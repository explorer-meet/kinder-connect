const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const { query, queryOne, newId, parseJ, toJ } = require('../src/lib/db');

const router = express.Router();

const fmt = (s) => {
  if (!s) return s;
  return {
    ...s,
    parentIds: parseJ(s.parentIds) || [],
    allergies: parseJ(s.allergies) || [],
    authorizedPickup: parseJ(s.authorizedPickup) || [],
    medicalProfile: parseJ(s.medicalProfile),
    documents: parseJ(s.documents) || [],
  };
};

router.post('/', auth, authorize(['admin']), async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, enrollmentNumber, classId, schoolId, parentIds, allergies, medicalNotes, authorizedPickup } = req.body;
    if (!firstName || !lastName || !classId || !schoolId) return res.status(400).json({ error: 'Missing required fields' });
    const cls = await queryOne('SELECT id FROM `Class` WHERE id = ? LIMIT 1', [classId]);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    const id = newId();
    await query(
      'INSERT INTO Student (id, firstName, lastName, dateOfBirth, enrollmentNumber, classId, schoolId, parentIds, allergies, medicalNotes, authorizedPickup, medicalProfile, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, NOW(), NOW())',
      [id, firstName, lastName, dateOfBirth ? new Date(dateOfBirth) : null, enrollmentNumber || `STU-${Date.now()}`, classId, schoolId, toJ(parentIds), toJ(allergies), medicalNotes || null, toJ(authorizedPickup)]
    );
    const student = await queryOne('SELECT * FROM Student WHERE id = ?', [id]);
    res.status(201).json({ message: 'Student created successfully', student: fmt(student) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/parent/my-children', auth, authorize(['parent']), async (req, res) => {
  try {
    const students = await query("SELECT s.*, c.name AS className, c.section, sc.name AS schoolName FROM Student s LEFT JOIN `Class` c ON s.classId = c.id LEFT JOIN School sc ON s.schoolId = sc.id WHERE JSON_CONTAINS(s.parentIds, JSON_QUOTE(?))", [req.userId]);
    res.json(students.map(fmt));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/parent/child/:studentId/attendance', auth, authorize(['parent']), async (req, res) => {
  try {
    const student = await queryOne('SELECT id, firstName, lastName, parentIds, batchId, classId FROM Student WHERE id = ? LIMIT 1', [req.params.studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const parentIds = parseJ(student.parentIds) || [];
    if (!parentIds.includes(req.userId)) return res.status(403).json({ error: 'Not authorized' });
    const attendance = await query('SELECT id, date, status, checkInTime, checkOutTime, pickedUpBy, notes FROM Attendance WHERE studentId = ? ORDER BY date DESC LIMIT 120', [req.params.studentId]);
    res.json({ student: fmt(student), attendance });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/parent/child/:studentId/medical-profile', auth, authorize(['parent']), async (req, res) => {
  try {
    const student = await queryOne('SELECT id, firstName, lastName, parentIds, allergies, medicalNotes, medicalProfile FROM Student WHERE id = ? LIMIT 1', [req.params.studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const parentIds = parseJ(student.parentIds) || [];
    if (!parentIds.includes(req.userId)) return res.status(403).json({ error: 'Not authorized' });
    res.json({ student: fmt(student), medicalProfile: parseJ(student.medicalProfile) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/parent/child/:studentId/medical-profile', auth, authorize(['parent']), async (req, res) => {
  try {
    const { medicalProfile, allergies, medicalNotes } = req.body;
    const student = await queryOne('SELECT id, parentIds FROM Student WHERE id = ? LIMIT 1', [req.params.studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const parentIds = parseJ(student.parentIds) || [];
    if (!parentIds.includes(req.userId)) return res.status(403).json({ error: 'Not authorized' });
    await query('UPDATE Student SET medicalProfile = ?, allergies = ?, medicalNotes = ?, updatedAt = NOW() WHERE id = ?',
      [toJ(medicalProfile), toJ(allergies), medicalNotes || null, req.params.studentId]);
    const updated = await queryOne('SELECT * FROM Student WHERE id = ?', [req.params.studentId]);
    res.json({ message: 'Medical profile updated successfully', student: fmt(updated) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/school/:schoolId', auth, authorize(['admin']), async (req, res) => {
  try {
    const students = await query('SELECT * FROM Student WHERE schoolId = ?', [req.params.schoolId]);
    res.json(students.map(fmt));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:studentId', auth, async (req, res) => {
  try {
    const student = await queryOne(
      'SELECT s.*, c.name AS className, c.section, sc.name AS schoolName, sc.city AS schoolCity, b.shiftName, b.startTime AS batchStartTime, b.endTime AS batchEndTime FROM Student s LEFT JOIN `Class` c ON s.classId = c.id LEFT JOIN School sc ON s.schoolId = sc.id LEFT JOIN Batch b ON s.batchId = b.id WHERE s.id = ? LIMIT 1',
      [req.params.studentId]
    );
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const parentIds = parseJ(student.parentIds) || [];
    if (req.userRole !== 'admin' && req.userRole !== 'school_admin' && !parentIds.includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    res.json(fmt(student));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:studentId', auth, async (req, res) => {
  try {
    const { allergies, medicalNotes, authorizedPickup, medicalProfile } = req.body;
    const student = await queryOne('SELECT id, parentIds FROM Student WHERE id = ? LIMIT 1', [req.params.studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (req.userRole !== 'admin' && !(parseJ(student.parentIds) || []).includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await query('UPDATE Student SET allergies = ?, medicalNotes = ?, authorizedPickup = ?, medicalProfile = ?, updatedAt = NOW() WHERE id = ?',
      [toJ(allergies), medicalNotes || null, toJ(authorizedPickup), toJ(medicalProfile), req.params.studentId]);
    const updated = await queryOne('SELECT * FROM Student WHERE id = ?', [req.params.studentId]);
    res.json({ message: 'Student updated', student: fmt(updated) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
