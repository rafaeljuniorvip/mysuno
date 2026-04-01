const axios = require('axios');
const config = require('../config/env');
const { getToken } = require('./auth');
const { pool } = require('../config/database');

async function apiClient() {
  const token = await getToken();
  return axios.create({
    baseURL: config.SUNO_API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
      'Referer': 'https://suno.com/',
      'Origin': 'https://suno.com',
    },
  });
}

async function generate({ prompt, make_instrumental = false, wait_audio = false }) {
  const client = await apiClient();
  const requestData = { gpt_description_prompt: prompt, make_instrumental, mv: 'chirp-fenix' };
  const response = await client.post('/api/generate/v2/', requestData);

  const generation = await saveGeneration('generate', prompt, requestData, response.data);
  const clips = response.data.clips || [];
  await saveClips(clips);

  if (wait_audio && clips.length > 0) {
    const ids = clips.map(c => c.id);
    const result = await waitForAudio(ids);
    await updateGeneration(generation.id, 'complete');
    return result;
  }

  return response.data;
}

async function customGenerate({ prompt, tags, title, make_instrumental = false, wait_audio = false }) {
  const client = await apiClient();
  const requestData = { prompt, tags, title, make_instrumental, mv: 'chirp-fenix' };
  const response = await client.post('/api/generate/v2/', requestData);

  const generation = await saveGeneration('custom_generate', prompt, requestData, response.data);
  const clips = response.data.clips || [];
  await saveClips(clips);

  if (wait_audio && clips.length > 0) {
    const ids = clips.map(c => c.id);
    const result = await waitForAudio(ids);
    await updateGeneration(generation.id, 'complete');
    return result;
  }

  return response.data;
}

async function generateLyrics(prompt) {
  const client = await apiClient();
  const response = await client.post('/api/generate/lyrics/', { prompt });

  await saveGeneration('lyrics', prompt, { prompt }, response.data);

  const id = response.data.id;
  if (!id) return response.data;

  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const result = await client.get(`/api/generate/lyrics/${id}`);
    if (result.data.status === 'complete') {
      return result.data;
    }
  }

  return { error: 'Lyrics generation timed out' };
}

async function get(ids) {
  const client = await apiClient();
  if (ids) {
    const response = await client.get(`/api/feed/?ids=${ids}`);
    return response.data;
  }
  const response = await client.get('/api/feed/');
  return response.data;
}

async function getLimit() {
  const client = await apiClient();
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
  const client = await apiClient();
  const requestData = { prompt, tags, title, continue_clip_id: audio_id, continue_at, mv: 'chirp-fenix' };
  const response = await client.post('/api/generate/v2/', requestData);

  const generation = await saveGeneration('extend', prompt, requestData, response.data);
  const clips = response.data.clips || [];
  await saveClips(clips);

  if (wait_audio && clips.length > 0) {
    const ids = clips.map(c => c.id);
    const result = await waitForAudio(ids);
    await updateGeneration(generation.id, 'complete');
    return result;
  }

  return response.data;
}

// --- Persistence helpers ---

async function saveGeneration(type, prompt, requestData, responseData) {
  const clips = responseData.clips || [];
  const result = await pool.query(
    `INSERT INTO generations (type, prompt, songs_count, status, request_data, response_data)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [type, prompt, clips.length, 'pending', JSON.stringify(requestData), JSON.stringify(responseData)]
  );
  return result.rows[0];
}

async function updateGeneration(id, status) {
  await pool.query('UPDATE generations SET status = $1 WHERE id = $2', [status, id]);
}

async function saveClips(clips) {
  for (const clip of clips) {
    await pool.query(
      `INSERT INTO songs (suno_id, title, prompt, tags, lyrics, audio_url, image_url, video_url, model, status, is_instrumental, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        clip.title || null,
        clip.gpt_description_prompt || clip.prompt || null,
        clip.tags || null,
        clip.lyric || null,
        clip.audio_url || null,
        clip.image_url || clip.image_large_url || null,
        clip.video_url || null,
        clip.model_name || clip.major_model_id || 'chirp-v4',
        clip.status || 'pending',
        clip.is_audio_upload_tos_accepted === false ? true : false,
        JSON.stringify(clip.metadata || {}),
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
  await saveClips(clips);

  return { synced: clips.length };
}

async function waitForAudio(ids, maxRetries = 60) {
  for (let i = 0; i < maxRetries; i++) {
    const data = await get(ids.join(','));
    const clips = Array.isArray(data) ? data : data.clips || [];

    // Save progress
    if (clips.length > 0) await saveClips(clips);

    const allDone = clips.length > 0 && clips.every(c =>
      c.status === 'streaming' || c.status === 'complete' || c.audio_url
    );
    if (allDone) return clips;
    await sleep(5000);
  }
  return await get(ids.join(','));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { generate, customGenerate, generateLyrics, get, getLimit, extendAudio, syncPendingSongs };
