const { Router } = require('express');
const { pool } = require('../config/database');

const router = Router();

router.get('/summary', async (req, res) => {
  try {
    const [songs, generations, today, styles] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'complete') as completed,
          COALESCE(AVG(duration::numeric) FILTER (WHERE duration IS NOT NULL AND duration::numeric > 0), 0) as avg_duration
        FROM songs WHERE deleted_at IS NULL
      `),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COALESCE(SUM(credits_used), 0) as credits,
          COUNT(*) FILTER (WHERE status = 'complete') as completed_gens
        FROM generations
      `),
      pool.query("SELECT COUNT(*) as total FROM songs WHERE deleted_at IS NULL AND created_at >= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date"),
      pool.query("SELECT COUNT(DISTINCT SPLIT_PART(tags, ',', 1)) as total FROM songs WHERE deleted_at IS NULL AND tags IS NOT NULL AND tags != ''"),
    ]);

    const totalGens = parseInt(generations.rows[0].total) || 0;
    const completedGens = parseInt(generations.rows[0].completed_gens) || 0;

    res.json({
      total_songs: parseInt(songs.rows[0].total),
      completed_songs: parseInt(songs.rows[0].completed),
      total_generations: totalGens,
      completed_generations: completedGens,
      total_credits_used: parseInt(generations.rows[0].credits || 0),
      songs_today: parseInt(today.rows[0].total),
      unique_styles: parseInt(styles.rows[0].total),
      avg_duration: parseFloat(songs.rows[0].avg_duration) || 0,
      success_rate: totalGens > 0 ? Math.round((completedGens / totalGens) * 100) : 0,
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
    const conditions = ['deleted_at IS NULL'];

    if (start) { params.push(start); conditions.push(`created_at >= $${params.length}`); }
    if (end) { params.push(end); conditions.push(`created_at <= $${params.length}`); }

    const where = `WHERE ${conditions.join(' AND ')}`;
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
    // Truncate tags to first part (before long AI descriptions)
    const result = await pool.query(
      `SELECT
        CASE
          WHEN position(',' in tags) > 0 THEN TRIM(SPLIT_PART(tags, ',', 1))
          ELSE tags
        END as style,
        COUNT(*) as total
       FROM songs
       WHERE deleted_at IS NULL AND tags IS NOT NULL AND tags != ''
       GROUP BY style ORDER BY total DESC LIMIT 50`
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
      `SELECT type, COUNT(*) as total, COALESCE(SUM(credits_used), 0) as credits
       FROM generations GROUP BY type ORDER BY total DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/reports/by-type]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
