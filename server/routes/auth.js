const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');
const { auth } = require('../middleware/auth');
const { sendMailSafe } = require('../src/lib/mailer');

const router = express.Router();

// Public school registration request
router.post('/school-registration-request', async (req, res) => {
  try {
    const {
      schoolName,
      contactFirstName,
      contactLastName,
      contactEmail,
      contactPhone,
      city,
      address,
      website,
      notes,
    } = req.body;

    if (!schoolName || !contactFirstName || !contactLastName || !contactEmail) {
      return res.status(400).json({ error: 'School and contact details are required' });
    }

    const normalizedEmail = contactEmail.toLowerCase().trim();

    const existingPending = await prisma.schoolRegistrationRequest.findFirst({
      where: {
        contactEmail: normalizedEmail,
        status: 'pending',
      },
    });

    if (existingPending) {
      return res.status(400).json({ error: 'A pending request already exists for this email' });
    }

    const request = await prisma.schoolRegistrationRequest.create({
      data: {
        schoolName: schoolName.trim(),
        contactFirstName: contactFirstName.trim(),
        contactLastName: contactLastName.trim(),
        contactEmail: normalizedEmail,
        contactPhone: contactPhone || null,
        city: city || null,
        address: address || null,
        website: website || null,
        notes: notes || null,
      },
    });

    const superAdminEmail = process.env.SUPER_ADMIN_NOTIFY_EMAIL || process.env.MAIL_FROM;
    await sendMailSafe({
      to: [normalizedEmail, superAdminEmail],
      subject: 'School registration request submitted',
      text: `Request ID: ${request.id}\nSchool: ${request.schoolName}\nContact: ${request.contactFirstName} ${request.contactLastName}\nEmail: ${request.contactEmail}`,
    });

    res.status(201).json({
      message: 'Registration request submitted. A super admin will review it soon.',
      requestId: request.id,
    });
  } catch (err) {
    console.error('School registration request error:', err);
    res.status(500).json({ error: err.message || 'Could not submit request' });
  }
});

// Register
router.post('/register', async (req, res) => {
  return res.status(403).json({
    error: 'Open account registration is disabled. Please ask your school to enroll you, or submit a school registration request.',
  });
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role, schoolId: user.schoolId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Get Current User
router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
