const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const { query, queryOne, newId, parseJ, toJ } = require('../src/lib/db');
const { getPublicVapidKey, upsertPushSubscription, removePushSubscription } = require('../src/lib/push');

const router = express.Router();

const RATING_TO_SCORE = {
  emerging: 1,
  developing: 2,
  proficient: 3,
  advanced: 4,
};

const INTAKE_TO_TEXT = {
  full: 'ate well',
  half: 'ate part of the meal',
  refused: 'refused most of the meal',
};

const statusText = (status) => {
  if (!status) return 'attendance was not marked';
  if (status === 'present') return 'was present';
  if (status === 'late') return 'arrived late';
  if (status === 'half_day') return 'attended for half day';
  return 'was absent';
};

const buildSmartSummary = ({ studentFirstName, attendance, meal, nap, teacherNote, incidentCount, topMood }) => {
  const bits = [];
  bits.push(`${studentFirstName} ${statusText(attendance?.status)} today.`);

  if (meal?.intakeLevel) {
    bits.push(`${studentFirstName} ${INTAKE_TO_TEXT[meal.intakeLevel] || 'had a meal update'}.`);
  } else if (meal?.mealType) {
    bits.push(`${meal.mealType[0].toUpperCase()}${meal.mealType.slice(1)} was logged.`);
  }

  if (nap?.duration) {
    bits.push(`Nap duration was ${nap.duration} minutes.`);
  }

  if (topMood) {
    bits.push(`Most observed mood: ${topMood}.`);
  }

  if (incidentCount > 0) {
    bits.push(`There ${incidentCount === 1 ? 'was 1 incident' : `were ${incidentCount} incidents`} logged.`);
  }

  if (teacherNote?.text) {
    bits.push(`Teacher note: ${teacherNote.text}`);
  }

  return bits.join(' ').trim();
};

