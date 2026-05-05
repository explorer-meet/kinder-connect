'use strict';
const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const { query, queryOne, newId, toJ } = require('../src/lib/db');

const router = express.Router();

const getSchoolUser = (userId) =>
  queryOne('SELECT id, schoolId, role FROM `user` WHERE id = ? LIMIT 1', [userId]);

// ── GET /compliance/audit — paginated audit timeline ─────────────────────────
router.get('/audit', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const rows = await query(
      'SELECT * FROM auditlog WHERE schoolId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
      [u.schoolId, limit, offset]
    );
    const [{ total }] = await query('SELECT COUNT(*) AS total FROM auditlog WHERE schoolId = ?', [u.schoolId]);
    res.json({ rows, total, limit, offset });
  } catch (err) {
    console.error('GET /compliance/audit error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /compliance/consents — list consent records ──────────────────────────
router.get('/consents', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const rows = await query(
      `SELECT cr.*,
              s.firstName AS studentFirst, s.lastName AS studentLast,
              p.firstName AS parentFirst, p.lastName AS parentLast, p.email AS parentEmail
       FROM consentrecord cr
       JOIN student s ON s.id = cr.studentId
       JOIN \`user\` p ON p.id = cr.parentId
       WHERE cr.schoolId = ?
       ORDER BY cr.createdAt DESC`,
      [u.schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /compliance/consents error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /compliance/consent — create/upsert consent record ──────────────────
router.post('/consent', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    const { parentId, studentId, consentType, consentText, accepted } = req.body;
    if (!parentId || !studentId || !consentType) return res.status(400).json({ error: 'parentId, studentId, consentType required' });

    // Upsert — one record per (parentId, studentId, consentType)
    const existing = await queryOne(
      'SELECT id FROM consentrecord WHERE parentId=? AND studentId=? AND consentType=? LIMIT 1',
      [parentId, studentId, consentType]
    );

    if (existing) {
      await query(
        'UPDATE consentrecord SET accepted=?, acceptedAt=?, consentText=COALESCE(?,consentText) WHERE id=?',
        [accepted ? 1 : 0, accepted ? new Date() : null, consentText || null, existing.id]
      );
      return res.json(await queryOne('SELECT * FROM consentrecord WHERE id=? LIMIT 1', [existing.id]));
    }

    const id = newId();
    await query(
      'INSERT INTO consentrecord (id,schoolId,parentId,studentId,consentType,consentText,accepted,acceptedAt,createdAt) VALUES (?,?,?,?,?,?,?,?,NOW())',
      [id, u.schoolId, parentId, studentId, consentType, consentText || '', accepted ? 1 : 0, accepted ? new Date() : null]
    );
    res.status(201).json(await queryOne('SELECT * FROM consentrecord WHERE id=? LIMIT 1', [id]));
  } catch (err) {
    console.error('POST /compliance/consent error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /compliance/consent/:id ───────────────────────────────────────────
router.delete('/consent/:id', auth, authorize(['school_admin']), async (req, res) => {
  try {
    const u = await getSchoolUser(req.userId);
    if (!u?.schoolId) return res.status(400).json({ error: 'No school linked' });

    await query('DELETE FROM consentrecord WHERE id=? AND schoolId=?', [req.params.id, u.schoolId]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /compliance/consent error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
