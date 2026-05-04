const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const { query, queryOne } = require('../src/lib/db');

const router = express.Router();

router.get('/schools', auth, authorize(['admin']), async (req, res) => {
  try {
    const schools = await query('SELECT * FROM school');
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
      'INSERT INTO school (id, name, address, city, phone, email, logo, createdBy, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
      [id, name, address || '', city || '', phone || '', email || '', logo || '', req.userId]
    );
    const school = await queryOne('SELECT * FROM school WHERE id = ?', [id]);
    res.status(201).json({ message: 'School created', school });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/school/:schoolId', auth, async (req, res) => {
  try {
    const school = await queryOne('SELECT * FROM school WHERE id = ?', [req.params.schoolId]);
    if (!school) return res.status(404).json({ error: 'School not found' });
    res.json(school);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/classes', auth, authorize(['admin']), async (req, res) => {
  try {
    const classes = await query('SELECT c.*, s.name AS schoolName FROM `class` c LEFT JOIN school s ON c.schoolId = s.id');
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
      'INSERT INTO `class` (id, name, section, schoolId, capacity, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [id, name, section || '', schoolId, capacity ? parseInt(capacity) : null]
    );
    const classObj = await queryOne('SELECT * FROM `class` WHERE id = ?', [id]);
    res.status(201).json({ message: 'Class created', class: classObj });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/classes/:schoolId', auth, authorize(['admin']), async (req, res) => {
  try {
    const classes = await query('SELECT * FROM `class` WHERE schoolId = ?', [req.params.schoolId]);
    res.json(classes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/parents', auth, authorize(['admin']), async (req, res) => {
  try {
    const parents = await query("SELECT id, firstName, lastName, email, phone, isActive FROM `user` WHERE role = 'parent'");
    res.json(parents);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/teachers', auth, authorize(['admin']), async (req, res) => {
  try {
    const teachers = await query("SELECT id, firstName, lastName, email, phone, schoolId, isActive FROM `user` WHERE role = 'teacher'");
    res.json(teachers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', auth, authorize(['admin']), async (req, res) => {
  try {
    const [schools, classes, students, teachers, parents] = await Promise.all([
      queryOne('SELECT COUNT(*) AS cnt FROM school'),
      queryOne('SELECT COUNT(*) AS cnt FROM `class`'),
      queryOne('SELECT COUNT(*) AS cnt FROM student'),
      queryOne("SELECT COUNT(*) AS cnt FROM `user` WHERE role = 'teacher'"),
      queryOne("SELECT COUNT(*) AS cnt FROM `user` WHERE role = 'parent'"),
    ]);
    res.json({ totalSchools: schools.cnt, totalClasses: classes.cnt, totalStudents: students.cnt, totalTeachers: teachers.cnt, totalParents: parents.cnt });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
