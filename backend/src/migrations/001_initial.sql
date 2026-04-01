CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suno_id VARCHAR(100) UNIQUE,
  title VARCHAR(500),
  prompt TEXT,
  tags VARCHAR(500),
  lyrics TEXT,
  style VARCHAR(255),
  duration NUMERIC(10,2),
  audio_url TEXT,
  image_url TEXT,
  video_url TEXT,
  model VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  is_instrumental BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  prompt TEXT,
  credits_used INTEGER DEFAULT 0,
  songs_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  request_data JSONB DEFAULT '{}',
  response_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_songs_status ON songs(status);
CREATE INDEX IF NOT EXISTS idx_songs_created ON songs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_songs_suno_id ON songs(suno_id);
CREATE INDEX IF NOT EXISTS idx_generations_type ON generations(type);
CREATE INDEX IF NOT EXISTS idx_generations_created ON generations(created_at DESC);
