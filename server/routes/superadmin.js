const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const prisma = require('../src/lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

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
    const totalStudents = await prisma.student.count();
    const totalUsers = await prisma.user.count();
    const totalClasses = await prisma.class.count();

    res.json({
      totalSchools,
      activeSchools,
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
