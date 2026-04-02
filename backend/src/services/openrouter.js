const axios = require('axios');
const config = require('../config/env');
const { pool } = require('../config/database');

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

function client() {
  return axios.create({
    baseURL: OPENROUTER_BASE,
    headers: {
      'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://mysn.vipte.co',
      'X-Title': 'MySuno Lyrics Generator',
    },
  });
}

async function syncModels() {
  const res = await client().get('/models');
  const models = res.data.data || [];
  let synced = 0;

  for (const m of models) {
    const provider = m.id.split('/')[0] || 'unknown';
    await pool.query(
      `INSERT INTO ai_models (id, name, description, context_length, pricing_prompt, pricing_completion,
        input_modalities, output_modalities, provider, created, knowledge_cutoff,
        max_completion_tokens, is_moderated, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, description=EXCLUDED.description, context_length=EXCLUDED.context_length,
         pricing_prompt=EXCLUDED.pricing_prompt, pricing_completion=EXCLUDED.pricing_completion,
         input_modalities=EXCLUDED.input_modalities, output_modalities=EXCLUDED.output_modalities,
         provider=EXCLUDED.provider, created=EXCLUDED.created, knowledge_cutoff=EXCLUDED.knowledge_cutoff,
         max_completion_tokens=EXCLUDED.max_completion_tokens, is_moderated=EXCLUDED.is_moderated,
         synced_at=NOW()`,
      [
        m.id,
        m.name,
        m.description || null,
        m.context_length || null,
        m.pricing?.prompt || '0',
        m.pricing?.completion || '0',
        m.architecture?.input_modalities || ['text'],
        m.architecture?.output_modalities || ['text'],
        provider,
        m.created || null,
        m.knowledge_cutoff || null,
        m.top_provider?.max_completion_tokens || null,
        m.top_provider?.is_moderated || false,
      ]
    );
    synced++;
  }

  return { synced, total: models.length };
}

async function chat({ model, messages, systemPrompt }) {
  const msgs = [];
  if (systemPrompt) {
    msgs.push({ role: 'system', content: systemPrompt });
  }
  msgs.push(...messages);

  const res = await client().post('/chat/completions', {
    model,
    messages: msgs,
  });

  return {
    content: res.data.choices?.[0]?.message?.content || '',
    usage: res.data.usage || {},
    cost: res.data.usage?.cost || 0,
    model: res.data.model,
  };
}

async function generateLyricsAI({ model, prompt, imageBase64, context, systemPrompt, userId, versions = 1 }) {
  const defaultSystem = `Voce e um compositor profissional de musicas. Gere letras de musica em portugues brasileiro seguindo a estrutura padrao: [Intro], [Verse], [Chorus], [Bridge], [Outro]. Seja criativo, use rimas e ritmo natural. Responda APENAS com a letra, sem explicacoes.`;

  const userContent = [];

  let textPrompt = prompt;
  if (context) textPrompt = `Contexto: ${context}\n\n${prompt}`;
  userContent.push({ type: 'text', text: textPrompt });

  if (imageBase64) {
    userContent.push({
      type: 'image_url',
      image_url: { url: imageBase64 },
    });
  }

  const messages = [{ role: 'user', content: userContent.length === 1 ? textPrompt : userContent }];

  // If image is present, use image model from user preferences (needs vision support)
  let usedModel = model || 'anthropic/claude-sonnet-4';
  if (imageBase64 && userId) {
    const prefs = await pool.query('SELECT default_image_model FROM user_preferences WHERE user_id = $1', [userId]);
    if (prefs.rows.length > 0 && prefs.rows[0].default_image_model) {
      usedModel = prefs.rows[0].default_image_model;
    } else {
      usedModel = 'openai/gpt-4o'; // fallback vision model
    }
  }

  const usedSystem = systemPrompt || defaultSystem;
  const count = Math.min(Math.max(parseInt(versions) || 1, 1), 5);

  // Generate N versions in parallel
  const promises = Array.from({ length: count }, () =>
    chat({ model: usedModel, messages, systemPrompt: usedSystem })
  );
  const results = await Promise.all(promises);

  const allVersions = results.map((result, i) => {
    let title = null;
    let lyrics = result.content;
    const titleMatch = lyrics.match(/^#\s*(.+)/m) || lyrics.match(/^Titulo:\s*(.+)/im);
    if (titleMatch) {
      title = titleMatch[1].trim();
      lyrics = lyrics.replace(titleMatch[0], '').trim();
    }
    return {
      lyrics,
      title,
      model: result.model,
      tokens: result.usage.total_tokens || 0,
      cost: parseFloat(result.cost) || 0,
    };
  });

  const totalTokens = allVersions.reduce((sum, v) => sum + v.tokens, 0);
  const totalCost = allVersions.reduce((sum, v) => sum + v.cost, 0);

  // Save conversation (store first version as main, all in messages)
  if (userId) {
    await pool.query(
      `INSERT INTO ai_conversations (user_id, model_id, system_prompt, messages, generated_lyrics, generated_title, total_tokens, total_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        usedModel,
        usedSystem,
        JSON.stringify({ prompt: messages, versions: allVersions }),
        allVersions[0].lyrics,
        allVersions[0].title,
        totalTokens,
        totalCost,
      ]
    );
  }

  return {
    versions: allVersions,
    lyrics: allVersions[0].lyrics,
    title: allVersions[0].title,
    model: allVersions[0].model,
    tokens: totalTokens,
    cost: totalCost,
  };
}

module.exports = { syncModels, chat, generateLyricsAI };
