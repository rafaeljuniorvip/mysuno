const { Router } = require('express');
const { pool } = require('../config/database');
const { syncModels, generateLyricsAI } = require('../services/openrouter');

const router = Router();

// List models with advanced filters
router.get('/models', async (req, res) => {
  try {
    const {
      provider, vision, search, sort = 'name', order = 'ASC',
      page = 1, limit = 50,
      // Advanced filters
      moderated, free, min_context, max_context,
      min_price, max_price, output_modality, input_modality,
    } = req.query;

    const params = [];
    const conditions = [];

    if (provider) {
      params.push(provider);
      conditions.push(`provider = $${params.length}`);
    }
    if (vision === 'true') {
      conditions.push(`'image' = ANY(input_modalities)`);
    }
    if (input_modality) {
      params.push(input_modality);
      conditions.push(`$${params.length} = ANY(input_modalities)`);
    }
    if (output_modality) {
      params.push(output_modality);
      conditions.push(`$${params.length} = ANY(output_modalities)`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR id ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }
    if (moderated === 'true') {
      conditions.push('is_moderated = true');
    } else if (moderated === 'false') {
      conditions.push('is_moderated = false');
    }
    if (free === 'true') {
      conditions.push("(pricing_prompt = '0' OR pricing_prompt IS NULL)");
    }
    if (min_context) {
      params.push(parseInt(min_context));
      conditions.push(`context_length >= $${params.length}`);
    }
    if (max_context) {
      params.push(parseInt(max_context));
      conditions.push(`context_length <= $${params.length}`);
    }
    if (min_price) {
      params.push(min_price);
      conditions.push(`pricing_prompt::numeric >= $${params.length}::numeric`);
    }
    if (max_price) {
      params.push(max_price);
      conditions.push(`pricing_prompt::numeric <= $${params.length}::numeric`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSorts = [
      'name', 'provider', 'context_length', 'pricing_prompt', 'pricing_completion',
      'created', 'synced_at', 'max_completion_tokens', 'id',
    ];
    const sortCol = allowedSorts.includes(sort) ? sort : 'name';
    // Cast pricing columns to numeric for proper sorting
    const sortExpr = sortCol.startsWith('pricing_') ? `${sortCol}::numeric` : sortCol;
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const offset = (page - 1) * limit;

    const countRes = await pool.query(`SELECT COUNT(*) FROM ai_models ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM ai_models ${where} ORDER BY ${sortExpr} ${sortOrder} NULLS LAST LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Aggregates for filter UI
    const [providersRes, statsRes] = await Promise.all([
      pool.query('SELECT provider, COUNT(*) as count FROM ai_models GROUP BY provider ORDER BY count DESC'),
      pool.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE 'image' = ANY(input_modalities)) as vision_count,
        COUNT(*) FILTER (WHERE pricing_prompt = '0' OR pricing_prompt IS NULL) as free_count,
        COUNT(*) FILTER (WHERE is_moderated = true) as moderated_count,
        MIN(context_length) as min_ctx,
        MAX(context_length) as max_ctx
      FROM ai_models`),
    ]);

    res.json({
      data: result.rows,
      providers: providersRes.rows,
      stats: statsRes.rows[0],
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

// Last sync info
router.get('/models/sync-info', async (req, res) => {
  try {
    const result = await pool.query('SELECT MAX(synced_at) as last_sync, COUNT(*) as total FROM ai_models');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate lyrics with AI
router.post('/generate-lyrics', async (req, res) => {
  try {
    const { model, prompt, imageBase64, context, systemPrompt, versions } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const result = await generateLyricsAI({
      model, prompt, imageBase64, context, systemPrompt, versions,
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
