const { Router } = require('express');
const { pool } = require('../config/database');
const { jwtAuth, adminOnly } = require('../middlewares/auth');

const router = Router();

router.get('/allowed', jwtAuth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM allowed_emails ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/allowed', jwtAuth, adminOnly, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const result = await pool.query(
      'INSERT INTO allowed_emails (email, added_by) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING *',
      [email.toLowerCase().trim(), req.user.id]
    );
    if (result.rows.length === 0) return res.status(409).json({ error: 'Email already exists' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/allowed/:id', jwtAuth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM allowed_emails WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
