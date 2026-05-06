'use strict';
const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const { query, queryOne, newId, toJ } = require('../src/lib/db');
const { sendMailSafe } = require('../src/lib/mailer');

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

const getSchoolUser = (userId) =>
  queryOne('SELECT id, schoolId, firstName, lastName, role FROM `user` WHERE id = ? LIMIT 1', [userId]);

const logAudit = async ({ schoolId, actorId, actorName, actorRole, action, targetType = '', targetId = '', metadata = null, ip = '' }) => {
  try {
    await query(
      'INSERT INTO auditlog (id, schoolId, actorId, actorName, actorRole, action, targetType, targetId, metadata, ipAddress, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,NOW())',
      [newId(), schoolId, actorId, actorName, actorRole, action, targetType, targetId, toJ(metadata), ip]
    );
  } catch (_) { /* non-fatal */ }
};

const safeMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Number(num.toFixed(2));
};

const normalizeInstallments = (parts = []) => {
  if (!Array.isArray(parts)) return [];
  return parts
    .map((p, idx) => {
      const amount = safeMoney(p?.amount);
      const dueDate = p?.dueDate ? new Date(p.dueDate) : null;
      const dateOk = dueDate && !Number.isNaN(dueDate.getTime());
      if (!amount || !dateOk) return null;
      return {
        partLabel: String(p.partLabel || `Part ${idx + 1}`),
        amount,
        dueDate: dueDate.toISOString().slice(0, 10),
      };
    })
    .filter(Boolean);
};

