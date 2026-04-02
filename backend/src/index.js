const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const { runMigrations } = require('./config/database');
const { refreshToken, startKeepAlive } = require('./services/auth');
const { combinedAuth } = require('./middlewares/auth');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const apikeysRoutes = require('./routes/apikeys');
const sunoRoutes = require('./routes/suno');
const songsRoutes = require('./routes/songs');
const reportsRoutes = require('./routes/reports');
const openrouterRoutes = require('./routes/openrouter');
const cron = require('node-cron');
const { syncModels } = require('./services/openrouter');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (JWT or API Key)
app.use('/api/users', usersRoutes);
app.use('/api/keys', apikeysRoutes);
app.use('/api/suno', combinedAuth, sunoRoutes);
app.use('/api/songs', combinedAuth, songsRoutes);
app.use('/api/reports', combinedAuth, reportsRoutes);
app.use('/api/ai', combinedAuth, openrouterRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mysuno-api' });
});

async function start() {
  try {
    await runMigrations();
    console.log('[MySuno] Authenticating with Suno...');
    await refreshToken();
    console.log('[MySuno] Authentication successful!');
    startKeepAlive();

    // Sync OpenRouter models every day at 3:00 AM (America/Sao_Paulo)
    cron.schedule('0 3 * * *', async () => {
      try {
        const result = await syncModels();
        console.log(`[Cron] OpenRouter models synced: ${result.synced}`);
      } catch (err) {
        console.error('[Cron] OpenRouter sync failed:', err.message);
      }
    }, { timezone: 'America/Sao_Paulo' });
    console.log('[MySuno] Cron: OpenRouter sync scheduled at 03:00 AM');

    app.listen(config.PORT, () => {
      console.log(`[MySuno] Backend running on http://localhost:${config.PORT}`);
    });
  } catch (err) {
    console.error('[MySuno] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
