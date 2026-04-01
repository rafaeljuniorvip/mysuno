const { Router } = require('express');
const { pool } = require('../config/database');
const { syncPendingSongs } = require('../services/suno');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(title ILIKE $${params.length} OR prompt ILIKE $${params.length} OR tags ILIKE $${params.length})`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const allowedSorts = ['created_at', 'title', 'status', 'duration'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await pool.query(`SELECT COUNT(*) FROM songs ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM songs ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[GET /api/songs]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM songs WHERE id = $1 OR suno_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Song not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[GET /api/songs/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM songs WHERE id = $1 OR suno_id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Song not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('[DELETE /api/songs/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const result = await syncPendingSongs();
    res.json(result);
  } catch (err) {
    console.error('[POST /api/songs/sync]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
