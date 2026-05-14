/**
 * Server Integration Tests
 * 
 * Tests all API endpoints end-to-end:
 * - Health check
 * - Auth (register, login, /me)
 * - Game results (save, history)
 * - Leaderboard
 * - Auth middleware (missing/invalid tokens)
 */
import { spawn } from 'node:child_process';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const TEST_PORT = 18999; // Use a unique port for testing
const BASE_URL = `http://localhost:${TEST_PORT}`;
const TEST_USERNAME = `tu_${Date.now() % 100000}`;
const TEST_PASSWORD = 'testpass123';

let serverProcess;
let authToken = null;
let userId = null;

function startServer() {
  return new Promise((resolve, reject) => {
    const serverDir = new URL('..', import.meta.url).pathname;
    serverProcess = spawn('node', ['dist/index.js'], {
      cwd: serverDir,
      env: { ...process.env, PORT: String(TEST_PORT), NODE_ENV: 'test' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let started = false;

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log(`[server] ${msg.trim()}`);
      if (msg.includes('running on port') && !started) {
        started = true;
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      console.error(`[server:err] ${msg.trim()}`);
    });

    serverProcess.on('error', (err) => {
      if (!started) reject(err);
    });

    serverProcess.on('exit', (code) => {
      if (!started) reject(new Error(`Server exited with code ${code}`));
    });

    // Timeout in case server doesn't start
    setTimeout(() => {
      if (!started) reject(new Error('Server failed to start within timeout'));
    }, 10000);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!serverProcess) return resolve();
    serverProcess.on('exit', () => resolve());
    serverProcess.kill('SIGTERM');
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
      resolve();
    }, 3000);
  });
}

async function api(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  // Build headers, always including Content-Type
  const headers = { 'Content-Type': 'application/json' };
  if (options.headers) {
    Object.assign(headers, options.headers);
  }
  
  // Remove headers from options to avoid conflicts, then use our merged headers
  const { headers: _, ...restOptions } = options;
  
  const fetchOptions = {
    ...restOptions,
    headers,
  };

  const response = await fetch(url, fetchOptions);
  const data = await response.json();
  return { status: response.status, data };
}

// ---- Tests ----

