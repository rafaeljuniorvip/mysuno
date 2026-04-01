CREATE TABLE IF NOT EXISTS ai_models (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(500),
  description TEXT,
  context_length INTEGER,
  pricing_prompt VARCHAR(50),
  pricing_completion VARCHAR(50),
  input_modalities TEXT[],
  output_modalities TEXT[],
  provider VARCHAR(255),
  created INTEGER,
  knowledge_cutoff VARCHAR(50),
  max_completion_tokens INTEGER,
  is_moderated BOOLEAN DEFAULT false,
  synced_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  model_id VARCHAR(255),
  system_prompt TEXT,
  messages JSONB DEFAULT '[]',
  generated_lyrics TEXT,
  generated_title VARCHAR(500),
  total_tokens INTEGER DEFAULT 0,
  total_cost NUMERIC(10,6) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  default_model VARCHAR(255) DEFAULT 'anthropic/claude-sonnet-4',
  default_system_prompt TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider);
CREATE INDEX IF NOT EXISTS idx_ai_models_modalities ON ai_models USING gin(input_modalities);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, created_at DESC);
