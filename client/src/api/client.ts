import type { AuthResponse, GameResult, LeaderboardEntry } from '../types';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function setToken(token: string): void {
  localStorage.setItem('token', token);
}

function clearToken(): void {
  localStorage.removeItem('token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data as T;
}

// Auth API
export async function register(
  username: string,
  password: string
): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data;
}

export async function login(
  username: string,
  password: string
): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data;
}

export async function getMe(): Promise<{ user: { id: number; username: string; created_at: string } }> {
  return request('/auth/me');
}

export function logout(): void {
  clearToken();
}

// Games API
export async function saveGameResult(
  result: 'win' | 'loss' | 'draw'
): Promise<{ game: GameResult }> {
  return request('/games', {
    method: 'POST',
    body: JSON.stringify({ result }),
  });
}

export async function getGameHistory(): Promise<{ games: GameResult[] }> {
  return request('/games/history');
}

// Leaderboard API
export async function getLeaderboard(): Promise<{
  leaderboard: LeaderboardEntry[];
}> {
  return request('/leaderboard');
}

export { getToken, setToken, clearToken };
