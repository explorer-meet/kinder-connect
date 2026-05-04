const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const prisma = require('../src/lib/prisma');

const router = express.Router();

const parseJsonValue = (value, fallback = null) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
};

const parseJsonArray = (value) => {
  const parsed = parseJsonValue(value, []);
  return Array.isArray(parsed) ? parsed : [];
};

const formatStudent = (student) => ({
  ...student,
  parentIds: parseJsonArray(student.parentIds),
  allergies: parseJsonArray(student.allergies),
  authorizedPickup: parseJsonArray(student.authorizedPickup),
  medicalProfile: parseJsonValue(student.medicalProfile, null),
});

// Create Student (Admin only)
router.post('/', auth, authorize(['admin']), async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, enrollmentNumber, classId, schoolId, parentIds, allergies, medicalNotes, authorizedPickup } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !classId || !schoolId) {
      return res.status(400).json({ error: 'Missing required fields: firstName, lastName, classId, schoolId' });
    }

    // Verify class exists
    const classExists = await prisma.class.findUnique({
      where: { id: classId },
    });
    if (!classExists) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Create student
    const student = await prisma.student.create({
      data: {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        enrollmentNumber: enrollmentNumber || `STU-${Date.now()}`,
        classId,
        schoolId,
        parentIds: parentIds || null,
        allergies: allergies || null,
        medicalNotes,
        authorizedPickup: authorizedPickup || null,
        medicalProfile: req.body.medicalProfile || null,
      },
      include: {
        class: true,
        school: true,
      },
    });

    res.status(201).json({
      message: 'Student created successfully',
      student: formatStudent(student),
    });
  } catch (err) {
    console.error('Create student error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Student Profile
router.get('/:studentId', auth, async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.studentId },
      include: {
        class: true,
        school: {
          select: { id: true, name: true, city: true },
        },
        batch: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check authorization: only parent of this student or admin can view
    const parentIds = Array.isArray(student.parentIds) ? student.parentIds : [];
    if (req.userRole !== 'admin' && req.userRole !== 'school_admin' && !parentIds.includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized to view this student' });
    }

    res.json(formatStudent(student));
  } catch (err) {
    console.error('Get student error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Students by Parent (for parent view)
router.get('/parent/my-children', auth, authorize(['parent']), async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        parentIds: {
          array_contains: req.userId,
        },
      },
      include: {
        class: true,
        school: {
          select: { id: true, name: true, city: true },
        },
        batch: true,
      },
    });

    res.json(students);
  } catch (err) {
    console.error('Get parent students error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get attendance for a child (parent only)
router.get('/parent/child/:studentId/attendance', auth, authorize(['parent']), async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        parentIds: true,
        batchId: true,
        class: { select: { id: true, name: true, section: true } },
        batch: { select: { id: true, shiftName: true, startTime: true, endTime: true } },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const parentIds = Array.isArray(student.parentIds) ? student.parentIds : [];
    if (!parentIds.includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized to view this attendance' });
    }

    const attendance = await prisma.attendance.findMany({
      where: { studentId: req.params.studentId },
      orderBy: { date: 'desc' },
      take: 120,
      select: {
        id: true,
        date: true,
        status: true,
        checkInTime: true,
        checkOutTime: true,
        pickedUpBy: true,
        notes: true,
      },
    });

    res.json({ student, attendance });
  } catch (err) {
    console.error('Get child attendance error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get medical profile for a child (parent only)
router.get('/parent/child/:studentId/medical-profile', auth, authorize(['parent']), async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        parentIds: true,
        allergies: true,
        medicalNotes: true,
        medicalProfile: true,
      },
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const parentIds = parseJsonArray(student.parentIds);
    if (!parentIds.includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized to view this medical profile' });
    }

    res.json({
      student: formatStudent(student),
      medicalProfile: parseJsonValue(student.medicalProfile, null),
    });
  } catch (err) {
    console.error('Get child medical profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update medical profile for a child (parent only)
router.put('/parent/child/:studentId/medical-profile', auth, authorize(['parent']), async (req, res) => {
  try {
    const { medicalProfile, allergies, medicalNotes } = req.body;

    const student = await prisma.student.findUnique({
      where: { id: req.params.studentId },
      select: { id: true, parentIds: true },
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const parentIds = parseJsonArray(student.parentIds);
    if (!parentIds.includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized to update this medical profile' });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: req.params.studentId },
      data: {
        medicalProfile: medicalProfile || null,
        allergies: allergies || null,
        medicalNotes: medicalNotes !== undefined ? medicalNotes : null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        parentIds: true,
        allergies: true,
        medicalNotes: true,
        medicalProfile: true,
      },
    });

    res.json({
      message: 'Medical profile updated successfully',
      student: formatStudent(updatedStudent),
      medicalProfile: parseJsonValue(updatedStudent.medicalProfile, null),
    });
  } catch (err) {
    console.error('Update child medical profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get All Students in School (Admin only)
router.get('/school/:schoolId', auth, authorize(['admin']), async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: { schoolId: req.params.schoolId },
      include: {
        class: true,
        school: true,
      },
    });

    const formattedStudents = students.map((s) => formatStudent(s));

    res.json(formattedStudents);
  } catch (err) {
    console.error('Get school students error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update Student Profile (Admin or Parent)
router.put('/:studentId', auth, async (req, res) => {
  try {
    const { allergies, medicalNotes, authorizedPickup, medicalProfile } = req.body;

    const student = await prisma.student.findUnique({
      where: { id: req.params.studentId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Authorization check
    if (req.userRole !== 'admin' && !parseJsonArray(student.parentIds).includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized to update this student' });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: req.params.studentId },
      data: {
        allergies: allergies !== undefined ? allergies : student.allergies,
        medicalNotes: medicalNotes !== undefined ? medicalNotes : student.medicalNotes,
        authorizedPickup: authorizedPickup !== undefined ? authorizedPickup : student.authorizedPickup,
        medicalProfile: medicalProfile !== undefined ? medicalProfile : student.medicalProfile,
      },
      include: {
        class: true,
        school: true,
      },
    });

    res.json({
      message: 'Student updated successfully',
      student: formatStudent(updatedStudent),
    });
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Link Parent to Student (Admin only)
router.post('/:studentId/add-parent', auth, authorize(['admin']), async (req, res) => {
  try {
    const { parentId } = req.body;

    if (!parentId) {
      return res.status(400).json({ error: 'Parent ID required' });
    }

    const student = await prisma.student.findUnique({
      where: { id: req.params.studentId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const parentIds = parseJsonArray(student.parentIds);
    if (!parentIds.includes(parentId)) {
      parentIds.push(parentId);
    }

    const updatedStudent = await prisma.student.update({
      where: { id: req.params.studentId },
      data: {
        parentIds,
      },
      include: {
        class: true,
        school: true,
      },
    });

    res.json({
      message: 'Parent linked to student',
      student: formatStudent(updatedStudent),
    });
  } catch (err) {
    console.error('Add parent error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
