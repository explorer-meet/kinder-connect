const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const prisma = require('../src/lib/prisma');

const router = express.Router();

// Get All Schools
router.get('/schools', auth, authorize(['admin']), async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      include: {
        users: true,
        classes: true,
      },
    });
    res.json(schools);
  } catch (err) {
    console.error('Get schools error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create School
router.post('/school', auth, authorize(['admin']), async (req, res) => {
  try {
    const { name, address, city, phone, email, logo } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'School name is required' });
    }

    const school = await prisma.school.create({
      data: {
        name,
        address: address || '',
        city: city || '',
        phone: phone || '',
        email: email || '',
        logo: logo || '',
        adminId: req.userId,
      },
    });

    res.status(201).json({ message: 'School created', school });
  } catch (err) {
    console.error('Create school error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get School Details
router.get('/school/:schoolId', auth, async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.params.schoolId },
      include: {
        users: true,
        classes: true,
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

// Get All Classes
router.get('/classes', auth, authorize(['admin']), async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      include: {
        school: true,
      },
    });
    res.json(classes);
  } catch (err) {
    console.error('Get classes error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create Class
router.post('/class', auth, authorize(['admin']), async (req, res) => {
  try {
    const { name, section, schoolId, capacity } = req.body;

    if (!name || !schoolId) {
      return res.status(400).json({ error: 'Class name and schoolId are required' });
    }

    const classObj = await prisma.class.create({
      data: {
        name,
        section: section || '',
        schoolId,
        capacity: capacity ? parseInt(capacity) : null,
      },
      include: {
        school: true,
      },
    });

    res.status(201).json({ message: 'Class created', class: classObj });
  } catch (err) {
    console.error('Create class error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get All Classes in School
router.get('/classes/:schoolId', auth, authorize(['admin']), async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where: { schoolId: req.params.schoolId },
      include: {
        school: true,
        students: true,
      },
    });

    res.json(classes);
  } catch (err) {
    console.error('Get school classes error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get All Parents
router.get('/parents', auth, authorize(['admin']), async (req, res) => {
  try {
    const parents = await prisma.user.findMany({
      where: { role: 'parent' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
      },
    });

    res.json(parents);
  } catch (err) {
    console.error('Get parents error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get All Teachers
router.get('/teachers', auth, authorize(['admin']), async (req, res) => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: 'teacher' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        schoolId: true,
        isActive: true,
      },
    });

    res.json(teachers);
  } catch (err) {
    console.error('Get teachers error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Dashboard Stats
router.get('/stats', auth, authorize(['admin']), async (req, res) => {
  try {
    const totalSchools = await prisma.school.count();
    const totalClasses = await prisma.class.count();
    const totalStudents = await prisma.student.count();
    const totalTeachers = await prisma.user.count({
      where: { role: 'teacher' },
    });
    const totalParents = await prisma.user.count({
      where: { role: 'parent' },
    });

    res.json({
      totalSchools,
      totalClasses,
      totalStudents,
      totalTeachers,
      totalParents,
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update School
router.put('/school/:schoolId', auth, authorize(['admin']), async (req, res) => {
  try {
    const { name, address, city, phone, email, logo } = req.body;

    const school = await prisma.school.update({
      where: { id: req.params.schoolId },
      data: {
        name: name || undefined,
        address: address !== undefined ? address : undefined,
        city: city !== undefined ? city : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined,
        logo: logo !== undefined ? logo : undefined,
      },
      include: {
        users: true,
        classes: true,
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

// Delete School
router.delete('/school/:schoolId', auth, authorize(['admin']), async (req, res) => {
  try {
    // Check if school has related records
    const classCount = await prisma.class.count({
      where: { schoolId: req.params.schoolId },
    });
    
    if (classCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete school with associated classes. Please delete classes first.' 
      });
    }

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

module.exports = router;
