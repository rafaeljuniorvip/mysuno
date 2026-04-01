const { Router } = require('express');
const { pool } = require('../config/database');
const { syncModels, generateLyricsAI } = require('../services/openrouter');
const { jwtAuth } = require('../middlewares/auth');

const router = Router();

// List models from DB with filters
router.get('/models', async (req, res) => {
  try {
    const { provider, vision, search, sort = 'name', order = 'ASC', page = 1, limit = 50 } = req.query;
    const params = [];
    const conditions = [];

    if (provider) {
      params.push(provider);
      conditions.push(`provider = $${params.length}`);
    }
    if (vision === 'true') {
      conditions.push(`'image' = ANY(input_modalities)`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR id ILIKE $${params.length})`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const allowedSorts = ['name', 'provider', 'context_length', 'pricing_prompt', 'created', 'synced_at'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'name';
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const offset = (page - 1) * limit;

    const countRes = await pool.query(`SELECT COUNT(*) FROM ai_models ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM ai_models ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Get distinct providers for filter dropdown
    const providersRes = await pool.query('SELECT DISTINCT provider FROM ai_models ORDER BY provider');

    res.json({
      data: result.rows,
      providers: providersRes.rows.map(r => r.provider),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync models from OpenRouter
router.post('/models/sync', async (req, res) => {
  try {
    const result = await syncModels();
    res.json(result);
  } catch (err) {
    console.error('[POST /api/ai/models/sync]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Generate lyrics with AI
router.post('/generate-lyrics', async (req, res) => {
  try {
    const { model, prompt, imageBase64, context, systemPrompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const result = await generateLyricsAI({
      model,
      prompt,
      imageBase64,
      context,
      systemPrompt,
      userId: req.user.id,
    });

    res.json(result);
  } catch (err) {
    console.error('[POST /api/ai/generate-lyrics]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// List user conversations
router.get('/conversations', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT id, model_id, generated_title, total_tokens, total_cost, created_at
       FROM ai_conversations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get conversation detail
router.get('/conversations/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ai_conversations WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user preferences
router.get('/preferences', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_preferences WHERE user_id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.json({ user_id: req.user.id, default_model: 'anthropic/claude-sonnet-4', default_system_prompt: null });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user preferences
router.put('/preferences', async (req, res) => {
  try {
    const { default_model, default_system_prompt } = req.body;
    const result = await pool.query(
      `INSERT INTO user_preferences (user_id, default_model, default_system_prompt, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         default_model = COALESCE(EXCLUDED.default_model, user_preferences.default_model),
         default_system_prompt = EXCLUDED.default_system_prompt,
         updated_at = NOW()
       RETURNING *`,
      [req.user.id, default_model, default_system_prompt]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
