-- Favoritos
ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Historico de atividades
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(255),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_songs_favorite ON songs(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_songs_deleted ON songs(deleted_at) WHERE deleted_at IS NULL;
