const { Router } = require('express');
const { pool } = require('../config/database');

const router = Router();

router.get('/summary', async (req, res) => {
  try {
    const [songs, generations, today, styles] = await Promise.all([
      pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'complete') as completed FROM songs"),
      pool.query('SELECT COUNT(*) as total, SUM(credits_used) as credits FROM generations'),
      pool.query("SELECT COUNT(*) as total FROM songs WHERE created_at >= CURRENT_DATE"),
      pool.query("SELECT COUNT(DISTINCT tags) as total FROM songs WHERE tags IS NOT NULL AND tags != ''"),
    ]);

    res.json({
      total_songs: parseInt(songs.rows[0].total),
      completed_songs: parseInt(songs.rows[0].completed),
      total_generations: parseInt(generations.rows[0].total),
      total_credits_used: parseInt(generations.rows[0].credits || 0),
      songs_today: parseInt(today.rows[0].total),
      unique_styles: parseInt(styles.rows[0].total),
    });
  } catch (err) {
    console.error('[GET /api/reports/summary]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/by-period', async (req, res) => {
  try {
    const { start, end, group = 'day' } = req.query;
    const params = [];
    const conditions = [];

    if (start) { params.push(start); conditions.push(`created_at >= $${params.length}`); }
    if (end) { params.push(end); conditions.push(`created_at <= $${params.length}`); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const trunc = group === 'month' ? 'month' : group === 'week' ? 'week' : 'day';

    const result = await pool.query(
      `SELECT DATE_TRUNC('${trunc}', created_at) as period, COUNT(*) as total
       FROM songs ${where}
       GROUP BY period ORDER BY period DESC LIMIT 90`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/reports/by-period]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/by-style', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tags as style, COUNT(*) as total
       FROM songs WHERE tags IS NOT NULL AND tags != ''
       GROUP BY tags ORDER BY total DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/reports/by-style]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/by-type', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT type, COUNT(*) as total, SUM(credits_used) as credits
       FROM generations GROUP BY type ORDER BY total DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/reports/by-type]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
