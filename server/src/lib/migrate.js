'use strict';
/**
 * migrate.js — creates new tables if they do not already exist.
 * Called once at server startup (after DB pool is ready).
 */
const { query } = require('./db');

// Safely add a column only if it does not already exist (works on all MySQL versions)
const addColumnIfMissing = async (table, column, definition) => {
  const rows = await query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (!rows[0] || rows[0].cnt === 0) {
    await query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
};

const createTables = async () => {
  // Fee reminders
  await query(`
    CREATE TABLE IF NOT EXISTS feereminder (
      id                   VARCHAR(64)   NOT NULL PRIMARY KEY,
      schoolId             VARCHAR(64)   NOT NULL,
      studentId            VARCHAR(64)   NOT NULL,
      amount               DECIMAL(10,2) NOT NULL DEFAULT 0,
      dueDate              DATE          NOT NULL,
      description          VARCHAR(500)  DEFAULT '',
      status               VARCHAR(30)   NOT NULL DEFAULT 'pending',
      reminderSentAt       DATETIME      NULL,
      paymentProof         VARCHAR(1000) NULL,
      transactionId        VARCHAR(200)  NULL,
      paymentNote          TEXT          NULL,
      paymentSubmittedAt   DATETIME      NULL,
      createdAt            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Alter existing feereminder tables to add payment columns if missing
  await addColumnIfMissing('feereminder', 'paymentProof', 'VARCHAR(1000) NULL');
  await addColumnIfMissing('feereminder', 'transactionId', 'VARCHAR(200) NULL');
  await addColumnIfMissing('feereminder', 'paymentNote', 'TEXT NULL');
  await addColumnIfMissing('feereminder', 'paymentSubmittedAt', 'DATETIME NULL');
  await addColumnIfMissing('feereminder', 'feeStructureId', 'VARCHAR(64) NULL');
  // Alter status column to allow 'payment_submitted'
  await query(`ALTER TABLE feereminder MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'pending'`).catch(() => {});

  // Fee structure (class/batch-wise fee definition)
  await query(`
    CREATE TABLE IF NOT EXISTS feestructure (
      id            VARCHAR(64)   NOT NULL PRIMARY KEY,
      schoolId      VARCHAR(64)   NOT NULL,
      classId       VARCHAR(64)   NOT NULL,
      batchId       VARCHAR(64)   NULL,
      title         VARCHAR(200)  NOT NULL,
      amount        DECIMAL(10,2) NOT NULL DEFAULT 0,
      totalAmount   DECIMAL(10,2) NOT NULL DEFAULT 0,
      dueDate       DATE          NOT NULL,
      installments  JSON          NULL,
      description   VARCHAR(500)  DEFAULT '',
      isActive      TINYINT(1)    NOT NULL DEFAULT 1,
      createdBy     VARCHAR(64)   NULL,
      createdAt     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_feestructure_school (schoolId),
      KEY idx_feestructure_class (classId),
      KEY idx_feestructure_batch (batchId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await addColumnIfMissing('feestructure', 'totalAmount', 'DECIMAL(10,2) NOT NULL DEFAULT 0');
  await addColumnIfMissing('feestructure', 'installments', 'JSON NULL');

  // Student fee structure assignments (tracks which students are linked to which fee structures)
  await query(`
    CREATE TABLE IF NOT EXISTS studentfeestructure (
      id              VARCHAR(64)   NOT NULL PRIMARY KEY,
      studentId       VARCHAR(64)   NOT NULL,
      feeStructureId  VARCHAR(64)   NOT NULL,
      schoolId        VARCHAR(64)   NOT NULL,
      isActive        TINYINT(1)    NOT NULL DEFAULT 1,
      createdAt       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_student_feestructure (studentId, feeStructureId),
      KEY idx_student_id (studentId),
      KEY idx_feestructure_id (feeStructureId),
      KEY idx_school_id (schoolId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Incident escalation workflow fields
  await addColumnIfMissing('incidentreport', 'escalationLevel', "VARCHAR(20) NOT NULL DEFAULT 'none'");
  await addColumnIfMissing('incidentreport', 'escalationStatus', "VARCHAR(30) NOT NULL DEFAULT 'open'");
  await addColumnIfMissing('incidentreport', 'escalationNotes', 'TEXT NULL');
  await addColumnIfMissing('incidentreport', 'escalatedAt', 'DATETIME NULL');
  await addColumnIfMissing('incidentreport', 'escalatedById', 'VARCHAR(64) NULL');
  await addColumnIfMissing('incidentreport', 'resolvedAt', 'DATETIME NULL');
  await addColumnIfMissing('incidentreport', 'resolutionSummary', 'TEXT NULL');

  // School payment details
  await query(`
    CREATE TABLE IF NOT EXISTS schoolpaymentdetails (
      id              VARCHAR(64)   NOT NULL PRIMARY KEY,
      schoolId        VARCHAR(64)   NOT NULL UNIQUE,
      upiId           VARCHAR(200)  DEFAULT '',
      upiName         VARCHAR(200)  DEFAULT '',
      bankName        VARCHAR(200)  DEFAULT '',
      accountNumber   VARCHAR(100)  DEFAULT '',
      ifscCode        VARCHAR(50)   DEFAULT '',
      accountName     VARCHAR(200)  DEFAULT '',
      qrCodeUrl       VARCHAR(1000) DEFAULT '',
      instructions    TEXT,
      updatedAt       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Add transportation fields to student table if missing
  await addColumnIfMissing('student', 'transportationType', 'VARCHAR(20) NULL');
  await addColumnIfMissing('student', 'transportationOptIn', 'TINYINT(1) NOT NULL DEFAULT 1');

  // School branding
  await query(`
    CREATE TABLE IF NOT EXISTS schoolbranding (
      id             VARCHAR(64)   NOT NULL PRIMARY KEY,
      schoolId       VARCHAR(64)   NOT NULL UNIQUE,
      logoUrl        VARCHAR(1000) DEFAULT '',
      primaryColor   VARCHAR(20)   DEFAULT '#059669',
      secondaryColor VARCHAR(20)   DEFAULT '#0d9488',
      tagline        VARCHAR(300)  DEFAULT '',
      updatedAt      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Audit log
  await query(`
    CREATE TABLE IF NOT EXISTS auditlog (
      id         VARCHAR(64)   NOT NULL PRIMARY KEY,
      schoolId   VARCHAR(64)   NOT NULL,
      actorId    VARCHAR(64)   NOT NULL,
      actorName  VARCHAR(200)  DEFAULT '',
      actorRole  VARCHAR(50)   DEFAULT '',
      action     VARCHAR(200)  NOT NULL,
      targetType VARCHAR(100)  DEFAULT '',
      targetId   VARCHAR(64)   DEFAULT '',
      metadata   JSON,
      ipAddress  VARCHAR(100)  DEFAULT '',
      createdAt  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Consent records
  await query(`
    CREATE TABLE IF NOT EXISTS consentrecord (
      id          VARCHAR(64)  NOT NULL PRIMARY KEY,
      schoolId    VARCHAR(64)  NOT NULL,
      parentId    VARCHAR(64)  NOT NULL,
      studentId   VARCHAR(64)  NOT NULL,
      consentType VARCHAR(100) NOT NULL,
      consentText TEXT,
      accepted    TINYINT(1)   NOT NULL DEFAULT 0,
      acceptedAt  DATETIME     NULL,
      createdAt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Parent web push subscriptions
  await query(`
    CREATE TABLE IF NOT EXISTS pushsubscription (
      id            VARCHAR(64)   NOT NULL PRIMARY KEY,
      userId        VARCHAR(64)   NOT NULL,
      endpoint      TEXT          NOT NULL,
      endpointHash  CHAR(64)      NOT NULL,
      p256dh        VARCHAR(255)  NOT NULL,
      auth          VARCHAR(255)  NOT NULL,
      userAgent     VARCHAR(500)  DEFAULT '',
      createdAt     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_push_endpoint_hash (endpointHash),
      KEY idx_push_user (userId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('DB tables verified/created');
};

module.exports = { createTables };