// GET parent's children
router.get('/children', auth, authorize(['parent']), async (req, res) => {
  try {
    const children = await query(
      `SELECT s.*, c.name AS className, c.section, sc.name AS schoolName
       FROM student s
       LEFT JOIN \`class\` c ON s.classId = c.id
       LEFT JOIN school sc ON s.schoolId = sc.id
       WHERE JSON_CONTAINS(s.parentIds, JSON_QUOTE(?))`,
      [req.userId]
    );
    res.json(children.map(s => ({
      ...s,
      parentIds: parseJ(s.parentIds) || [],
      allergies: parseJ(s.allergies) || [],
      class: s.className ? { name: s.className, section: s.section } : null,
      school: s.schoolName ? { name: s.schoolName } : null,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET child's activity feed
router.get('/child/:studentId/feed', auth, authorize(['parent']), async (req, res) => {
  try {
    const student = await queryOne('SELECT id, batchId FROM student WHERE id = ? LIMIT 1', [req.params.studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [activities, todayAttendance] = await Promise.all([
      query(
        `SELECT a.*, u.firstName AS teacherFirstName, u.lastName AS teacherLastName
         FROM activitylog a
         LEFT JOIN \`user\` u ON a.teacherId = u.id
         WHERE (a.studentId = ? AND a.activityType = 'respective')
            OR (a.batchId = ? AND a.activityType IN ('general','class_note'))
         ORDER BY a.createdAt DESC LIMIT 50`,
        [req.params.studentId, student.batchId]
      ),
      queryOne('SELECT * FROM attendance WHERE studentId = ? AND date >= ? AND date < ? LIMIT 1', [req.params.studentId, today, tomorrow]),
    ]);

    res.json({
      activities: activities.map(a => ({ ...a, teacher: a.teacherFirstName ? { firstName: a.teacherFirstName, lastName: a.teacherLastName } : null })),
      todayAttendance,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET child's daily digest (attendance + meal + nap + one photo + teacher note)
router.get('/child/:studentId/digest', auth, authorize(['parent']), async (req, res) => {
  try {
    const student = await queryOne('SELECT id, firstName, lastName, batchId, parentIds FROM student WHERE id = ? LIMIT 1', [req.params.studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const parentIds = parseJ(student.parentIds) || [];
    if (!parentIds.includes(req.userId)) return res.status(403).json({ error: 'Not authorized' });

    const requestedDate = req.query.date ? new Date(req.query.date) : new Date();
    requestedDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(requestedDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const [attendance, activities, incidentStats] = await Promise.all([
      queryOne('SELECT * FROM attendance WHERE studentId = ? AND date >= ? AND date < ? LIMIT 1', [req.params.studentId, requestedDate, nextDate]),
      query(
        `SELECT a.*, u.firstName AS teacherFirstName, u.lastName AS teacherLastName
         FROM activitylog a
         LEFT JOIN \`user\` u ON a.teacherId = u.id
         WHERE a.createdAt >= ? AND a.createdAt < ?
           AND ((a.studentId = ?) OR (a.batchId = ? AND a.activityType IN ('general', 'class_note')))
         ORDER BY a.createdAt DESC`,
        [requestedDate, nextDate, req.params.studentId, student.batchId]
      ),
      queryOne('SELECT COUNT(*) AS cnt FROM incidentreport WHERE studentId = ? AND incidentTime >= ? AND incidentTime < ?', [req.params.studentId, requestedDate, nextDate]),
    ]);

    const mealLog = activities.find((a) => a.mealType || a.intakeLevel || a.foodItems);
    const napLog = activities.find((a) => a.napStartTime || a.napEndTime || a.napDuration);
    const photoLog = activities.find((a) => a.mediaUrl);
    const noteLog = activities.find((a) => a.notes || a.description || a.caption || a.activityType === 'class_note');
    const moodCounts = {};
    activities.forEach((a) => {
      const mood = a.moodAtArrival || a.moodAtDeparture;
      if (mood) moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const digest = {
      student: { id: student.id, firstName: student.firstName, lastName: student.lastName },
      date: requestedDate,
      attendance: attendance
        ? {
          status: attendance.status,
          checkInTime: attendance.checkInTime,
          checkOutTime: attendance.checkOutTime,
          notes: attendance.notes || null,
        }
        : null,
      meal: mealLog
        ? {
          mealType: mealLog.mealType || null,
          intakeLevel: mealLog.intakeLevel || null,
          foodItems: parseJ(mealLog.foodItems),
          time: mealLog.time || mealLog.createdAt,
        }
        : null,
      nap: napLog
        ? {
          start: napLog.napStartTime || null,
          end: napLog.napEndTime || null,
          duration: napLog.napDuration || null,
        }
        : null,
      photo: photoLog
        ? {
          mediaUrl: photoLog.mediaUrl,
          mediaType: photoLog.mediaType || null,
          caption: photoLog.caption || null,
          createdAt: photoLog.createdAt,
        }
        : null,
      teacherNote: noteLog
        ? {
          text: noteLog.notes || noteLog.description || noteLog.caption || null,
          teacherName: noteLog.teacherFirstName ? `${noteLog.teacherFirstName} ${noteLog.teacherLastName || ''}`.trim() : 'Teacher',
          createdAt: noteLog.createdAt,
        }
        : null,
      smartSummary: buildSmartSummary({
        studentFirstName: student.firstName,
        attendance,
        meal: mealLog ? { intakeLevel: mealLog.intakeLevel, mealType: mealLog.mealType } : null,
        nap: napLog ? { duration: napLog.napDuration } : null,
        teacherNote: noteLog ? { text: noteLog.notes || noteLog.description || noteLog.caption || null } : null,
        incidentCount: incidentStats?.cnt || 0,
        topMood,
      }),
      quickInsights: {
        incidentCount: incidentStats?.cnt || 0,
        topMood,
        activityCount: activities.length,
      },
    };

    res.json(digest);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET child progress insights timeline
router.get('/child/:studentId/progress-insights', auth, authorize(['parent']), async (req, res) => {
  try {
    const student = await queryOne('SELECT id, firstName, lastName, parentIds FROM student WHERE id = ? LIMIT 1', [req.params.studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const parentIds = parseJ(student.parentIds) || [];
    if (!parentIds.includes(req.userId)) return res.status(403).json({ error: 'Not authorized' });

    const months = Math.max(3, Math.min(parseInt(req.query.months, 10) || 6, 12));
    const fromDate = new Date();
    fromDate.setDate(1);
    fromDate.setMonth(fromDate.getMonth() - (months - 1));
    fromDate.setHours(0, 0, 0, 0);

    const [reports, attendanceAgg, incidentsAgg, milestonesAgg] = await Promise.all([
      query(
        `SELECT month, year, domains
         FROM report
         WHERE studentId = ?
           AND reportStatus IN ('completed', 'sent_to_parent')
           AND STR_TO_DATE(CONCAT(year, '-', month, '-01'), '%Y-%m-%d') >= ?
         ORDER BY year ASC, month ASC`,
        [req.params.studentId, fromDate]
      ),
      query(
        `SELECT YEAR(date) AS year, MONTH(date) AS month,
                COUNT(*) AS totalDays,
                SUM(CASE WHEN status IN ('present','late','half_day') THEN 1 ELSE 0 END) AS presentDays
         FROM attendance
         WHERE studentId = ? AND date >= ?
         GROUP BY YEAR(date), MONTH(date)
         ORDER BY YEAR(date), MONTH(date)`,
        [req.params.studentId, fromDate]
      ),
      query(
        `SELECT YEAR(incidentTime) AS year, MONTH(incidentTime) AS month, COUNT(*) AS incidents
         FROM incidentreport
         WHERE studentId = ? AND incidentTime >= ?
         GROUP BY YEAR(incidentTime), MONTH(incidentTime)
         ORDER BY YEAR(incidentTime), MONTH(incidentTime)`,
        [req.params.studentId, fromDate]
      ),
      query(
        `SELECT YEAR(COALESCE(achievedDate, createdAt)) AS year, MONTH(COALESCE(achievedDate, createdAt)) AS month,
                SUM(CASE WHEN isAchieved = 1 THEN 1 ELSE 0 END) AS achieved
         FROM milestone
         WHERE studentId = ? AND COALESCE(achievedDate, createdAt) >= ?
         GROUP BY YEAR(COALESCE(achievedDate, createdAt)), MONTH(COALESCE(achievedDate, createdAt))
         ORDER BY YEAR(COALESCE(achievedDate, createdAt)), MONTH(COALESCE(achievedDate, createdAt))`,
        [req.params.studentId, fromDate]
      ),
    ]);

    const reportMap = {};
    reports.forEach((r) => {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      const domains = parseJ(r.domains) || [];
      const domainScores = {};
      const values = domains
        .map((d) => {
          const score = RATING_TO_SCORE[String(d.rating || '').toLowerCase()] || null;
          if (score) domainScores[d.domain] = score;
          return score;
        })
        .filter(Boolean);
      reportMap[key] = {
        avgDomainScore: values.length ? Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(2)) : null,
        domainScores,
      };
    });

    const attendanceMap = Object.fromEntries(attendanceAgg.map((a) => {
      const pct = a.totalDays ? Math.round((a.presentDays / a.totalDays) * 100) : 0;
      return [`${a.year}-${String(a.month).padStart(2, '0')}`, { attendancePct: pct, totalDays: a.totalDays }];
    }));
    const incidentMap = Object.fromEntries(incidentsAgg.map((i) => [`${i.year}-${String(i.month).padStart(2, '0')}`, Number(i.incidents || 0)]));
    const milestoneMap = Object.fromEntries(milestonesAgg.map((m) => [`${m.year}-${String(m.month).padStart(2, '0')}`, Number(m.achieved || 0)]));

    const timeline = [];
    const cursor = new Date(fromDate);
    for (let i = 0; i < months; i += 1) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, '0')}`;
      timeline.push({
        key,
        year: y,
        month: m,
        avgDomainScore: reportMap[key]?.avgDomainScore ?? null,
        domainScores: reportMap[key]?.domainScores || {},
        attendancePct: attendanceMap[key]?.attendancePct ?? null,
        incidents: incidentMap[key] || 0,
        achievedMilestones: milestoneMap[key] || 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const domainSeries = {
      social: timeline.map((t) => t.domainScores.social ?? null),
      emotional: timeline.map((t) => t.domainScores.emotional ?? null),
      motor: timeline.map((t) => t.domainScores.motor ?? null),
      language: timeline.map((t) => t.domainScores.language ?? null),
      cognitive: timeline.map((t) => t.domainScores.cognitive ?? null),
    };

    const domainAverage = (series) => {
      const vals = series.filter(Boolean);
      return vals.length ? Number((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)) : null;
    };

    const reportScores = timeline.map((t) => t.avgDomainScore).filter(Boolean);
    const scoreTrend = reportScores.length >= 2
      ? Number((reportScores[reportScores.length - 1] - reportScores[0]).toFixed(2))
      : 0;

    const attendanceVals = timeline.map((t) => t.attendancePct).filter((v) => Number.isInteger(v));
    const avgAttendance = attendanceVals.length
      ? Math.round(attendanceVals.reduce((s, v) => s + v, 0) / attendanceVals.length)
      : null;

    const totalIncidents = timeline.reduce((s, t) => s + (t.incidents || 0), 0);

    res.json({
      student: { id: student.id, firstName: student.firstName, lastName: student.lastName },
      months,
      timeline,
      trendSummary: {
        scoreTrend,
        avgAttendance,
        totalIncidents,
        strongestDomain: Object.entries(domainSeries)
          .map(([domain, series]) => ({ domain, avg: domainAverage(series) }))
          .filter((d) => d.avg)
          .sort((a, b) => b.avg - a.avg)[0]?.domain || null,
        watchDomain: Object.entries(domainSeries)
          .map(([domain, series]) => ({ domain, avg: domainAverage(series) }))
          .filter((d) => d.avg)
          .sort((a, b) => a.avg - b.avg)[0]?.domain || null,
      },
      scale: {
        domainScore: { min: 1, max: 4 },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET monthly development report
router.get('/child/:studentId/report/:month/:year', auth, authorize(['parent']), async (req, res) => {
  try {
    const report = await queryOne(
      `SELECT r.*, u.firstName AS teacherFirstName, u.lastName AS teacherLastName
       FROM report r
       LEFT JOIN \`user\` u ON r.teacherId = u.id
       WHERE r.studentId = ? AND r.month = ? AND r.year = ? LIMIT 1`,
      [req.params.studentId, parseInt(req.params.month), parseInt(req.params.year)]
    );
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({
      ...report,
      domains: parseJ(report.domains),
      highlights: parseJ(report.highlights),
      areasForImprovement: parseJ(report.areasForImprovement),
      recommendedActivities: parseJ(report.recommendedActivities),
      teacher: report.teacherFirstName ? { firstName: report.teacherFirstName, lastName: report.teacherLastName } : null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET child's attendance
router.get('/child/:studentId/attendance', auth, authorize(['parent']), async (req, res) => {
  try {
    const attendance = await query('SELECT * FROM attendance WHERE studentId = ? ORDER BY date DESC', [req.params.studentId]);
    res.json(attendance);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET messages with teacher
router.get('/messages/:teacherId', auth, authorize(['parent']), async (req, res) => {
  try {
    const messages = await query(
      `SELECT m.*,
         su.firstName AS senderFirstName, su.lastName AS senderLastName,
         ru.firstName AS recipientFirstName, ru.lastName AS recipientLastName
       FROM message m
       LEFT JOIN \`user\` su ON m.senderId = su.id
       LEFT JOIN \`user\` ru ON m.recipientId = ru.id
       WHERE (m.senderId = ? AND m.recipientId = ?) OR (m.senderId = ? AND m.recipientId = ?)
       ORDER BY m.createdAt DESC`,
      [req.userId, req.params.teacherId, req.params.teacherId, req.userId]
    );
    res.json(messages.map(m => ({
      ...m,
      sender: m.senderFirstName ? { firstName: m.senderFirstName, lastName: m.senderLastName } : null,
      recipient: m.recipientFirstName ? { firstName: m.recipientFirstName, lastName: m.recipientLastName } : null,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST send message to teacher
router.post('/message', auth, authorize(['parent']), async (req, res) => {
  try {
    const { recipientId, studentId, message, mediaUrl } = req.body;
    if (!recipientId || !message) return res.status(400).json({ error: 'recipientId and message are required' });
    const id = newId();
    await query('INSERT INTO message (id, senderId, recipientId, studentId, message, mediaUrl, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, 0, NOW())',
      [id, req.userId, recipientId, studentId || null, message, mediaUrl || null]);
    const msg = await queryOne('SELECT * FROM message WHERE id = ?', [id]);
    res.status(201).json({ message: 'Message sent', data: msg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST book a PTM slot
router.post('/ptm/book', auth, authorize(['parent']), async (req, res) => {
  try {
    const { ptmBookingId } = req.body;
    if (!ptmBookingId) return res.status(400).json({ error: 'ptmBookingId is required' });
    const ptm = await queryOne('SELECT * FROM ptmbooking WHERE id = ? LIMIT 1', [ptmBookingId]);
    if (!ptm) return res.status(404).json({ error: 'PTM slot not found' });
    if (ptm.status !== 'available') return res.status(400).json({ error: 'Slot not available' });
    await query("UPDATE ptmbooking SET status = 'booked', parentId = ?, bookedOn = NOW(), updatedAt = NOW() WHERE id = ?",
      [req.userId, ptmBookingId]);
    const updated = await queryOne('SELECT * FROM ptmbooking WHERE id = ?', [ptmBookingId]);
    res.json({ message: 'PTM slot booked', ptm: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET PTM slots by teacher
router.get('/ptm/slots/:teacherId', auth, authorize(['parent']), async (req, res) => {
  try {
    const slots = await query(
      "SELECT * FROM ptmbooking WHERE teacherId = ? AND status IN ('available','booked') ORDER BY meetingDate ASC",
      [req.params.teacherId]
    );
    res.json(slots);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update authorized pickup contacts
router.put('/child/:studentId/authorized-pickup', auth, authorize(['parent']), async (req, res) => {
  try {
    const { authorizedPickup } = req.body;
    const student = await queryOne('SELECT id, parentIds FROM student WHERE id = ? LIMIT 1', [req.params.studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!(parseJ(student.parentIds) || []).includes(req.userId)) return res.status(403).json({ error: 'Not authorized' });
    await query('UPDATE student SET authorizedPickup = ?, updatedAt = NOW() WHERE id = ?',
      [toJ(authorizedPickup), req.params.studentId]);
    const updated = await queryOne('SELECT * FROM student WHERE id = ?', [req.params.studentId]);
    res.json({ message: 'Authorized pickup updated', student: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET child incidents
router.get('/child/:studentId/incidents', auth, authorize(['parent']), async (req, res) => {
  try {
    const incidents = await query('SELECT * FROM incidentreport WHERE studentId = ? ORDER BY incidentTime DESC', [req.params.studentId]);
    const teacherIds = [...new Set(incidents.map(i => i.teacherId).filter(Boolean))];
    const teachers = teacherIds.length ? await query(`SELECT id, firstName, lastName FROM \`user\` WHERE id IN (${teacherIds.map(() => '?').join(',')})`, teacherIds) : [];
    const tMap = Object.fromEntries(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`]));
    res.json(incidents.map(i => ({ ...i, teacherName: tMap[i.teacherId] || 'Teacher' })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET child milestones
router.get('/child/:studentId/milestones', auth, authorize(['parent']), async (req, res) => {
  try {
    const milestones = await query('SELECT * FROM milestone WHERE studentId = ? ORDER BY isAchieved ASC, createdAt DESC', [req.params.studentId]);
    const teacherIds = [...new Set(milestones.map(m => m.teacherId).filter(Boolean))];
    const teachers = teacherIds.length ? await query(`SELECT id, firstName, lastName FROM \`user\` WHERE id IN (${teacherIds.map(() => '?').join(',')})`, teacherIds) : [];
    const tMap = Object.fromEntries(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`]));
    res.json(milestones.map(m => ({ ...m, teacherName: tMap[m.teacherId] || 'Teacher' })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST pickup request
router.post('/pickup-request', auth, authorize(['parent']), async (req, res) => {
  try {
    const { studentId, personName, mobileNumber, photoUrl } = req.body;
    if (!studentId || !personName || !mobileNumber) return res.status(400).json({ error: 'studentId, personName and mobileNumber are required' });
    const student = await queryOne('SELECT id, schoolId, parentIds FROM student WHERE id = ? LIMIT 1', [studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!(parseJ(student.parentIds) || []).includes(req.userId)) return res.status(403).json({ error: 'You are not authorized to request for this student' });
    const id = newId();
    await query('INSERT INTO pickuprequest (id, studentId, requestedById, schoolId, personName, mobileNumber, photoUrl, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [id, studentId, req.userId, student.schoolId, personName, mobileNumber, photoUrl || null, 'pending']);
    const request = await queryOne('SELECT * FROM pickuprequest WHERE id = ?', [id]);
    res.status(201).json({ message: 'Pickup request submitted. Awaiting school admin approval.', request });
  } catch (err) {
    console.error('Pickup request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET pickup requests
router.get('/pickup-requests', auth, authorize(['parent']), async (req, res) => {
  try {
    const requests = await query(
      'SELECT pr.*, s.id AS studentRelId, s.firstName AS studentFirstName, s.lastName AS studentLastName FROM pickuprequest pr LEFT JOIN student s ON pr.studentId = s.id WHERE pr.requestedById = ? ORDER BY pr.createdAt DESC',
      [req.userId]
    );
    res.json(requests.map(r => ({ ...r, student: r.studentRelId ? { id: r.studentRelId, firstName: r.studentFirstName, lastName: r.studentLastName } : null })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET PTM slots for parent's children (teacher-created sessions)
router.get('/ptm/slots', auth, authorize(['parent']), async (req, res) => {
  try {
    const children = await query('SELECT id FROM student WHERE JSON_CONTAINS(parentIds, JSON_QUOTE(?))', [req.userId]);
    const childIds = children.map(c => c.id);
    if (!childIds.length) return res.json([]);

    const slots = await query(
      `SELECT sl.*, ss.id AS sessionRelId, ss.sessionDate, ss.location, ss.notes AS sessionNotes, ss.teacherId, ss.batchId
       FROM ptmslot sl
       JOIN ptmsession ss ON sl.sessionId = ss.id
       WHERE sl.studentId IN (${childIds.map(() => '?').join(',')})
       ORDER BY sl.createdAt DESC`,
      childIds
    );

    const teacherIds = [...new Set(slots.map(s => s.teacherId).filter(Boolean))];
    const studentIds = [...new Set(slots.map(s => s.studentId).filter(Boolean))];
    const [teachers, students] = await Promise.all([
      teacherIds.length ? query(`SELECT id, firstName, lastName FROM \`user\` WHERE id IN (${teacherIds.map(() => '?').join(',')})`, teacherIds) : [],
      studentIds.length ? query(`SELECT id, firstName, lastName FROM student WHERE id IN (${studentIds.map(() => '?').join(',')})`, studentIds) : [],
    ]);
    const teacherMap = Object.fromEntries(teachers.map(t => [t.id, t]));
    const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

    res.json(slots.map(slot => {
      const teacher = teacherMap[slot.teacherId] || null;
      const student = studentMap[slot.studentId] || null;
      return {
        slotId: slot.id, sessionId: slot.sessionId,
        studentId: slot.studentId, studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
        teacherId: slot.teacherId, teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown Teacher',
        batchId: slot.batchId, sessionDate: slot.sessionDate,
        startTime: slot.startTime, endTime: slot.endTime, status: slot.status,
        location: slot.location || null, notes: slot.sessionNotes || null,
      };
    }));
  } catch (err) {
    console.error('Parent PTM slots error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST PTM request
router.post('/ptm/request', auth, authorize(['parent']), async (req, res) => {
  try {
    const { studentId, requestNotes, preferredDate } = req.body;
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });
    const student = await queryOne('SELECT id, schoolId, parentIds FROM student WHERE id = ? LIMIT 1', [studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!(parseJ(student.parentIds) || []).includes(req.userId)) return res.status(403).json({ error: 'You are not authorized to request PTM for this student' });
    const id = newId();
    await query('INSERT INTO ptmrequest (id, schoolId, parentId, studentId, requestNotes, preferredDate, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [id, student.schoolId, req.userId, studentId, requestNotes || null, preferredDate ? new Date(preferredDate) : null, 'pending']);
    const request = await queryOne('SELECT * FROM ptmrequest WHERE id = ?', [id]);
    res.status(201).json({ message: 'PTM request submitted', request });
  } catch (err) {
    console.error('Parent PTM request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET PTM requests list
router.get('/ptm/requests', auth, authorize(['parent']), async (req, res) => {
  try {
    const requests = await query('SELECT * FROM ptmrequest WHERE parentId = ? ORDER BY createdAt DESC', [req.userId]);
    const studentIds = [...new Set(requests.map(r => r.studentId).filter(Boolean))];
    const teacherIds = [...new Set(requests.map(r => r.teacherId).filter(Boolean))];
    const [students, teachers] = await Promise.all([
      studentIds.length ? query(`SELECT id, firstName, lastName FROM student WHERE id IN (${studentIds.map(() => '?').join(',')})`, studentIds) : [],
      teacherIds.length ? query(`SELECT id, firstName, lastName FROM \`user\` WHERE id IN (${teacherIds.map(() => '?').join(',')})`, teacherIds) : [],
    ]);
    const sMap = Object.fromEntries(students.map(s => [s.id, s]));
    const tMap = Object.fromEntries(teachers.map(t => [t.id, t]));
    res.json(requests.map(r => ({
      ...r,
      studentName: sMap[r.studentId] ? `${sMap[r.studentId].firstName} ${sMap[r.studentId].lastName}` : 'Unknown Student',
      teacherName: r.teacherId && tMap[r.teacherId] ? `${tMap[r.teacherId].firstName} ${tMap[r.teacherId].lastName}` : null,
    })));
  } catch (err) {
    console.error('Parent PTM requests list error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET fee reminders for parent's children
router.get('/fees', auth, authorize(['parent']), async (req, res) => {
  try {
    const rows = await query(
      `SELECT fr.*, s.firstName AS studentFirstName, s.lastName AS studentLastName
       FROM feereminder fr
       JOIN student s ON CONVERT(s.id USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(fr.studentId USING utf8mb4) COLLATE utf8mb4_unicode_ci
       WHERE JSON_CONTAINS(s.parentIds, JSON_QUOTE(?))
       ORDER BY
         CASE fr.status
           WHEN 'overdue' THEN 1
           WHEN 'pending' THEN 2
           WHEN 'payment_submitted' THEN 3
           WHEN 'paid' THEN 4
           WHEN 'cancelled' THEN 5
           ELSE 6
         END,
         fr.dueDate ASC`,
      [req.userId]
    );

    res.json(rows.map((r) => ({
      ...r,
      studentName: `${r.studentFirstName || ''} ${r.studentLastName || ''}`.trim(),
    })));
  } catch (err) {
    console.error('Parent fees list error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /parent/fees/:feeId/submit-payment — parent submits payment proof
router.post('/fees/:feeId/submit-payment', auth, authorize(['parent']), async (req, res) => {
  try {
    const { transactionId, paymentNote, paymentProof } = req.body;
    if (!transactionId) return res.status(400).json({ error: 'transactionId is required' });

    // Verify this fee belongs to one of the parent's children
    const fee = await queryOne(
      `SELECT fr.* FROM feereminder fr
       JOIN student s ON CONVERT(s.id USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(fr.studentId USING utf8mb4) COLLATE utf8mb4_unicode_ci
       WHERE CONVERT(fr.id USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? AND JSON_CONTAINS(s.parentIds, JSON_QUOTE(?)) LIMIT 1`,
      [req.params.feeId, req.userId]
    );
    if (!fee) return res.status(404).json({ error: 'Fee reminder not found' });
    if (!['pending', 'overdue'].includes(fee.status)) return res.status(400).json({ error: 'Fee is not in a payable state' });

    await query(
      'UPDATE feereminder SET status=?, transactionId=?, paymentNote=?, paymentProof=?, paymentSubmittedAt=NOW(), updatedAt=NOW() WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci=?',
      ['payment_submitted', transactionId, paymentNote || '', paymentProof || null, req.params.feeId]
    );

    const updated = await queryOne('SELECT * FROM feereminder WHERE CONVERT(id USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? LIMIT 1', [req.params.feeId]);
    res.json({ success: true, fee: updated });
  } catch (err) {
    console.error('POST /parent/fees/:feeId/submit-payment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /parent/school-payment-details — get school payment details for parent's children's school
router.get('/school-payment-details', auth, authorize(['parent']), async (req, res) => {
  try {
    const child = await queryOne(
      `SELECT s.schoolId FROM student s WHERE JSON_CONTAINS(s.parentIds, JSON_QUOTE(?)) LIMIT 1`,
      [req.userId]
    );
    if (!child?.schoolId) return res.json({});
    const details = await queryOne('SELECT * FROM schoolpaymentdetails WHERE CONVERT(schoolId USING utf8mb4) COLLATE utf8mb4_unicode_ci = ? LIMIT 1', [child.schoolId]);
    res.json(details || {});
  } catch (err) {
    console.error('GET /parent/school-payment-details error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /parent/child/:studentId/transportation — toggle opt-in/out
router.put('/child/:studentId/transportation', auth, authorize(['parent']), async (req, res) => {
  try {
    const { transportationOptIn } = req.body;
    if (typeof transportationOptIn === 'undefined') return res.status(400).json({ error: 'transportationOptIn is required' });

    const student = await queryOne('SELECT id, parentIds, transportationType FROM student WHERE id = ? LIMIT 1', [req.params.studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const parentIds = parseJ(student.parentIds) || [];
    if (!parentIds.includes(req.userId)) return res.status(403).json({ error: 'Not authorized' });

    await query('UPDATE student SET transportationOptIn=?, updatedAt=NOW() WHERE id=?', [transportationOptIn ? 1 : 0, req.params.studentId]);
    const updated = await queryOne('SELECT id, firstName, lastName, transportationType, transportationOptIn FROM student WHERE id=? LIMIT 1', [req.params.studentId]);
    res.json({ success: true, student: updated });
  } catch (err) {
    console.error('PUT /parent/child/:studentId/transportation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /parent/push/public-key
router.get('/push/public-key', auth, authorize(['parent']), async (req, res) => {
  try {
    const publicKey = getPublicVapidKey();
    res.json({ publicKey });
  } catch (err) {
    res.status(503).json({ error: err.message || 'Push notification is not configured' });
  }
});

// POST /parent/push/subscribe
router.post('/push/subscribe', auth, authorize(['parent']), async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: 'Valid subscription payload is required' });
    }

    const id = await upsertPushSubscription({
      userId: req.userId,
      subscription,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(201).json({ success: true, id });
  } catch (err) {
    console.error('POST /parent/push/subscribe error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /parent/push/subscribe
router.delete('/push/subscribe', auth, authorize(['parent']), async (req, res) => {
  try {
    const endpoint = req.body?.endpoint || req.body?.subscription?.endpoint;
    if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });

    const removed = await removePushSubscription({ userId: req.userId, endpoint });
    res.json({ success: true, removed });
  } catch (err) {
    console.error('DELETE /parent/push/subscribe error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
