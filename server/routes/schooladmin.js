const express = require('express');
const bcrypt = require('bcryptjs');
const { auth, authorize } = require('../middleware/auth');
const prisma = require('../src/lib/prisma');

const router = express.Router();

const getCurrentSchoolUser = async (userId) => prisma.user.findUnique({
  where: { id: userId },
  select: { id: true, schoolId: true, role: true },
});

const upsertParentByEmail = async ({ email, firstName, lastName, phone, schoolId, fallbackFirstName, fallbackLastName }) => {
  const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
  if (!normalizedEmail) return { parentUser: null, accountInfo: null };

  let parentUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (parentUser && parentUser.role !== 'parent') {
    throw new Error(`Provided parent email (${normalizedEmail}) belongs to a non-parent account`);
  }

  if (!parentUser) {
    const defaultParentPassword = process.env.DEFAULT_PARENT_PASSWORD || 'Parent@123';
    const hashedPassword = await bcrypt.hash(defaultParentPassword, 10);
    parentUser = await prisma.user.create({
      data: {
        firstName: firstName || fallbackFirstName || 'Parent',
        lastName: lastName || fallbackLastName || 'User',
        email: normalizedEmail,
        phone: phone || '',
        password: hashedPassword,
        role: 'parent',
        schoolId: schoolId || null,
        isActive: true,
      },
    });

    return {
      parentUser,
      accountInfo: {
        email: normalizedEmail,
        password: defaultParentPassword,
        isNewAccount: true,
      },
    };
  }

  return {
    parentUser,
    accountInfo: { email: normalizedEmail, isNewAccount: false },
  };
};

