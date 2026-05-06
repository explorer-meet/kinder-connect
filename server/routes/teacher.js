const express = require('express');
const bcrypt = require('bcryptjs');
const { auth, authorize } = require('../middleware/auth');
const { pool, query, queryOne, newId, parseJ, toJ } = require('../src/lib/db');
const { notifyParentsForActivity } = require('../src/lib/push');

const router = express.Router();

const escalationBySeverity = (severity) => {
  if (severity === 'severe') return 'high';
  if (severity === 'moderate') return 'medium';
  return 'none';
};

// ===== Teacher Profile =====

router.get('/profile', auth, authorize(['teacher']), async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, firstName, lastName, email, phone, photo, address, qualification, dateOfJoining, emergencyContactName, emergencyContactPhone, createdAt FROM `user` WHERE id = ? LIMIT 1',
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
      const existing = await queryOne('SELECT password FROM `user` WHERE id = ? LIMIT 1', [req.userId]);
      const match = await bcrypt.compare(currentPassword, existing.password);
      if (!match) return res.status(400).json({ error: 'Current password is incorrect' });
      sets.push('password = ?');
      vals.push(await bcrypt.hash(newPassword, 10));
    }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
    sets.push('updatedAt = NOW()');
    vals.push(req.userId);

    await query(`UPDATE \`user\` SET ${sets.join(', ')} WHERE id = ?`, vals);
    const user = await queryOne(
      'SELECT id, firstName, lastName, email, phone, photo, address, qualification, dateOfJoining, emergencyContactName, emergencyContactPhone FROM `user` WHERE id = ? LIMIT 1',
      [req.userId]
    );
    res.json({ message: 'Profile updated', user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== Attendance APIs =====

router.get('/attendance/data', auth, authorize(['teacher']), async (req, res) => {
  try {
    const user = await queryOne('SELECT schoolId FROM `user` WHERE id = ? LIMIT 1', [req.userId]);
    if (!user?.schoolId) return res.status(400).json({ error: 'Teacher is not assigned to a school' });

    const school = await queryOne('SELECT * FROM school WHERE id = ? LIMIT 1', [user.schoolId]);
    if (!school) return res.status(404).json({ error: 'School not found' });

    const classes = await query('SELECT * FROM `class` WHERE schoolId = ? ORDER BY name ASC', [user.schoolId]);
    const batches = classes.length
      ? await query(`SELECT id, shiftName, startTime, endTime, capacity, classId FROM batch WHERE classId IN (${classes.map(() => '?').join(',')}) `, classes.map(c => c.id))
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

    const batch = await queryOne('SELECT b.*, c.id AS classRelId, c.name AS className, c.section FROM batch b LEFT JOIN `class` c ON b.classId = c.id WHERE b.id = ? LIMIT 1', [batchId]);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const students = await query('SELECT id, firstName, lastName, enrollmentNumber, isActive FROM student WHERE batchId = ? ORDER BY firstName ASC, lastName ASC', [batchId]);
    batch.class = batch.classRelId ? { id: batch.classRelId, name: batch.className, section: batch.section } : null;
    batch.students = students;

    const attendance = await query(
      'SELECT id, studentId, status, checkInTime, checkOutTime, notes FROM attendance WHERE batchId = ? AND date >= ? AND date < ?',
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
    const teacher = await queryOne('SELECT schoolId FROM `user` WHERE id = ? LIMIT 1', [req.userId]);
    if (!teacher?.schoolId) return res.status(400).json({ error: 'Teacher is not assigned to a school' });

    const batch = await queryOne('SELECT b.*, c.id AS classRelId, c.name AS className, c.section FROM batch b LEFT JOIN `class` c ON b.classId = c.id WHERE b.id = ? LIMIT 1', [req.params.batchId]);
    if (!batch || batch.schoolId !== teacher.schoolId) return res.status(404).json({ error: 'Batch not found' });

    const students = await query(
      'SELECT id, firstName, lastName, enrollmentNumber, dateOfBirth, isActive, medicalProfile, allergies FROM student WHERE batchId = ? ORDER BY firstName ASC, lastName ASC',
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
    const teacher = await queryOne('SELECT schoolId FROM `user` WHERE id = ? LIMIT 1', [req.userId]);
    if (!teacher?.schoolId) return res.status(400).json({ error: 'Teacher is not assigned to a school' });

    const student = await queryOne(
      `SELECT s.id, s.firstName, s.lastName, s.enrollmentNumber, s.dateOfBirth, s.schoolId, s.allergies, s.medicalNotes, s.medicalProfile,
       c.id AS classRelId, c.name AS className, c.section, b.id AS batchRelId, b.shiftName, b.startTime AS batchStartTime, b.endTime AS batchEndTime
       FROM student s
       LEFT JOIN \`class\` c ON s.classId = c.id
       LEFT JOIN batch b ON s.batchId = b.id
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
      const existing = await queryOne('SELECT * FROM attendance WHERE studentId = ? AND batchId = ? AND date >= ? AND date < ? LIMIT 1', [rec.studentId, batchId, dayStart, dayEnd]);
      if (existing) {
        await query('UPDATE attendance SET status = ?, checkInTime = ?, checkOutTime = ?, notes = ?, updatedAt = NOW() WHERE id = ?',
          [rec.status, rec.checkInTime ? new Date(rec.checkInTime) : existing.checkInTime, rec.checkOutTime ? new Date(rec.checkOutTime) : existing.checkOutTime, rec.notes !== undefined ? rec.notes : existing.notes, existing.id]);
        results.push(await queryOne('SELECT * FROM attendance WHERE id = ?', [existing.id]));
      } else {
        const id = newId();
        await query('INSERT INTO attendance (id, studentId, batchId, date, status, checkInTime, checkOutTime, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
          [id, rec.studentId, batchId, dayStart, rec.status, rec.checkInTime ? new Date(rec.checkInTime) : null, rec.checkOutTime ? new Date(rec.checkOutTime) : null, rec.notes || null]);
        results.push(await queryOne('SELECT * FROM attendance WHERE id = ?', [id]));
      }
    }
    res.json({ message: 'Attendance saved', count: results.length, records: results });
  } catch (err) {
    console.error('Teacher attendance mark error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/activity', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, batchId, activityType, napStartTime, napEndTime, napDuration, mealType, foodItems, intakeLevel, pottyType, time, notes, moodAtArrival, moodAtDeparture, moodNotes, mediaUrl, mediaType, caption, milestoneAchieved, domain, description } = req.body;
    if (!batchId || !activityType) return res.status(400).json({ error: 'batchId and activityType are required' });
    const id = newId();
    await query(
      `INSERT INTO activitylog (id, studentId, batchId, teacherId, activityType, napStartTime, napEndTime, napDuration, mealType, foodItems, intakeLevel, pottyType, time, notes, moodAtArrival, moodAtDeparture, moodNotes, mediaUrl, mediaType, caption, milestoneAchieved, domain, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, studentId || null, batchId, req.userId, activityType, napStartTime ? new Date(napStartTime) : null, napEndTime ? new Date(napEndTime) : null, napDuration ? parseInt(napDuration) : null, mealType || null, foodItems ? JSON.stringify(Array.isArray(foodItems) ? foodItems : [foodItems]) : null, intakeLevel || null, pottyType || null, time ? new Date(time) : null, notes || null, moodAtArrival || null, moodAtDeparture || null, moodNotes || null, mediaUrl || null, mediaType || null, caption || null, milestoneAchieved || null, domain || null, description || null]
    );
    const activity = await queryOne('SELECT * FROM activitylog WHERE id = ?', [id]);

    await notifyParentsForActivity(activity).catch((notifyErr) => {
      console.error('Push notification send failed for activity:', id, notifyErr.message);
    });

    res.status(201).json({ message: 'Activity logged', activity });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/student/:studentId/activities', auth, async (req, res) => {
  try {
    const activities = await query('SELECT a.*, u.firstName AS teacherFirstName, u.lastName AS teacherLastName FROM activitylog a LEFT JOIN `user` u ON a.teacherId = u.id WHERE a.studentId = ? ORDER BY a.createdAt DESC LIMIT 100', [req.params.studentId]);
    res.json(activities.map(a => ({ ...a, teacher: a.teacherFirstName ? { firstName: a.teacherFirstName, lastName: a.teacherLastName } : null })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/attendance', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, batchId, status, date } = req.body;
    if (!studentId || !status) return res.status(400).json({ error: 'studentId and status are required' });
    const id = newId();
    const d = date ? new Date(date) : new Date(); d.setHours(0, 0, 0, 0);
    await query('INSERT INTO attendance (id, studentId, batchId, date, status, checkInTime, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())',
      [id, studentId, batchId || null, d, status]);
    const attendance = await queryOne('SELECT * FROM attendance WHERE id = ?', [id]);
    res.status(201).json({ message: 'Attendance marked', attendance });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/attendance/bulk', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { batchId, attendanceData } = req.body;
    if (!Array.isArray(attendanceData) || !attendanceData.length) return res.status(400).json({ error: 'attendanceData array is required' });
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const results = [];
    for (const record of attendanceData) {
      const id = newId();
      await query('INSERT INTO attendance (id, studentId, batchId, date, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [id, record.studentId, batchId || null, d, record.status]);
      results.push(id);
    }
    res.status(201).json({ message: 'Attendance marked for class', count: results.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/message', auth, authorize(['teacher']), async (req, res) => {
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

router.get('/class/:classId', auth, authorize(['teacher']), async (req, res) => {
  try {
    const classObj = await queryOne('SELECT * FROM `class` WHERE id = ? LIMIT 1', [req.params.classId]);
    if (!classObj) return res.status(404).json({ error: 'Class not found' });
    const students = await query('SELECT * FROM student WHERE classId = ? ORDER BY firstName ASC', [req.params.classId]);
    res.json({ ...classObj, students });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== Milestones =====

router.get('/milestones/batch/:batchId', auth, authorize(['teacher']), async (req, res) => {
  try {
    const where = ['batchId = ?'];
    const vals = [req.params.batchId];
    if (req.query.studentId) { where.push('studentId = ?'); vals.push(req.query.studentId); }
    const milestones = await query(`SELECT * FROM milestone WHERE ${where.join(' AND ')} ORDER BY createdAt DESC`, vals);
    const studentIds = [...new Set(milestones.map(m => m.studentId))];
    const students = studentIds.length ? await query(`SELECT id, firstName, lastName FROM student WHERE id IN (${studentIds.map(() => '?').join(',')})`, studentIds) : [];
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
    await query('INSERT INTO milestone (id, studentId, batchId, teacherId, domain, milestone, description, isAchieved, achievedDate, month, year, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [id, studentId, batchId, req.userId, domain, milestone, description || null, isAchieved ? 1 : 0, isAchieved ? now : null, now.getMonth() + 1, now.getFullYear(), notes || null]);
    const record = await queryOne('SELECT * FROM milestone WHERE id = ?', [id]);
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
    await query(`UPDATE milestone SET ${sets.join(', ')} WHERE id = ?`, vals);
    const updated = await queryOne('SELECT * FROM milestone WHERE id = ?', [req.params.id]);
    res.json({ message: 'Milestone updated', milestone: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/milestone/:id', auth, authorize(['teacher']), async (req, res) => {
  try {
    await query('DELETE FROM milestone WHERE id = ?', [req.params.id]);
    res.json({ message: 'Milestone deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== Incidents =====

router.get('/incidents/batch/:batchId', auth, authorize(['teacher']), async (req, res) => {
  try {
    const where = ['batchId = ?'];
    const vals = [req.params.batchId];
    if (req.query.studentId) { where.push('studentId = ?'); vals.push(req.query.studentId); }
    const incidents = await query(`SELECT * FROM incidentreport WHERE ${where.join(' AND ')} ORDER BY incidentTime DESC`, vals);
    const studentIds = [...new Set(incidents.map(i => i.studentId))];
    const students = studentIds.length ? await query(`SELECT id, firstName, lastName FROM student WHERE id IN (${studentIds.map(() => '?').join(',')})`, studentIds) : [];
    const sMap = Object.fromEntries(students.map(s => [s.id, `${s.firstName} ${s.lastName}`]));
    res.json(incidents.map(i => ({ ...i, studentName: sMap[i.studentId] || 'Unknown' })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/incident', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, batchId, incidentType, description, severity, actionTaken, incidentTime } = req.body;
    if (!studentId || !batchId || !incidentType || !description) return res.status(400).json({ error: 'studentId, batchId, incidentType and description are required' });
    const id = newId();
    const normalizedSeverity = severity || 'minor';
    const escalationLevel = escalationBySeverity(normalizedSeverity);
    const escalationStatus = escalationLevel === 'none' ? 'open' : 'in_progress';
    await query(
      'INSERT INTO incidentreport (id, studentId, batchId, teacherId, incidentType, description, severity, actionTaken, parentNotified, incidentTime, escalationLevel, escalationStatus, escalatedAt, escalatedById, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, NOW(), NOW())',
      [id, studentId, batchId, req.userId, incidentType, description, normalizedSeverity, actionTaken || null, incidentTime ? new Date(incidentTime) : new Date(), escalationLevel, escalationStatus, escalationLevel === 'none' ? null : new Date(), escalationLevel === 'none' ? null : req.userId]
    );
    const incident = await queryOne('SELECT * FROM incidentreport WHERE id = ?', [id]);
    res.status(201).json({ message: 'Incident report created', incident });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/incident/:id', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { actionTaken, followUpRequired, followUpNotes, parentNotified, escalationLevel, escalationStatus, escalationNotes, resolutionSummary } = req.body;
    const sets = [], vals = [];
    if (actionTaken !== undefined)     { sets.push('actionTaken = ?');    vals.push(actionTaken); }
    if (followUpRequired !== undefined){ sets.push('followUpRequired = ?'); vals.push(followUpRequired ? 1 : 0); }
    if (followUpNotes !== undefined)   { sets.push('followUpNotes = ?');   vals.push(followUpNotes); }
    if (parentNotified !== undefined)  { sets.push('parentNotified = ?', 'parentNotificationTime = ?'); vals.push(parentNotified ? 1 : 0, parentNotified ? new Date() : null); }
    if (escalationLevel !== undefined) {
      sets.push('escalationLevel = ?', 'escalationStatus = ?', 'escalatedAt = ?', 'escalatedById = ?');
      vals.push(escalationLevel, escalationLevel === 'none' ? 'open' : 'in_progress', escalationLevel === 'none' ? null : new Date(), escalationLevel === 'none' ? null : req.userId);
    }
    if (escalationStatus !== undefined) {
      sets.push('escalationStatus = ?');
      vals.push(escalationStatus);
      if (escalationStatus === 'resolved') {
        sets.push('resolvedAt = ?');
        vals.push(new Date());
      }
    }
    if (escalationNotes !== undefined)  { sets.push('escalationNotes = ?'); vals.push(escalationNotes); }
    if (resolutionSummary !== undefined){ sets.push('resolutionSummary = ?'); vals.push(resolutionSummary); }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
    sets.push('updatedAt = NOW()');
    vals.push(req.params.id);
    await query(`UPDATE incidentreport SET ${sets.join(', ')} WHERE id = ?`, vals);
    const updated = await queryOne('SELECT * FROM incidentreport WHERE id = ?', [req.params.id]);
    res.json({ message: 'Incident updated', incident: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/incident/:id/escalate', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { escalationLevel, escalationNotes } = req.body;
    const level = escalationLevel || 'high';
    await query(
      'UPDATE incidentreport SET escalationLevel = ?, escalationStatus = ?, escalationNotes = ?, escalatedAt = NOW(), escalatedById = ?, updatedAt = NOW() WHERE id = ?',
      [level, 'in_progress', escalationNotes || null, req.userId, req.params.id]
    );
    const incident = await queryOne('SELECT * FROM incidentreport WHERE id = ? LIMIT 1', [req.params.id]);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json({ message: 'Incident escalated', incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/incident/:id', auth, authorize(['teacher']), async (req, res) => {
  try {
    await query('DELETE FROM incidentreport WHERE id = ?', [req.params.id]);
    res.json({ message: 'Incident deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== PTM Routes (Teacher) =====

router.get('/ptm/sessions', auth, authorize(['teacher']), async (req, res) => {
  try {
    const sessions = await query('SELECT * FROM ptmsession WHERE teacherId = ? ORDER BY sessionDate DESC', [req.userId]);
    const sessionIds = sessions.map(s => s.id);
    const slots = sessionIds.length ? await query(`SELECT * FROM ptmslot WHERE sessionId IN (${sessionIds.map(() => '?').join(',')})`, sessionIds) : [];

    const studentIds = [...new Set(slots.map(sl => sl.studentId).filter(Boolean))];
    const students = studentIds.length ? await query(`SELECT id, firstName, lastName FROM student WHERE id IN (${studentIds.map(() => '?').join(',')})`, studentIds) : [];
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

    const teacher = await queryOne('SELECT schoolId FROM `user` WHERE id = ? LIMIT 1', [req.userId]);
    if (!teacher?.schoolId) return res.status(400).json({ error: 'Teacher not linked to a school' });

    const parseTime = (t) => { const [time, period] = t.trim().split(' '); let [h, m] = time.split(':').map(Number); if (period === 'PM' && h !== 12) h += 12; if (period === 'AM' && h === 12) h = 0; return h * 60 + m; };
    const formatTime = (mins) => { const h24 = Math.floor(mins / 60) % 24; const m = mins % 60; const period = h24 >= 12 ? 'PM' : 'AM'; const h12 = h24 % 12 || 12; return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${period}`; };

    const sessionId = newId();
    await query('INSERT INTO ptmsession (id, teacherId, batchId, schoolId, sessionDate, location, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [sessionId, req.userId, batchId, teacher.schoolId, new Date(sessionDate), location || null, notes || null]);

    let cursor = parseTime(startTime);
    const slotIds = [];
    for (const studentId of studentIds) {
      const slotId = newId();
      await query('INSERT INTO ptmslot (id, sessionId, studentId, startTime, endTime, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [slotId, sessionId, studentId, formatTime(cursor), formatTime(cursor + 15), 'scheduled']);
      slotIds.push(slotId);
      cursor += 15;
    }

    const session = await queryOne('SELECT * FROM ptmsession WHERE id = ?', [sessionId]);
    const slots = slotIds.length ? await query(`SELECT * FROM ptmslot WHERE id IN (${slotIds.map(() => '?').join(',')})`, slotIds) : [];
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
    await query(`UPDATE ptmslot SET ${sets.join(', ')} WHERE id = ?`, vals);
    const slot = await queryOne('SELECT * FROM ptmslot WHERE id = ?', [req.params.slotId]);
    res.json(slot);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/ptm/session/:sessionId', auth, authorize(['teacher']), async (req, res) => {
  try {
    await query('DELETE FROM ptmslot WHERE sessionId = ?', [req.params.sessionId]);
    await query('DELETE FROM ptmsession WHERE id = ? AND teacherId = ?', [req.params.sessionId, req.userId]);
    res.json({ message: 'Session deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
