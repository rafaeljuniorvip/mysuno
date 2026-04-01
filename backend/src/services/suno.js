const axios = require('axios');
const config = require('../config/env');
const { getToken } = require('./auth');
const { pool } = require('../config/database');

const SUNOAPI_BASE = 'https://api.sunoapi.org';
const CALLBACK_URL = 'https://api.mysn.vipte.co/api/suno/callback';

// Client for sunoapi.org (generation, lyrics, extend)
function sunoApiClient() {
  return axios.create({
    baseURL: SUNOAPI_BASE,
    headers: {
      'Authorization': `Bearer ${config.SUNO_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
}

// Client for Suno direct API (billing, feed — these don't need captcha)
async function directClient() {
  const token = await getToken();
  return axios.create({
    baseURL: config.SUNO_API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Referer': 'https://suno.com/',
      'Origin': 'https://suno.com',
    },
  });
}

async function generate({ prompt, make_instrumental = false, wait_audio = false }) {
  const client = sunoApiClient();
  const requestData = {
    customMode: false,
    prompt,
    instrumental: make_instrumental,
    model: 'V5_5',
    callBackUrl: CALLBACK_URL,
  };

  const response = await client.post('/api/v1/generate', requestData);
  const taskId = response.data.data?.taskId;
  if (!taskId && response.data.code !== 200) {
    throw new Error(response.data.msg || 'Failed to start generation');
  }

  const generation = await saveGeneration('generate', prompt, requestData, response.data);
  await saveTaskMapping(taskId, generation.id);

  // Always poll in background to save results
  if (taskId) pollAndSave(taskId, generation.id);

  return { taskId, generationId: generation.id, status: 'generating' };
}

async function customGenerate({ prompt, tags, title, make_instrumental = false, wait_audio = false }) {
  const client = sunoApiClient();
  const requestData = {
    customMode: true,
    prompt: make_instrumental ? '' : prompt,
    style: tags || '',
    title: title || '',
    instrumental: make_instrumental,
    model: 'V5_5',
    callBackUrl: CALLBACK_URL,
  };

  const response = await client.post('/api/v1/generate', requestData);
  const taskId = response.data.data?.taskId;
  if (!taskId && response.data.code !== 200) {
    throw new Error(response.data.msg || 'Failed to start generation');
  }

  const generation = await saveGeneration('custom_generate', prompt, requestData, response.data);
  await saveTaskMapping(taskId, generation.id);

  if (taskId) pollAndSave(taskId, generation.id);

  return { taskId, generationId: generation.id, status: 'generating' };
}

async function generateLyrics(prompt) {
  const client = sunoApiClient();
  const response = await client.post('/api/v1/lyrics', { prompt, callBackUrl: CALLBACK_URL });
  const taskId = response.data.data?.taskId;

  await saveGeneration('lyrics', prompt, { prompt }, response.data);

  if (!taskId) return response.data;

  // Poll for lyrics result
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const result = await client.get(`/api/v1/lyrics/record-info?taskId=${taskId}`);
    const data = result.data.data;
    if (data?.status === 'SUCCESS' || data?.status === 'complete') {
      const lyrics = data.response?.sunoData?.[0] || data.response || data;
      return { title: lyrics.title, text: lyrics.text, status: 'complete' };
    }
  }

  return { error: 'Lyrics generation timed out' };
}

async function get(ids) {
  const client = await directClient();
  if (ids) {
    const response = await client.get(`/api/feed/?ids=${ids}`);
    return response.data;
  }
  const response = await client.get('/api/feed/');
  return response.data;
}

async function getLimit() {
  const client = await directClient();
  const response = await client.get('/api/billing/info/');
  const data = response.data;
  return {
    credits_left: data.total_credits_left ?? data.credits,
    period: data.period,
    monthly_limit: data.monthly_limit,
    monthly_usage: data.monthly_usage,
    plan: data.plan?.name,
    renews_on: data.renews_on,
  };
}

async function extendAudio({ audio_id, prompt, continue_at, tags, title, wait_audio = false }) {
  const client = sunoApiClient();
  const requestData = {
    audioId: audio_id,
    defaultParamFlag: !!(prompt || tags || title),
    prompt: prompt || '',
    style: tags || '',
    title: title || '',
    continueAt: continue_at || 0,
    model: 'V5_5',
    callBackUrl: CALLBACK_URL,
  };

  const response = await client.post('/api/v1/generate/extend', requestData);
  const taskId = response.data.data?.taskId;
  if (!taskId && response.data.code !== 200) {
    throw new Error(response.data.msg || 'Failed to start extension');
  }

  const generation = await saveGeneration('extend', prompt, requestData, response.data);
  await saveTaskMapping(taskId, generation.id);

  if (taskId) pollAndSave(taskId, generation.id);

  return { taskId, generationId: generation.id, status: 'generating' };
}

// --- Task tracking ---

async function saveTaskMapping(taskId, generationId) {
  if (!taskId) return;
  await pool.query(
    "UPDATE generations SET response_data = jsonb_set(COALESCE(response_data, '{}')::jsonb, '{taskId}', $1::jsonb) WHERE id = $2",
    [JSON.stringify(taskId), generationId]
  );
}

async function getGenerationStatus(generationId) {
  const gen = await pool.query('SELECT * FROM generations WHERE id = $1', [generationId]);
  if (gen.rows.length === 0) return null;
  const g = gen.rows[0];

  if (g.status === 'complete' || g.status === 'failed') {
    const songs = await pool.query(
      "SELECT * FROM songs WHERE created_at >= $1 AND created_at <= $2 + interval '5 minutes' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 4",
      [g.created_at, g.created_at]
    );
    return { ...g, songs: songs.rows };
  }

  // Try to poll if we have taskId
  const taskId = g.response_data?.taskId;
  if (taskId && g.status === 'pending') {
    try {
      const client = sunoApiClient();
      const result = await client.get(`/api/v1/generate/record-info?taskId=${taskId}`);
      const data = result.data.data;
      if (data?.status === 'SUCCESS') {
        const clips = normalizeClips(data);
        await saveClips(clips);
        await updateGeneration(generationId, 'complete');
        return { ...g, status: 'complete', songs: clips };
      }
      return { ...g, sunoStatus: data?.status || 'PENDING' };
    } catch {
      return { ...g, sunoStatus: 'PENDING' };
    }
  }

  return g;
}

// --- sunoapi.org polling ---

async function pollTask(taskId, maxRetries = 60) {
  const client = sunoApiClient();
  for (let i = 0; i < maxRetries; i++) {
    await sleep(5000);
    const result = await client.get(`/api/v1/generate/record-info?taskId=${taskId}`);
    const data = result.data.data;
    if (data?.status === 'SUCCESS') return data;
    if (data?.status?.includes('FAILED') || data?.status?.includes('ERROR')) {
      throw new Error(data.errorMessage || `Generation failed: ${data.status}`);
    }
  }
  throw new Error('Generation timed out');
}

function normalizeClips(taskData) {
  const sunoData = taskData?.response?.sunoData || [];
  return sunoData.map(clip => ({
    id: clip.id,
    title: clip.title || null,
    prompt: clip.prompt || null,
    tags: clip.tags || null,
    lyric: clip.prompt || null,
    audio_url: clip.sourceAudioUrl || clip.audioUrl || null,
    stream_audio_url: clip.sourceStreamAudioUrl || clip.streamAudioUrl || null,
    image_url: clip.sourceImageUrl || clip.imageUrl || null,
    video_url: null,
    model_name: clip.modelName || 'V5_5',
    status: (clip.audioUrl || clip.sourceAudioUrl) ? 'complete' : 'pending',
    duration: clip.duration || null,
    created_at: clip.createTime ? new Date(clip.createTime).toISOString() : new Date().toISOString(),
  }));
}

async function pollAndSave(taskId, generationId) {
  try {
    const result = await pollTask(taskId);
    const clips = normalizeClips(result);
    await saveClips(clips);
    await updateGeneration(generationId, 'complete');
  } catch (err) {
    console.error('[Suno] Background poll failed:', err.message);
    await updateGeneration(generationId, 'failed');
  }
}

// --- Persistence helpers ---

async function saveGeneration(type, prompt, requestData, responseData) {
  const result = await pool.query(
    `INSERT INTO generations (type, prompt, songs_count, status, request_data, response_data)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [type, prompt, 2, 'pending', JSON.stringify(requestData), JSON.stringify(responseData)]
  );
  return result.rows[0];
}

async function updateGeneration(id, status) {
  await pool.query('UPDATE generations SET status = $1 WHERE id = $2', [status, id]);
}

async function saveClips(clips) {
  for (const clip of clips) {
    await pool.query(
      `INSERT INTO songs (suno_id, title, prompt, tags, lyrics, audio_url, image_url, video_url, model, status, is_instrumental, duration, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (suno_id) DO UPDATE SET
         title = COALESCE(EXCLUDED.title, songs.title),
         audio_url = COALESCE(EXCLUDED.audio_url, songs.audio_url),
         image_url = COALESCE(EXCLUDED.image_url, songs.image_url),
         video_url = COALESCE(EXCLUDED.video_url, songs.video_url),
         status = COALESCE(EXCLUDED.status, songs.status),
         lyrics = COALESCE(EXCLUDED.lyrics, songs.lyrics),
         duration = COALESCE(EXCLUDED.duration, songs.duration),
         updated_at = NOW()`,
      [
        clip.id,
        clip.title,
        clip.prompt,
        clip.tags,
        clip.lyric,
        clip.audio_url || clip.stream_audio_url,
        clip.image_url,
        clip.video_url,
        clip.model_name || 'V5_5',
        clip.status || 'pending',
        false,
        clip.duration,
        JSON.stringify({}),
      ]
    );
  }
}

async function syncPendingSongs() {
  const result = await pool.query(
    "SELECT suno_id FROM songs WHERE status NOT IN ('streaming', 'complete') AND suno_id IS NOT NULL"
  );
  if (result.rows.length === 0) return { synced: 0 };

  const ids = result.rows.map(r => r.suno_id).join(',');
  const data = await get(ids);
  const clips = Array.isArray(data) ? data : data.clips || [];

  for (const clip of clips) {
    await pool.query(
      `UPDATE songs SET
        audio_url = COALESCE($2, audio_url),
        image_url = COALESCE($3, image_url),
        video_url = COALESCE($4, video_url),
        status = COALESCE($5, status),
        duration = COALESCE($6, duration),
        updated_at = NOW()
       WHERE suno_id = $1`,
      [clip.id, clip.audio_url, clip.image_url || clip.image_large_url, clip.video_url, clip.status, clip.duration]
    );
  }

  return { synced: clips.length };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { generate, customGenerate, generateLyrics, get, getLimit, extendAudio, syncPendingSongs, getGenerationStatus };
