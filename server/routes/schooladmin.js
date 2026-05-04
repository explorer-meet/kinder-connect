const express = require('express');
const bcrypt = require('bcryptjs');
const { auth, authorize } = require('../middleware/auth');
const { pool, query, queryOne, newId, parseJ, toJ } = require('../src/lib/db');
const { sendMailSafe } = require('../src/lib/mailer');

const router = express.Router();

const getCurrentSchoolUser = async (userId) =>
  queryOne('SELECT id, schoolId, role FROM `user` WHERE id = ? LIMIT 1', [userId]);

const upsertParentByEmail = async ({ email, firstName, lastName, phone, schoolId, fallbackFirstName, fallbackLastName }) => {
  const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
  if (!normalizedEmail) return { parentUser: null, accountInfo: null };

  let parentUser = await queryOne('SELECT * FROM `user` WHERE email = ? LIMIT 1', [normalizedEmail]);
  if (parentUser && parentUser.role !== 'parent') {
    throw new Error(`Provided parent email (${normalizedEmail}) belongs to a non-parent account`);
  }

  if (!parentUser) {
    const defaultParentPassword = process.env.DEFAULT_PARENT_PASSWORD || 'Parent@123';
    const hashedPassword = await bcrypt.hash(defaultParentPassword, 10);
    const id = newId();
    await query(
      "INSERT INTO `user` (id, firstName, lastName, email, phone, password, role, schoolId, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'parent', ?, 1, NOW(), NOW())",
      [id, firstName || fallbackFirstName || 'Parent', lastName || fallbackLastName || 'User', normalizedEmail, phone || '', hashedPassword, schoolId || null]
    );
    parentUser = await queryOne('SELECT * FROM `user` WHERE id = ? LIMIT 1', [id]);
    return { parentUser, accountInfo: { email: normalizedEmail, password: defaultParentPassword, isNewAccount: true } };
  }

  return { parentUser, accountInfo: { email: normalizedEmail, isNewAccount: false } };
};

