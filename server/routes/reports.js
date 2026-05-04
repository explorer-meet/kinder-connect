const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const { query, queryOne, newId, parseJ, toJ } = require('../src/lib/db');

const router = express.Router();

async function computeStats(studentId, batchId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 1);

  const [attendanceRecords, activityLogs, milestones, incidents] = await Promise.all([
    query('SELECT * FROM attendance WHERE studentId = ? AND batchId = ? AND date >= ? AND date < ?', [studentId, batchId, startDate, endDate]),
    query('SELECT * FROM activitylog WHERE studentId = ? AND date >= ? AND date < ?', [studentId, startDate, endDate]),
    query('SELECT * FROM milestone WHERE studentId = ? AND month = ? AND year = ?', [studentId, month, year]),
    query('SELECT id, incidentType, severity, incidentTime, description FROM incidentreport WHERE studentId = ? AND incidentTime >= ? AND incidentTime < ?', [studentId, startDate, endDate]),
  ]);

  const totalDays    = attendanceRecords.length;
  const presentDays  = attendanceRecords.filter(a => ['present','late','half_day'].includes(a.status)).length;
  const absentDays   = attendanceRecords.filter(a => a.status === 'absent').length;
  const lateDays     = attendanceRecords.filter(a => a.status === 'late').length;
  const attendancePct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  const moodMap = {};
  activityLogs.forEach(l => { if (l.moodAtArrival) moodMap[l.moodAtArrival] = (moodMap[l.moodAtArrival] || 0) + 1; });
  const topArrivalMood = Object.entries(moodMap).sort((a,b) => b[1]-a[1])[0]?.[0] || null;

  const napLogs  = activityLogs.filter(l => l.napDuration);
  const avgNapMin = napLogs.length > 0 ? Math.round(napLogs.reduce((s,l) => s + (l.napDuration || 0), 0) / napLogs.length) : null;

  const mealLogs = activityLogs.filter(l => l.activityType === 'meal' && l.intakeLevel);
  const mealIntakeMap = {};
  mealLogs.forEach(l => { if (l.intakeLevel) mealIntakeMap[l.intakeLevel] = (mealIntakeMap[l.intakeLevel] || 0) + 1; });
  const topMealIntake = Object.entries(mealIntakeMap).sort((a,b) => b[1]-a[1])[0]?.[0] || null;

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

