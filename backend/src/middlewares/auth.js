const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');
const { pool } = require('../config/database');

function jwtAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(header.slice(7), config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) {
    return res.status(401).json({ error: 'No API key provided' });
  }

  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const result = await pool.query(
    `SELECT ak.*, u.email, u.is_admin FROM api_keys ak
     JOIN users u ON u.id = ak.user_id
     WHERE ak.key_hash = $1 AND ak.revoked = false`,
    [hash]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const row = result.rows[0];
  pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [row.id]);
  req.user = { id: row.user_id, email: row.email, is_admin: row.is_admin };
  next();
}

function combinedAuth(req, res, next) {
  if (req.headers['x-api-key']) {
    return apiKeyAuth(req, res, next);
  }
  return jwtAuth(req, res, next);
}

function adminOnly(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { jwtAuth, apiKeyAuth, combinedAuth, adminOnly };