router.get('/school', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const user = await getCurrentSchoolUser(req.userId);
    if (!user?.schoolId) return res.status(400).json({ error: 'School admin is not linked to a school' });

    const school = await queryOne('SELECT * FROM school WHERE id = ? LIMIT 1', [user.schoolId]);
    if (!school) return res.status(404).json({ error: 'School not found' });

    const classes = await query('SELECT * FROM `class` WHERE schoolId = ? ORDER BY name ASC, section ASC', [user.schoolId]);
    const batches = classes.length ? await query(
      `SELECT * FROM batch WHERE classId IN (${classes.map(() => '?').join(',')}) ORDER BY createdAt ASC`,
      classes.map(c => c.id)
    ) : [];

    const batchMap = {};
    batches.forEach(b => { (batchMap[b.classId] = batchMap[b.classId] || []).push(b); });
    school.classes = classes.map(c => ({ ...c, batches: batchMap[c.id] || [] }));

    res.json(school);
  } catch (err) {
    console.error('Get school error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const user = await getCurrentSchoolUser(req.userId);
    const schoolId = user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'School admin is not linked to a school' });

    const [totalStaff, totalStudents, totalClasses, totalBatches] = await Promise.all([
      queryOne("SELECT COUNT(*) AS cnt FROM `user` WHERE schoolId = ? AND role = 'teacher'", [schoolId]),
      queryOne('SELECT COUNT(*) AS cnt FROM student WHERE schoolId = ?', [schoolId]),
      queryOne('SELECT COUNT(*) AS cnt FROM `class` WHERE schoolId = ?', [schoolId]),
      queryOne('SELECT COUNT(*) AS cnt FROM batch WHERE schoolId = ?', [schoolId]),
    ]);

    res.json({ totalStaff: totalStaff.cnt, totalStudents: totalStudents.cnt, totalClasses: totalClasses.cnt, totalBatches: totalBatches.cnt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/staff', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const user = await getCurrentSchoolUser(req.userId);
    const staff = await query(
      "SELECT id, firstName, lastName, email, phone, role, photo, isActive, address, qualification, dateOfJoining, emergencyContactName, emergencyContactPhone, staffDocuments FROM `user` WHERE schoolId = ? AND role = 'teacher' ORDER BY firstName ASC, lastName ASC",
      [user.schoolId]
    );
    res.json(staff.map(s => ({ ...s, staffDocuments: parseJ(s.staffDocuments) || [] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/staff', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, role, password, photo,
      address, qualification, dateOfJoining, emergencyContactName, emergencyContactPhone, staffDocuments } = req.body;
    const currentUser = await getCurrentSchoolUser(req.userId);
    if (!firstName || !lastName || !email || !role) return res.status(400).json({ error: 'All fields are required' });

    const existingUser = await queryOne('SELECT id FROM `user` WHERE email = ? LIMIT 1', [email]);
    if (existingUser) return res.status(400).json({ error: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password || 'temp123', 10);
    const id = newId();
    await query(
      'INSERT INTO `user` (id, firstName, lastName, email, phone, photo, address, qualification, dateOfJoining, emergencyContactName, emergencyContactPhone, staffDocuments, password, role, schoolId, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
      [id, firstName, lastName, email, phone || '', photo || null, address || null, qualification || null, dateOfJoining ? new Date(dateOfJoining) : null, emergencyContactName || null, emergencyContactPhone || null, toJ(staffDocuments || []), hashedPassword, role, currentUser?.schoolId || null]
    );
    const staff = await queryOne('SELECT * FROM `user` WHERE id = ?', [id]);

    await sendMailSafe({
      to: staff.email,
      subject: 'Your Kinder Connect staff account is ready',
      text: `Hello ${staff.firstName}, your staff account has been created for ${role}. Email: ${staff.email}. Temporary password: ${password || 'temp123'}`,
    });

    res.status(201).json({ message: 'Staff added successfully', staff });
  } catch (err) {
    console.error('Add staff error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/staff/:staffId', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const { firstName, lastName, phone, role, photo, isActive,
      address, qualification, dateOfJoining, emergencyContactName, emergencyContactPhone, staffDocuments } = req.body;

    const sets = [], vals = [];
    if (firstName !== undefined)              { sets.push('firstName = ?');              vals.push(firstName); }
    if (lastName !== undefined)               { sets.push('lastName = ?');               vals.push(lastName); }
    if (phone !== undefined)                  { sets.push('phone = ?');                  vals.push(phone); }
    if (role !== undefined)                   { sets.push('role = ?');                   vals.push(role); }
    if (photo !== undefined)                  { sets.push('photo = ?');                  vals.push(photo); }
    if (isActive !== undefined)               { sets.push('isActive = ?');               vals.push(isActive ? 1 : 0); }
    if (address !== undefined)                { sets.push('address = ?');                vals.push(address); }
    if (qualification !== undefined)          { sets.push('qualification = ?');          vals.push(qualification); }
    if (dateOfJoining !== undefined)          { sets.push('dateOfJoining = ?');          vals.push(dateOfJoining ? new Date(dateOfJoining) : null); }
    if (emergencyContactName !== undefined)   { sets.push('emergencyContactName = ?');   vals.push(emergencyContactName); }
    if (emergencyContactPhone !== undefined)  { sets.push('emergencyContactPhone = ?');  vals.push(emergencyContactPhone); }
    if (staffDocuments !== undefined)         { sets.push('staffDocuments = ?');         vals.push(JSON.stringify(staffDocuments)); }
    sets.push('updatedAt = NOW()');
    vals.push(req.params.staffId);

    await query(`UPDATE \`user\` SET ${sets.join(', ')} WHERE id = ?`, vals);
    const staff = await queryOne('SELECT * FROM `user` WHERE id = ?', [req.params.staffId]);
    res.json({ message: 'Staff updated', staff });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/staff/:staffId', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const staff = await queryOne('SELECT id, firstName, lastName FROM `user` WHERE id = ? LIMIT 1', [req.params.staffId]);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    await query('DELETE FROM `user` WHERE id = ?', [req.params.staffId]);
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

    const classes = await query('SELECT * FROM `class` WHERE schoolId = ? ORDER BY name ASC, section ASC', [user.schoolId]);
    if (!classes.length) return res.json([]);

    const batches = await query(
      `SELECT * FROM batch WHERE classId IN (${classes.map(() => '?').join(',')}) ORDER BY createdAt ASC`,
      classes.map(c => c.id)
    );

    const batchMap = {};
    batches.forEach(b => { (batchMap[b.classId] = batchMap[b.classId] || []).push(b); });

    const batchIds = batches.map(b => b.id);
    const students = batchIds.length ? await query(
      `SELECT id, firstName, lastName, enrollmentNumber, isActive, batchId FROM student WHERE batchId IN (${batchIds.map(() => '?').join(',')}) ORDER BY firstName ASC, lastName ASC`,
      batchIds
    ) : [];

    const studentMap = {};
    students.forEach(s => { (studentMap[s.batchId] = studentMap[s.batchId] || []).push(s); });

    res.json(classes.map(c => ({
      ...c,
      batches: (batchMap[c.id] || []).map(b => ({ ...b, students: studentMap[b.id] || [] })),
    })));
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

    const existingClass = await queryOne('SELECT id FROM `class` WHERE schoolId = ? AND name = ? AND section = ? LIMIT 1', [user.schoolId, name, section || null]);
    if (existingClass) return res.status(400).json({ error: 'Class already exists in this school' });

    const id = newId();
    await query('INSERT INTO `class` (id, schoolId, name, section, capacity, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [id, user.schoolId, name, section || '', capacity ? parseInt(capacity, 10) : null]);

    const classObj = await queryOne('SELECT * FROM `class` WHERE id = ?', [id]);
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
    if (!classId || !shiftName || !user?.schoolId) return res.status(400).json({ error: 'Class and shift name are required' });

    const classObj = await queryOne('SELECT id, schoolId FROM `class` WHERE id = ? LIMIT 1', [classId]);
    if (!classObj || classObj.schoolId !== user.schoolId) return res.status(404).json({ error: 'Class not found' });

    const existingBatch = await queryOne('SELECT id FROM batch WHERE classId = ? AND shiftName = ? LIMIT 1', [classId, shiftName]);
    if (existingBatch) return res.status(400).json({ error: 'Batch with this shift already exists for this class' });

    const id = newId();
    await query('INSERT INTO batch (id, schoolId, classId, shiftName, startTime, endTime, capacity, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [id, user.schoolId, classId, shiftName, startTime || '09:00 AM', endTime || '12:00 PM', capacity ? parseInt(capacity, 10) : null]);

    const batch = await queryOne('SELECT * FROM batch WHERE id = ?', [id]);
    res.status(201).json({ message: 'Batch created successfully', batch });
  } catch (err) {
    console.error('Create batch error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/batch/:batchId', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const studentCount = await queryOne('SELECT COUNT(*) AS cnt FROM student WHERE batchId = ?', [req.params.batchId]);
    if (studentCount.cnt > 0) return res.status(400).json({ error: 'Cannot delete batch with students. Please delete students first.' });
    const batch = await queryOne('SELECT * FROM batch WHERE id = ? LIMIT 1', [req.params.batchId]);
    await query('DELETE FROM batch WHERE id = ?', [req.params.batchId]);
    res.json({ message: 'Batch deleted successfully', batch });
  } catch (err) {
    console.error('Delete batch error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/students', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const user = await getCurrentSchoolUser(req.userId);
    const students = await query(
      `SELECT s.*, sc.id AS schoolRelId, sc.name AS schoolName, c.id AS classRelId, c.name AS className, c.section, b.id AS batchRelId, b.shiftName, b.startTime AS batchStartTime, b.endTime AS batchEndTime
       FROM student s
       LEFT JOIN school sc ON s.schoolId = sc.id
       LEFT JOIN \`class\` c ON s.classId = c.id
       LEFT JOIN batch b ON s.batchId = b.id
       WHERE s.schoolId = ? ORDER BY s.createdAt DESC`,
      [user.schoolId]
    );
    res.json(students.map(s => ({
      ...s,
      parentIds: parseJ(s.parentIds) || [],
      allergies: parseJ(s.allergies) || [],
      documents: parseJ(s.documents) || [],
      school: s.schoolRelId ? { id: s.schoolRelId, name: s.schoolName } : null,
      class: s.classRelId ? { id: s.classRelId, name: s.className, section: s.section } : null,
      batch: s.batchRelId ? { id: s.batchRelId, shiftName: s.shiftName, startTime: s.batchStartTime, endTime: s.batchEndTime } : null,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/batch/:batchId/student', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const {
      firstName, lastName, dateOfBirth, enrollmentNumber, parentIds,
      photo,
      fatherFirstName, fatherLastName,
      motherFirstName, motherLastName,
      guardianFirstName, guardianLastName,
      documents,
      parentEmail, parentFirstName, parentLastName, parentPhone,
      secondParentEmail, secondParentFirstName, secondParentLastName, secondParentPhone,
    } = req.body;

    const batch = await queryOne('SELECT * FROM batch WHERE id = ? LIMIT 1', [req.params.batchId]);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (!firstName || !lastName) return res.status(400).json({ error: 'Student firstName and lastName are required' });

    const linkedParentIds = Array.isArray(parentIds) ? [...parentIds] : [];
    const parentAccounts = [];

    const primaryParent = await upsertParentByEmail({
      email: parentEmail, firstName: parentFirstName || fatherFirstName, lastName: parentLastName || fatherLastName,
      phone: parentPhone, schoolId: batch.schoolId, fallbackFirstName: 'Parent', fallbackLastName: `${firstName} ${lastName}`,
    });
    if (primaryParent.parentUser && !linkedParentIds.includes(primaryParent.parentUser.id)) linkedParentIds.push(primaryParent.parentUser.id);
    if (primaryParent.accountInfo) parentAccounts.push(primaryParent.accountInfo);

    const secondaryParent = await upsertParentByEmail({
      email: secondParentEmail, firstName: secondParentFirstName || motherFirstName, lastName: secondParentLastName || motherLastName,
      phone: secondParentPhone, schoolId: batch.schoolId, fallbackFirstName: 'Guardian', fallbackLastName: `${firstName} ${lastName}`,
    });
    if (secondaryParent.parentUser && !linkedParentIds.includes(secondaryParent.parentUser.id)) linkedParentIds.push(secondaryParent.parentUser.id);
    if (secondaryParent.accountInfo) parentAccounts.push(secondaryParent.accountInfo);

    const id = newId();
    await query(
      'INSERT INTO student (id, firstName, lastName, dateOfBirth, enrollmentNumber, photo, schoolId, classId, batchId, parentIds, fatherFirstName, fatherLastName, motherFirstName, motherLastName, guardianFirstName, guardianLastName, documents, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
      [id, firstName, lastName, dateOfBirth ? new Date(dateOfBirth) : null, enrollmentNumber || `STU-${Date.now()}`, photo || null, batch.schoolId, batch.classId, req.params.batchId, JSON.stringify(linkedParentIds), fatherFirstName || null, fatherLastName || null, motherFirstName || null, motherLastName || null, guardianFirstName || null, guardianLastName || null, JSON.stringify(Array.isArray(documents) ? documents : [])]
    );
    const student = await queryOne('SELECT * FROM student WHERE id = ?', [id]);

    if (linkedParentIds.length > 0) {
      await Promise.all(linkedParentIds.map(async (parentId) => {
        const parentUser = await queryOne('SELECT id, parentChildIds FROM `user` WHERE id = ? LIMIT 1', [parentId]);
        if (!parentUser) return;
        const currentChildren = parseJ(parentUser.parentChildIds) || [];
        if (!currentChildren.includes(id)) {
          await query('UPDATE `user` SET parentChildIds = ?, updatedAt = NOW() WHERE id = ?', [JSON.stringify([...currentChildren, id]), parentId]);
        }
      }));
    }

    if (parentAccounts.length > 0) {
      await Promise.all(parentAccounts.map((p) => sendMailSafe({
        to: p.email,
        subject: `Child enrollment update: ${firstName} ${lastName}`,
        text: p.isNewAccount
          ? `Your child ${firstName} ${lastName} has been enrolled. Login email: ${p.email}. Temporary password: ${p.password}`
          : `Your child ${firstName} ${lastName} has been enrolled and linked to your existing account (${p.email}).`,
      })));
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
      photo, fatherFirstName, fatherLastName, motherFirstName, motherLastName,
      guardianFirstName, guardianLastName, documents,
      parentEmail, parentFirstName, parentLastName, parentPhone,
      secondParentEmail, secondParentFirstName, secondParentLastName, secondParentPhone,
    } = req.body;

    const existingStudent = await queryOne('SELECT * FROM student WHERE id = ? LIMIT 1', [req.params.studentId]);
    if (!existingStudent) return res.status(404).json({ error: 'Student not found' });

    let nextSchoolId = existingStudent.schoolId;
    let nextClassId = existingStudent.classId;
    let nextBatchId = existingStudent.batchId;

    if (batchId) {
      const targetBatch = await queryOne('SELECT * FROM batch WHERE id = ? LIMIT 1', [batchId]);
      if (!targetBatch) return res.status(404).json({ error: 'Selected batch not found' });
      nextSchoolId = targetBatch.schoolId;
      nextClassId = targetBatch.classId;
      nextBatchId = batchId;
    }

    const linkedParentIds = parseJ(existingStudent.parentIds) || [];
    const parentAccounts = [];

    const primaryParent = await upsertParentByEmail({
      email: parentEmail, firstName: parentFirstName || fatherFirstName, lastName: parentLastName || fatherLastName,
      phone: parentPhone, schoolId: existingStudent.schoolId,
      fallbackFirstName: 'Parent', fallbackLastName: `${firstName || existingStudent.firstName} ${lastName || existingStudent.lastName}`,
    });
    if (primaryParent.parentUser && !linkedParentIds.includes(primaryParent.parentUser.id)) linkedParentIds.push(primaryParent.parentUser.id);
    if (primaryParent.accountInfo) parentAccounts.push(primaryParent.accountInfo);

    const secondaryParent = await upsertParentByEmail({
      email: secondParentEmail, firstName: secondParentFirstName || motherFirstName, lastName: secondParentLastName || motherLastName,
      phone: secondParentPhone, schoolId: existingStudent.schoolId,
      fallbackFirstName: 'Guardian', fallbackLastName: `${firstName || existingStudent.firstName} ${lastName || existingStudent.lastName}`,
    });
    if (secondaryParent.parentUser && !linkedParentIds.includes(secondaryParent.parentUser.id)) linkedParentIds.push(secondaryParent.parentUser.id);
    if (secondaryParent.accountInfo) parentAccounts.push(secondaryParent.accountInfo);

    const sets = [], vals = [];
    if (firstName !== undefined)        { sets.push('firstName = ?');        vals.push(firstName); }
    if (lastName !== undefined)         { sets.push('lastName = ?');         vals.push(lastName); }
    if (dateOfBirth !== undefined)      { sets.push('dateOfBirth = ?');      vals.push(dateOfBirth ? new Date(dateOfBirth) : null); }
    if (enrollmentNumber !== undefined) { sets.push('enrollmentNumber = ?'); vals.push(enrollmentNumber || null); }
    if (photo !== undefined)            { sets.push('photo = ?');            vals.push(photo); }
    if (isActive !== undefined)         { sets.push('isActive = ?');         vals.push(isActive ? 1 : 0); }
    if (fatherFirstName !== undefined)  { sets.push('fatherFirstName = ?');  vals.push(fatherFirstName); }
    if (fatherLastName !== undefined)   { sets.push('fatherLastName = ?');   vals.push(fatherLastName); }
    if (motherFirstName !== undefined)  { sets.push('motherFirstName = ?');  vals.push(motherFirstName); }
    if (motherLastName !== undefined)   { sets.push('motherLastName = ?');   vals.push(motherLastName); }
    if (guardianFirstName !== undefined){ sets.push('guardianFirstName = ?'); vals.push(guardianFirstName); }
    if (guardianLastName !== undefined) { sets.push('guardianLastName = ?'); vals.push(guardianLastName); }
    if (documents !== undefined)        { sets.push('documents = ?');        vals.push(JSON.stringify(documents)); }
    sets.push('schoolId = ?', 'classId = ?', 'batchId = ?', 'parentIds = ?', 'updatedAt = NOW()');
    vals.push(nextSchoolId, nextClassId, nextBatchId, JSON.stringify(linkedParentIds), req.params.studentId);

    await query(`UPDATE student SET ${sets.join(', ')} WHERE id = ?`, vals);

    const student = await queryOne('SELECT * FROM student WHERE id = ?', [req.params.studentId]);

    if (linkedParentIds.length > 0) {
      await Promise.all(linkedParentIds.map(async (parentId) => {
        const parentUser = await queryOne('SELECT id, parentChildIds FROM `user` WHERE id = ? LIMIT 1', [parentId]);
        if (!parentUser) return;
        const currentChildren = parseJ(parentUser.parentChildIds) || [];
        if (!currentChildren.includes(req.params.studentId)) {
          await query('UPDATE `user` SET parentChildIds = ?, updatedAt = NOW() WHERE id = ?', [JSON.stringify([...currentChildren, req.params.studentId]), parentId]);
        }
      }));
    }

    if (parentAccounts.length > 0) {
      await Promise.all(parentAccounts.map((p) => sendMailSafe({
        to: p.email,
        subject: `Child profile updated: ${student.firstName} ${student.lastName}`,
        text: `A school admin updated enrollment details for ${student.firstName} ${student.lastName}.`,
      })));
    }

    res.json({ message: 'Student updated successfully', student, parentAccounts });
  } catch (err) {
    console.error('UPDATE student error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/circulars', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const user = await getCurrentSchoolUser(req.userId);
    const circulars = await query('SELECT * FROM circular WHERE schoolId = ? ORDER BY createdAt DESC', [user.schoolId]);
    res.json(circulars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/circulars/feed', auth, authorize(['school_admin', 'teacher', 'parent']), async (req, res) => {
  try {
    const user = await queryOne('SELECT id, role, schoolId FROM `user` WHERE id = ? LIMIT 1', [req.userId]);
    let schoolId = user?.schoolId || null;

    if (user?.role === 'parent' && !schoolId) {
      const child = await queryOne('SELECT schoolId FROM student WHERE JSON_CONTAINS(parentIds, JSON_QUOTE(?)) LIMIT 1', [req.userId]);
      schoolId = child?.schoolId || null;
    }

    if (!schoolId) return res.json([]);

    const circulars = await query('SELECT * FROM circular WHERE isPublished = 1 AND schoolId = ? ORDER BY createdAt DESC LIMIT 50', [schoolId]);
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
    const id = newId();
    await query('INSERT INTO circular (id, title, description, content, circularType, adminId, schoolId, expiryDate, isPublished, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
      [id, title, description, content || '', circularType || 'general', req.userId, user.schoolId, expiryDate ? new Date(expiryDate) : null]);
    const circular = await queryOne('SELECT * FROM circular WHERE id = ?', [id]);
    res.status(201).json({ message: 'Circular created', circular });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/circular/:circularId', auth, authorize(['school_admin']), async (req, res) => {
  try {
    await query('DELETE FROM circular WHERE id = ?', [req.params.circularId]);
    res.json({ message: 'Circular deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pickup-requests', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const user = await getCurrentSchoolUser(req.userId);
    const requests = await query('SELECT pr.*, s.id AS studentRelId, s.firstName AS studentFirstName, s.lastName AS studentLastName FROM pickuprequest pr LEFT JOIN student s ON pr.studentId = s.id WHERE pr.schoolId = ? ORDER BY pr.createdAt DESC', [user.schoolId]);
    res.json(requests.map(r => ({
      ...r,
      student: r.studentRelId ? { id: r.studentRelId, firstName: r.studentFirstName, lastName: r.studentLastName } : null,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/pickup-request/:requestId', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Status must be approved or rejected' });
    await query('UPDATE pickuprequest SET status = ?, adminNotes = ?, updatedAt = NOW() WHERE id = ?', [status, adminNotes || null, req.params.requestId]);
    const updated = await queryOne('SELECT * FROM pickuprequest WHERE id = ?', [req.params.requestId]);
    res.json({ message: `Request ${status}`, request: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ptm-requests', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const user = await getCurrentSchoolUser(req.userId);
    const requests = await query('SELECT * FROM ptmrequest WHERE schoolId = ? ORDER BY createdAt DESC', [user.schoolId]);

    const studentIds = [...new Set(requests.map(r => r.studentId).filter(Boolean))];
    const parentIds  = [...new Set(requests.map(r => r.parentId).filter(Boolean))];
    const teacherIds = [...new Set(requests.map(r => r.teacherId).filter(Boolean))];

    const inList = (ids) => ids.map(() => '?').join(',');

    const [students, parents, teachers] = await Promise.all([
      studentIds.length ? query(`SELECT id, firstName, lastName, batchId FROM student WHERE id IN (${inList(studentIds)})`, studentIds) : [],
      parentIds.length  ? query(`SELECT id, firstName, lastName, email, phone FROM \`user\` WHERE id IN (${inList(parentIds)})`, parentIds)  : [],
      teacherIds.length ? query(`SELECT id, firstName, lastName FROM \`user\` WHERE id IN (${inList(teacherIds)})`, teacherIds) : [],
    ]);

    const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
    const parentMap  = Object.fromEntries(parents.map(p => [p.id, p]));
    const teacherMap = Object.fromEntries(teachers.map(t => [t.id, t]));

    res.json(requests.map(r => ({
      ...r,
      student: studentMap[r.studentId] || null,
      parent: parentMap[r.parentId] || null,
      teacherName: r.teacherId && teacherMap[r.teacherId]
        ? `${teacherMap[r.teacherId].firstName} ${teacherMap[r.teacherId].lastName}`
        : null,
    })));
  } catch (err) {
    console.error('Get PTM requests error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/ptm-request/:requestId', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const { status, meetingDate, startTime, endTime, location, adminNotes, teacherId } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Status must be approved or rejected' });
    if (status === 'approved' && (!meetingDate || !startTime || !endTime)) {
      return res.status(400).json({ error: 'meetingDate, startTime and endTime are required to approve a PTM request' });
    }
    await query('UPDATE ptmrequest SET status = ?, meetingDate = ?, startTime = ?, endTime = ?, location = ?, adminNotes = ?, teacherId = ?, updatedAt = NOW() WHERE id = ?',
      [status, meetingDate ? new Date(meetingDate) : null, startTime || null, endTime || null, location || null, adminNotes || null, teacherId || null, req.params.requestId]);
    const updated = await queryOne('SELECT * FROM ptmrequest WHERE id = ?', [req.params.requestId]);
    res.json({ message: `PTM request ${status}`, request: updated });
  } catch (err) {
    console.error('Update PTM request error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
