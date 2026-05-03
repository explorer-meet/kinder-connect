const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const Student = require('../models/Student');
const ActivityLog = require('../models/ActivityLog');
const Report = require('../models/Report');
const Attendance = require('../models/Attendance');
const Message = require('../models/Message');
const PTMBooking = require('../models/PTMBooking');
const IncidentReport = require('../models/IncidentReport');
const prisma = require('../src/lib/prisma');

const router = express.Router();

// Get Parent's Children
router.get('/children', auth, authorize(['parent']), async (req, res) => {
  try {
    const children = await Student.find({ parentIds: req.userId })
      .populate('classId', 'name section')
      .populate('schoolId', 'name');
    
    res.json(children);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Child's Activity Feed (Daily Updates)
router.get('/child/:studentId/feed', auth, authorize(['parent']), async (req, res) => {
  try {
    const activities = await ActivityLog.find({ studentId: req.params.studentId })
      .sort({ date: -1 })
      .limit(50)
      .populate('teacherId', 'firstName lastName');
    
    const attendance = await Attendance.findOne({
      studentId: req.params.studentId,
      date: { $gte: new Date().setHours(0, 0, 0, 0) },
    });
    
    res.json({
      activities,
      todayAttendance: attendance,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Monthly Development Report
router.get('/child/:studentId/report/:month/:year', auth, authorize(['parent']), async (req, res) => {
  try {
    const report = await Report.findOne({
      studentId: req.params.studentId,
      month: parseInt(req.params.month),
      year: parseInt(req.params.year),
    }).populate('teacherId', 'firstName lastName');
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Child's Attendance Records
router.get('/child/:studentId/attendance', auth, authorize(['parent']), async (req, res) => {
  try {
    const attendance = await Attendance.find({ studentId: req.params.studentId })
      .sort({ date: -1 });
    
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Incident Reports
router.get('/child/:studentId/incidents', auth, authorize(['parent']), async (req, res) => {
  try {
    const incidents = await IncidentReport.find({ studentId: req.params.studentId })
      .sort({ incidentTime: -1 })
      .populate('teacherId', 'firstName lastName');
    
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Messages with Teacher
router.get('/messages/:teacherId', auth, authorize(['parent']), async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.userId, recipientId: req.params.teacherId },
        { senderId: req.params.teacherId, recipientId: req.userId },
      ],
    })
      .sort({ createdAt: -1 })
      .populate('senderId', 'firstName lastName')
      .populate('recipientId', 'firstName lastName');
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send Message to Teacher
router.post('/message', auth, authorize(['parent']), async (req, res) => {
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

// Book PTM Slot
router.post('/ptm/book', auth, authorize(['parent']), async (req, res) => {
  try {
    const { ptmBookingId } = req.body;
    
    const ptm = await PTMBooking.findById(ptmBookingId);
    if (!ptm) {
      return res.status(404).json({ error: 'PTM slot not found' });
    }
    
    if (ptm.status !== 'available') {
      return res.status(400).json({ error: 'Slot not available' });
    }
    
    ptm.status = 'booked';
    ptm.parentId = req.userId;
    ptm.bookedOn = new Date();
    await ptm.save();
    
    res.json({ message: 'PTM slot booked', ptm });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Available PTM Slots
router.get('/ptm/slots/:teacherId', auth, authorize(['parent']), async (req, res) => {
  try {
    const slots = await PTMBooking.find({
      teacherId: req.params.teacherId,
      status: { $in: ['available', 'booked'] },
    }).sort({ meetingDate: 1 });
    
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Authorized Pickup Contacts
router.put('/child/:studentId/authorized-pickup', auth, authorize(['parent']), async (req, res) => {
  try {
    const { authorizedPickup } = req.body;
    
    const student = await Student.findByIdAndUpdate(
      req.params.studentId,
      { authorizedPickup },
      { new: true }
    );
    
    res.json({ message: 'Authorized pickup updated', student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Pickup / Drop Requests ──────────────────────────────────────────────────

// Parent requests someone else to pick up / drop their child
router.post('/pickup-request', auth, authorize(['parent']), async (req, res) => {
  try {
    const { studentId, personName, mobileNumber, photoUrl } = req.body;

    if (!studentId || !personName || !mobileNumber) {
      return res.status(400).json({ error: 'studentId, personName and mobileNumber are required' });
    }

    // Verify the student belongs to this parent
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const parentIds = Array.isArray(student.parentIds) ? student.parentIds : [];
    if (!parentIds.includes(req.userId)) {
      return res.status(403).json({ error: 'You are not authorized to request for this student' });
    }

    const request = await prisma.pickupRequest.create({
      data: {
        studentId,
        requestedById: req.userId,
        schoolId: student.schoolId,
        personName,
        mobileNumber,
        photoUrl: photoUrl || null,
        status: 'pending',
      },
    });

    res.status(201).json({ message: 'Pickup request submitted. Awaiting school admin approval.', request });
  } catch (err) {
    console.error('Pickup request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Parent views their pickup requests
router.get('/pickup-requests', auth, authorize(['parent']), async (req, res) => {
  try {
    const requests = await prisma.pickupRequest.findMany({
      where: { requestedById: req.userId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
