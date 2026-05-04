const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const prisma = require('../src/lib/prisma');

const router = express.Router();

// ─── Helper: compute month stats from live data ───────────────────────────────
async function computeStats(studentId, batchId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 1);

  const [attendanceRecords, activityLogs, milestones, incidents] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId, batchId, date: { gte: startDate, lt: endDate } },
    }),
    prisma.activityLog.findMany({
      where: { studentId, date: { gte: startDate, lt: endDate } },
    }),
    prisma.milestone.findMany({ where: { studentId, month, year } }),
    prisma.incidentReport.findMany({
      where: { studentId, incidentTime: { gte: startDate, lt: endDate } },
      select: { id: true, incidentType: true, severity: true, incidentTime: true, description: true },
    }),
  ]);

  const totalDays    = attendanceRecords.length;
  const presentDays  = attendanceRecords.filter(a => ['present', 'late', 'half_day'].includes(a.status)).length;
  const absentDays   = attendanceRecords.filter(a => a.status === 'absent').length;
  const lateDays     = attendanceRecords.filter(a => a.status === 'late').length;
  const attendancePct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  const moodMap = {};
  activityLogs.forEach(l => {
    if (l.moodAtArrival) moodMap[l.moodAtArrival] = (moodMap[l.moodAtArrival] || 0) + 1;
  });
  const topArrivalMood = Object.entries(moodMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const napLogs   = activityLogs.filter(l => l.napDuration);
  const avgNapMin = napLogs.length > 0
    ? Math.round(napLogs.reduce((s, l) => s + (l.napDuration || 0), 0) / napLogs.length)
    : null;

  const mealLogs = activityLogs.filter(l => l.activityType === 'meal' && l.intakeLevel);
  const mealIntakeMap = {};
  mealLogs.forEach(l => {
    if (l.intakeLevel) mealIntakeMap[l.intakeLevel] = (mealIntakeMap[l.intakeLevel] || 0) + 1;
  });
  const topMealIntake = Object.entries(mealIntakeMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    attendance: { totalDays, presentDays, absentDays, lateDays, attendancePct },
    mood:       { topArrivalMood, moodBreakdown: moodMap },
    nap:        { avgNapMin, napDays: napLogs.length },
    meal:       { topMealIntake, mealIntakeBreakdown: mealIntakeMap, mealDays: mealLogs.length },
    milestones: {
      total:    milestones.length,
      achieved: milestones.filter(m => m.isAchieved).length,
      list:     milestones.map(m => ({ domain: m.domain, milestone: m.milestone, isAchieved: m.isAchieved })),
    },
    incidents: { count: incidents.length, list: incidents },
  };
}

