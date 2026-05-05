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
