import { useState, useCallback } from 'react';
import Board from '../components/Board';
import { useAuth } from '../context/AuthContext';
import { saveGameResult } from '../api/client';

interface Score {
  wins: number;
  losses: number;
  draws: number;
}

export default function GamePage() {
  const { user, logout } = useAuth();
  const [resetKey, setResetKey] = useState(0);
  const [score, setScore] = useState<Score>({ wins: 0, losses: 0, draws: 0 });
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleGameEnd = useCallback(
    async (result: 'win' | 'loss' | 'draw') => {
      setScore((prev) => ({
        ...prev,
        [result === 'win'
          ? 'wins'
          : result === 'loss'
            ? 'losses'
            : 'draws']:
          prev[result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'draws'] + 1,
      }));

      setLastResult(
        result === 'win'
          ? 'You won!'
          : result === 'loss'
            ? 'AI won!'
            : "It's a draw!"
      );

      // Save result to API
      setSaving(true);
      try {
        await saveGameResult(result);
      } catch {
        // Silently fail — the game still works without saving
        console.error('Failed to save game result');
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const handleReset = () => {
    setResetKey((prev) => prev + 1);
    setLastResult(null);
  };

  return (
    <div className="page">
      <div className="game-header">
        <h1>Tic-Tac-Toe</h1>
        {user && (
          <div className="user-info">
            <span>Playing as: <strong>{user.username}</strong></span>
            <button className="btn-logout" onClick={logout}>
              Logout
            </button>
          </div>
        )}
      </div>

      <div className="score-board">
        <div className="score-item score-wins">
          Wins: <strong>{score.wins}</strong>
        </div>
        <div className="score-item score-losses">
          Losses: <strong>{score.losses}</strong>
        </div>
        <div className="score-item score-draws">
          Draws: <strong>{score.draws}</strong>
        </div>
      </div>

      {lastResult && (
        <div className="game-result-message">
          {lastResult}
          {saving && <span className="saving-indicator"> (saving...)</span>}
        </div>
      )}

      <Board onGameEnd={handleGameEnd} resetKey={resetKey} />

      <button className="btn-reset" onClick={handleReset}>
        Start New Game
      </button>
    </div>
  );
}
