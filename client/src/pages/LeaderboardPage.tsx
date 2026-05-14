import { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '../types';
import { getLeaderboard } from '../api/client';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getLeaderboard();
        setEntries(data.leaderboard);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load leaderboard'
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <h1>Leaderboard</h1>
        <p className="loading">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <h1>Leaderboard</h1>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Leaderboard</h1>
      {entries.length === 0 ? (
        <p className="empty-message">No games played yet. Be the first!</p>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Draws</th>
              <th>Win %</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={entry.username}>
                <td>{index + 1}</td>
                <td>{entry.username}</td>
                <td>{entry.wins}</td>
                <td>{entry.losses}</td>
                <td>{entry.draws}</td>
                <td>{(entry.win_rate * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
