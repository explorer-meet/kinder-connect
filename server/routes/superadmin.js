const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const { pool, query, queryOne, newId } = require('../src/lib/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendMailSafe } = require('../src/lib/mailer');

const router = express.Router();

const genTempPassword = (len = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// GET school registration requests
router.get('/school-requests', auth, authorize(['super_admin']), async (req, res) => {
  try {
    const statusFilter = req.query.status;
    const rows = statusFilter
      ? await query('SELECT * FROM schoolregistrationrequest WHERE status = ? ORDER BY createdAt DESC', [statusFilter])
      : await query('SELECT * FROM schoolregistrationrequest ORDER BY createdAt DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Approve school request (with transaction)
router.post('/school-request/:requestId/approve', auth, authorize(['super_admin']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminFirstName, adminLastName, adminEmail, adminPassword, reviewNotes } = req.body;
    if (!adminFirstName || !adminLastName || !adminEmail) return res.status(400).json({ error: 'Admin first name, last name, and email are required' });

    const request = await queryOne('SELECT * FROM schoolregistrationrequest WHERE id = ? LIMIT 1', [requestId]);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Only pending requests can be approved' });

    const normalizedAdminEmail = adminEmail.toLowerCase().trim();
    const existingAdmin = await queryOne('SELECT id FROM `user` WHERE email = ? LIMIT 1', [normalizedAdminEmail]);
    if (existingAdmin) return res.status(400).json({ error: 'Admin email is already in use' });

    const plainPassword = adminPassword?.trim().length >= 6 ? adminPassword.trim() : genTempPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    let school, schoolAdmin;
    try {
      const schoolId = newId();
      await conn.execute(
        'INSERT INTO school (id, name, description, address, city, phone, email, website, createdBy, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
        [schoolId, request.schoolName, request.notes || '', request.address || '', request.city || '', request.contactPhone || '', request.contactEmail, request.website || '', req.userId]
      );
      const adminId = newId();
      await conn.execute(
        "INSERT INTO `user` (id, firstName, lastName, email, phone, password, role, schoolId, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'school_admin', ?, 1, NOW(), NOW())",
        [adminId, adminFirstName.trim(), adminLastName.trim(), normalizedAdminEmail, request.contactPhone || '', hashedPassword, schoolId]
      );
      await conn.execute('UPDATE school SET schoolAdminId = ? WHERE id = ?', [adminId, schoolId]);
      await conn.execute(
        'UPDATE schoolregistrationrequest SET status = ?, reviewedBy = ?, reviewedAt = NOW(), reviewNotes = ?, approvedSchoolId = ?, updatedAt = NOW() WHERE id = ?',
        ['approved', req.userId, reviewNotes || null, schoolId, requestId]
      );
      await conn.commit();
      conn.release();
      school = await queryOne('SELECT * FROM school WHERE id = ?', [schoolId]);
      schoolAdmin = await queryOne('SELECT id, firstName, lastName, email FROM `user` WHERE id = ?', [adminId]);
    } catch (e) {
      await conn.rollback(); conn.release(); throw e;
    }

    await sendMailSafe({
      to: [request.contactEmail, normalizedAdminEmail],
      subject: 'School registration approved - Kinder Connect',
      text: `Your school request has been approved.\nSchool: ${school.name}\nAdmin Login: ${schoolAdmin.email}\nTemporary Password: ${plainPassword}`,
    });

    res.json({ message: 'School request approved', school, schoolAdmin, adminCredentials: { email: schoolAdmin.email, password: plainPassword } });
  } catch (err) {
    console.error('Approve school request error:', err);
    res.status(500).json({ error: err.message || 'Failed to approve request' });
  }
});

// Reject school request
router.patch('/school-request/:requestId/reject', auth, authorize(['super_admin']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reviewNotes } = req.body;
    const request = await queryOne('SELECT * FROM schoolregistrationrequest WHERE id = ? LIMIT 1', [requestId]);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Only pending requests can be rejected' });
    await query('UPDATE schoolregistrationrequest SET status = ?, reviewedBy = ?, reviewedAt = NOW(), reviewNotes = ?, updatedAt = NOW() WHERE id = ?',
      ['rejected', req.userId, reviewNotes || null, requestId]);
    await sendMailSafe({ to: request.contactEmail, subject: 'School registration update - Kinder Connect', text: `Your school registration request was rejected.${reviewNotes ? '\nReason: ' + reviewNotes : ''}` });
    const updated = await queryOne('SELECT * FROM schoolregistrationrequest WHERE id = ?', [requestId]);
    res.json({ message: 'Request rejected', request: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all schools
router.get('/schools', auth, authorize(['super_admin']), async (req, res) => {
  try {
    const schools = await query('SELECT * FROM school ORDER BY createdAt DESC');
    res.json(schools);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create school (direct, without registration request)
router.post('/school', auth, authorize(['super_admin']), async (req, res) => {
  try {
    const { name, description, address, city, phone, email, website, schoolAdminEmail, schoolAdminPassword, schoolAdminFirstName, schoolAdminLastName } = req.body;
    if (!name) return res.status(400).json({ error: 'School name is required' });

    const schoolId = newId();
    await query('INSERT INTO school (id, name, description, address, city, phone, email, website, createdBy, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
      [schoolId, name, description || '', address || '', city || '', phone || '', email || '', website || '', req.userId]);

    if (schoolAdminEmail && schoolAdminPassword) {
      const hashedPassword = await bcrypt.hash(schoolAdminPassword, 10);
      const adminId = newId();
      await query("INSERT INTO `user` (id, firstName, lastName, email, phone, password, role, schoolId, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'school_admin', ?, 1, NOW(), NOW())",
        [adminId, schoolAdminFirstName || 'School', schoolAdminLastName || 'Admin', schoolAdminEmail, phone || '', hashedPassword, schoolId]);
      await query('UPDATE school SET schoolAdminId = ? WHERE id = ?', [adminId, schoolId]);
      const token = jwt.sign({ id: adminId, role: 'school_admin', schoolId }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '7d' });
      const school = await queryOne('SELECT * FROM school WHERE id = ?', [schoolId]);
      return res.status(201).json({ message: 'School and admin account created successfully', school: { ...school, admin: { id: adminId, email: schoolAdminEmail, token } } });
    }

    const school = await queryOne('SELECT * FROM school WHERE id = ?', [schoolId]);
    res.status(201).json({ message: 'School created successfully', school });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get school details
router.get('/school/:schoolId', auth, authorize(['super_admin', 'school_admin']), async (req, res) => {
  try {
    const school = await queryOne('SELECT * FROM school WHERE id = ? LIMIT 1', [req.params.schoolId]);
    if (!school) return res.status(404).json({ error: 'School not found' });
    res.json(school);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update school
router.put('/school/:schoolId', auth, authorize(['super_admin', 'school_admin']), async (req, res) => {
  try {
    const { name, description, address, city, phone, email, website, isActive } = req.body;
    const sets = [], vals = [];
    if (name !== undefined)        { sets.push('name = ?');        vals.push(name); }
    if (description !== undefined) { sets.push('description = ?'); vals.push(description); }
    if (address !== undefined)     { sets.push('address = ?');     vals.push(address); }
    if (city !== undefined)        { sets.push('city = ?');        vals.push(city); }
    if (phone !== undefined)       { sets.push('phone = ?');       vals.push(phone); }
    if (email !== undefined)       { sets.push('email = ?');       vals.push(email); }
    if (website !== undefined)     { sets.push('website = ?');     vals.push(website); }
    if (isActive !== undefined)    { sets.push('isActive = ?');    vals.push(isActive ? 1 : 0); }
    sets.push('updatedAt = NOW()');
    vals.push(req.params.schoolId);
    await query(`UPDATE school SET ${sets.join(', ')} WHERE id = ?`, vals);
    const school = await queryOne('SELECT * FROM school WHERE id = ?', [req.params.schoolId]);
    res.json({ message: 'School updated successfully', school });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Deactivate / Activate school
router.patch('/school/:schoolId/deactivate', auth, authorize(['super_admin']), async (req, res) => {
  try {
    await query('UPDATE school SET isActive = 0, updatedAt = NOW() WHERE id = ?', [req.params.schoolId]);
    res.json({ message: 'School deactivated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/school/:schoolId/activate', auth, authorize(['super_admin']), async (req, res) => {
  try {
    await query('UPDATE school SET isActive = 1, updatedAt = NOW() WHERE id = ?', [req.params.schoolId]);
    res.json({ message: 'School activated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete school
router.delete('/school/:schoolId', auth, authorize(['super_admin']), async (req, res) => {
  try {
    await query('DELETE FROM `user` WHERE schoolId = ?', [req.params.schoolId]);
    await query('DELETE FROM school WHERE id = ?', [req.params.schoolId]);
    res.json({ message: 'School deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Stats
router.get('/stats', auth, authorize(['super_admin']), async (req, res) => {
  try {
    const [schools, active, pending, students, users, classes] = await Promise.all([
      queryOne('SELECT COUNT(*) AS cnt FROM school'),
      queryOne('SELECT COUNT(*) AS cnt FROM school WHERE isActive = 1'),
      queryOne("SELECT COUNT(*) AS cnt FROM schoolregistrationrequest WHERE status = 'pending'"),
      queryOne('SELECT COUNT(*) AS cnt FROM student'),
      queryOne('SELECT COUNT(*) AS cnt FROM `user`'),
      queryOne('SELECT COUNT(*) AS cnt FROM `class`'),
    ]);
    res.json({ totalSchools: schools.cnt, activeSchools: active.cnt, pendingRequests: pending.cnt, totalStudents: students.cnt, totalUsers: users.cnt, totalClasses: classes.cnt });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
