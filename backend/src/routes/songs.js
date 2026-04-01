const { Router } = require('express');
const { pool } = require('../config/database');
const { syncPendingSongs } = require('../services/suno');

const router = Router();

// === STATIC ROUTES FIRST (before :id) ===

// Stats overview
router.get('/stats/overview', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL) as total,
        COUNT(*) FILTER (WHERE status = 'complete' AND deleted_at IS NULL) as completed,
        COUNT(*) FILTER (WHERE is_favorite = true AND deleted_at IS NULL) as favorites,
        COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as trashed,
        COALESCE(SUM(duration) FILTER (WHERE deleted_at IS NULL), 0) as total_duration
      FROM songs
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List deleted songs (trash)
router.get('/trash/list', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM songs WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Permanently delete all trashed songs
router.delete('/trash', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM songs WHERE deleted_at IS NOT NULL');
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync pending songs
router.post('/sync', async (req, res) => {
  try {
    const result = await syncPendingSongs();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk delete
router.post('/bulk/delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'ids is required' });
    const result = await pool.query(
      'UPDATE songs SET deleted_at = NOW() WHERE id = ANY($1) AND deleted_at IS NULL',
      [ids]
    );
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk favorite
router.post('/bulk/favorite', async (req, res) => {
  try {
    const { ids, is_favorite } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'ids is required' });
    const result = await pool.query(
      'UPDATE songs SET is_favorite = $2, updated_at = NOW() WHERE id = ANY($1) AND deleted_at IS NULL',
      [ids, is_favorite !== false]
    );
    res.json({ updated: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === LIST ROUTE ===

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, sort = 'created_at', order = 'DESC', favorite, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = ['deleted_at IS NULL'];

    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(title ILIKE $${params.length} OR prompt ILIKE $${params.length} OR tags ILIKE $${params.length})`); }
    if (favorite === 'true') { conditions.push('is_favorite = true'); }
    if (date_from) { params.push(date_from); conditions.push(`created_at >= $${params.length}`); }
    if (date_to) { params.push(date_to); conditions.push(`created_at <= $${params.length}`); }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const allowedSorts = ['created_at', 'title', 'status', 'duration', 'is_favorite'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await pool.query(`SELECT COUNT(*) FROM songs ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM songs ${where} ORDER BY is_favorite DESC, ${sortCol} ${sortOrder} LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === PARAMETERIZED ROUTES ===

// Get single song
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM songs WHERE (id = $1 OR suno_id = $1) AND deleted_at IS NULL', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Song not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update song metadata
router.patch('/:id', async (req, res) => {
  try {
    const { title, tags, notes, is_favorite } = req.body;
    const updates = [];
    const params = [];

    if (title !== undefined) { params.push(title); updates.push(`title = $${params.length}`); }
    if (tags !== undefined) { params.push(tags); updates.push(`tags = $${params.length}`); }
    if (notes !== undefined) { params.push(notes); updates.push(`notes = $${params.length}`); }
    if (is_favorite !== undefined) { params.push(is_favorite); updates.push(`is_favorite = $${params.length}`); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    const result = await pool.query(
      `UPDATE songs SET ${updates.join(', ')} WHERE (id = $${params.length} OR suno_id = $${params.length}) AND deleted_at IS NULL RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Song not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle favorite
router.post('/:id/favorite', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE songs SET is_favorite = NOT is_favorite, updated_at = NOW() WHERE (id = $1 OR suno_id = $1) AND deleted_at IS NULL RETURNING id, is_favorite',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Song not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Soft delete
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE songs SET deleted_at = NOW() WHERE (id = $1 OR suno_id = $1) AND deleted_at IS NULL RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Song not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore soft-deleted song
router.post('/:id/restore', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE songs SET deleted_at = NULL, updated_at = NOW() WHERE (id = $1 OR suno_id = $1) AND deleted_at IS NOT NULL RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Song not found or not deleted' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
