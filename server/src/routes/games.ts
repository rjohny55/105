import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { authMiddleware } from '../middleware/auth';
import { GameResult } from '../types';

const router = Router();

// POST /api/games — save a game result
router.post('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const { result } = req.body;
    const userId = req.userId!;

    // Validate result
    const validResults = ['win', 'loss', 'draw'];
    if (!result || typeof result !== 'string' || !validResults.includes(result)) {
      res.status(400).json({ error: 'Result must be one of: win, loss, draw' });
      return;
    }

    const db = getDb();

    const stmt = db.prepare('INSERT INTO games (user_id, result, opponent) VALUES (?, ?, ?)');
    const insertResult = stmt.run(userId, result, 'ai');

    const game = db.prepare('SELECT id, user_id, result, opponent, created_at FROM games WHERE id = ?').get(insertResult.lastInsertRowid) as GameResult;

    res.status(201).json({ game });
  } catch (err) {
    console.error('Save game error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/games/history — get user's game history with pagination
router.get('/history', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const db = getDb();

    // Pagination params
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    // Get total count for pagination info
    const countResult = db.prepare('SELECT COUNT(*) as total FROM games WHERE user_id = ?').get(userId) as { total: number };
    const total = countResult.total;

    // Get paginated games
    const games = db.prepare(
      'SELECT id, result, opponent, created_at FROM games WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(userId, limit, offset) as Array<{ id: number; result: string; opponent: string; created_at: string }>;

    res.status(200).json({
      games,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Game history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
