const express = require('express');
const bcrypt = require('bcryptjs');
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

// ===== Teacher Profile =====

router.get('/profile', auth, authorize(['teacher']), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        photo: true, address: true, qualification: true, dateOfJoining: true,
        emergencyContactName: true, emergencyContactPhone: true,
        createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { firstName, lastName, phone, address, qualification, dateOfJoining,
      emergencyContactName, emergencyContactPhone, photo, currentPassword, newPassword } = req.body;

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (qualification !== undefined) updateData.qualification = qualification;
    if (dateOfJoining !== undefined) updateData.dateOfJoining = dateOfJoining ? new Date(dateOfJoining) : null;
    if (emergencyContactName !== undefined) updateData.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone !== undefined) updateData.emergencyContactPhone = emergencyContactPhone;
    if (photo !== undefined) updateData.photo = photo;

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required to set a new password' });
      const existing = await prisma.user.findUnique({ where: { id: req.userId }, select: { password: true } });
      const match = await bcrypt.compare(currentPassword, existing.password);
      if (!match) return res.status(400).json({ error: 'Current password is incorrect' });
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        photo: true, address: true, qualification: true, dateOfJoining: true,
        emergencyContactName: true, emergencyContactPhone: true,
      },
    });
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// ===== PTM Routes (Teacher) =====

// GET /teacher/ptm/sessions — list sessions created by this teacher
router.get('/ptm/sessions', auth, authorize(['teacher']), async (req, res) => {
  try {
    const sessions = await prisma.pTMSession.findMany({
      where: { teacherId: req.userId },
      include: { slots: true },
      orderBy: { sessionDate: 'desc' },
    });

    const studentIds = [...new Set(
      sessions.flatMap((session) => (session.slots || []).map((slot) => slot.studentId)).filter(Boolean)
    )];

    let studentNameMap = {};
    if (studentIds.length > 0) {
      const students = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, firstName: true, lastName: true },
      });

      studentNameMap = Object.fromEntries(
        students.map((student) => [student.id, `${student.firstName || ''} ${student.lastName || ''}`.trim()])
      );
    }

    const enrichedSessions = sessions.map((session) => ({
      ...session,
      slots: (session.slots || []).map((slot) => ({
        ...slot,
        studentName: studentNameMap[slot.studentId] || 'Unknown Student',
      })),
    }));

    res.json(enrichedSessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /teacher/ptm/session — create a PTM session with auto-generated 15-min slots
router.post('/ptm/session', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { batchId, sessionDate, startTime, location, notes, studentIds } = req.body;
    if (!batchId || !sessionDate || !startTime || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'batchId, sessionDate, startTime and studentIds are required' });
    }

    const teacher = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!teacher?.schoolId) return res.status(400).json({ error: 'Teacher not linked to a school' });

    // Generate 15-min slots starting from startTime
    const parseTime = (t) => {
      const [time, period] = t.trim().split(' ');
      let [h, m] = time.split(':').map(Number);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };
    const formatTime = (mins) => {
      const h24 = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      const period = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
    };

    let cursor = parseTime(startTime);
    const slotsData = studentIds.map((studentId) => {
      const slot = { studentId, startTime: formatTime(cursor), endTime: formatTime(cursor + 15) };
      cursor += 15;
      return slot;
    });

    const session = await prisma.pTMSession.create({
      data: {
        teacherId: req.userId,
        batchId,
        schoolId: teacher.schoolId,
        sessionDate: new Date(sessionDate),
        location: location || null,
        notes: notes || null,
        slots: { create: slotsData },
      },
      include: { slots: true },
    });

    res.status(201).json(session);
  } catch (err) {
    console.error('PTM session create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /teacher/ptm/slot/:slotId — update slot status
router.patch('/ptm/slot/:slotId', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { status } = req.body;
    const slot = await prisma.pTMSlot.update({
      where: { id: req.params.slotId },
      data: { status },
    });
    res.json(slot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /teacher/ptm/session/:sessionId — delete a session and all slots
router.delete('/ptm/session/:sessionId', auth, authorize(['teacher']), async (req, res) => {
  try {
    await prisma.pTMSession.delete({ where: { id: req.params.sessionId, teacherId: req.userId } });
    res.json({ message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
