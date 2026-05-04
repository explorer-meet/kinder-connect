const express = require('express');
const bcrypt = require('bcryptjs');
const { auth, authorize } = require('../middleware/auth');
const ActivityLog = require('../models/ActivityLog');
const Attendance = require('../models/Attendance');
const Message = require('../models/Message');
const Class = require('../models/Class');
const { pool, query, queryOne, newId, parseJ, toJ } = require('../src/lib/db');

const router = express.Router();

// ===== Teacher Profile =====

router.get('/profile', auth, authorize(['teacher']), async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, firstName, lastName, email, phone, photo, address, qualification, dateOfJoining, emergencyContactName, emergencyContactPhone, createdAt FROM `User` WHERE id = ? LIMIT 1',
      [req.userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/profile', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { firstName, lastName, phone, address, qualification, dateOfJoining,
      emergencyContactName, emergencyContactPhone, photo, currentPassword, newPassword } = req.body;

    const sets = [], vals = [];
    if (firstName !== undefined)             { sets.push('firstName = ?');             vals.push(firstName); }
    if (lastName !== undefined)              { sets.push('lastName = ?');              vals.push(lastName); }
    if (phone !== undefined)                 { sets.push('phone = ?');                 vals.push(phone); }
    if (address !== undefined)               { sets.push('address = ?');               vals.push(address); }
    if (qualification !== undefined)         { sets.push('qualification = ?');         vals.push(qualification); }
    if (dateOfJoining !== undefined)         { sets.push('dateOfJoining = ?');         vals.push(dateOfJoining ? new Date(dateOfJoining) : null); }
    if (emergencyContactName !== undefined)  { sets.push('emergencyContactName = ?');  vals.push(emergencyContactName); }
    if (emergencyContactPhone !== undefined) { sets.push('emergencyContactPhone = ?'); vals.push(emergencyContactPhone); }
    if (photo !== undefined)                 { sets.push('photo = ?');                 vals.push(photo); }

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required to set a new password' });
      const existing = await queryOne('SELECT password FROM `User` WHERE id = ? LIMIT 1', [req.userId]);
      const match = await bcrypt.compare(currentPassword, existing.password);
      if (!match) return res.status(400).json({ error: 'Current password is incorrect' });
      sets.push('password = ?');
      vals.push(await bcrypt.hash(newPassword, 10));
    }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
    sets.push('updatedAt = NOW()');
    vals.push(req.userId);

    await query(`UPDATE \`User\` SET ${sets.join(', ')} WHERE id = ?`, vals);
    const user = await queryOne(
      'SELECT id, firstName, lastName, email, phone, photo, address, qualification, dateOfJoining, emergencyContactName, emergencyContactPhone FROM `User` WHERE id = ? LIMIT 1',
      [req.userId]
    );
    res.json({ message: 'Profile updated', user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== Attendance APIs =====

router.get('/attendance/data', auth, authorize(['teacher']), async (req, res) => {
  try {
    const user = await queryOne('SELECT schoolId FROM `User` WHERE id = ? LIMIT 1', [req.userId]);
    if (!user?.schoolId) return res.status(400).json({ error: 'Teacher is not assigned to a school' });

    const school = await queryOne('SELECT * FROM School WHERE id = ? LIMIT 1', [user.schoolId]);
    if (!school) return res.status(404).json({ error: 'School not found' });

    const classes = await query('SELECT * FROM `Class` WHERE schoolId = ? ORDER BY name ASC', [user.schoolId]);
    const batches = classes.length
      ? await query(`SELECT id, shiftName, startTime, endTime, capacity, classId FROM Batch WHERE classId IN (${classes.map(() => '?').join(',')}) `, classes.map(c => c.id))
      : [];
    const batchMap = {};
    batches.forEach(b => { (batchMap[b.classId] = batchMap[b.classId] || []).push(b); });
    school.classes = classes.map(c => ({ ...c, batches: batchMap[c.id] || [] }));

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
    const start = new Date(dateInput); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);

    const batch = await queryOne('SELECT b.*, c.id AS classRelId, c.name AS className, c.section FROM Batch b LEFT JOIN `Class` c ON b.classId = c.id WHERE b.id = ? LIMIT 1', [batchId]);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const students = await query('SELECT id, firstName, lastName, enrollmentNumber, isActive FROM Student WHERE batchId = ? ORDER BY firstName ASC, lastName ASC', [batchId]);
    batch.class = batch.classRelId ? { id: batch.classRelId, name: batch.className, section: batch.section } : null;
    batch.students = students;

    const attendance = await query(
      'SELECT id, studentId, status, checkInTime, checkOutTime, notes FROM Attendance WHERE batchId = ? AND date >= ? AND date < ?',
      [batchId, start, end]
    );

    res.json({ batch, attendance });
  } catch (err) {
    console.error('Teacher attendance batch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== Medical Records =====

router.get('/medical/batch/:batchId', auth, authorize(['teacher']), async (req, res) => {
  try {
    const teacher = await queryOne('SELECT schoolId FROM `User` WHERE id = ? LIMIT 1', [req.userId]);
    if (!teacher?.schoolId) return res.status(400).json({ error: 'Teacher is not assigned to a school' });

    const batch = await queryOne('SELECT b.*, c.id AS classRelId, c.name AS className, c.section FROM Batch b LEFT JOIN `Class` c ON b.classId = c.id WHERE b.id = ? LIMIT 1', [req.params.batchId]);
    if (!batch || batch.schoolId !== teacher.schoolId) return res.status(404).json({ error: 'Batch not found' });

    const students = await query(
      'SELECT id, firstName, lastName, enrollmentNumber, dateOfBirth, isActive, medicalProfile, allergies FROM Student WHERE batchId = ? ORDER BY firstName ASC, lastName ASC',
      [req.params.batchId]
    );

    batch.class = batch.classRelId ? { id: batch.classRelId, name: batch.className, section: batch.section } : null;

    res.json({
      batch: { id: batch.id, shiftName: batch.shiftName, class: batch.class },
      students: students.map(s => {
        const allergies = parseJ(s.allergies) || [];
        const medicalProfile = parseJ(s.medicalProfile);
        return { ...s, allergies, medicalProfile, hasMedicalData: Boolean(medicalProfile || allergies.length > 0) };
      }),
    });
  } catch (err) {
    console.error('Teacher medical batch error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/medical/student/:studentId', auth, authorize(['teacher']), async (req, res) => {
  try {
    const teacher = await queryOne('SELECT schoolId FROM `User` WHERE id = ? LIMIT 1', [req.userId]);
    if (!teacher?.schoolId) return res.status(400).json({ error: 'Teacher is not assigned to a school' });

    const student = await queryOne(
      `SELECT s.id, s.firstName, s.lastName, s.enrollmentNumber, s.dateOfBirth, s.schoolId, s.allergies, s.medicalNotes, s.medicalProfile,
       c.id AS classRelId, c.name AS className, c.section, b.id AS batchRelId, b.shiftName, b.startTime AS batchStartTime, b.endTime AS batchEndTime
       FROM Student s
       LEFT JOIN \`Class\` c ON s.classId = c.id
       LEFT JOIN Batch b ON s.batchId = b.id
       WHERE s.id = ? LIMIT 1`,
      [req.params.studentId]
    );

    if (!student || student.schoolId !== teacher.schoolId) return res.status(404).json({ error: 'Student not found' });

    res.json({
      ...student,
      allergies: parseJ(student.allergies) || [],
      medicalProfile: parseJ(student.medicalProfile) || null,
      class: student.classRelId ? { id: student.classRelId, name: student.className, section: student.section } : null,
      batch: student.batchRelId ? { id: student.batchRelId, shiftName: student.shiftName, startTime: student.batchStartTime, endTime: student.batchEndTime } : null,
    });
  } catch (err) {
    console.error('Teacher medical student error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/attendance/mark', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { batchId, date, records } = req.body;
    if (!batchId || !Array.isArray(records) || records.length === 0) return res.status(400).json({ error: 'batchId and non-empty records are required' });

    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

    const results = [];
    for (const rec of records) {
      if (!rec.studentId || !rec.status) continue;
      const existing = await queryOne('SELECT * FROM Attendance WHERE studentId = ? AND batchId = ? AND date >= ? AND date < ? LIMIT 1', [rec.studentId, batchId, dayStart, dayEnd]);
      if (existing) {
        await query('UPDATE Attendance SET status = ?, checkInTime = ?, checkOutTime = ?, notes = ?, updatedAt = NOW() WHERE id = ?',
          [rec.status, rec.checkInTime ? new Date(rec.checkInTime) : existing.checkInTime, rec.checkOutTime ? new Date(rec.checkOutTime) : existing.checkOutTime, rec.notes !== undefined ? rec.notes : existing.notes, existing.id]);
        results.push(await queryOne('SELECT * FROM Attendance WHERE id = ?', [existing.id]));
      } else {
        const id = newId();
        await query('INSERT INTO Attendance (id, studentId, batchId, date, status, checkInTime, checkOutTime, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
          [id, rec.studentId, batchId, dayStart, rec.status, rec.checkInTime ? new Date(rec.checkInTime) : null, rec.checkOutTime ? new Date(rec.checkOutTime) : null, rec.notes || null]);
        results.push(await queryOne('SELECT * FROM Attendance WHERE id = ?', [id]));
      }
    }
    res.json({ message: 'Attendance saved', count: results.length, records: results });
  } catch (err) {
    console.error('Teacher attendance mark error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== Mongoose Routes (kept as-is) =====

router.post('/activity', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, classId, activityType, ...activityData } = req.body;
    const activity = new ActivityLog({ studentId, classId, teacherId: req.userId, activityType, date: new Date(), ...activityData });
    await activity.save();
    res.status(201).json({ message: 'Activity logged', activity });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/student/:studentId/activities', auth, async (req, res) => {
  try {
    const activities = await ActivityLog.find({ studentId: req.params.studentId }).sort({ date: -1 }).populate('teacherId', 'firstName lastName');
    res.json(activities);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/attendance', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, classId, status, date } = req.body;
    const attendance = new Attendance({ studentId, classId, status, date: date || new Date(), checkInTime: new Date() });
    await attendance.save();
    res.status(201).json({ message: 'Attendance marked', attendance });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/attendance/bulk', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { classId, attendanceData } = req.body;
    const results = await Promise.all(attendanceData.map((record) => Attendance.create({ studentId: record.studentId, classId, status: record.status, date: new Date() })));
    res.status(201).json({ message: 'Attendance marked for class', count: results.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/message', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { recipientId, studentId, message, mediaUrl } = req.body;
    const msg = new Message({ senderId: req.userId, recipientId, studentId, message, mediaUrl });
    await msg.save();
    res.status(201).json({ message: 'Message sent', data: msg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/class/:classId', auth, authorize(['teacher']), async (req, res) => {
  try {
    const classObj = await Class.findById(req.params.classId).populate('students').populate('teachers', 'firstName lastName');
    if (!classObj) return res.status(404).json({ error: 'Class not found' });
    res.json(classObj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== Milestones =====

router.get('/milestones/batch/:batchId', auth, authorize(['teacher']), async (req, res) => {
  try {
    const where = ['batchId = ?'];
    const vals = [req.params.batchId];
    if (req.query.studentId) { where.push('studentId = ?'); vals.push(req.query.studentId); }
    const milestones = await query(`SELECT * FROM Milestone WHERE ${where.join(' AND ')} ORDER BY createdAt DESC`, vals);
    const studentIds = [...new Set(milestones.map(m => m.studentId))];
    const students = studentIds.length ? await query(`SELECT id, firstName, lastName FROM Student WHERE id IN (${studentIds.map(() => '?').join(',')})`, studentIds) : [];
    const sMap = Object.fromEntries(students.map(s => [s.id, `${s.firstName} ${s.lastName}`]));
    res.json(milestones.map(m => ({ ...m, studentName: sMap[m.studentId] || 'Unknown' })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/milestone', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, batchId, domain, milestone, description, isAchieved, notes } = req.body;
    if (!studentId || !batchId || !domain || !milestone) return res.status(400).json({ error: 'studentId, batchId, domain and milestone are required' });
    const now = new Date();
    const id = newId();
    await query('INSERT INTO Milestone (id, studentId, batchId, teacherId, domain, milestone, description, isAchieved, achievedDate, month, year, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [id, studentId, batchId, req.userId, domain, milestone, description || null, isAchieved ? 1 : 0, isAchieved ? now : null, now.getMonth() + 1, now.getFullYear(), notes || null]);
    const record = await queryOne('SELECT * FROM Milestone WHERE id = ?', [id]);
    res.status(201).json({ message: 'Milestone recorded', milestone: record });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/milestone/:id', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { isAchieved, notes, description } = req.body;
    const sets = [], vals = [];
    if (isAchieved !== undefined) { sets.push('isAchieved = ?', 'achievedDate = ?'); vals.push(isAchieved ? 1 : 0, isAchieved ? new Date() : null); }
    if (notes !== undefined)       { sets.push('notes = ?');       vals.push(notes); }
    if (description !== undefined) { sets.push('description = ?'); vals.push(description); }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
    sets.push('updatedAt = NOW()');
    vals.push(req.params.id);
    await query(`UPDATE Milestone SET ${sets.join(', ')} WHERE id = ?`, vals);
    const updated = await queryOne('SELECT * FROM Milestone WHERE id = ?', [req.params.id]);
    res.json({ message: 'Milestone updated', milestone: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/milestone/:id', auth, authorize(['teacher']), async (req, res) => {
  try {
    await query('DELETE FROM Milestone WHERE id = ?', [req.params.id]);
    res.json({ message: 'Milestone deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== Incidents =====

router.get('/incidents/batch/:batchId', auth, authorize(['teacher']), async (req, res) => {
  try {
    const where = ['batchId = ?'];
    const vals = [req.params.batchId];
    if (req.query.studentId) { where.push('studentId = ?'); vals.push(req.query.studentId); }
    const incidents = await query(`SELECT * FROM IncidentReport WHERE ${where.join(' AND ')} ORDER BY incidentTime DESC`, vals);
    const studentIds = [...new Set(incidents.map(i => i.studentId))];
    const students = studentIds.length ? await query(`SELECT id, firstName, lastName FROM Student WHERE id IN (${studentIds.map(() => '?').join(',')})`, studentIds) : [];
    const sMap = Object.fromEntries(students.map(s => [s.id, `${s.firstName} ${s.lastName}`]));
    res.json(incidents.map(i => ({ ...i, studentName: sMap[i.studentId] || 'Unknown' })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/incident', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, batchId, incidentType, description, severity, actionTaken, incidentTime } = req.body;
    if (!studentId || !batchId || !incidentType || !description) return res.status(400).json({ error: 'studentId, batchId, incidentType and description are required' });
    const id = newId();
    await query('INSERT INTO IncidentReport (id, studentId, batchId, teacherId, incidentType, description, severity, actionTaken, parentNotified, incidentTime, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NOW())',
      [id, studentId, batchId, req.userId, incidentType, description, severity || 'minor', actionTaken || null, incidentTime ? new Date(incidentTime) : new Date()]);
    const incident = await queryOne('SELECT * FROM IncidentReport WHERE id = ?', [id]);
    res.status(201).json({ message: 'Incident report created', incident });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/incident/:id', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { actionTaken, followUpRequired, followUpNotes, parentNotified } = req.body;
    const sets = [], vals = [];
    if (actionTaken !== undefined)     { sets.push('actionTaken = ?');    vals.push(actionTaken); }
    if (followUpRequired !== undefined){ sets.push('followUpRequired = ?'); vals.push(followUpRequired ? 1 : 0); }
    if (followUpNotes !== undefined)   { sets.push('followUpNotes = ?');   vals.push(followUpNotes); }
    if (parentNotified !== undefined)  { sets.push('parentNotified = ?', 'parentNotificationTime = ?'); vals.push(parentNotified ? 1 : 0, parentNotified ? new Date() : null); }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
    sets.push('updatedAt = NOW()');
    vals.push(req.params.id);
    await query(`UPDATE IncidentReport SET ${sets.join(', ')} WHERE id = ?`, vals);
    const updated = await queryOne('SELECT * FROM IncidentReport WHERE id = ?', [req.params.id]);
    res.json({ message: 'Incident updated', incident: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/incident/:id', auth, authorize(['teacher']), async (req, res) => {
  try {
    await query('DELETE FROM IncidentReport WHERE id = ?', [req.params.id]);
    res.json({ message: 'Incident deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== PTM Routes (Teacher) =====

router.get('/ptm/sessions', auth, authorize(['teacher']), async (req, res) => {
  try {
    const sessions = await query('SELECT * FROM PTMSession WHERE teacherId = ? ORDER BY sessionDate DESC', [req.userId]);
    const sessionIds = sessions.map(s => s.id);
    const slots = sessionIds.length ? await query(`SELECT * FROM PTMSlot WHERE sessionId IN (${sessionIds.map(() => '?').join(',')})`, sessionIds) : [];

    const studentIds = [...new Set(slots.map(sl => sl.studentId).filter(Boolean))];
    const students = studentIds.length ? await query(`SELECT id, firstName, lastName FROM Student WHERE id IN (${studentIds.map(() => '?').join(',')})`, studentIds) : [];
    const sMap = Object.fromEntries(students.map(s => [s.id, `${s.firstName} ${s.lastName}`.trim()]));

    const slotMap = {};
    slots.forEach(sl => { (slotMap[sl.sessionId] = slotMap[sl.sessionId] || []).push({ ...sl, studentName: sMap[sl.studentId] || 'Unknown Student' }); });

    res.json(sessions.map(s => ({ ...s, slots: slotMap[s.id] || [] })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ptm/session', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { batchId, sessionDate, startTime, location, notes, studentIds } = req.body;
    if (!batchId || !sessionDate || !startTime || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'batchId, sessionDate, startTime and studentIds are required' });
    }

    const teacher = await queryOne('SELECT schoolId FROM `User` WHERE id = ? LIMIT 1', [req.userId]);
    if (!teacher?.schoolId) return res.status(400).json({ error: 'Teacher not linked to a school' });

    const parseTime = (t) => { const [time, period] = t.trim().split(' '); let [h, m] = time.split(':').map(Number); if (period === 'PM' && h !== 12) h += 12; if (period === 'AM' && h === 12) h = 0; return h * 60 + m; };
    const formatTime = (mins) => { const h24 = Math.floor(mins / 60) % 24; const m = mins % 60; const period = h24 >= 12 ? 'PM' : 'AM'; const h12 = h24 % 12 || 12; return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${period}`; };

    const sessionId = newId();
    await query('INSERT INTO PTMSession (id, teacherId, batchId, schoolId, sessionDate, location, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [sessionId, req.userId, batchId, teacher.schoolId, new Date(sessionDate), location || null, notes || null]);

    let cursor = parseTime(startTime);
    const slotIds = [];
    for (const studentId of studentIds) {
      const slotId = newId();
      await query('INSERT INTO PTMSlot (id, sessionId, studentId, startTime, endTime, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [slotId, sessionId, studentId, formatTime(cursor), formatTime(cursor + 15), 'scheduled']);
      slotIds.push(slotId);
      cursor += 15;
    }

    const session = await queryOne('SELECT * FROM PTMSession WHERE id = ?', [sessionId]);
    const slots = slotIds.length ? await query(`SELECT * FROM PTMSlot WHERE id IN (${slotIds.map(() => '?').join(',')})`, slotIds) : [];
    res.status(201).json({ ...session, slots });
  } catch (err) {
    console.error('PTM session create error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/ptm/slot/:slotId', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { status, teacherNotes } = req.body;
    const sets = [], vals = [];
    if (status !== undefined)       { sets.push('status = ?');       vals.push(status); }
    if (teacherNotes !== undefined) { sets.push('teacherNotes = ?'); vals.push(teacherNotes); }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
    sets.push('updatedAt = NOW()');
    vals.push(req.params.slotId);
    await query(`UPDATE PTMSlot SET ${sets.join(', ')} WHERE id = ?`, vals);
    const slot = await queryOne('SELECT * FROM PTMSlot WHERE id = ?', [req.params.slotId]);
    res.json(slot);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/ptm/session/:sessionId', auth, authorize(['teacher']), async (req, res) => {
  try {
    await query('DELETE FROM PTMSlot WHERE sessionId = ?', [req.params.sessionId]);
    await query('DELETE FROM PTMSession WHERE id = ? AND teacherId = ?', [req.params.sessionId, req.userId]);
    res.json({ message: 'Session deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
