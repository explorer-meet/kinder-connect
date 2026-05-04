const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const { query, queryOne, newId, parseJ, toJ } = require('../src/lib/db');

const router = express.Router();

// GET parent's children
router.get('/children', auth, authorize(['parent']), async (req, res) => {
  try {
    const children = await query(
      `SELECT s.*, c.name AS className, c.section, sc.name AS schoolName
       FROM student s
       LEFT JOIN \`Class\` c ON s.classId = c.id
       LEFT JOIN school sc ON s.schoolId = sc.id
       WHERE JSON_CONTAINS(s.parentIds, JSON_QUOTE(?))`,
      [req.userId]
    );
    res.json(children.map(s => ({
      ...s,
      parentIds: parseJ(s.parentIds) || [],
      allergies: parseJ(s.allergies) || [],
      class: s.className ? { name: s.className, section: s.section } : null,
      school: s.schoolName ? { name: s.schoolName } : null,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET child's activity feed
router.get('/child/:studentId/feed', auth, authorize(['parent']), async (req, res) => {
  try {
    const student = await queryOne('SELECT id, batchId FROM student WHERE id = ? LIMIT 1', [req.params.studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [activities, todayAttendance] = await Promise.all([
      query(
        `SELECT a.*, u.firstName AS teacherFirstName, u.lastName AS teacherLastName
         FROM activitylog a
         LEFT JOIN \`User\` u ON a.teacherId = u.id
         WHERE (a.studentId = ? AND a.activityType = 'respective')
            OR (a.batchId = ? AND a.activityType IN ('general','class_note'))
         ORDER BY a.createdAt DESC LIMIT 50`,
        [req.params.studentId, student.batchId]
      ),
      queryOne('SELECT * FROM attendance WHERE studentId = ? AND date >= ? AND date < ? LIMIT 1', [req.params.studentId, today, tomorrow]),
    ]);

    res.json({
      activities: activities.map(a => ({ ...a, teacher: a.teacherFirstName ? { firstName: a.teacherFirstName, lastName: a.teacherLastName } : null })),
      todayAttendance,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET monthly development report
router.get('/child/:studentId/report/:month/:year', auth, authorize(['parent']), async (req, res) => {
  try {
    const report = await queryOne(
      `SELECT r.*, u.firstName AS teacherFirstName, u.lastName AS teacherLastName
       FROM report r
       LEFT JOIN \`User\` u ON r.teacherId = u.id
       WHERE r.studentId = ? AND r.month = ? AND r.year = ? LIMIT 1`,
      [req.params.studentId, parseInt(req.params.month), parseInt(req.params.year)]
    );
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({
      ...report,
      domains: parseJ(report.domains),
      highlights: parseJ(report.highlights),
      areasForImprovement: parseJ(report.areasForImprovement),
      recommendedActivities: parseJ(report.recommendedActivities),
      teacher: report.teacherFirstName ? { firstName: report.teacherFirstName, lastName: report.teacherLastName } : null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET child's attendance
router.get('/child/:studentId/attendance', auth, authorize(['parent']), async (req, res) => {
  try {
    const attendance = await query('SELECT * FROM attendance WHERE studentId = ? ORDER BY date DESC', [req.params.studentId]);
    res.json(attendance);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET messages with teacher
router.get('/messages/:teacherId', auth, authorize(['parent']), async (req, res) => {
  try {
    const messages = await query(
      `SELECT m.*,
         su.firstName AS senderFirstName, su.lastName AS senderLastName,
         ru.firstName AS recipientFirstName, ru.lastName AS recipientLastName
       FROM message m
       LEFT JOIN \`User\` su ON m.senderId = su.id
       LEFT JOIN \`User\` ru ON m.recipientId = ru.id
       WHERE (m.senderId = ? AND m.recipientId = ?) OR (m.senderId = ? AND m.recipientId = ?)
       ORDER BY m.createdAt DESC`,
      [req.userId, req.params.teacherId, req.params.teacherId, req.userId]
    );
    res.json(messages.map(m => ({
      ...m,
      sender: m.senderFirstName ? { firstName: m.senderFirstName, lastName: m.senderLastName } : null,
      recipient: m.recipientFirstName ? { firstName: m.recipientFirstName, lastName: m.recipientLastName } : null,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST send message to teacher
router.post('/message', auth, authorize(['parent']), async (req, res) => {
  try {
    const { recipientId, studentId, message, mediaUrl } = req.body;
    if (!recipientId || !message) return res.status(400).json({ error: 'recipientId and message are required' });
    const id = newId();
    await query('INSERT INTO message (id, senderId, recipientId, studentId, message, mediaUrl, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, 0, NOW())',
      [id, req.userId, recipientId, studentId || null, message, mediaUrl || null]);
    const msg = await queryOne('SELECT * FROM message WHERE id = ?', [id]);
    res.status(201).json({ message: 'Message sent', data: msg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST book a PTM slot
router.post('/ptm/book', auth, authorize(['parent']), async (req, res) => {
  try {
    const { ptmBookingId } = req.body;
    if (!ptmBookingId) return res.status(400).json({ error: 'ptmBookingId is required' });
    const ptm = await queryOne('SELECT * FROM ptmbooking WHERE id = ? LIMIT 1', [ptmBookingId]);
    if (!ptm) return res.status(404).json({ error: 'PTM slot not found' });
    if (ptm.status !== 'available') return res.status(400).json({ error: 'Slot not available' });
    await query("UPDATE ptmbooking SET status = 'booked', parentId = ?, bookedOn = NOW(), updatedAt = NOW() WHERE id = ?",
      [req.userId, ptmBookingId]);
    const updated = await queryOne('SELECT * FROM ptmbooking WHERE id = ?', [ptmBookingId]);
    res.json({ message: 'PTM slot booked', ptm: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET PTM slots by teacher
router.get('/ptm/slots/:teacherId', auth, authorize(['parent']), async (req, res) => {
  try {
    const slots = await query(
      "SELECT * FROM ptmbooking WHERE teacherId = ? AND status IN ('available','booked') ORDER BY meetingDate ASC",
      [req.params.teacherId]
    );
    res.json(slots);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update authorized pickup contacts
router.put('/child/:studentId/authorized-pickup', auth, authorize(['parent']), async (req, res) => {
  try {
    const { authorizedPickup } = req.body;
    const student = await queryOne('SELECT id, parentIds FROM student WHERE id = ? LIMIT 1', [req.params.studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!(parseJ(student.parentIds) || []).includes(req.userId)) return res.status(403).json({ error: 'Not authorized' });
    await query('UPDATE student SET authorizedPickup = ?, updatedAt = NOW() WHERE id = ?',
      [toJ(authorizedPickup), req.params.studentId]);
    const updated = await queryOne('SELECT * FROM student WHERE id = ?', [req.params.studentId]);
    res.json({ message: 'Authorized pickup updated', student: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET child incidents
router.get('/child/:studentId/incidents', auth, authorize(['parent']), async (req, res) => {
  try {
    const incidents = await query('SELECT * FROM incidentreport WHERE studentId = ? ORDER BY incidentTime DESC', [req.params.studentId]);
    const teacherIds = [...new Set(incidents.map(i => i.teacherId).filter(Boolean))];
    const teachers = teacherIds.length ? await query(`SELECT id, firstName, lastName FROM \`User\` WHERE id IN (${teacherIds.map(() => '?').join(',')})`, teacherIds) : [];
    const tMap = Object.fromEntries(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`]));
    res.json(incidents.map(i => ({ ...i, teacherName: tMap[i.teacherId] || 'Teacher' })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET child milestones
router.get('/child/:studentId/milestones', auth, authorize(['parent']), async (req, res) => {
  try {
    const milestones = await query('SELECT * FROM milestone WHERE studentId = ? ORDER BY isAchieved ASC, createdAt DESC', [req.params.studentId]);
    const teacherIds = [...new Set(milestones.map(m => m.teacherId).filter(Boolean))];
    const teachers = teacherIds.length ? await query(`SELECT id, firstName, lastName FROM \`User\` WHERE id IN (${teacherIds.map(() => '?').join(',')})`, teacherIds) : [];
    const tMap = Object.fromEntries(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`]));
    res.json(milestones.map(m => ({ ...m, teacherName: tMap[m.teacherId] || 'Teacher' })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST pickup request
router.post('/pickup-request', auth, authorize(['parent']), async (req, res) => {
  try {
    const { studentId, personName, mobileNumber, photoUrl } = req.body;
    if (!studentId || !personName || !mobileNumber) return res.status(400).json({ error: 'studentId, personName and mobileNumber are required' });
    const student = await queryOne('SELECT id, schoolId, parentIds FROM student WHERE id = ? LIMIT 1', [studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!(parseJ(student.parentIds) || []).includes(req.userId)) return res.status(403).json({ error: 'You are not authorized to request for this student' });
    const id = newId();
    await query('INSERT INTO pickuprequest (id, studentId, requestedById, schoolId, personName, mobileNumber, photoUrl, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [id, studentId, req.userId, student.schoolId, personName, mobileNumber, photoUrl || null, 'pending']);
    const request = await queryOne('SELECT * FROM pickuprequest WHERE id = ?', [id]);
    res.status(201).json({ message: 'Pickup request submitted. Awaiting school admin approval.', request });
  } catch (err) {
    console.error('Pickup request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET pickup requests
router.get('/pickup-requests', auth, authorize(['parent']), async (req, res) => {
  try {
    const requests = await query(
      'SELECT pr.*, s.id AS studentRelId, s.firstName AS studentFirstName, s.lastName AS studentLastName FROM pickuprequest pr LEFT JOIN student s ON pr.studentId = s.id WHERE pr.requestedById = ? ORDER BY pr.createdAt DESC',
      [req.userId]
    );
    res.json(requests.map(r => ({ ...r, student: r.studentRelId ? { id: r.studentRelId, firstName: r.studentFirstName, lastName: r.studentLastName } : null })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET PTM slots for parent's children (teacher-created sessions)
router.get('/ptm/slots', auth, authorize(['parent']), async (req, res) => {
  try {
    const children = await query('SELECT id FROM student WHERE JSON_CONTAINS(parentIds, JSON_QUOTE(?))', [req.userId]);
    const childIds = children.map(c => c.id);
    if (!childIds.length) return res.json([]);

    const slots = await query(
      `SELECT sl.*, ss.id AS sessionRelId, ss.sessionDate, ss.location, ss.notes AS sessionNotes, ss.teacherId, ss.batchId
       FROM ptmslot sl
       JOIN ptmsession ss ON sl.sessionId = ss.id
       WHERE sl.studentId IN (${childIds.map(() => '?').join(',')})
       ORDER BY sl.createdAt DESC`,
      childIds
    );

    const teacherIds = [...new Set(slots.map(s => s.teacherId).filter(Boolean))];
    const studentIds = [...new Set(slots.map(s => s.studentId).filter(Boolean))];
    const [teachers, students] = await Promise.all([
      teacherIds.length ? query(`SELECT id, firstName, lastName FROM \`User\` WHERE id IN (${teacherIds.map(() => '?').join(',')})`, teacherIds) : [],
      studentIds.length ? query(`SELECT id, firstName, lastName FROM student WHERE id IN (${studentIds.map(() => '?').join(',')})`, studentIds) : [],
    ]);
    const teacherMap = Object.fromEntries(teachers.map(t => [t.id, t]));
    const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

    res.json(slots.map(slot => {
      const teacher = teacherMap[slot.teacherId] || null;
      const student = studentMap[slot.studentId] || null;
      return {
        slotId: slot.id, sessionId: slot.sessionId,
        studentId: slot.studentId, studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
        teacherId: slot.teacherId, teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown Teacher',
        batchId: slot.batchId, sessionDate: slot.sessionDate,
        startTime: slot.startTime, endTime: slot.endTime, status: slot.status,
        location: slot.location || null, notes: slot.sessionNotes || null,
      };
    }));
  } catch (err) {
    console.error('Parent PTM slots error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST PTM request
router.post('/ptm/request', auth, authorize(['parent']), async (req, res) => {
  try {
    const { studentId, requestNotes, preferredDate } = req.body;
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });
    const student = await queryOne('SELECT id, schoolId, parentIds FROM student WHERE id = ? LIMIT 1', [studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!(parseJ(student.parentIds) || []).includes(req.userId)) return res.status(403).json({ error: 'You are not authorized to request PTM for this student' });
    const id = newId();
    await query('INSERT INTO ptmrequest (id, schoolId, parentId, studentId, requestNotes, preferredDate, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [id, student.schoolId, req.userId, studentId, requestNotes || null, preferredDate ? new Date(preferredDate) : null, 'pending']);
    const request = await queryOne('SELECT * FROM ptmrequest WHERE id = ?', [id]);
    res.status(201).json({ message: 'PTM request submitted', request });
  } catch (err) {
    console.error('Parent PTM request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET PTM requests list
router.get('/ptm/requests', auth, authorize(['parent']), async (req, res) => {
  try {
    const requests = await query('SELECT * FROM ptmrequest WHERE parentId = ? ORDER BY createdAt DESC', [req.userId]);
    const studentIds = [...new Set(requests.map(r => r.studentId).filter(Boolean))];
    const teacherIds = [...new Set(requests.map(r => r.teacherId).filter(Boolean))];
    const [students, teachers] = await Promise.all([
      studentIds.length ? query(`SELECT id, firstName, lastName FROM student WHERE id IN (${studentIds.map(() => '?').join(',')})`, studentIds) : [],
      teacherIds.length ? query(`SELECT id, firstName, lastName FROM \`User\` WHERE id IN (${teacherIds.map(() => '?').join(',')})`, teacherIds) : [],
    ]);
    const sMap = Object.fromEntries(students.map(s => [s.id, s]));
    const tMap = Object.fromEntries(teachers.map(t => [t.id, t]));
    res.json(requests.map(r => ({
      ...r,
      studentName: sMap[r.studentId] ? `${sMap[r.studentId].firstName} ${sMap[r.studentId].lastName}` : 'Unknown Student',
      teacherName: r.teacherId && tMap[r.teacherId] ? `${tMap[r.teacherId].firstName} ${tMap[r.teacherId].lastName}` : null,
    })));
  } catch (err) {
    console.error('Parent PTM requests list error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
