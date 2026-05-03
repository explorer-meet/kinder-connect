const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const prisma = require('../src/lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendMailSafe } = require('../src/lib/mailer');

const router = express.Router();

const generateTempPassword = (length = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// ===== SCHOOL REGISTRATION REQUESTS =====

router.get('/school-requests', auth, authorize(['super_admin']), async (req, res) => {
  try {
    const statusFilter = req.query.status;
    const where = statusFilter ? { status: statusFilter } : {};

    const requests = await prisma.schoolRegistrationRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (err) {
    console.error('Get school requests error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/school-request/:requestId/approve', auth, authorize(['super_admin']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const {
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPassword,
      reviewNotes,
    } = req.body;

    if (!adminFirstName || !adminLastName || !adminEmail) {
      return res.status(400).json({ error: 'Admin first name, last name, and email are required' });
    }

    const request = await prisma.schoolRegistrationRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be approved' });
    }

    const normalizedAdminEmail = adminEmail.toLowerCase().trim();

    const existingAdmin = await prisma.user.findUnique({
      where: { email: normalizedAdminEmail },
    });

    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin email is already in use' });
    }

    const plainPassword = adminPassword && adminPassword.trim().length >= 6
      ? adminPassword.trim()
      : generateTempPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: request.schoolName,
          description: request.notes || '',
          address: request.address || '',
          city: request.city || '',
          phone: request.contactPhone || '',
          email: request.contactEmail,
          website: request.website || '',
          createdBy: req.userId,
          isActive: true,
        },
      });

      const schoolAdmin = await tx.user.create({
        data: {
          firstName: adminFirstName.trim(),
          lastName: adminLastName.trim(),
          email: normalizedAdminEmail,
          phone: request.contactPhone || '',
          password: hashedPassword,
          role: 'school_admin',
          schoolId: school.id,
          isActive: true,
        },
      });

      await tx.school.update({
        where: { id: school.id },
        data: { schoolAdminId: schoolAdmin.id },
      });

      const updatedRequest = await tx.schoolRegistrationRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          reviewedBy: req.userId,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
          approvedSchoolId: school.id,
        },
      });

      return { school, schoolAdmin, updatedRequest };
    });

    await sendMailSafe({
      to: [request.contactEmail, normalizedAdminEmail],
      subject: 'School registration approved - Kinder Connect',
      text: `Your school request has been approved.\nSchool: ${result.school.name}\nSchool Admin Login: ${result.schoolAdmin.email}\nTemporary Password: ${plainPassword}`,
    });

    res.json({
      message: 'School request approved and school admin account created',
      request: result.updatedRequest,
      school: result.school,
      schoolAdmin: {
        id: result.schoolAdmin.id,
        email: result.schoolAdmin.email,
        firstName: result.schoolAdmin.firstName,
        lastName: result.schoolAdmin.lastName,
      },
      adminCredentials: {
        email: result.schoolAdmin.email,
        password: plainPassword,
      },
    });
  } catch (err) {
    console.error('Approve school request error:', err);
    res.status(500).json({ error: err.message || 'Failed to approve request' });
  }
});

router.patch('/school-request/:requestId/reject', auth, authorize(['super_admin']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reviewNotes } = req.body;

    const request = await prisma.schoolRegistrationRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be rejected' });
    }

    const updatedRequest = await prisma.schoolRegistrationRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        reviewedBy: req.userId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
    });

    await sendMailSafe({
      to: request.contactEmail,
      subject: 'School registration update - Kinder Connect',
      text: `Your school registration request was rejected.${reviewNotes ? `\nReason: ${reviewNotes}` : ''}`,
    });

    res.json({ message: 'Request rejected', request: updatedRequest });
  } catch (err) {
    console.error('Reject school request error:', err);
    res.status(500).json({ error: err.message || 'Failed to reject request' });
  }
});

// ===== SCHOOL ACCOUNT MANAGEMENT =====

