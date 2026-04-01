const { Router } = require('express');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { jwtAuth } = require('../middlewares/auth');

const router = Router();

router.get('/', jwtAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, key_prefix, last_used_at, revoked, created_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', jwtAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const rawKey = 'mysn_' + crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.slice(0, 9);

    const result = await pool.query(
      'INSERT INTO api_keys (user_id, name, key_hash, key_prefix) VALUES ($1, $2, $3, $4) RETURNING id, name, key_prefix, created_at',
      [req.user.id, name, hash, prefix]
    );

    res.json({ ...result.rows[0], key: rawKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', jwtAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE api_keys SET revoked = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Key not found' });
    res.json({ revoked: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
