ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS default_image_model VARCHAR(255) DEFAULT 'openai/gpt-4o';
