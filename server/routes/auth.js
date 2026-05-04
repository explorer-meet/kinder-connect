const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query, queryOne, newId } = require('../src/lib/db');
const { auth } = require('../middleware/auth');
const { sendMailSafe } = require('../src/lib/mailer');

const router = express.Router();

// Public school registration request
router.post('/school-registration-request', async (req, res) => {
  try {
    const { schoolName, contactFirstName, contactLastName, contactEmail, contactPhone, city, address, website, notes } = req.body;
    if (!schoolName || !contactFirstName || !contactLastName || !contactEmail) {
      return res.status(400).json({ error: 'School and contact details are required' });
    }
    const normalizedEmail = contactEmail.toLowerCase().trim();
    const existing = await queryOne(
      "SELECT id FROM schoolregistrationrequest WHERE contactEmail = ? AND status = 'pending' LIMIT 1",
      [normalizedEmail]
    );
    if (existing) return res.status(400).json({ error: 'A pending request already exists for this email' });

    const id = newId();
    await query(
      'INSERT INTO schoolregistrationrequest (id, schoolName, contactFirstName, contactLastName, contactEmail, contactPhone, city, address, website, notes, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [id, schoolName.trim(), contactFirstName.trim(), contactLastName.trim(), normalizedEmail, contactPhone || null, city || null, address || null, website || null, notes || null, 'pending']
    );

    const superAdminEmail = process.env.SUPER_ADMIN_NOTIFY_EMAIL || process.env.MAIL_FROM;
    await sendMailSafe({
      to: [normalizedEmail, superAdminEmail],
      subject: 'School registration request submitted',
      text: `Request ID: ${id}\nSchool: ${schoolName}\nContact: ${contactFirstName} ${contactLastName}\nEmail: ${normalizedEmail}`,
    });
    res.status(201).json({ message: 'Registration request submitted. A super admin will review it soon.', requestId: id });
  } catch (err) {
    console.error('School registration request error:', err);
    res.status(500).json({ error: err.message || 'Could not submit request' });
  }
});

// Register (disabled)
router.post('/register', async (req, res) => {
  return res.status(403).json({ error: 'Open account registration is disabled. Please ask your school to enroll you, or submit a school registration request.' });
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await queryOne('SELECT * FROM `user` WHERE email = ? LIMIT 1', [email.toLowerCase()]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role, schoolId: user.schoolId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, schoolId: user.schoolId },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Get Current User
router.get('/me', auth, async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, firstName, lastName, email, role, schoolId FROM `user` WHERE id = ? LIMIT 1',
      [req.userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;