const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const Report = require('../models/Report');
const Milestone = require('../models/Milestone');
const ActivityLog = require('../models/ActivityLog');

const router = express.Router();

// Create Monthly Report
router.post('/', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, classId, month, year, domains, overallSummary, highlights, areasForImprovement, recommendedActivities } = req.body;
    
    const report = new Report({
      studentId,
      classId,
      teacherId: req.userId,
      month,
      year,
      domains,
      overallSummary,
      highlights,
      areasForImprovement,
      recommendedActivities,
      reportStatus: 'completed',
    });
    
    await report.save();
    res.status(201).json({ message: 'Report created', report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate Report (Auto-generate from milestones)
router.post('/generate', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, classId, month, year } = req.body;
    
    // Fetch milestones for the student for this month
    const milestones = await Milestone.find({
      studentId,
      month,
      year,
    });
    
    // Group milestones by domain
    const domains = {};
    const domainList = ['social', 'emotional', 'motor', 'language', 'cognitive'];
    
    domainList.forEach((domain) => {
      domains[domain] = {
        domain,
        milestones: milestones
          .filter((m) => m.domain === domain)
          .map((m) => ({
            milestone: m.milestone,
            isAchieved: m.isAchieved,
          })),
        overallRating: 'developing',
      };
    });
    
    // Check if report exists
    let report = await Report.findOne({ studentId, classId, month, year });
    
    if (report) {
      report.domains = Object.values(domains);
      await report.save();
    } else {
      report = new Report({
        studentId,
        classId,
        teacherId: req.userId,
        month,
        year,
        domains: Object.values(domains),
        reportStatus: 'draft',
      });
      await report.save();
    }
    
    await report.populate('teacherId', 'firstName lastName');
    res.status(201).json({ message: 'Report generated', report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Report
router.get('/:reportId', auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.reportId)
      .populate('studentId', 'firstName lastName')
      .populate('teacherId', 'firstName lastName');
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Student's Reports
router.get('/student/:studentId/all', auth, async (req, res) => {
  try {
    const reports = await Report.find({ studentId: req.params.studentId })
      .sort({ year: -1, month: -1 })
      .populate('teacherId', 'firstName lastName');
    
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Report Status (Draft → Completed → Sent)
router.put('/:reportId/status', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { reportStatus } = req.body;
    
    const report = await Report.findByIdAndUpdate(
      req.params.reportId,
      {
        reportStatus,
        sentToParentOn: reportStatus === 'sent_to_parent' ? new Date() : null,
      },
      { new: true }
    );
    
    res.json({ message: 'Report status updated', report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