// ─── POST /reports/generate ──────────────────────────────────────────────────
router.post('/generate', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, batchId, month, year } = req.body;
    if (!studentId || !batchId || !month || !year)
      return res.status(400).json({ error: 'studentId, batchId, month, year are required' });

    const teacher = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { schoolId: true },
    });
    if (!teacher?.schoolId) return res.status(403).json({ error: 'Teacher not linked to a school' });

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: teacher.schoolId },
      select: { id: true, firstName: true, lastName: true, photo: true },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const iMonth = parseInt(month);
    const iYear  = parseInt(year);
    const stats  = await computeStats(studentId, batchId, iMonth, iYear);

    const DOMAINS = ['social', 'emotional', 'motor', 'language', 'cognitive'];
    const milestonesByDomain = {};
    stats.milestones.list.forEach(m => {
      if (!milestonesByDomain[m.domain]) milestonesByDomain[m.domain] = [];
      milestonesByDomain[m.domain].push({ milestone: m.milestone, isAchieved: m.isAchieved });
    });

    const defaultDomains = DOMAINS.map(d => ({
      domain:     d,
      rating:     'developing',
      notes:      '',
      milestones: milestonesByDomain[d] || [],
    }));

    let report = await prisma.report.findFirst({
      where: { studentId, batchId, month: iMonth, year: iYear },
    });

    if (report) {
      const existingDomains = Array.isArray(report.domains) ? report.domains : defaultDomains;
      const mergedDomains   = existingDomains.map(d => ({
        ...d,
        milestones: milestonesByDomain[d.domain] || d.milestones || [],
      }));
      report = await prisma.report.update({
        where: { id: report.id },
        data:  { domains: mergedDomains },
      });
    } else {
      report = await prisma.report.create({
        data: {
          studentId,
          batchId,
          teacherId:             req.userId,
          month:                 iMonth,
          year:                  iYear,
          domains:               defaultDomains,
          highlights:            [],
          areasForImprovement:   [],
          recommendedActivities: [],
          reportStatus:          'draft',
        },
      });
    }

    res.json({ report, stats, student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /reports/batch/:batchId?month=&year= ────────────────────────────────
router.get('/batch/:batchId', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { batchId } = req.params;
    const month       = parseInt(req.query.month);
    const year        = parseInt(req.query.year);
    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });

    const teacher = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { schoolId: true },
    });
    if (!teacher?.schoolId) return res.status(403).json({ error: 'Teacher not linked to a school' });

    const students = await prisma.student.findMany({
      where: { batchId, schoolId: teacher.schoolId, isActive: true },
      select: { id: true, firstName: true, lastName: true, photo: true },
      orderBy: [{ firstName: 'asc' }],
    });

    const reports = await prisma.report.findMany({
      where: { batchId, month, year, studentId: { in: students.map(s => s.id) } },
      select: { id: true, studentId: true, reportStatus: true, updatedAt: true, sentToParentOn: true },
    });

    const reportMap = {};
    reports.forEach(r => { reportMap[r.studentId] = r; });

    res.json(students.map(s => ({ ...s, report: reportMap[s.id] || null })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /reports/student/:studentId ─────────────────────────────────────────
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const whereClause   = { studentId };
    if (req.userRole === 'parent') whereClause.reportStatus = 'sent_to_parent';

    const reports = await prisma.report.findMany({
      where:   whereClause,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: {
        id: true, month: true, year: true, reportStatus: true,
        overallSummary: true, sentToParentOn: true, updatedAt: true, teacherId: true,
      },
    });

    const teacherIds = [...new Set(reports.map(r => r.teacherId))];
    const teachers   = await prisma.user.findMany({
      where:  { id: { in: teacherIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const teacherMap = {};
    teachers.forEach(t => { teacherMap[t.id] = t; });

    res.json(reports.map(r => ({ ...r, teacher: teacherMap[r.teacherId] || null })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /reports/:reportId ───────────────────────────────────────────────────
router.get('/:reportId', auth, async (req, res) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.reportId } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (req.userRole === 'parent' && report.reportStatus !== 'sent_to_parent')
      return res.status(403).json({ error: 'Report not yet published' });

    const [student, teacher, stats] = await Promise.all([
      prisma.student.findUnique({
        where:  { id: report.studentId },
        select: { id: true, firstName: true, lastName: true, photo: true, dateOfBirth: true },
      }),
      prisma.user.findUnique({
        where:  { id: report.teacherId },
        select: { id: true, firstName: true, lastName: true, photo: true },
      }),
      computeStats(report.studentId, report.batchId, report.month, report.year),
    ]);

    res.json({ report, student, teacher, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /reports/:reportId ─────────────────────────────────────────────────
router.patch('/:reportId', auth, authorize(['teacher']), async (req, res) => {
  try {
    const {
      domains, overallSummary, highlights,
      areasForImprovement, recommendedActivities, reportStatus,
    } = req.body;

    const existing = await prisma.report.findUnique({ where: { id: req.params.reportId } });
    if (!existing) return res.status(404).json({ error: 'Report not found' });
    if (existing.teacherId !== req.userId) return res.status(403).json({ error: 'Not authorized' });

    const updateData = {};
    if (domains               !== undefined) updateData.domains               = domains;
    if (overallSummary        !== undefined) updateData.overallSummary        = overallSummary;
    if (highlights            !== undefined) updateData.highlights            = highlights;
    if (areasForImprovement   !== undefined) updateData.areasForImprovement   = areasForImprovement;
    if (recommendedActivities !== undefined) updateData.recommendedActivities = recommendedActivities;
    if (reportStatus          !== undefined) updateData.reportStatus          = reportStatus;

    const report = await prisma.report.update({ where: { id: req.params.reportId }, data: updateData });
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /reports/:reportId/send ─────────────────────────────────────────────
router.post('/:reportId/send', auth, authorize(['teacher']), async (req, res) => {
  try {
    const existing = await prisma.report.findUnique({ where: { id: req.params.reportId } });
    if (!existing) return res.status(404).json({ error: 'Report not found' });
    if (existing.teacherId !== req.userId) return res.status(403).json({ error: 'Not authorized' });

    const report = await prisma.report.update({
      where: { id: req.params.reportId },
      data:  { reportStatus: 'sent_to_parent', sentToParentOn: new Date() },
    });
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
