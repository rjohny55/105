import request from 'supertest';
import { getDb } from '../db';

// Set test environment before importing app
process.env.PORT = '0'; // random available port
process.env.JWT_SECRET = 'test-secret-key';

let app: import('express').Application;
let authToken: string;
let testUsername: string;
let testUserId: number;

beforeAll(async () => {
  // Clean database before all tests
  const db = getDb();
  db.exec('DELETE FROM games');
  db.exec('DELETE FROM users');

  // Import the app - this will trigger app.listen but that's fine for supertest
  app = (await import('../index')).default;
});

afterAll(() => {
  // Clean up database
  const db = getDb();
  db.exec('DELETE FROM games');
  db.exec('DELETE FROM users');
});

// Helper to generate a valid username (3-20 chars, alphanumeric + underscore)
function generateTestUsername(): string {
  return 'test_' + Date.now().toString(36); // e.g. "test_1a2b3c4d" - well under 20 chars
}

describe('Integration Tests - API Endpoints', () => {
  // =====================================================
  // Health Check
  // =====================================================
  describe('GET /api/health', () => {
    it('should return 200 with status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  // =====================================================
  // Auth Routes
  // =====================================================
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      testUsername = generateTestUsername();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: testUsername, password: 'testpass123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('username', testUsername);
      expect(res.body.user).toHaveProperty('id');
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.split('.')).toHaveLength(3); // JWT has 3 parts

      authToken = res.body.token;
      testUserId = res.body.user.id;
    });

    it('should reject registration with short username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'ab', password: 'testpass123' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject registration with long username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'a'.repeat(21), password: 'testpass123' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject registration with invalid characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'user name!', password: 'testpass123' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject registration with short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'validuser1', password: 'ab' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject registration with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject duplicate username registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: testUsername, password: 'testpass123' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Username is already taken');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: testUsername, password: 'testpass123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe(testUsername);
      expect(res.body.token.split('.')).toHaveLength(3);

      // Update token
      authToken = res.body.token;
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: testUsername, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid username or password');
    });

    it('should reject login with non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent_user', password: 'testpass123' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid username or password');
    });

    it('should reject login with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe(testUsername);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('created_at');
    });

    it('should reject request without auth header', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Authorization header is required');
    });

    it('should reject request with malformed auth header', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidToken');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Authorization header must be in format: Bearer <token>');
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid or expired token');
    });

    it('should reject request with expired token', async () => {
      // Create a token that's already expired
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { id: testUserId, username: testUsername },
        process.env.JWT_SECRET!,
        { expiresIn: '0s' }
      );

      // Wait a tiny bit for the token to expire
      await new Promise(r => setTimeout(r, 100));

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid or expired token');
    });
  });

  // =====================================================
  // Games Routes
  // =====================================================
  describe('POST /api/games', () => {
    it('should save a game result (win)', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ result: 'win' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('game');
      expect(res.body.game).toHaveProperty('id');
      expect(res.body.game.result).toBe('win');
      expect(res.body.game.opponent).toBe('ai');
      expect(res.body.game.user_id).toBe(testUserId);
    });

    it('should save a game result (loss)', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ result: 'loss' });

      expect(res.status).toBe(201);
      expect(res.body.game.result).toBe('loss');
    });

    it('should save a game result (draw)', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ result: 'draw' });

      expect(res.status).toBe(201);
      expect(res.body.game.result).toBe('draw');
    });

    it('should reject invalid game result', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ result: 'invalid_result' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject game save without auth', async () => {
      const res = await request(app)
        .post('/api/games')
        .send({ result: 'win' });

      expect(res.status).toBe(401);
    });

    it('should reject game save with missing result', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/games/history', () => {
    it('should return game history for authenticated user', async () => {
      const res = await request(app)
        .get('/api/games/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('games');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.games)).toBe(true);
      expect(res.body.games.length).toBeGreaterThanOrEqual(3); // We saved 3 games
      expect(res.body.pagination).toHaveProperty('page');
      expect(res.body.pagination).toHaveProperty('limit');
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/games/history?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.games.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
    });

    it('should reject history request without auth', async () => {
      const res = await request(app).get('/api/games/history');

      expect(res.status).toBe(401);
    });

    it('should return empty history for user with no games', async () => {
      // Register a new user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ username: generateTestUsername(), password: 'testpass123' });

      const newToken = registerRes.body.token;

      const res = await request(app)
        .get('/api/games/history')
        .set('Authorization', `Bearer ${newToken}`);

      expect(res.status).toBe(200);
      expect(res.body.games).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  // =====================================================
  // Leaderboard Routes
  // =====================================================
  describe('GET /api/leaderboard', () => {
    it('should return the leaderboard', async () => {
      const res = await request(app).get('/api/leaderboard');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('leaderboard');
      expect(Array.isArray(res.body.leaderboard)).toBe(true);
    });

    it('should contain the test user with correct stats', async () => {
      const res = await request(app).get('/api/leaderboard');
      
      const userEntry = res.body.leaderboard.find(
        (entry: any) => entry.username === testUsername
      );

      expect(userEntry).toBeDefined();
      expect(userEntry.wins).toBeGreaterThanOrEqual(1);
      expect(userEntry.losses).toBeGreaterThanOrEqual(1);
      expect(userEntry.draws).toBeGreaterThanOrEqual(1);
      expect(userEntry.total).toBeGreaterThanOrEqual(3);
      expect(userEntry).toHaveProperty('win_rate');
      expect(typeof userEntry.win_rate).toBe('number');
    });

    it('should be sorted by win_rate descending', async () => {
      const res = await request(app).get('/api/leaderboard');

      if (res.body.leaderboard.length > 1) {
        for (let i = 1; i < res.body.leaderboard.length; i++) {
          expect(res.body.leaderboard[i].win_rate)
            .toBeLessThanOrEqual(res.body.leaderboard[i - 1].win_rate);
        }
      }
    });

    it('should return leaderboard without auth (public endpoint)', async () => {
      const res = await request(app).get('/api/leaderboard');
      expect(res.status).toBe(200);
    });
  });

  // =====================================================
  // Cross-Module Communication (Auth + Games + Leaderboard)
  // =====================================================
  describe('Cross-module integration', () => {
    it('should reflect saved games in leaderboard', async () => {
      // Create a new user and save a game
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ username: generateTestUsername(), password: 'testpass123' });

      const token = registerRes.body.token;

      // Save a win
      await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({ result: 'win' });

      // Save a loss
      await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({ result: 'loss' });

      // Check leaderboard
      const lbRes = await request(app).get('/api/leaderboard');
      const userEntry = lbRes.body.leaderboard.find(
        (entry: any) => entry.username === registerRes.body.user.username
      );

      expect(userEntry).toBeDefined();
      expect(userEntry.wins).toBe(1);
      expect(userEntry.losses).toBe(1);
      expect(userEntry.total).toBe(2);
      expect(userEntry.win_rate).toBe(50);
    });
  });

  // =====================================================
  // Error Handling
  // =====================================================
  describe('Global error handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
