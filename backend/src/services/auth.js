const axios = require('axios');
const config = require('../config/env');

let currentToken = null;
let tokenExpiry = 0;

async function refreshToken() {
  const url = `${config.CLERK_BASE_URL}/v1/client/sessions/${config.SUNO_SESSION_ID}/touch?__clerk_api_version=2025-11-10&_clerk_js_version=${config.CLERK_JS_VERSION}`;

  const response = await axios.post(url, '', {
    headers: {
      'accept': '*/*',
      'content-type': 'application/x-www-form-urlencoded',
      'cookie': config.SUNO_COOKIE,
      'Referer': 'https://suno.com/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
    },
  });

  const session = response.data.response || response.data;
  const jwt = session.last_active_token?.jwt;

  if (!jwt) {
    throw new Error('Failed to get JWT from Clerk session touch');
  }

  const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
  tokenExpiry = payload.exp * 1000;
  currentToken = jwt;

  console.log('[Auth] Token refreshed, expires:', new Date(tokenExpiry).toISOString());
  return jwt;
}

async function getToken() {
  if (!currentToken || Date.now() > tokenExpiry - 30000) {
    await refreshToken();
  }
  return currentToken;
}

function startKeepAlive() {
  setInterval(async () => {
    try {
      await refreshToken();
    } catch (err) {
      console.error('[Auth] Keep-alive failed:', err.message);
    }
  }, 3 * 60 * 1000);
}

module.exports = { getToken, refreshToken, startKeepAlive };
