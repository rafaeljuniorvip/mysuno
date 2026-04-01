const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const { runMigrations } = require('./config/database');
const { refreshToken, startKeepAlive } = require('./services/auth');
const sunoRoutes = require('./routes/suno');
const songsRoutes = require('./routes/songs');
const reportsRoutes = require('./routes/reports');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/suno', sunoRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/reports', reportsRoutes);

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

    app.listen(config.PORT, () => {
      console.log(`[MySuno] Backend running on http://localhost:${config.PORT}`);
    });
  } catch (err) {
    console.error('[MySuno] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
