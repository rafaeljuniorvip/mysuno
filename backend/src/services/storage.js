const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const MEDIA_DIR = process.env.MEDIA_DIR || '/app/data/media';
const AUDIO_DIR = path.join(MEDIA_DIR, 'audio');
const IMAGE_DIR = path.join(MEDIA_DIR, 'images');

function ensureDirs() {
  [MEDIA_DIR, AUDIO_DIR, IMAGE_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

ensureDirs();

async function downloadFile(url, destPath) {
  const response = await axios.get(url, { responseType: 'stream', timeout: 60000 });
  const writer = fs.createWriteStream(destPath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function downloadAndSaveSong(songId) {
  const result = await pool.query('SELECT suno_id, audio_url, image_url FROM songs WHERE (id::text = $1 OR suno_id = $1)', [songId]);
  if (result.rows.length === 0) return null;

  const song = result.rows[0];
  const sunoId = song.suno_id;
  const updates = {};

  // Download audio
  if (song.audio_url && !song.audio_url.startsWith('/media/')) {
    try {
      const audioFile = `${sunoId}.mp3`;
      const audioPath = path.join(AUDIO_DIR, audioFile);
      await downloadFile(song.audio_url, audioPath);
      updates.audio_url = `/media/audio/${audioFile}`;
      console.log(`[Storage] Audio saved: ${audioFile}`);
    } catch (err) {
      console.error(`[Storage] Audio download failed for ${sunoId}:`, err.message);
    }
  }

  // Download image
  if (song.image_url && !song.image_url.startsWith('/media/')) {
    try {
      const ext = song.image_url.includes('.png') ? 'png' : 'jpeg';
      const imageFile = `${sunoId}.${ext}`;
      const imagePath = path.join(IMAGE_DIR, imageFile);
      await downloadFile(song.image_url, imagePath);
      updates.image_url = `/media/images/${imageFile}`;
      console.log(`[Storage] Image saved: ${imageFile}`);
    } catch (err) {
      console.error(`[Storage] Image download failed for ${sunoId}:`, err.message);
    }
  }

  // Update DB with local paths
  if (Object.keys(updates).length > 0) {
    const sets = [];
    const params = [];
    if (updates.audio_url) { params.push(updates.audio_url); sets.push(`audio_url = $${params.length}`); }
    if (updates.image_url) { params.push(updates.image_url); sets.push(`image_url = $${params.length}`); }
    sets.push('updated_at = NOW()');
    params.push(songId);
    await pool.query(`UPDATE songs SET ${sets.join(', ')} WHERE id::text = $${params.length} OR suno_id = $${params.length}`, params);
  }

  return updates;
}

async function downloadAllPending() {
  const result = await pool.query(
    "SELECT id, suno_id FROM songs WHERE audio_url IS NOT NULL AND audio_url NOT LIKE '/media/%' AND deleted_at IS NULL AND status = 'complete'"
  );

  let downloaded = 0;
  for (const song of result.rows) {
    try {
      await downloadAndSaveSong(song.id);
      downloaded++;
    } catch (err) {
      console.error(`[Storage] Failed ${song.suno_id}:`, err.message);
    }
  }

  return { downloaded, total: result.rows.length };
}

function getMediaPath() {
  return MEDIA_DIR;
}

module.exports = { downloadAndSaveSong, downloadAllPending, getMediaPath };
