const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const ActivityLog = require('../models/ActivityLog');
const Attendance = require('../models/Attendance');
const Milestone = require('../models/Milestone');
const IncidentReport = require('../models/IncidentReport');
const Student = require('../models/Student');
const Message = require('../models/Message');
const Class = require('../models/Class');
const prisma = require('../src/lib/prisma');

const router = express.Router();

// ===== Prisma Attendance APIs (Teacher) =====

router.get('/attendance/data', auth, authorize(['teacher']), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.schoolId) {
      return res.status(400).json({ error: 'Teacher is not assigned to a school' });
    }

    const school = await prisma.school.findUnique({
      where: { id: user.schoolId },
      include: {
        classes: {
          include: {
            batches: {
              select: {
                id: true,
                shiftName: true,
                startTime: true,
                endTime: true,
                capacity: true,
                classId: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!school) return res.status(404).json({ error: 'School not found' });

    res.json(school);
  } catch (err) {
    console.error('Teacher attendance data error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/attendance/batch/:batchId', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { batchId } = req.params;
    const dateInput = req.query.date ? new Date(req.query.date) : new Date();
    const start = new Date(dateInput);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        class: { select: { id: true, name: true, section: true } },
        students: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            enrollmentNumber: true,
            isActive: true,
          },
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        },
      },
    });

    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const attendance = await prisma.attendance.findMany({
      where: {
        batchId,
        date: { gte: start, lt: end },
      },
      select: {
        id: true,
        studentId: true,
        status: true,
        checkInTime: true,
        checkOutTime: true,
        notes: true,
      },
    });

    res.json({ batch, attendance });
  } catch (err) {
    console.error('Teacher attendance batch error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/attendance/mark', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { batchId, date, records } = req.body;

    if (!batchId || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'batchId and non-empty records are required' });
    }

    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const results = [];
    for (const rec of records) {
      if (!rec.studentId || !rec.status) continue;

      const existing = await prisma.attendance.findFirst({
        where: {
          studentId: rec.studentId,
          batchId,
          date: { gte: dayStart, lt: dayEnd },
        },
      });

      if (existing) {
        const updated = await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: rec.status,
            checkInTime: rec.checkInTime ? new Date(rec.checkInTime) : existing.checkInTime,
            checkOutTime: rec.checkOutTime ? new Date(rec.checkOutTime) : existing.checkOutTime,
            notes: rec.notes !== undefined ? rec.notes : existing.notes,
          },
        });
        results.push(updated);
      } else {
        const created = await prisma.attendance.create({
          data: {
            studentId: rec.studentId,
            batchId,
            date: dayStart,
            status: rec.status,
            checkInTime: rec.checkInTime ? new Date(rec.checkInTime) : null,
            checkOutTime: rec.checkOutTime ? new Date(rec.checkOutTime) : null,
            notes: rec.notes || null,
          },
        });
        results.push(created);
      }
    }

    res.json({ message: 'Attendance saved', count: results.length, records: results });
  } catch (err) {
    console.error('Teacher attendance mark error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Log Activity (Nap, Meal, Potty, Mood, etc.)
router.post('/activity', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, classId, activityType, ...activityData } = req.body;
    
    const activity = new ActivityLog({
      studentId,
      classId,
      teacherId: req.userId,
      activityType,
      date: new Date(),
      ...activityData,
    });
    
    await activity.save();
    res.status(201).json({ message: 'Activity logged', activity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Student's Daily Activity Log
router.get('/student/:studentId/activities', auth, async (req, res) => {
  try {
    const activities = await ActivityLog.find({ studentId: req.params.studentId })
      .sort({ date: -1 })
      .populate('teacherId', 'firstName lastName');
    
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark Attendance
router.post('/attendance', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, classId, status, date } = req.body;
    
    const attendance = new Attendance({
      studentId,
      classId,
      status,
      date: date || new Date(),
      checkInTime: new Date(),
    });
    
    await attendance.save();
    res.status(201).json({ message: 'Attendance marked', attendance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Mark Attendance for Class
router.post('/attendance/bulk', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { classId, attendanceData } = req.body;
    
    const results = await Promise.all(
      attendanceData.map((record) =>
        Attendance.create({
          studentId: record.studentId,
          classId,
          status: record.status,
          date: new Date(),
        })
      )
    );
    
    res.status(201).json({ message: 'Attendance marked for class', count: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record Milestone
router.post('/milestone', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, classId, domain, milestone, isAchieved } = req.body;
    
    const milestoneRecord = new Milestone({
      studentId,
      classId,
      teacherId: req.userId,
      domain,
      milestone,
      isAchieved,
      achievedDate: isAchieved ? new Date() : null,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    });
    
    await milestoneRecord.save();
    res.status(201).json({ message: 'Milestone recorded', milestone: milestoneRecord });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Incident Report
router.post('/incident', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, classId, incidentType, description, severity, photo, actionTaken } = req.body;
    
    const incident = new IncidentReport({
      studentId,
      classId,
      teacherId: req.userId,
      incidentType,
      description,
      severity,
      photo,
      actionTaken,
      parentNotified: false,
    });
    
    await incident.save();
    res.status(201).json({ message: 'Incident report created', incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send Message to Parent
router.post('/message', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { recipientId, studentId, message, mediaUrl } = req.body;
    
    const msg = new Message({
      senderId: req.userId,
      recipientId,
      studentId,
      message,
      mediaUrl,
    });
    
    await msg.save();
    res.status(201).json({ message: 'Message sent', data: msg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Class Details for Teacher
router.get('/class/:classId', auth, authorize(['teacher']), async (req, res) => {
  try {
    const classObj = await Class.findById(req.params.classId)
      .populate('students')
      .populate('teachers', 'firstName lastName');
    
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    res.json(classObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
