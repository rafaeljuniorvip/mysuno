const { Router } = require('express');
const suno = require('../services/suno');

const router = Router();

router.post('/generate', async (req, res) => {
  try {
    const { prompt, make_instrumental, wait_audio } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    const result = await suno.generate({ prompt, make_instrumental, wait_audio });
    res.json(result);
  } catch (err) {
    console.error('[POST /api/suno/generate]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.msg || err.message });
  }
});

router.post('/custom_generate', async (req, res) => {
  try {
    const { prompt, tags, title, make_instrumental, wait_audio } = req.body;
    if (!prompt && !tags) return res.status(400).json({ error: 'prompt or tags is required' });
    const result = await suno.customGenerate({ prompt, tags, title, make_instrumental, wait_audio });
    res.json(result);
  } catch (err) {
    console.error('[POST /api/suno/custom_generate]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.msg || err.message });
  }
});

router.post('/generate_lyrics', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    const result = await suno.generateLyrics(prompt);
    res.json(result);
  } catch (err) {
    console.error('[POST /api/suno/generate_lyrics]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.msg || err.message });
  }
});

router.post('/extend_audio', async (req, res) => {
  try {
    const { audio_id, prompt, continue_at, tags, title, wait_audio } = req.body;
    if (!audio_id) return res.status(400).json({ error: 'audio_id is required' });
    const result = await suno.extendAudio({ audio_id, prompt, continue_at, tags, title, wait_audio });
    res.json(result);
  } catch (err) {
    console.error('[POST /api/suno/extend_audio]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.msg || err.message });
  }
});

router.get('/limit', async (req, res) => {
  try {
    const result = await suno.getLimit();
    res.json(result);
  } catch (err) {
    console.error('[GET /api/suno/limit]', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.msg || err.message });
  }
});

// Generation status polling (frontend uses this)
router.get('/status/:generationId', async (req, res) => {
  try {
    const result = await suno.getGenerationStatus(req.params.generationId);
    if (!result) return res.status(404).json({ error: 'Generation not found' });
    res.json(result);
  } catch (err) {
    console.error('[GET /api/suno/status]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Callback endpoint for sunoapi.org (receives results when ready)
router.post('/callback', async (req, res) => {
  console.log('[Suno Callback] Received:', JSON.stringify(req.body).slice(0, 200));
  res.json({ ok: true });
});

module.exports = router;
