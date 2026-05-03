const express = require('express');
const { randomUUID } = require('crypto');
const { auth, authorize } = require('../middleware/auth');
const prisma = require('../src/lib/prisma');
const { uploadBufferToS3, resolveStoredS3Url } = require('../src/lib/s3');

const router = express.Router();

const parseFoodItems = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return null;
};

const parseDataUrl = (dataUrl) => {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  return { contentType: match[1], base64: match[2] };
};

const formatActivityMedia = async (activity) => {
  if (!activity?.mediaUrl) return activity;

  return {
    ...activity,
    mediaUrl: await resolveStoredS3Url(activity.mediaUrl),
  };
};

// Upload image/video and return public URL
router.post('/upload', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { fileName, contentType, dataUrl } = req.body;

    if (!dataUrl) {
      return res.status(400).json({ error: 'dataUrl is required' });
    }

    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid base64 dataUrl format' });
    }

    const detectedType = contentType || parsed.contentType;
    if (!detectedType?.startsWith('image/') && !detectedType?.startsWith('video/')) {
      return res.status(400).json({ error: 'Only image and video uploads are allowed' });
    }

    const safeFileName = (fileName || 'media.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `activities/${Date.now()}-${randomUUID()}-${safeFileName}`;
    const buffer = Buffer.from(parsed.base64, 'base64');

    const uploaded = await uploadBufferToS3({
      key,
      buffer,
      contentType: detectedType,
    });

    res.status(201).json({
      message: 'Uploaded successfully',
      mediaUrl: uploaded.url,
      previewUrl: await resolveStoredS3Url(uploaded.url),
      mediaKey: uploaded.key,
      mediaType: detectedType,
    });
  } catch (err) {
    console.error('Activity media upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Log Activity (batch-based)
router.post('/', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, batchId, activityType, ...activityData } = req.body;

    if (!batchId || !activityType) {
      return res.status(400).json({ error: 'Missing required fields: batchId, activityType' });
    }

    const normalizedType = String(activityType || '').trim().toLowerCase();
    if (!['general', 'respective', 'class_note'].includes(normalizedType)) {
      return res.status(400).json({ error: 'activityType must be general, respective, or class_note' });
    }

    if (normalizedType === 'respective' && !studentId) {
      return res.status(400).json({ error: 'studentId is required for respective activity type' });
    }

    let selectedStudentId = null;

    if (studentId) {
      const student = await prisma.student.findFirst({
        where: { id: studentId, batchId },
        select: { id: true },
      });

      if (!student) {
        return res.status(400).json({ error: 'Student is not assigned to selected batch' });
      }

      selectedStudentId = student.id;
    }

    const activity = await prisma.activityLog.create({
      data: {
        studentId: ['general', 'class_note'].includes(normalizedType) ? null : selectedStudentId,
        batchId,
        teacherId: req.userId,
        activityType: normalizedType,
        napStartTime: activityData.napStartTime ? new Date(activityData.napStartTime) : null,
        napEndTime: activityData.napEndTime ? new Date(activityData.napEndTime) : null,
        napDuration: activityData.napDuration ? parseInt(activityData.napDuration, 10) : null,
        mealType: activityData.mealType || null,
        foodItems: parseFoodItems(activityData.foodItems),
        intakeLevel: activityData.intakeLevel || null,
        pottyType: activityData.pottyType || null,
        time: activityData.time ? new Date(activityData.time) : null,
        notes: activityData.notes || null,
        moodAtArrival: activityData.moodAtArrival || null,
        moodAtDeparture: activityData.moodAtDeparture || null,
        moodNotes: activityData.moodNotes || null,
        mediaUrl: activityData.mediaUrl || null,
        mediaType: activityData.mediaType || null,
        caption: activityData.caption || null,
        milestoneAchieved: activityData.milestoneAchieved || null,
        domain: activityData.domain || null,
        description: activityData.description || null,
      },
    });

    res.status(201).json({ message: 'Activity logged', activity });
  } catch (err) {
    console.error('Log activity error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get activities for a student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.studentId },
      select: { id: true, batchId: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const activities = await prisma.activityLog.findMany({
      where: {
        OR: [
          { studentId: req.params.studentId, activityType: 'respective' },
          { batchId: student.batchId, activityType: 'general' },
          { batchId: student.batchId, activityType: 'class_note' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(await Promise.all(activities.map(formatActivityMedia)));
  } catch (err) {
    console.error('Get student activities error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get activities by batch and date
router.get('/batch/:batchId/date/:date', auth, async (req, res) => {
  try {
    const startDate = new Date(req.params.date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const activities = await prisma.activityLog.findMany({
      where: {
        batchId: req.params.batchId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(await Promise.all(activities.map(formatActivityMedia)));
  } catch (err) {
    console.error('Get batch activities error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get recent activities for a batch
router.get('/batch/:batchId/recent', auth, async (req, res) => {
  try {
    const take = Math.min(parseInt(req.query.take || '30', 10), 100);

    const activities = await prisma.activityLog.findMany({
      where: { batchId: req.params.batchId },
      orderBy: { createdAt: 'desc' },
      take,
    });

    res.json(await Promise.all(activities.map(formatActivityMedia)));
  } catch (err) {
    console.error('Get batch recent activities error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get activities by type for a student
router.get('/student/:studentId/type/:activityType', auth, async (req, res) => {
  try {
    const activities = await prisma.activityLog.findMany({
      where: {
        studentId: req.params.studentId,
        activityType: req.params.activityType,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(await Promise.all(activities.map(formatActivityMedia)));
  } catch (err) {
    console.error('Get activity by type error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
