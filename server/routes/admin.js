const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const { query, queryOne } = require('../src/lib/db');

const router = express.Router();

router.get('/schools', auth, authorize(['admin']), async (req, res) => {
  try {
    const schools = await query('SELECT * FROM School');
    res.json(schools);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/school', auth, authorize(['admin']), async (req, res) => {
  try {
    const { name, address, city, phone, email, logo } = req.body;
    if (!name) return res.status(400).json({ error: 'School name is required' });
    const { newId } = require('../src/lib/db');
    const id = newId();
    await query(
      'INSERT INTO School (id, name, address, city, phone, email, logo, createdBy, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
      [id, name, address || '', city || '', phone || '', email || '', logo || '', req.userId]
    );
    const school = await queryOne('SELECT * FROM School WHERE id = ?', [id]);
    res.status(201).json({ message: 'School created', school });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/school/:schoolId', auth, async (req, res) => {
  try {
    const school = await queryOne('SELECT * FROM School WHERE id = ?', [req.params.schoolId]);
    if (!school) return res.status(404).json({ error: 'School not found' });
    res.json(school);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/classes', auth, authorize(['admin']), async (req, res) => {
  try {
    const classes = await query('SELECT c.*, s.name AS schoolName FROM `Class` c LEFT JOIN School s ON c.schoolId = s.id');
    res.json(classes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/class', auth, authorize(['admin']), async (req, res) => {
  try {
    const { name, section, schoolId, capacity } = req.body;
    if (!name || !schoolId) return res.status(400).json({ error: 'Class name and schoolId are required' });
    const { newId } = require('../src/lib/db');
    const id = newId();
    await query(
      'INSERT INTO `Class` (id, name, section, schoolId, capacity, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [id, name, section || '', schoolId, capacity ? parseInt(capacity) : null]
    );
    const classObj = await queryOne('SELECT * FROM `Class` WHERE id = ?', [id]);
    res.status(201).json({ message: 'Class created', class: classObj });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/classes/:schoolId', auth, authorize(['admin']), async (req, res) => {
  try {
    const classes = await query('SELECT * FROM `Class` WHERE schoolId = ?', [req.params.schoolId]);
    res.json(classes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/parents', auth, authorize(['admin']), async (req, res) => {
  try {
    const parents = await query("SELECT id, firstName, lastName, email, phone, isActive FROM `User` WHERE role = 'parent'");
    res.json(parents);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/teachers', auth, authorize(['admin']), async (req, res) => {
  try {
    const teachers = await query("SELECT id, firstName, lastName, email, phone, schoolId, isActive FROM `User` WHERE role = 'teacher'");
    res.json(teachers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', auth, authorize(['admin']), async (req, res) => {
  try {
    const [schools, classes, students, teachers, parents] = await Promise.all([
      queryOne('SELECT COUNT(*) AS cnt FROM School'),
      queryOne('SELECT COUNT(*) AS cnt FROM `Class`'),
      queryOne('SELECT COUNT(*) AS cnt FROM Student'),
      queryOne("SELECT COUNT(*) AS cnt FROM `User` WHERE role = 'teacher'"),
      queryOne("SELECT COUNT(*) AS cnt FROM `User` WHERE role = 'parent'"),
    ]);
    res.json({ totalSchools: schools.cnt, totalClasses: classes.cnt, totalStudents: students.cnt, totalTeachers: teachers.cnt, totalParents: parents.cnt });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