router.get('/school', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const user = await getCurrentSchoolUser(req.userId);
    if (!user?.schoolId) return res.status(400).json({ error: 'School admin is not linked to a school' });

    const school = await prisma.school.findUnique({
      where: { id: user.schoolId },
      include: {
        classes: {
          include: {
            batches: { orderBy: { createdAt: 'asc' } },
          },
          orderBy: [{ name: 'asc' }, { section: 'asc' }],
        },
      },
    });

    res.json(school);
  } catch (err) {
    console.error('Get school admin school error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const user = await getCurrentSchoolUser(req.userId);
    const schoolId = user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'School admin is not linked to a school' });

    const [totalStaff, totalStudents, totalClasses, totalBatches] = await Promise.all([
      prisma.user.count({ where: { schoolId, role: 'teacher' } }),
      prisma.student.count({ where: { schoolId } }),
      prisma.class.count({ where: { schoolId } }),
      prisma.batch.count({ where: { schoolId } }),
    ]);

    res.json({ totalStaff, totalStudents, totalClasses, totalBatches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/staff', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const user = await getCurrentSchoolUser(req.userId);
    const staff = await prisma.user.findMany({
      where: { schoolId: user.schoolId, role: 'teacher' },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isActive: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/staff', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, role, password } = req.body;
    const currentUser = await getCurrentSchoolUser(req.userId);

    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password || 'temp123', 10);
    const staff = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || '',
        password: hashedPassword,
        role,
        schoolId: currentUser?.schoolId || null,
        isActive: true,
      },
    });

    res.status(201).json({ message: 'Staff added successfully', staff });
  } catch (err) {
    console.error('Add staff error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/staff/:staffId', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const { firstName, lastName, phone, role, isActive } = req.body;
    const staff = await prisma.user.update({
      where: { id: req.params.staffId },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone !== undefined ? phone : undefined,
        role: role || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });
    res.json({ message: 'Staff updated', staff });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/staff/:staffId', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const staff = await prisma.user.delete({ where: { id: req.params.staffId } });
    res.json({ message: 'Staff removed successfully', staff });
  } catch (err) {
    console.error('Remove staff error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/classes', auth, authorize(['school_admin', 'teacher']), async (req, res) => {
  try {
    const user = await getCurrentSchoolUser(req.userId);
    if (!user?.schoolId) return res.status(400).json({ error: 'User is not linked to a school' });

    const classes = await prisma.class.findMany({
      where: { schoolId: user.schoolId },
      include: {
        batches: {
          include: {
            students: {
              select: { id: true, firstName: true, lastName: true, enrollmentNumber: true, isActive: true },
              orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ name: 'asc' }, { section: 'asc' }],
    });

    res.json(classes);
  } catch (err) {
    console.error('Get classes error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/class', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const { name, section, capacity } = req.body;
    const user = await getCurrentSchoolUser(req.userId);

    if (!user?.schoolId || !name) return res.status(400).json({ error: 'Class name is required' });

    const existingClass = await prisma.class.findFirst({
      where: { schoolId: user.schoolId, name, section: section || null },
    });
    if (existingClass) return res.status(400).json({ error: 'Class already exists in this school' });

    const classObj = await prisma.class.create({
      data: {
        schoolId: user.schoolId,
        name,
        section: section || '',
        capacity: capacity ? parseInt(capacity, 10) : null,
      },
    });

    res.status(201).json({ message: 'Class created successfully', class: classObj });
  } catch (err) {
    console.error('Create class error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/batch', auth, authorize(['school_admin', 'teacher']), async (req, res) => {
  try {
    const { classId, shiftName, startTime, endTime, capacity } = req.body;
    const user = await getCurrentSchoolUser(req.userId);

    if (!classId || !shiftName || !user?.schoolId) {
      return res.status(400).json({ error: 'Class and shift name are required' });
    }

    const classObj = await prisma.class.findUnique({ where: { id: classId } });
    if (!classObj || classObj.schoolId !== user.schoolId) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const existingBatch = await prisma.batch.findFirst({ where: { classId, shiftName } });
    if (existingBatch) return res.status(400).json({ error: 'Batch with this shift already exists for this class' });

    const batch = await prisma.batch.create({
      data: {
        schoolId: user.schoolId,
        classId,
        shiftName,
        startTime: startTime || '09:00 AM',
        endTime: endTime || '12:00 PM',
        capacity: capacity ? parseInt(capacity, 10) : null,
      },
    });

    res.status(201).json({ message: 'Batch created successfully', batch });
  } catch (err) {
    console.error('Create batch error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/batch/:batchId', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const studentCount = await prisma.student.count({ where: { batchId: req.params.batchId } });
    if (studentCount > 0) return res.status(400).json({ error: 'Cannot delete batch with students. Please delete students first.' });
    const batch = await prisma.batch.delete({ where: { id: req.params.batchId } });
    res.json({ message: 'Batch deleted successfully', batch });
  } catch (err) {
    console.error('Delete batch error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/students', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const user = await getCurrentSchoolUser(req.userId);
    const students = await prisma.student.findMany({
      where: { schoolId: user.schoolId },
      include: {
        school: { select: { id: true, name: true } },
        class: { select: { id: true, name: true, section: true } },
        batch: { select: { id: true, shiftName: true, startTime: true, endTime: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/batch/:batchId/student', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const {
      firstName, lastName, dateOfBirth, enrollmentNumber, parentIds,
      fatherFirstName, fatherLastName,
      motherFirstName, motherLastName,
      guardianFirstName, guardianLastName,
      documents,
      // Father login account
      parentEmail, parentFirstName, parentLastName, parentPhone,
      // Mother/guardian login account
      secondParentEmail, secondParentFirstName, secondParentLastName, secondParentPhone,
    } = req.body;

    const batch = await prisma.batch.findUnique({ where: { id: req.params.batchId }, include: { class: true } });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (!firstName || !lastName) return res.status(400).json({ error: 'Student firstName and lastName are required' });

    const linkedParentIds = Array.isArray(parentIds) ? [...parentIds] : [];
    const parentAccounts = [];

    const primaryParent = await upsertParentByEmail({
      email: parentEmail,
      firstName: parentFirstName || fatherFirstName,
      lastName: parentLastName || fatherLastName,
      phone: parentPhone,
      schoolId: batch.schoolId,
      fallbackFirstName: 'Parent',
      fallbackLastName: `${firstName} ${lastName}`,
    });
    if (primaryParent.parentUser && !linkedParentIds.includes(primaryParent.parentUser.id)) linkedParentIds.push(primaryParent.parentUser.id);
    if (primaryParent.accountInfo) parentAccounts.push(primaryParent.accountInfo);

    const secondaryParent = await upsertParentByEmail({
      email: secondParentEmail,
      firstName: secondParentFirstName || motherFirstName,
      lastName: secondParentLastName || motherLastName,
      phone: secondParentPhone,
      schoolId: batch.schoolId,
      fallbackFirstName: 'Guardian',
      fallbackLastName: `${firstName} ${lastName}`,
    });
    if (secondaryParent.parentUser && !linkedParentIds.includes(secondaryParent.parentUser.id)) linkedParentIds.push(secondaryParent.parentUser.id);
    if (secondaryParent.accountInfo) parentAccounts.push(secondaryParent.accountInfo);

    const student = await prisma.student.create({
      data: {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        enrollmentNumber: enrollmentNumber || `STU-${Date.now()}`,
        schoolId: batch.schoolId,
        classId: batch.classId,
        batchId: req.params.batchId,
        parentIds: linkedParentIds,
        fatherFirstName: fatherFirstName || null,
        fatherLastName: fatherLastName || null,
        motherFirstName: motherFirstName || null,
        motherLastName: motherLastName || null,
        guardianFirstName: guardianFirstName || null,
        guardianLastName: guardianLastName || null,
        documents: Array.isArray(documents) ? documents : [],
      },
    });

    if (linkedParentIds.length > 0) {
      await Promise.all(linkedParentIds.map(async (parentId) => {
        const parentUser = await prisma.user.findUnique({ where: { id: parentId } });
        if (!parentUser) return;
        const currentChildren = Array.isArray(parentUser.parentChildIds) ? parentUser.parentChildIds : [];
        if (!currentChildren.includes(student.id)) {
          await prisma.user.update({ where: { id: parentId }, data: { parentChildIds: [...currentChildren, student.id] } });
        }
      }));
    }

    res.status(201).json({ message: 'Student enrolled successfully', student, parentAccounts, parentAccount: parentAccounts[0] || null });
  } catch (err) {
    console.error('Enroll student error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/student/:studentId', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const {
      firstName, lastName, dateOfBirth, enrollmentNumber, batchId, isActive,
      fatherFirstName, fatherLastName,
      motherFirstName, motherLastName,
      guardianFirstName, guardianLastName,
      documents,
      parentEmail, parentFirstName, parentLastName, parentPhone,
      secondParentEmail, secondParentFirstName, secondParentLastName, secondParentPhone,
    } = req.body;

    const existingStudent = await prisma.student.findUnique({ where: { id: req.params.studentId } });
    if (!existingStudent) return res.status(404).json({ error: 'Student not found' });

    let nextSchoolId = existingStudent.schoolId;
    let nextClassId = existingStudent.classId;
    let nextBatchId = existingStudent.batchId;

    if (batchId) {
      const targetBatch = await prisma.batch.findUnique({ where: { id: batchId } });
      if (!targetBatch) return res.status(404).json({ error: 'Selected batch not found' });
      nextSchoolId = targetBatch.schoolId;
      nextClassId = targetBatch.classId;
      nextBatchId = batchId;
    }

    const linkedParentIds = Array.isArray(existingStudent.parentIds) ? [...existingStudent.parentIds] : [];
    const parentAccounts = [];

    const primaryParent = await upsertParentByEmail({
      email: parentEmail,
      firstName: parentFirstName || fatherFirstName,
      lastName: parentLastName || fatherLastName,
      phone: parentPhone,
      schoolId: existingStudent.schoolId,
      fallbackFirstName: 'Parent',
      fallbackLastName: `${firstName || existingStudent.firstName} ${lastName || existingStudent.lastName}`,
    });
    if (primaryParent.parentUser && !linkedParentIds.includes(primaryParent.parentUser.id)) linkedParentIds.push(primaryParent.parentUser.id);
    if (primaryParent.accountInfo) parentAccounts.push(primaryParent.accountInfo);

    const secondaryParent = await upsertParentByEmail({
      email: secondParentEmail,
      firstName: secondParentFirstName || motherFirstName,
      lastName: secondParentLastName || motherLastName,
      phone: secondParentPhone,
      schoolId: existingStudent.schoolId,
      fallbackFirstName: 'Guardian',
      fallbackLastName: `${firstName || existingStudent.firstName} ${lastName || existingStudent.lastName}`,
    });
    if (secondaryParent.parentUser && !linkedParentIds.includes(secondaryParent.parentUser.id)) linkedParentIds.push(secondaryParent.parentUser.id);
    if (secondaryParent.accountInfo) parentAccounts.push(secondaryParent.accountInfo);

    const student = await prisma.student.update({
      where: { id: req.params.studentId },
      data: {
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        dateOfBirth: dateOfBirth !== undefined ? (dateOfBirth ? new Date(dateOfBirth) : null) : undefined,
        enrollmentNumber: enrollmentNumber !== undefined ? (enrollmentNumber || null) : undefined,
        schoolId: nextSchoolId,
        classId: nextClassId,
        batchId: nextBatchId,
        isActive: isActive !== undefined ? isActive : undefined,
        parentIds: linkedParentIds,
        fatherFirstName: fatherFirstName !== undefined ? fatherFirstName : undefined,
        fatherLastName: fatherLastName !== undefined ? fatherLastName : undefined,
        motherFirstName: motherFirstName !== undefined ? motherFirstName : undefined,
        motherLastName: motherLastName !== undefined ? motherLastName : undefined,
        guardianFirstName: guardianFirstName !== undefined ? guardianFirstName : undefined,
        guardianLastName: guardianLastName !== undefined ? guardianLastName : undefined,
        documents: documents !== undefined ? documents : undefined,
      },
    });

    if (linkedParentIds.length > 0) {
      await Promise.all(linkedParentIds.map(async (parentId) => {
        const parentUser = await prisma.user.findUnique({ where: { id: parentId } });
        if (!parentUser) return;
        const currentChildren = Array.isArray(parentUser.parentChildIds) ? parentUser.parentChildIds : [];
        if (!currentChildren.includes(student.id)) {
          await prisma.user.update({ where: { id: parentId }, data: { parentChildIds: [...currentChildren, student.id] } });
        }
      }));
    }

    res.json({ message: 'Student updated successfully', student, parentAccounts });
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/circulars', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const user = await getCurrentSchoolUser(req.userId);
    const circulars = await prisma.circular.findMany({ where: { schoolId: user.schoolId }, orderBy: { createdAt: 'desc' } });
    res.json(circulars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/circulars/feed', auth, authorize(['school_admin', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, role: true, schoolId: true } });
    let schoolId = user?.schoolId || null;

    if (user?.role === 'parent' && !schoolId) {
      const child = await prisma.student.findFirst({ where: { parentIds: { array_contains: req.userId } }, select: { schoolId: true } });
      schoolId = child?.schoolId || null;
    }

    if (!schoolId) return res.json([]);

    const circulars = await prisma.circular.findMany({
      where: { isPublished: true, schoolId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(circulars);
  } catch (err) {
    console.error('Circular feed error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/circular', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const { title, description, content, circularType, expiryDate } = req.body;
    const user = await getCurrentSchoolUser(req.userId);
    if (!title || !description) return res.status(400).json({ error: 'Title and description are required' });
    const circular = await prisma.circular.create({
      data: {
        title,
        description,
        content: content || '',
        circularType: circularType || 'general',
        adminId: req.userId,
        schoolId: user.schoolId,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isPublished: true,
      },
    });
    res.status(201).json({ message: 'Circular created', circular });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/circular/:circularId', auth, authorize(['school_admin']), async (req, res) => {
  try {
    await prisma.circular.delete({ where: { id: req.params.circularId } });
    res.json({ message: 'Circular deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Pickup Requests (admin management) ─────────────────────────────────────

router.get('/pickup-requests', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const user = await getCurrentSchoolUser(req.userId);
    const requests = await prisma.pickupRequest.findMany({
      where: { schoolId: user.schoolId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/pickup-request/:requestId', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }
    const updated = await prisma.pickupRequest.update({
      where: { id: req.params.requestId },
      data: { status, adminNotes: adminNotes || null },
    });
    res.json({ message: `Request ${status}`, request: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
