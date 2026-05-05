'use strict';

const { createHash } = require('crypto');
const webpush = require('web-push');
const { query, queryOne, newId, parseJ } = require('./db');

let vapidConfigured = false;

const ensureVapidConfigured = () => {
  if (vapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  const subject = process.env.VAPID_SUBJECT || 'mailto:support@kinderconnect.local';
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
};

const getPublicVapidKey = () => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    throw new Error('Push notifications are not configured on server');
  }
  return process.env.VAPID_PUBLIC_KEY;
};

const hashEndpoint = (endpoint = '') => createHash('sha256').update(String(endpoint)).digest('hex');

const upsertPushSubscription = async ({ userId, subscription, userAgent = '' }) => {
  const endpoint = String(subscription?.endpoint || '').trim();
  const p256dh = String(subscription?.keys?.p256dh || '').trim();
  const auth = String(subscription?.keys?.auth || '').trim();

  if (!endpoint || !p256dh || !auth) {
    throw new Error('Invalid push subscription payload');
  }

  const endpointHash = hashEndpoint(endpoint);
  const existing = await queryOne('SELECT id FROM pushsubscription WHERE endpointHash = ? LIMIT 1', [endpointHash]);

  if (existing?.id) {
    await query(
      'UPDATE pushsubscription SET userId = ?, endpoint = ?, p256dh = ?, auth = ?, userAgent = ?, updatedAt = NOW() WHERE id = ?',
      [userId, endpoint, p256dh, auth, userAgent, existing.id]
    );
    return existing.id;
  }

  const id = newId();
  await query(
    'INSERT INTO pushsubscription (id, userId, endpoint, endpointHash, p256dh, auth, userAgent, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [id, userId, endpoint, endpointHash, p256dh, auth, userAgent]
  );
  return id;
};

const removePushSubscription = async ({ userId, endpoint }) => {
  const cleanEndpoint = String(endpoint || '').trim();
  if (!cleanEndpoint) return 0;

  const endpointHash = hashEndpoint(cleanEndpoint);
  const result = await query('DELETE FROM pushsubscription WHERE userId = ? AND endpointHash = ?', [userId, endpointHash]);
  return result?.affectedRows || 0;
};

const sendPushToUsers = async ({ userIds, payload }) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return { sent: 0, failed: 0, skipped: 0 };
  }

  if (!ensureVapidConfigured()) {
    return { sent: 0, failed: 0, skipped: userIds.length };
  }

  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueUserIds.length) return { sent: 0, failed: 0, skipped: 0 };

  const subscriptions = await query(
    `SELECT id, endpoint, endpointHash, p256dh, auth FROM pushsubscription WHERE userId IN (${uniqueUserIds.map(() => '?').join(',')})`,
    uniqueUserIds
  );

  let sent = 0;
  let failed = 0;
  const staleHashes = [];

  await Promise.all(subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
        { TTL: 60 * 60 }
      );
      sent += 1;
    } catch (err) {
      failed += 1;
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        staleHashes.push(sub.endpointHash);
      }
    }
  }));

  if (staleHashes.length) {
    await query(
      `DELETE FROM pushsubscription WHERE endpointHash IN (${staleHashes.map(() => '?').join(',')})`,
      staleHashes
    ).catch(() => {});
  }

  return { sent, failed, skipped: 0 };
};

const notifyParentsForActivity = async (activity) => {
  if (!activity) return;

  const type = String(activity.activityType || '').toLowerCase();
  const teacher = await queryOne('SELECT firstName, lastName FROM `user` WHERE id = ? LIMIT 1', [activity.teacherId]);
  const teacherName = teacher ? `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() : 'Teacher';

  let students = [];
  if (activity.studentId) {
    const student = await queryOne('SELECT id, firstName, lastName, parentIds FROM student WHERE id = ? LIMIT 1', [activity.studentId]);
    if (student) students = [student];
  } else if (activity.batchId) {
    students = await query('SELECT id, firstName, lastName, parentIds FROM student WHERE batchId = ?', [activity.batchId]);
  }

  const parentIds = [...new Set(
    students.flatMap((s) => {
      const parsed = parseJ(s.parentIds) || [];
      return Array.isArray(parsed) ? parsed : [];
    })
  )];

  if (!parentIds.length) return;

  const studentName = students.length === 1
    ? `${students[0].firstName || ''} ${students[0].lastName || ''}`.trim()
    : 'your child\'s class';

  const bodyText = activity.notes || activity.description || activity.caption || `${teacherName} added a ${type || 'new'} update.`;
  const payload = {
    title: 'New Activity Update',
    body: students.length === 1
      ? `${teacherName}: ${studentName} - ${bodyText}`
      : `${teacherName}: ${bodyText}`,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    data: {
      url: activity.studentId ? `/parent/feed/${activity.studentId}` : '/parent/dashboard',
      activityId: activity.id,
      activityType: type,
    },
    tag: `activity-${activity.id}`,
  };

  await sendPushToUsers({ userIds: parentIds, payload });
};

module.exports = {
  getPublicVapidKey,
  upsertPushSubscription,
  removePushSubscription,
  notifyParentsForActivity,
};
