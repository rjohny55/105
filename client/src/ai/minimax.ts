import type { BoardState, Player } from '../types';

/**
 * Minimax algorithm implementation for Tic-Tac-Toe.
 * The computer plays as 'O' and the human plays as 'X'.
 */

function checkWinner(board: BoardState): Player | 'draw' | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // columns
    [0, 4, 8],
    [2, 4, 6], // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (board.every((cell) => cell !== null)) {
    return 'draw';
  }

  return null;
}

function minimax(
  board: BoardState,
  depth: number,
  isMaximizing: boolean,
  maxDepth: number = 9
): number {
  const result = checkWinner(board);

  // Terminal states
  if (result === 'O') return 10 - depth; // AI wins
  if (result === 'X') return depth - 10; // Human wins
  if (result === 'draw') return 0;

  // Depth limit (should never happen in 3x3)
  if (depth >= maxDepth) return 0;

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'O';
        const score = minimax(board, depth + 1, false, maxDepth);
        board[i] = null;
        bestScore = Math.max(score, bestScore);
      }
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'X';
        const score = minimax(board, depth + 1, true, maxDepth);
        board[i] = null;
        bestScore = Math.min(score, bestScore);
      }
    }
    return bestScore;
  }
}

/**
 * Returns the best move index (0-8) for the AI player ('O').
 * If no moves are available, returns -1.
 */
export function getBestMove(board: BoardState): number {
  let bestScore = -Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      // Copy the board so we don't mutate the original
      const boardCopy = [...board] as BoardState;
      boardCopy[i] = 'O';
      const score = minimax(boardCopy, 0, false);
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }

  return bestMove;
}

export { checkWinner };