// ── GET /fees — list fee reminders for the school ────────────────────────────
router.get('/', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const rows = await query(
      `SELECT fr.*, s.firstName AS studentFirst, s.lastName AS studentLast
       FROM feereminder fr
       JOIN student s ON CONVERT(s.id USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(fr.studentId USING utf8mb4) COLLATE utf8mb4_unicode_ci
       WHERE CONVERT(fr.schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?
       ORDER BY fr.dueDate ASC`,
      [u.schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /fees error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /fees/summary — KPI snapshot for fee collections ────────────────────
router.get('/summary', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const [statusRows, monthPaid] = await Promise.all([
      query(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
         FROM feereminder
         WHERE CONVERT(schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?
         GROUP BY status`,
        [u.schoolId]
      ),
      queryOne(
        `SELECT COALESCE(SUM(amount), 0) AS collected
         FROM feereminder
         WHERE CONVERT(schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?
           AND status = 'paid'
           AND YEAR(updatedAt) = YEAR(CURDATE())
           AND MONTH(updatedAt) = MONTH(CURDATE())`,
        [u.schoolId]
      ),
    ]);

    const summary = {
      pending: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      payment_submitted: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
    };

    statusRows.forEach((r) => {
      summary[r.status] = { count: Number(r.count || 0), amount: Number(r.amount || 0) };
    });

    res.json({
      summary,
      monthCollected: Number(monthPaid?.collected || 0),
    });
  } catch (err) {
    console.error('GET /fees/summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /fees/structures — list class/batch fee structures ──────────────────
router.get('/structures', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const rows = await query(
      `SELECT fs.*, c.name AS className, c.section AS classSection,
              b.shiftName AS batchShiftName,
              COALESCE(frAgg.reminderCount, 0) AS reminderCount,
              COALESCE(frAgg.paidCount, 0) AS paidCount
       FROM feestructure fs
       JOIN \`class\` c ON CONVERT(c.id USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(fs.classId USING utf8mb4) COLLATE utf8mb4_unicode_ci
       LEFT JOIN batch b ON CONVERT(b.id USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(fs.batchId USING utf8mb4) COLLATE utf8mb4_unicode_ci
       LEFT JOIN (
         SELECT feeStructureId,
                COUNT(*) AS reminderCount,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paidCount
         FROM feereminder
         GROUP BY feeStructureId
       ) frAgg ON CONVERT(frAgg.feeStructureId USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(fs.id USING utf8mb4) COLLATE utf8mb4_unicode_ci
       WHERE CONVERT(fs.schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?
       ORDER BY fs.createdAt DESC`,
      [u.schoolId]
    );

    res.json(rows.map((r) => ({
      ...r,
      installments: (() => {
        if (Array.isArray(r.installments)) return r.installments;
        if (r.installments && typeof r.installments === 'object') return [r.installments].flat();
        try { return JSON.parse(r.installments || '[]'); } catch (_) { return []; }
      })(),
      reminderCount: Number(r.reminderCount || 0),
      paidCount: Number(r.paidCount || 0),
      totalAmount: Number(r.totalAmount || r.amount || 0),
      scopeLabel: r.batchId ? `${r.className}${r.classSection ? ` (${r.classSection})` : ''} - ${r.batchShiftName}` : `${r.className}${r.classSection ? ` (${r.classSection})` : ''} - All Batches`,
    })));
  } catch (err) {
    console.error('GET /fees/structures error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /fees/structures — create class/batch structure and apply to students ──
router.post('/structures', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const { classId, batchId, title, amount, dueDate, description, installmentParts } = req.body;
    if (!classId || !title) {
      return res.status(400).json({ error: 'classId and title are required' });
    }

    let installments = normalizeInstallments(installmentParts);
    if (!installments.length && amount && dueDate) {
      const oneAmount = safeMoney(amount);
      const oneDate = new Date(dueDate);
      if (oneAmount && !Number.isNaN(oneDate.getTime())) {
        installments = [{ partLabel: 'Part 1', amount: oneAmount, dueDate: oneDate.toISOString().slice(0, 10) }];
      }
    }
    if (!installments.length) return res.status(400).json({ error: 'Provide valid installmentParts with amount and dueDate' });

    const totalAmount = Number(installments.reduce((s, p) => s + Number(p.amount), 0).toFixed(2));
    const primaryDueDate = installments[0].dueDate;

    const classRow = await queryOne(
      'SELECT id, schoolId, name, section FROM `class` WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? LIMIT 1',
      [classId]
    );
    if (!classRow || String(classRow.schoolId) !== String(u.schoolId)) {
      return res.status(404).json({ error: 'Class not found in your school' });
    }

    let batchRow = null;
    if (batchId) {
      batchRow = await queryOne(
        'SELECT id, classId, schoolId, shiftName FROM batch WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? LIMIT 1',
        [batchId]
      );
      if (!batchRow || String(batchRow.schoolId) !== String(u.schoolId) || String(batchRow.classId) !== String(classId)) {
        return res.status(404).json({ error: 'Batch not found for selected class' });
      }
    }

    const structureId = newId();
    await query(
      'INSERT INTO feestructure (id, schoolId, classId, batchId, title, amount, totalAmount, dueDate, installments, description, isActive, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())',
      [structureId, u.schoolId, classId, batchId || null, title, totalAmount, totalAmount, primaryDueDate, JSON.stringify(installments), description || '', u.id]
    );

    const students = await query(
      `SELECT id
       FROM student
       WHERE CONVERT(schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?
         AND CONVERT(classId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?
         AND isActive = 1
         ${batchId ? 'AND CONVERT(batchId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?' : ''}`,
      batchId ? [u.schoolId, classId, batchId] : [u.schoolId, classId]
    );

    let createdReminders = 0;

    // Get today's date (without time) for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const student of students) {
      // Create student-feestructure binding
      const bindingId = newId();
      await query(
        'INSERT INTO studentfeestructure (id, studentId, feeStructureId, schoolId, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, NOW(), NOW())',
        [bindingId, student.id, structureId, u.schoolId]
      ).catch(() => {}); // Ignore if already exists (duplicate)

      for (const part of installments) {
        // Only create reminders for installment parts with past or current due dates
        const partDueDate = new Date(part.dueDate);
        partDueDate.setHours(0, 0, 0, 0);

        if (partDueDate > today) {
          // Skip future parts; reminder will be created when date becomes current
          continue;
        }

        const reminderId = newId();
        const partDescription = `${title} - ${part.partLabel}${description?.trim() ? ` (${description.trim()})` : ''}`;
        await query(
          'INSERT INTO feereminder (id, schoolId, studentId, feeStructureId, amount, dueDate, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, \'pending\', NOW(), NOW())',
          [reminderId, u.schoolId, student.id, structureId, part.amount, part.dueDate, partDescription]
        );
        createdReminders += 1;
      }
    }

    await logAudit({
      schoolId: u.schoolId,
      actorId: u.id,
      actorName: `${u.firstName} ${u.lastName}`,
      actorRole: u.role,
      action: 'fee_structure_created',
      targetType: 'feestructure',
      targetId: structureId,
      metadata: { classId, batchId: batchId || null, totalAmount, installments, createdReminders },
      ip: req.ip,
    });

    const created = await queryOne('SELECT * FROM feestructure WHERE id = ? LIMIT 1', [structureId]);
    res.status(201).json({
      structure: created,
      appliedToStudents: createdReminders,
      message: `Fee structure created and applied to ${createdReminders} student(s).`,
    });
  } catch (err) {
    console.error('POST /fees/structures error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /fees/structures/:id — update fee structure and installments ────────
router.put('/structures/:id', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const { id } = req.params;
    const { classId, batchId, title, description, installmentParts } = req.body;

    if (!classId || !title) {
      return res.status(400).json({ error: 'classId and title are required' });
    }

    let installments = normalizeInstallments(installmentParts);
    if (!installments.length) return res.status(400).json({ error: 'Provide valid installmentParts with amount and dueDate' });

    const totalAmount = Number(installments.reduce((s, p) => s + Number(p.amount), 0).toFixed(2));
    const primaryDueDate = installments[0].dueDate;

    // Verify the structure exists and belongs to this school
    const existing = await queryOne(
      'SELECT id, schoolId FROM feestructure WHERE id = ? LIMIT 1',
      [id]
    );
    if (!existing || String(existing.schoolId) !== String(u.schoolId)) {
      return res.status(404).json({ error: 'Fee structure not found' });
    }

    // Verify class and batch
    const classRow = await queryOne(
      'SELECT id, schoolId FROM `class` WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? LIMIT 1',
      [classId]
    );
    if (!classRow || String(classRow.schoolId) !== String(u.schoolId)) {
      return res.status(404).json({ error: 'Class not found in your school' });
    }

    if (batchId) {
      const batchRow = await queryOne(
        'SELECT id, schoolId FROM batch WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? LIMIT 1',
        [batchId]
      );
      if (!batchRow || String(batchRow.schoolId) !== String(u.schoolId)) {
        return res.status(404).json({ error: 'Batch not found' });
      }
    }

    // Update the structure
    await query(
      'UPDATE feestructure SET classId = ?, batchId = ?, title = ?, description = ?, amount = ?, totalAmount = ?, dueDate = ?, installments = ?, updatedAt = NOW() WHERE id = ?',
      [classId, batchId || null, title, description || '', totalAmount, totalAmount, primaryDueDate, JSON.stringify(installments), id]
    );

    await logAudit({
      schoolId: u.schoolId,
      actorId: u.id,
      actorName: `${u.firstName} ${u.lastName}`,
      actorRole: u.role,
      action: 'fee_structure_updated',
      targetType: 'feestructure',
      targetId: id,
      metadata: { classId, batchId: batchId || null, totalAmount, installments },
      ip: req.ip,
    });

    const updated = await queryOne('SELECT * FROM feestructure WHERE id = ? LIMIT 1', [id]);
    res.json({
      structure: updated,
      message: 'Fee structure updated successfully.',
    });
  } catch (err) {
    console.error('PUT /fees/structures/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /fees/structures/:id — delete fee structure ──────────────────────
router.delete('/structures/:id', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const { id } = req.params;

    // Verify the structure exists and belongs to this school
    const existing = await queryOne(
      'SELECT id, schoolId, title FROM feestructure WHERE id = ? LIMIT 1',
      [id]
    );
    if (!existing || String(existing.schoolId) !== String(u.schoolId)) {
      return res.status(404).json({ error: 'Fee structure not found' });
    }

    // Delete the fee structure
    await query('DELETE FROM feestructure WHERE id = ?', [id]);

    await logAudit({
      schoolId: u.schoolId,
      actorId: u.id,
      actorName: `${u.firstName} ${u.lastName}`,
      actorRole: u.role,
      action: 'fee_structure_deleted',
      targetType: 'feestructure',
      targetId: id,
      metadata: { title: existing.title },
      ip: req.ip,
    });

    res.json({ success: true, message: 'Fee structure deleted successfully.' });
  } catch (err) {
    console.error('DELETE /fees/structures/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /fees/structures/send-due-reminders — notify all due fee parts ─────
router.post('/structures/send-due-reminders', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const targetDate = req.body?.date ? new Date(req.body.date) : new Date();
    if (Number.isNaN(targetDate.getTime())) return res.status(400).json({ error: 'Invalid date' });
    const day = targetDate.toISOString().slice(0, 10);

    const reminders = await query(
      `SELECT fr.*, s.firstName AS studentFirst, s.lastName AS studentLast, s.id AS sid
       FROM feereminder fr
       JOIN student s ON CONVERT(s.id USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(fr.studentId USING utf8mb4) COLLATE utf8mb4_unicode_ci
       WHERE CONVERT(fr.schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?
         AND DATE(fr.dueDate) = ?
         AND fr.status IN ('pending', 'overdue')`,
      [u.schoolId, day]
    );

    const school = await queryOne('SELECT name FROM school WHERE id = ? LIMIT 1', [u.schoolId]);
    const schoolName = school?.name || 'Your School';

    let emailSent = 0;
    for (const fee of reminders) {
      const parentLink = await queryOne(
        "SELECT u.email, u.firstName FROM `user` u JOIN student s ON s.id = ? WHERE u.role = 'parent' AND JSON_CONTAINS(s.parentIds, JSON_QUOTE(u.id)) LIMIT 1",
        [fee.sid]
      );

      if (parentLink?.email) {
        await sendMailSafe({
          to: parentLink.email,
          subject: `Fee Reminder — ${fee.studentFirst} ${fee.studentLast} | ${schoolName}`,
          text: `Hello ${parentLink.firstName || 'Parent'},\n\nFee due reminder for ${fee.studentFirst} ${fee.studentLast}.\n${fee.description || 'School Fee'}\nAmount: INR ${Number(fee.amount || 0).toFixed(2)}\nDue date: ${new Date(fee.dueDate).toDateString()}\n\nThank you,\n${schoolName}`,
        });
        emailSent += 1;
      }

      await query('UPDATE feereminder SET reminderSentAt = NOW(), updatedAt = NOW() WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?', [fee.id]);
    }

    await logAudit({
      schoolId: u.schoolId,
      actorId: u.id,
      actorName: `${u.firstName} ${u.lastName}`,
      actorRole: u.role,
      action: 'due_fee_reminders_sent',
      targetType: 'feestructure',
      metadata: { date: day, reminders: reminders.length, emailSent },
      ip: req.ip,
    });

    res.json({ success: true, date: day, reminders: reminders.length, emailSent });
  } catch (err) {
    console.error('POST /fees/structures/send-due-reminders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /fees/structures/:id/send-part-reminder — send reminder for specific part ────
router.post('/structures/:id/send-part-reminder', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const { id } = req.params;
    const { partLabel } = req.body;

    if (!partLabel) return res.status(400).json({ error: 'partLabel is required' });

    // Get the fee structure
    const feeStructure = await queryOne(
      'SELECT id, schoolId, classId, batchId, title, installments FROM feestructure WHERE id = ? LIMIT 1',
      [id]
    );

    if (!feeStructure || String(feeStructure.schoolId) !== String(u.schoolId)) {
      return res.status(404).json({ error: 'Fee structure not found' });
    }

    // Parse installments to find the part with matching label
    let installments = feeStructure.installments;
    if (typeof installments === 'string') {
      try { installments = JSON.parse(installments); } catch (_) { installments = []; }
    }
    if (!Array.isArray(installments)) installments = [];

    const part = installments.find((p) => String(p.partLabel || '') === String(partLabel));
    if (!part) return res.status(404).json({ error: `Part "${partLabel}" not found in structure` });

    // Check if reminders exist for this part
    let reminders = await query(
      `SELECT fr.*, s.firstName AS studentFirst, s.lastName AS studentLast, s.id AS sid
       FROM feereminder fr
       JOIN student s ON CONVERT(s.id USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(fr.studentId USING utf8mb4) COLLATE utf8mb4_unicode_ci
       WHERE CONVERT(fr.feeStructureId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?
         AND CONVERT(fr.schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?
         AND fr.dueDate = ?`,
      [id, u.schoolId, part.dueDate]
    );

    // If no reminders exist for this part, create them
    if (!reminders || reminders.length === 0) {
      const students = await query(
        `SELECT id
         FROM student
         WHERE CONVERT(schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?
           AND CONVERT(classId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?
           AND isActive = 1
           ${feeStructure.batchId ? 'AND CONVERT(batchId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?' : ''}`,
        feeStructure.batchId ? [u.schoolId, feeStructure.classId, feeStructure.batchId] : [u.schoolId, feeStructure.classId]
      );

      for (const student of students) {
        const reminderId = newId();
        const partDescription = `${feeStructure.title} - ${partLabel}`;
        await query(
          'INSERT INTO feereminder (id, schoolId, studentId, feeStructureId, amount, dueDate, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, \'pending\', NOW(), NOW())',
          [reminderId, u.schoolId, student.id, id, part.amount, part.dueDate, partDescription]
        );
      }

      // Fetch the newly created reminders
      reminders = await query(
        `SELECT fr.*, s.firstName AS studentFirst, s.lastName AS studentLast, s.id AS sid
         FROM feereminder fr
         JOIN student s ON CONVERT(s.id USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(fr.studentId USING utf8mb4) COLLATE utf8mb4_unicode_ci
         WHERE CONVERT(fr.feeStructureId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?
           AND CONVERT(fr.schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?
           AND fr.dueDate = ?`,
        [id, u.schoolId, part.dueDate]
      );
    }

    const school = await queryOne('SELECT name FROM school WHERE id = ? LIMIT 1', [u.schoolId]);
    const schoolName = school?.name || 'Your School';

    let remindersSent = 0;
    for (const fee of reminders) {
      const parentLink = await queryOne(
        "SELECT u.email, u.firstName FROM `user` u JOIN student s ON s.id = ? WHERE u.role = 'parent' AND JSON_CONTAINS(s.parentIds, JSON_QUOTE(u.id)) LIMIT 1",
        [fee.sid]
      );

      if (parentLink?.email) {
        await sendMailSafe({
          to: parentLink.email,
          subject: `Fee Reminder — ${fee.studentFirst} ${fee.studentLast} (${partLabel}) | ${schoolName}`,
          text: `Hello ${parentLink.firstName || 'Parent'},\n\nFee due reminder for ${fee.studentFirst} ${fee.studentLast}.\n${fee.description || 'School Fee'}\nAmount: INR ${Number(fee.amount || 0).toFixed(2)}\nDue date: ${new Date(fee.dueDate).toDateString()}\n\nThank you,\n${schoolName}`,
        });
        remindersSent += 1;
      }

      await query('UPDATE feereminder SET reminderSentAt = NOW(), updatedAt = NOW() WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?', [fee.id]);
    }

    await logAudit({
      schoolId: u.schoolId,
      actorId: u.id,
      actorName: `${u.firstName} ${u.lastName}`,
      actorRole: u.role,
      action: 'fee_part_reminder_sent',
      targetType: 'feestructure',
      targetId: id,
      metadata: { partLabel, remindersSent },
      ip: req.ip,
    });

    res.json({ success: true, partLabel, remindersSent });
  } catch (err) {
    console.error('POST /fees/structures/:id/send-part-reminder error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /fees — create fee reminder ─────────────────────────────────────────
router.post('/', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const { studentId, amount, dueDate, description } = req.body;
    if (!studentId || !amount || !dueDate) return res.status(400).json({ error: 'studentId, amount, dueDate required' });

    const student = await queryOne('SELECT * FROM student WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? AND CONVERT(schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? LIMIT 1', [studentId, u.schoolId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const id = newId();
    await query(
      'INSERT INTO feereminder (id, schoolId, studentId, amount, dueDate, description, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,\'pending\',NOW(),NOW())',
      [id, u.schoolId, studentId, parseFloat(amount), dueDate, description || '']
    );

    await logAudit({ schoolId: u.schoolId, actorId: u.id, actorName: `${u.firstName} ${u.lastName}`, actorRole: u.role, action: 'fee_reminder_created', targetType: 'student', targetId: studentId, metadata: { amount, dueDate }, ip: req.ip });

    const created = await queryOne('SELECT * FROM feereminder WHERE id = ? LIMIT 1', [id]);
    res.status(201).json(created);
  } catch (err) {
    console.error('POST /fees error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /fees/:feeId/ack-payment — school admin acknowledges submitted payment ──
router.post('/:feeId/ack-payment', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const { action, adminNote } = req.body; // action: 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'action must be approve or reject' });

    const fee = await queryOne('SELECT * FROM feereminder WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? AND CONVERT(schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? LIMIT 1', [req.params.feeId, u.schoolId]);
    if (!fee) return res.status(404).json({ error: 'Fee reminder not found' });
    if (fee.status !== 'payment_submitted') return res.status(400).json({ error: 'No payment submission to acknowledge' });

    const newStatus = action === 'approve' ? 'paid' : 'pending';
    await query('UPDATE feereminder SET status=?, updatedAt=NOW() WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci=?', [newStatus, req.params.feeId]);

    await logAudit({ schoolId: u.schoolId, actorId: u.id, actorName: `${u.firstName} ${u.lastName}`, actorRole: u.role, action: action === 'approve' ? 'fee_payment_approved' : 'fee_payment_rejected', targetType: 'feereminder', targetId: req.params.feeId, metadata: { adminNote }, ip: req.ip });

    const updated = await queryOne('SELECT * FROM feereminder WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? LIMIT 1', [req.params.feeId]);
    res.json(updated);
  } catch (err) {
    console.error('POST /fees/:feeId/ack-payment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /fees/payment-details — get school payment details ────────────────────
router.get('/payment-details', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });
    const details = await queryOne('SELECT * FROM schoolpaymentdetails WHERE CONVERT(schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? LIMIT 1', [u.schoolId]);
    res.json(details || {});
  } catch (err) {
    console.error('GET /fees/payment-details error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /fees/payment-details — upsert school payment details ────────────────
router.put('/payment-details', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const { upiId, upiName, bankName, accountNumber, ifscCode, accountName, qrCodeUrl, instructions } = req.body;

    const existing = await queryOne('SELECT id FROM schoolpaymentdetails WHERE CONVERT(schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? LIMIT 1', [u.schoolId]);
    if (existing) {
      await query(
        'UPDATE schoolpaymentdetails SET upiId=?, upiName=?, bankName=?, accountNumber=?, ifscCode=?, accountName=?, qrCodeUrl=?, instructions=?, updatedAt=NOW() WHERE id=?',
        [upiId || '', upiName || '', bankName || '', accountNumber || '', ifscCode || '', accountName || '', qrCodeUrl || '', instructions || '', existing.id]
      );
    } else {
      const id = newId();
      await query(
        'INSERT INTO schoolpaymentdetails (id, schoolId, upiId, upiName, bankName, accountNumber, ifscCode, accountName, qrCodeUrl, instructions) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [id, u.schoolId, upiId || '', upiName || '', bankName || '', accountNumber || '', ifscCode || '', accountName || '', qrCodeUrl || '', instructions || '']
      );
    }

    await logAudit({ schoolId: u.schoolId, actorId: u.id, actorName: `${u.firstName} ${u.lastName}`, actorRole: u.role, action: 'payment_details_updated', targetType: 'school', targetId: u.schoolId, ip: req.ip });

    const updated = await queryOne('SELECT * FROM schoolpaymentdetails WHERE CONVERT(schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? LIMIT 1', [u.schoolId]);
    res.json(updated);
  } catch (err) {
    console.error('PUT /fees/payment-details error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /fees/:feeId — update status ─────────────────────────────────────────
router.put('/:feeId', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const { status, amount, dueDate, description } = req.body;
    const allowed = ['pending', 'paid', 'overdue', 'cancelled', 'payment_submitted'];
    if (status && !allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const fee = await queryOne('SELECT * FROM feereminder WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? AND CONVERT(schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? LIMIT 1', [req.params.feeId, u.schoolId]);
    if (!fee) return res.status(404).json({ error: 'Fee reminder not found' });

    await query(
      'UPDATE feereminder SET status=COALESCE(?,status), amount=COALESCE(?,amount), dueDate=COALESCE(?,dueDate), description=COALESCE(?,description), updatedAt=NOW() WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci=?',
      [status || null, amount ? parseFloat(amount) : null, dueDate || null, description ?? null, req.params.feeId]
    );

    if (status) await logAudit({ schoolId: u.schoolId, actorId: u.id, actorName: `${u.firstName} ${u.lastName}`, actorRole: u.role, action: 'fee_status_updated', targetType: 'feereminder', targetId: req.params.feeId, metadata: { status }, ip: req.ip });

    const updated = await queryOne('SELECT * FROM feereminder WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? LIMIT 1', [req.params.feeId]);
    res.json(updated);
  } catch (err) {
    console.error('PUT /fees/:feeId error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /fees/:feeId ───────────────────────────────────────────────────────
router.delete('/:feeId', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const fee = await queryOne('SELECT * FROM feereminder WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? AND CONVERT(schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? LIMIT 1', [req.params.feeId, u.schoolId]);
    if (!fee) return res.status(404).json({ error: 'Fee reminder not found' });

    await query('DELETE FROM feereminder WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci = ?', [req.params.feeId]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /fees/:feeId error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /fees/:feeId/send-reminder — send email + return WhatsApp URL ────────
router.post('/:feeId/send-reminder', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const fee = await queryOne(
      `SELECT fr.*, s.firstName AS studentFirst, s.lastName AS studentLast, s.id AS sid
       FROM feereminder fr JOIN student s ON CONVERT(s.id USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(fr.studentId USING utf8mb4) COLLATE utf8mb4_unicode_ci
       WHERE CONVERT(fr.id USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? AND CONVERT(fr.schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? LIMIT 1`,
      [req.params.feeId, u.schoolId]
    );
    if (!fee) return res.status(404).json({ error: 'Fee reminder not found' });

    const school = await queryOne('SELECT name FROM school WHERE id = ? LIMIT 1', [u.schoolId]);

    // Find parent email & phone
    const parentLink = await queryOne(
      "SELECT u.email, u.phone, u.firstName, u.lastName FROM `user` u JOIN student s ON s.id = ? WHERE u.role = 'parent' AND JSON_CONTAINS(s.parentIds, JSON_QUOTE(u.id)) LIMIT 1",
      [fee.sid]
    );

    const studentName = `${fee.studentFirst} ${fee.studentLast}`;
    const dueFormatted = new Date(fee.dueDate).toDateString();
    const amount = parseFloat(fee.amount).toFixed(2);
    const schoolName = school?.name || 'Your School';
    const desc = fee.description || 'School Fee';

    // WhatsApp message
    const waMsg = `Hello ${parentLink?.firstName || 'Parent'},\n\nThis is a reminder from ${schoolName}.\n\nFee Due for *${studentName}*:\n📌 ${desc}\n💰 Amount: ₹${amount}\n📅 Due Date: ${dueFormatted}\n\nPlease clear the dues at the earliest. Thank you!`;
    const waUrl = parentLink?.phone ? `https://wa.me/${parentLink.phone.replace(/\D/g, '')}?text=${encodeURIComponent(waMsg)}` : null;

    // Email
    if (parentLink?.email) {
      await sendMailSafe({
        to: parentLink.email,
        subject: `Fee Reminder — ${studentName} | ${schoolName}`,
        html: `<p>Dear ${parentLink.firstName || 'Parent'},</p>
               <p>This is a friendly reminder from <strong>${schoolName}</strong> regarding an outstanding fee for <strong>${studentName}</strong>.</p>
               <table style="border-collapse:collapse;width:100%;max-width:400px">
                 <tr><td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:bold">Description</td><td style="padding:6px 12px;border:1px solid #e5e7eb">${desc}</td></tr>
                 <tr><td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:bold">Amount Due</td><td style="padding:6px 12px;border:1px solid #e5e7eb">₹${amount}</td></tr>
                 <tr><td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:bold">Due Date</td><td style="padding:6px 12px;border:1px solid #e5e7eb">${dueFormatted}</td></tr>
               </table>
               <p>Please clear the dues at the earliest. For any queries, contact the school office.</p>
               <p>Thank you,<br/>${schoolName}</p>`,
      });
    }

    // Mark as reminded
    await query('UPDATE feereminder SET reminderSentAt=NOW(), updatedAt=NOW() WHERE id=?', [req.params.feeId]);

    await logAudit({ schoolId: u.schoolId, actorId: u.id, actorName: `${u.firstName} ${u.lastName}`, actorRole: u.role, action: 'fee_reminder_sent', targetType: 'feereminder', targetId: req.params.feeId, metadata: { studentName, amount, dueDate: fee.dueDate }, ip: req.ip });

    res.json({ success: true, waUrl, emailSent: !!parentLink?.email });
  } catch (err) {
    console.error('POST /fees/:feeId/send-reminder error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