// Get All Schools (Super Admin Only)
router.get('/schools', auth, authorize(['super_admin']), async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      include: {
        classes: {
          select: {
            id: true,
            name: true,
            section: true,
          }
        },
        admins: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
          }
        },
        _count: {
          select: {
            classes: true,
            students: true,
            admins: true,
          },
        },
      },
    });

    res.json(schools);
  } catch (err) {
    console.error('Get schools error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create School Account (Super Admin Only)
router.post('/school', auth, authorize(['super_admin']), async (req, res) => {
  try {
    const { name, description, address, city, phone, email, website, schoolAdminEmail, schoolAdminPassword, schoolAdminFirstName, schoolAdminLastName } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'School name is required' });
    }

    // Create school
    const school = await prisma.school.create({
      data: {
        name,
        description: description || '',
        address: address || '',
        city: city || '',
        phone: phone || '',
        email: email || '',
        website: website || '',
        createdBy: req.userId,
      },
    });

    // Create school admin account if credentials provided
    if (schoolAdminEmail && schoolAdminPassword) {
      const hashedPassword = await bcrypt.hash(schoolAdminPassword, 10);
      
      const schoolAdmin = await prisma.user.create({
        data: {
          firstName: schoolAdminFirstName || 'School',
          lastName: schoolAdminLastName || 'Admin',
          email: schoolAdminEmail,
          phone: phone || '',
          password: hashedPassword,
          role: 'school_admin',
          schoolId: school.id,
          isActive: true,
        },
      });

      // Update school with admin reference
      await prisma.school.update({
        where: { id: school.id },
        data: { schoolAdminId: schoolAdmin.id },
      });

      const token = jwt.sign(
        { userId: schoolAdmin.id, role: schoolAdmin.role },
        process.env.JWT_SECRET || 'your_secret_key',
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'School and admin account created successfully',
        school: {
          ...school,
          admin: {
            id: schoolAdmin.id,
            email: schoolAdmin.email,
            token,
          },
        },
      });
    }

    res.status(201).json({ message: 'School created successfully', school });
  } catch (err) {
    console.error('Create school error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get School Details
router.get('/school/:schoolId', auth, authorize(['super_admin', 'school_admin']), async (req, res) => {
  try {
    // School admin can only view their own school
    if (req.userRole === 'school_admin') {
      const userSchool = await prisma.user.findUnique({ where: { id: req.userId } });
      if (userSchool.schoolId !== req.params.schoolId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    const school = await prisma.school.findUnique({
      where: { id: req.params.schoolId },
      include: {
        classes: {
          include: { batches: true },
        },
        students: true,
        admins: true,
      },
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(school);
  } catch (err) {
    console.error('Get school error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update School
router.put('/school/:schoolId', auth, authorize(['super_admin', 'school_admin']), async (req, res) => {
  try {
    // School admin can only update their own school
    if (req.userRole === 'school_admin') {
      const userSchool = await prisma.user.findUnique({ where: { id: req.userId } });
      if (userSchool.schoolId !== req.params.schoolId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    const { name, description, address, city, phone, email, website, isActive } = req.body;

    const school = await prisma.school.update({
      where: { id: req.params.schoolId },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        address: address !== undefined ? address : undefined,
        city: city !== undefined ? city : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined,
        website: website !== undefined ? website : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    res.json({ message: 'School updated successfully', school });
  } catch (err) {
    console.error('Update school error:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'School not found' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Deactivate School
router.patch('/school/:schoolId/deactivate', auth, authorize(['super_admin']), async (req, res) => {
  try {
    const school = await prisma.school.update({
      where: { id: req.params.schoolId },
      data: { isActive: false },
    });

    res.json({ message: 'School deactivated successfully', school });
  } catch (err) {
    console.error('Deactivate school error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Activate School
router.patch('/school/:schoolId/activate', auth, authorize(['super_admin']), async (req, res) => {
  try {
    const school = await prisma.school.update({
      where: { id: req.params.schoolId },
      data: { isActive: true },
    });

    res.json({ message: 'School activated successfully', school });
  } catch (err) {
    console.error('Activate school error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete School (with confirmation)
router.delete('/school/:schoolId', auth, authorize(['super_admin']), async (req, res) => {
  try {
    // Delete all related admin accounts
    await prisma.user.deleteMany({
      where: { schoolId: req.params.schoolId },
    });

    // Delete school
    const school = await prisma.school.delete({
      where: { id: req.params.schoolId },
    });

    res.json({ message: 'School deleted successfully', school });
  } catch (err) {
    console.error('Delete school error:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'School not found' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ===== STATISTICS =====

router.get('/stats', auth, authorize(['super_admin']), async (req, res) => {
  try {
    const totalSchools = await prisma.school.count();
    const activeSchools = await prisma.school.count({ where: { isActive: true } });
    const pendingRequests = await prisma.schoolRegistrationRequest.count({ where: { status: 'pending' } });
    const totalStudents = await prisma.student.count();
    const totalUsers = await prisma.user.count();
    const totalClasses = await prisma.class.count();

    res.json({
      totalSchools,
      activeSchools,
      pendingRequests,
      totalClasses,
      totalStudents,
      totalUsers,
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