describe('API Integration Tests', async () => {
  before(async () => {
    await startServer();
  });

  after(async () => {
    await stopServer();
  });

  // --- Health Check ---
  describe('GET /api/health', () => {
    it('should return ok status', async () => {
      const { status, data } = await api('/api/health');
      assert.equal(status, 200);
      assert.equal(data.status, 'ok');
      assert.ok(data.timestamp);
    });
  });

  // --- Auth: Register ---
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const { status, data } = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: TEST_USERNAME, password: TEST_PASSWORD }),
      });
      assert.equal(status, 201);
      assert.ok(data.token);
      assert.ok(data.user);
      assert.equal(data.user.username, TEST_USERNAME);
      authToken = data.token;
      userId = data.user.id;
    });

    it('should reject duplicate username', async () => {
      const { status, data } = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: TEST_USERNAME, password: TEST_PASSWORD }),
      });
      assert.equal(status, 400);
      assert.ok(data.error);
    });

    it('should reject short username', async () => {
      const { status, data } = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: 'ab', password: TEST_PASSWORD }),
      });
      assert.equal(status, 400);
      assert.ok(data.error);
    });

    it('should reject missing password', async () => {
      const { status, data } = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: 'newuser_test' }),
      });
      assert.equal(status, 400);
      assert.ok(data.error);
    });
  });

  // --- Auth: Login ---
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const { status, data } = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: TEST_USERNAME, password: TEST_PASSWORD }),
      });
      assert.equal(status, 200);
      assert.ok(data.token);
      assert.equal(data.user.username, TEST_USERNAME);
      authToken = data.token;
    });

    it('should reject invalid password', async () => {
      const { status, data } = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: TEST_USERNAME, password: 'wrongpass' }),
      });
      assert.equal(status, 401);
      assert.ok(data.error);
    });

    it('should reject nonexistent user', async () => {
      const { status, data } = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'nonexistent_user', password: TEST_PASSWORD }),
      });
      assert.equal(status, 401);
      assert.ok(data.error);
    });
  });

  // --- Auth: Me ---
  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      const { status, data } = await api('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assert.equal(status, 200);
      assert.equal(data.user.username, TEST_USERNAME);
    });

    it('should reject request without token', async () => {
      const { status, data } = await api('/api/auth/me');
      assert.equal(status, 401);
      assert.ok(data.error);
    });

    it('should reject request with invalid token', async () => {
      const { status, data } = await api('/api/auth/me', {
        headers: { Authorization: 'Bearer invalid_token_here' },
      });
      assert.equal(status, 401);
      assert.ok(data.error);
    });

    it('should reject malformed auth header', async () => {
      const { status, data } = await api('/api/auth/me', {
        headers: { Authorization: 'InvalidHeader' },
      });
      assert.equal(status, 401);
      assert.ok(data.error);
    });
  });

  // --- Games: Save Result ---
  describe('POST /api/games', () => {
    it('should save a win result', async () => {
      const { status, data } = await api('/api/games', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ result: 'win' }),
      });
      assert.equal(status, 201);
      assert.equal(data.game.result, 'win');
      assert.equal(data.game.opponent, 'ai');
    });

    it('should save a loss result', async () => {
      const { status, data } = await api('/api/games', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ result: 'loss' }),
      });
      assert.equal(status, 201);
      assert.equal(data.game.result, 'loss');
    });

    it('should save a draw result', async () => {
      const { status, data } = await api('/api/games', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ result: 'draw' }),
      });
      assert.equal(status, 201);
      assert.equal(data.game.result, 'draw');
    });

    it('should reject invalid result', async () => {
      const { status, data } = await api('/api/games', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ result: 'invalid_result' }),
      });
      assert.equal(status, 400);
      assert.ok(data.error);
    });

    it('should reject without auth token', async () => {
      const { status, data } = await api('/api/games', {
        method: 'POST',
        body: JSON.stringify({ result: 'win' }),
      });
      assert.equal(status, 401);
    });
  });

  // --- Games: History ---
  describe('GET /api/games/history', () => {
    it('should return paginated game history', async () => {
      const { status, data } = await api('/api/games/history', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assert.equal(status, 200);
      assert.ok(Array.isArray(data.games));
      assert.ok(data.games.length >= 3); // We saved win, loss, draw above
      assert.ok(data.pagination);
      assert.equal(data.pagination.page, 1);
    });

    it('should support pagination parameters', async () => {
      const { status, data } = await api('/api/games/history?page=1&limit=2', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assert.equal(status, 200);
      assert.ok(data.games.length <= 2);
      assert.equal(data.pagination.limit, 2);
    });

    it('should reject without auth', async () => {
      const { status } = await api('/api/games/history');
      assert.equal(status, 401);
    });
  });

  // --- Leaderboard ---
  describe('GET /api/leaderboard', () => {
    it('should return leaderboard without auth', async () => {
      const { status, data } = await api('/api/leaderboard');
      assert.equal(status, 200);
      assert.ok(Array.isArray(data.leaderboard));
    });

    it('should include the test user in leaderboard', async () => {
      const { status, data } = await api('/api/leaderboard');
      assert.equal(status, 200);
      const testUserEntry = data.leaderboard.find(
        (entry) => entry.username === TEST_USERNAME
      );
      assert.ok(testUserEntry, 'Test user should be in leaderboard');
      assert.equal(testUserEntry.wins, 1);
      assert.equal(testUserEntry.losses, 1);
      assert.equal(testUserEntry.draws, 1);
      assert.equal(testUserEntry.total, 3);
    });
  });

  // --- Auth middleware edge cases ---
  describe('Auth Middleware Edge Cases', () => {
    it('should reject empty Bearer token', async () => {
      const { status, data } = await api('/api/auth/me', {
        headers: { Authorization: 'Bearer ' },
      });
      assert.equal(status, 401);
      assert.ok(data.error);
    });

    it('should reject non-Bearer auth scheme', async () => {
      const { status, data } = await api('/api/auth/me', {
        headers: { Authorization: 'Basic somebase64==' },
      });
      assert.equal(status, 401);
      assert.ok(data.error);
    });
  });
});
