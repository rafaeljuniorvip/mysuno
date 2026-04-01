const { Router } = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { pool } = require('../config/database');
const { jwtAuth } = require('../middlewares/auth');

const router = Router();
const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'credential is required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture, sub: google_id } = payload;

    // Check if email is allowed
    const allowed = await pool.query('SELECT id FROM allowed_emails WHERE email = $1', [email]);
    if (allowed.rows.length === 0) {
      return res.status(403).json({ error: 'Email not authorized. Contact the administrator.' });
    }

    // Upsert user
    const isAdmin = email === 'rafaeljrssg@gmail.com';
    const result = await pool.query(
      `INSERT INTO users (email, name, picture, google_id, is_admin)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         picture = EXCLUDED.picture,
         google_id = EXCLUDED.google_id,
         is_admin = users.is_admin OR EXCLUDED.is_admin,
         updated_at = NOW()
       RETURNING *`,
      [email, name, picture, google_id, isAdmin]
    );
    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, picture: user.picture, is_admin: user.is_admin } });
  } catch (err) {
    console.error('[POST /api/auth/google]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', jwtAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, name, picture, is_admin, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
