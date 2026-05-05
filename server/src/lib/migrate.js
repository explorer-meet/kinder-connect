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
  // Alter status column to allow 'payment_submitted'
  await query(`ALTER TABLE feereminder MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'pending'`).catch(() => {});

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

  console.log('DB tables verified/created');
};

module.exports = { createTables };
