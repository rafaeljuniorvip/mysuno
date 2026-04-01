require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3870,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://mysuno:mysuno@localhost:5432/mysuno',
  SUNO_COOKIE: process.env.SUNO_COOKIE,
  SUNO_SESSION_ID: process.env.SUNO_SESSION_ID,
  CLERK_JS_VERSION: process.env.CLERK_JS_VERSION || '5.117.0',
  CLERK_BASE_URL: 'https://auth.suno.com',
  SUNO_API_BASE_URL: 'https://studio-api.suno.ai',
};
