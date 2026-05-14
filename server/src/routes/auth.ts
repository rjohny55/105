import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db';
import { authMiddleware } from '../middleware/auth';
import { User, AuthResponse, JwtPayload } from '../types';
import { JWT_SECRET } from '../config';

const router = Router();
const SALT_ROUNDS = 10;

// POST /api/auth/register
router.post('/register', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validate username
    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username is required' });
      return;
    }
    if (username.length < 3 || username.length > 20) {
      res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
      return;
    }

    // Validate password
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required' });
      return;
    }
    if (password.length < 4 || password.length > 100) {
      res.status(400).json({ error: 'Password must be between 4 and 100 characters' });
      return;
    }

    const db = getDb();

    // Check if username already exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      res.status(400).json({ error: 'Username is already taken' });
      return;
    }

    // Hash password and create user
    const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);
    const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword);

    const userId = result.lastInsertRowid as number;
    const token = jwt.sign({ id: userId, username } as JwtPayload, JWT_SECRET, { expiresIn: '7d' });

    const response: AuthResponse = {
      token,
      user: { id: userId, username },
    };

    res.status(201).json(response);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username is required' });
      return;
    }
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    const db = getDb();

    const user = db.prepare('SELECT id, username, password FROM users WHERE username = ?').get(username) as User | undefined;
    if (!user) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const token = jwt.sign({ id: user.id, username: user.username } as JwtPayload, JWT_SECRET, { expiresIn: '7d' });

    const response: AuthResponse = {
      token,
      user: { id: user.id, username: user.username },
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(req.userId) as { id: number; username: string; created_at: string } | undefined;

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