router.post('/generate', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { studentId, batchId, month, year } = req.body;
    if (!studentId || !batchId || !month || !year) return res.status(400).json({ error: 'studentId, batchId, month, year are required' });

    const teacher = await queryOne('SELECT schoolId FROM `user` WHERE id = ? LIMIT 1', [req.userId]);
    if (!teacher?.schoolId) return res.status(403).json({ error: 'Teacher not linked to a school' });

    const student = await queryOne('SELECT id, firstName, lastName, photo FROM student WHERE id = ? AND schoolId = ? LIMIT 1', [studentId, teacher.schoolId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const iMonth = parseInt(month), iYear = parseInt(year);
    const stats = await computeStats(studentId, batchId, iMonth, iYear);

    const DOMAINS = ['social','emotional','motor','language','cognitive'];
    const milestonesByDomain = {};
    stats.milestones.list.forEach(m => {
      if (!milestonesByDomain[m.domain]) milestonesByDomain[m.domain] = [];
      milestonesByDomain[m.domain].push({ milestone: m.milestone, isAchieved: m.isAchieved });
    });

    const defaultDomains = DOMAINS.map(d => ({ domain: d, rating: 'developing', notes: '', milestones: milestonesByDomain[d] || [] }));

    let report = await queryOne('SELECT * FROM report WHERE studentId = ? AND batchId = ? AND month = ? AND year = ? LIMIT 1', [studentId, batchId, iMonth, iYear]);

    if (report) {
      const existing = parseJ(report.domains) || defaultDomains;
      const merged   = existing.map(d => ({ ...d, milestones: milestonesByDomain[d.domain] || d.milestones || [] }));
      await query('UPDATE report SET domains = ?, updatedAt = NOW() WHERE id = ?', [JSON.stringify(merged), report.id]);
      report = await queryOne('SELECT * FROM report WHERE id = ?', [report.id]);
    } else {
      const id = newId();
      await query(
        'INSERT INTO report (id, studentId, batchId, teacherId, month, year, domains, highlights, areasForImprovement, recommendedActivities, reportStatus, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [id, studentId, batchId, req.userId, iMonth, iYear, JSON.stringify(defaultDomains), JSON.stringify([]), JSON.stringify([]), JSON.stringify([]), 'draft']
      );
      report = await queryOne('SELECT * FROM report WHERE id = ?', [id]);
    }

    if (report) {
      report.domains = parseJ(report.domains);
      report.highlights = parseJ(report.highlights);
      report.areasForImprovement = parseJ(report.areasForImprovement);
      report.recommendedActivities = parseJ(report.recommendedActivities);
    }

    res.json({ report, stats, student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/batch/:batchId', auth, authorize(['teacher']), async (req, res) => {
  try {
    const month = parseInt(req.query.month), year = parseInt(req.query.year);
    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });

    const teacher = await queryOne('SELECT schoolId FROM `user` WHERE id = ? LIMIT 1', [req.userId]);
    if (!teacher?.schoolId) return res.status(403).json({ error: 'Teacher not linked to a school' });

    const students = await query(
      'SELECT id, firstName, lastName, photo FROM student WHERE batchId = ? AND schoolId = ? AND isActive = 1 ORDER BY firstName ASC',
      [req.params.batchId, teacher.schoolId]
    );

    const reports = await query(
      'SELECT id, studentId, reportStatus, updatedAt, sentToParentOn FROM report WHERE batchId = ? AND month = ? AND year = ?',
      [req.params.batchId, month, year]
    );
    const reportMap = {};
    reports.forEach(r => { reportMap[r.studentId] = r; });

    res.json(students.map(s => ({ ...s, report: reportMap[s.id] || null })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const whereStatus = req.userRole === 'parent' ? "AND reportStatus = 'sent_to_parent'" : '';
    const reports = await query(
      `SELECT id, month, year, reportStatus, overallSummary, sentToParentOn, updatedAt, teacherId FROM report WHERE studentId = ? ${whereStatus} ORDER BY year DESC, month DESC`,
      [req.params.studentId]
    );
    const teacherIds = [...new Set(reports.map(r => r.teacherId).filter(Boolean))];
    const teachers = teacherIds.length ? await query(`SELECT id, firstName, lastName FROM \`User\` WHERE id IN (${teacherIds.map(() => '?').join(',')})`, teacherIds) : [];
    const tMap = Object.fromEntries(teachers.map(t => [t.id, t]));
    res.json(reports.map(r => ({ ...r, teacher: tMap[r.teacherId] || null })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:reportId', auth, async (req, res) => {
  try {
    const report = await queryOne('SELECT * FROM report WHERE id = ? LIMIT 1', [req.params.reportId]);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (req.userRole === 'parent' && report.reportStatus !== 'sent_to_parent') return res.status(403).json({ error: 'Report not yet published' });

    report.domains = parseJ(report.domains);
    report.highlights = parseJ(report.highlights);
    report.areasForImprovement = parseJ(report.areasForImprovement);
    report.recommendedActivities = parseJ(report.recommendedActivities);

    const [student, teacher, stats] = await Promise.all([
      queryOne('SELECT id, firstName, lastName, photo, dateOfBirth FROM student WHERE id = ? LIMIT 1', [report.studentId]),
      queryOne('SELECT id, firstName, lastName, photo FROM `user` WHERE id = ? LIMIT 1', [report.teacherId]),
      computeStats(report.studentId, report.batchId, report.month, report.year),
    ]);
    res.json({ report, student, teacher, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:reportId', auth, authorize(['teacher']), async (req, res) => {
  try {
    const { domains, overallSummary, highlights, areasForImprovement, recommendedActivities, reportStatus } = req.body;
    const existing = await queryOne('SELECT id, teacherId FROM report WHERE id = ? LIMIT 1', [req.params.reportId]);
    if (!existing) return res.status(404).json({ error: 'Report not found' });
    if (existing.teacherId !== req.userId) return res.status(403).json({ error: 'Not authorized' });

    const sets = [], vals = [];
    if (domains !== undefined)               { sets.push('domains = ?');               vals.push(JSON.stringify(domains)); }
    if (overallSummary !== undefined)        { sets.push('overallSummary = ?');        vals.push(overallSummary); }
    if (highlights !== undefined)            { sets.push('highlights = ?');            vals.push(JSON.stringify(highlights)); }
    if (areasForImprovement !== undefined)   { sets.push('areasForImprovement = ?');   vals.push(JSON.stringify(areasForImprovement)); }
    if (recommendedActivities !== undefined) { sets.push('recommendedActivities = ?'); vals.push(JSON.stringify(recommendedActivities)); }
    if (reportStatus !== undefined)          { sets.push('reportStatus = ?');          vals.push(reportStatus); }
    sets.push('updatedAt = NOW()');
    vals.push(req.params.reportId);

    await query(`UPDATE report SET ${sets.join(', ')} WHERE id = ?`, vals);
    const report = await queryOne('SELECT * FROM report WHERE id = ?', [req.params.reportId]);
    if (report) {
      report.domains = parseJ(report.domains);
      report.highlights = parseJ(report.highlights);
      report.areasForImprovement = parseJ(report.areasForImprovement);
      report.recommendedActivities = parseJ(report.recommendedActivities);
    }
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:reportId/send', auth, authorize(['teacher']), async (req, res) => {
  try {
    const existing = await queryOne('SELECT id, teacherId FROM report WHERE id = ? LIMIT 1', [req.params.reportId]);
    if (!existing) return res.status(404).json({ error: 'Report not found' });
    if (existing.teacherId !== req.userId) return res.status(403).json({ error: 'Not authorized' });
    await query("UPDATE report SET reportStatus = 'sent_to_parent', sentToParentOn = NOW(), updatedAt = NOW() WHERE id = ?", [req.params.reportId]);
    const report = await queryOne('SELECT * FROM report WHERE id = ?', [req.params.reportId]);
    if (report) {
      report.domains = parseJ(report.domains);
      report.highlights = parseJ(report.highlights);
    }
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
