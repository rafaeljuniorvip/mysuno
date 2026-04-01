require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3870,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://mysuno:mysuno@localhost:5432/mysuno',
  SUNO_COOKIE: process.env.SUNO_COOKIE,
  SUNO_SESSION_ID: process.env.SUNO_SESSION_ID,
  CLERK_JS_VERSION: process.env.CLERK_JS_VERSION || '5.117.0',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '141913349498-n6mfefb0k7p559grf0l6gdkn65dt2bi6.apps.googleusercontent.com',
  JWT_SECRET: process.env.JWT_SECRET || 'mysuno-dev-secret-change-in-production',
  CLERK_BASE_URL: 'https://auth.suno.com',
  SUNO_API_BASE_URL: 'https://studio-api.prod.suno.com',
};
