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

async function generateLyricsAI({ model, prompt, imageBase64, context, systemPrompt, userId }) {
  const defaultSystem = `Voce e um compositor profissional de musicas. Gere letras de musica em portugues brasileiro seguindo a estrutura padrao: [Intro], [Verse], [Chorus], [Bridge], [Outro]. Seja criativo, use rimas e ritmo natural. Responda APENAS com a letra, sem explicacoes.`;

  const userContent = [];

  // Text prompt
  let textPrompt = prompt;
  if (context) textPrompt = `Contexto: ${context}\n\n${prompt}`;
  userContent.push({ type: 'text', text: textPrompt });

  // Image if provided
  if (imageBase64) {
    userContent.push({
      type: 'image_url',
      image_url: { url: imageBase64 },
    });
  }

  const messages = [{ role: 'user', content: userContent.length === 1 ? textPrompt : userContent }];

  const result = await chat({
    model: model || 'anthropic/claude-sonnet-4',
    messages,
    systemPrompt: systemPrompt || defaultSystem,
  });

  // Extract title from first line if bracketed
  let title = null;
  let lyrics = result.content;
  const titleMatch = lyrics.match(/^#\s*(.+)/m) || lyrics.match(/^Titulo:\s*(.+)/im);
  if (titleMatch) {
    title = titleMatch[1].trim();
    lyrics = lyrics.replace(titleMatch[0], '').trim();
  }

  // Save conversation
  if (userId) {
    await pool.query(
      `INSERT INTO ai_conversations (user_id, model_id, system_prompt, messages, generated_lyrics, generated_title, total_tokens, total_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        model,
        systemPrompt || defaultSystem,
        JSON.stringify(messages),
        lyrics,
        title,
        result.usage.total_tokens || 0,
        result.cost || 0,
      ]
    );
  }

  return {
    lyrics,
    title,
    model: result.model,
    tokens: result.usage.total_tokens || 0,
    cost: result.cost || 0,
  };
}

module.exports = { syncModels, chat, generateLyricsAI };
