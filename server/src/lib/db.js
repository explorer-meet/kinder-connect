'use strict';

const mysql = require('mysql2/promise');
const { randomUUID } = require('crypto');

// Parse DATABASE_URL (strips unsupported params like ?sslaccept=...)
const parseDbUrl = (rawUrl = '') => {
  const clean = rawUrl.split('?')[0];
  const u = new URL(clean);
  return {
    host: u.hostname,
    port: parseInt(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  };
};

const cfg = parseDbUrl(process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/kinder_connect');

const pool = mysql.createPool({
  ...cfg,
  ssl: { rejectUnauthorized: false }, // required for Aiven self-signed cert
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

// Run a query, return all rows
const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

// Run a query, return first row or null
const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return Array.isArray(rows) ? (rows[0] || null) : null;
};

// Generate a unique string ID
const newId = () => 'c' + randomUUID().replace(/-/g, '');

// Safely parse a JSON value (handles already-parsed objects and string-encoded JSON)
const parseJ = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return null; } }
  return val;
};

// Safely stringify for INSERT/UPDATE into JSON columns
const toJ = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val; // already a JSON string
  return JSON.stringify(val);
};

module.exports = { pool, query, queryOne, newId, parseJ, toJ };
