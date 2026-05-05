'use strict';
/**
 * migrate.js — creates new tables if they do not already exist.
 * Called once at server startup (after DB pool is ready).
 */
const { query } = require('./db');

const createTables = async () => {
  // Fee reminders
  await query(`
    CREATE TABLE IF NOT EXISTS feereminder (
      id           VARCHAR(64)  NOT NULL PRIMARY KEY,
      schoolId     VARCHAR(64)  NOT NULL,
      studentId    VARCHAR(64)  NOT NULL,
      amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
      dueDate      DATE         NOT NULL,
      description  VARCHAR(500) DEFAULT '',
      status       ENUM('pending','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
      reminderSentAt DATETIME   NULL,
      createdAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

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
