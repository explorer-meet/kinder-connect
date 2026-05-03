const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const prisma = require('../src/lib/prisma');

const router = express.Router();

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
        parentIds: parentIds ? JSON.stringify(parentIds) : null,
        allergies: allergies ? JSON.stringify(allergies) : null,
        medicalNotes,
        authorizedPickup: authorizedPickup ? JSON.stringify(authorizedPickup) : null,
      },
      include: {
        class: true,
        school: true,
      },
    });

    res.status(201).json({
      message: 'Student created successfully',
      student: {
        ...student,
        parentIds: student.parentIds ? JSON.parse(student.parentIds) : [],
        allergies: student.allergies ? JSON.parse(student.allergies) : [],
        authorizedPickup: student.authorizedPickup ? JSON.parse(student.authorizedPickup) : [],
      },
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

    res.json(student);
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

    const formattedStudents = students.map(s => ({
      ...s,
      parentIds: s.parentIds ? JSON.parse(s.parentIds) : [],
      allergies: s.allergies ? JSON.parse(s.allergies) : [],
      authorizedPickup: s.authorizedPickup ? JSON.parse(s.authorizedPickup) : [],
    }));

    res.json(formattedStudents);
  } catch (err) {
    console.error('Get school students error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update Student Profile (Admin or Parent)
router.put('/:studentId', auth, async (req, res) => {
  try {
    const { allergies, medicalNotes, authorizedPickup } = req.body;

    const student = await prisma.student.findUnique({
      where: { id: req.params.studentId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Authorization check
    if (req.userRole !== 'admin' && (!student.parentIds || !JSON.parse(student.parentIds).includes(req.userId))) {
      return res.status(403).json({ error: 'Not authorized to update this student' });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: req.params.studentId },
      data: {
        allergies: allergies ? JSON.stringify(allergies) : student.allergies,
        medicalNotes: medicalNotes !== undefined ? medicalNotes : student.medicalNotes,
        authorizedPickup: authorizedPickup ? JSON.stringify(authorizedPickup) : student.authorizedPickup,
      },
      include: {
        class: true,
        school: true,
      },
    });

    res.json({
      message: 'Student updated successfully',
      student: {
        ...updatedStudent,
        parentIds: updatedStudent.parentIds ? JSON.parse(updatedStudent.parentIds) : [],
        allergies: updatedStudent.allergies ? JSON.parse(updatedStudent.allergies) : [],
        authorizedPickup: updatedStudent.authorizedPickup ? JSON.parse(updatedStudent.authorizedPickup) : [],
      },
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

    const parentIds = student.parentIds ? JSON.parse(student.parentIds) : [];
    if (!parentIds.includes(parentId)) {
      parentIds.push(parentId);
    }

    const updatedStudent = await prisma.student.update({
      where: { id: req.params.studentId },
      data: {
        parentIds: JSON.stringify(parentIds),
      },
      include: {
        class: true,
        school: true,
      },
    });

    res.json({
      message: 'Parent linked to student',
      student: {
        ...updatedStudent,
        parentIds: JSON.parse(updatedStudent.parentIds),
        allergies: updatedStudent.allergies ? JSON.parse(updatedStudent.allergies) : [],
        authorizedPickup: updatedStudent.authorizedPickup ? JSON.parse(updatedStudent.authorizedPickup) : [],
      },
    });
  } catch (err) {
    console.error('Add parent error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
