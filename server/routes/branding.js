const express = require('express');
const { auth } = require('../middleware/auth');
const { queryOne } = require('../src/lib/db');

const router = express.Router();

const DEFAULT_BRANDING = {
  logoUrl: '',
  primaryColor: '#059669',
  secondaryColor: '#0d9488',
  tagline: 'Modern operations for early childhood schools',
};

const normalizeBranding = (row) => ({
  logoUrl: row?.logoUrl || DEFAULT_BRANDING.logoUrl,
  primaryColor: row?.primaryColor || DEFAULT_BRANDING.primaryColor,
  secondaryColor: row?.secondaryColor || DEFAULT_BRANDING.secondaryColor,
  tagline: row?.tagline || DEFAULT_BRANDING.tagline,
});

router.get('/me', auth, async (req, res) => {
  try {
    if (!req.schoolId) return res.json(DEFAULT_BRANDING);

    const branding = await queryOne(
      'SELECT logoUrl, primaryColor, secondaryColor, tagline FROM schoolbranding WHERE schoolId = ? LIMIT 1',
      [req.schoolId]
    );

    res.json(normalizeBranding(branding));
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unable to load branding' });
  }
});

module.exports = router;
