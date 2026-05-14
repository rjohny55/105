export interface User {
  id: number;
  username: string;
  password: string;
  created_at: string;
}

export interface UserPublic {
  id: number;
  username: string;
  created_at: string;
}

export interface GameResult {
  id: number;
  user_id: number;
  result: 'win' | 'loss' | 'draw';
  opponent: 'ai';
  created_at: string;
}

export interface LeaderboardEntry {
  username: string;
  wins: number;
  losses: number;
  draws: number;
  total: number;
  win_rate: number;
}

export interface AuthResponse {
  token: string;
  user: Pick<UserPublic, 'id' | 'username'>;
}

export interface JwtPayload {
  id: number;
  username: string;
}

// Extend Express Request to include user_id from auth middleware
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}
