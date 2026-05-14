import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { LeaderboardEntry } from '../types';

const router = Router();

// GET /api/leaderboard — top 20 players by win rate
router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDb();

    const rows = db.prepare(`
      SELECT
        u.username,
        SUM(CASE WHEN g.result = 'win' THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN g.result = 'loss' THEN 1 ELSE 0 END) AS losses,
        SUM(CASE WHEN g.result = 'draw' THEN 1 ELSE 0 END) AS draws,
        COUNT(*) AS total,
        ROUND(CAST(SUM(CASE WHEN g.result = 'win' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 2) AS win_rate
      FROM users u
      INNER JOIN games g ON u.id = g.user_id
      GROUP BY u.id, u.username
      HAVING total > 0
      ORDER BY win_rate DESC, total DESC
      LIMIT 20
    `).all() as LeaderboardEntry[];

    res.status(200).json({ leaderboard: rows });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
