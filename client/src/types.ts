export interface User {
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
  user: Pick<User, 'id' | 'username'>;
}

export type Player = 'X' | 'O' | null;
export type BoardState = Player[];
