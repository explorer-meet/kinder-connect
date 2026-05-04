const express = require('express');
const { randomUUID } = require('crypto');
const { auth, authorize } = require('../middleware/auth');
const { query, queryOne, newId, parseJ, toJ } = require('../src/lib/db');
const { uploadBufferToS3, resolveStoredS3Url } = require('../src/lib/s3');

const router = express.Router();

const parseFoodItems = (v) => {
  if (!v) return null;
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return v.split(',').map(x => x.trim()).filter(Boolean);
  return null;
};

const parseDataUrl = (dataUrl) => {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  return { contentType: match[1], base64: match[2] };
};

const fmtActivity = async (a) => {
  if (!a || !a.mediaUrl) return a;
  return { ...a, foodItems: parseJ(a.foodItems), mediaUrl: await resolveStoredS3Url(a.mediaUrl) };
};

router.post('/upload', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { fileName, contentType, dataUrl } = req.body;
    if (!dataUrl) return res.status(400).json({ error: 'dataUrl is required' });
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) return res.status(400).json({ error: 'Invalid base64 dataUrl format' });
    const detectedType = contentType || parsed.contentType;
    if (!detectedType?.startsWith('image/') && !detectedType?.startsWith('video/')) {
      return res.status(400).json({ error: 'Only image and video uploads are allowed' });
    }
    const safeFileName = (fileName || 'media.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `activities/${Date.now()}-${randomUUID()}-${safeFileName}`;
    const buffer = Buffer.from(parsed.base64, 'base64');
    const uploaded = await uploadBufferToS3({ key, buffer, contentType: detectedType });
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

router.post('/', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, batchId, activityType, ...d } = req.body;
    if (!batchId || !activityType) return res.status(400).json({ error: 'Missing required fields: batchId, activityType' });
    const normalizedType = String(activityType).trim().toLowerCase();
    if (!['general', 'respective', 'class_note'].includes(normalizedType)) {
      return res.status(400).json({ error: 'activityType must be general, respective, or class_note' });
    }
    if (normalizedType === 'respective' && !studentId) {
      return res.status(400).json({ error: 'studentId is required for respective activity type' });
    }
    let selectedStudentId = null;
    if (studentId) {
      const student = await queryOne('SELECT id FROM student WHERE id = ? AND batchId = ? LIMIT 1', [studentId, batchId]);
      if (!student) return res.status(400).json({ error: 'Student is not assigned to selected batch' });
      selectedStudentId = student.id;
    }
    const id = newId();
    const foodItems = parseFoodItems(d.foodItems);
    await query(
      `INSERT INTO activitylog (id, studentId, batchId, teacherId, activityType, napStartTime, napEndTime, napDuration, mealType, foodItems, intakeLevel, pottyType, time, notes, moodAtArrival, moodAtDeparture, moodNotes, mediaUrl, mediaType, caption, milestoneAchieved, domain, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        ['general', 'class_note'].includes(normalizedType) ? null : selectedStudentId,
        batchId, req.userId, normalizedType,
        d.napStartTime ? new Date(d.napStartTime) : null,
        d.napEndTime ? new Date(d.napEndTime) : null,
        d.napDuration ? parseInt(d.napDuration) : null,
        d.mealType || null,
        foodItems ? JSON.stringify(foodItems) : null,
        d.intakeLevel || null, d.pottyType || null,
        d.time ? new Date(d.time) : null,
        d.notes || null, d.moodAtArrival || null, d.moodAtDeparture || null, d.moodNotes || null,
        d.mediaUrl || null, d.mediaType || null, d.caption || null,
        d.milestoneAchieved || null, d.domain || null, d.description || null,
      ]
    );
    const activity = await queryOne('SELECT * FROM activitylog WHERE id = ?', [id]);
    res.status(201).json({ message: 'Activity logged', activity });
  } catch (err) {
    console.error('Log activity error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const student = await queryOne('SELECT id, batchId FROM student WHERE id = ? LIMIT 1', [req.params.studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const activities = await query(
      `SELECT * FROM activitylog WHERE (studentId = ? AND activityType = 'respective') OR (batchId = ? AND activityType IN ('general','class_note')) ORDER BY createdAt DESC LIMIT 100`,
      [req.params.studentId, student.batchId]
    );
    res.json(await Promise.all(activities.map(fmtActivity)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/batch/:batchId/date/:date', auth, async (req, res) => {
  try {
    const startDate = new Date(req.params.date); startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 1);
    const activities = await query(
      'SELECT * FROM activitylog WHERE batchId = ? AND createdAt >= ? AND createdAt < ? ORDER BY createdAt DESC',
      [req.params.batchId, startDate, endDate]
    );
    res.json(await Promise.all(activities.map(fmtActivity)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/batch/:batchId/recent', auth, async (req, res) => {
  try {
    const take = Math.min(parseInt(req.query.take || '30'), 100);
    const activities = await query(
      'SELECT * FROM activitylog WHERE batchId = ? ORDER BY createdAt DESC LIMIT ?',
      [req.params.batchId, take]
    );
    res.json(await Promise.all(activities.map(fmtActivity)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/student/:studentId/type/:activityType', auth, async (req, res) => {
  try {
    const activities = await query(
      'SELECT * FROM activitylog WHERE studentId = ? AND activityType = ? ORDER BY createdAt DESC LIMIT 50',
      [req.params.studentId, req.params.activityType]
    );
    res.json(await Promise.all(activities.map(fmtActivity)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
