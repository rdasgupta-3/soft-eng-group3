const http = require('http');
const https = require('https');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const parsed = new URL(BASE_URL);
const protocol = parsed.protocol === 'https:' ? https : http;
const DEFAULT_TEST_PASSWORD = '12345678';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sendJsonRequest(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      ...extraHeaders
    };

    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path,
      method,
      headers
    };

    const req = protocol.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function sendJsonRequestWithRetry(method, path, body, extraHeaders = {}, attempts = 5) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await sendJsonRequest(method, path, body, extraHeaders);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await wait(250 * attempt);
      }
    }
  }

  throw lastError;
}

async function ensureUserExists(email, password) {
  try {
    const response = await sendJsonRequestWithRetry('POST', '/api/signup', { email, password });
    if (response.status !== 200 && response.status !== 400) {
      throw new Error(`Signup failed with status ${response.status}: ${response.body}`);
    }
  } catch (error) {
    throw new Error(`Failed to ensure test user exists: ${error.message}`);
  }
}

module.exports = {
  DEFAULT_TEST_PASSWORD,
  ensureUserExists,
  sendJsonRequest,
  sendJsonRequestWithRetry
};
