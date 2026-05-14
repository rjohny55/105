import { useState, useCallback, useEffect, useRef } from 'react';
import type { BoardState, Player } from '../types';
import { checkWinner, getBestMove } from '../ai/minimax';
import Cell from './Cell';

interface BoardProps {
  onGameEnd: (result: 'win' | 'loss' | 'draw') => void;
  resetKey: number;
}

function getWinningCells(board: BoardState): number[] {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return [a, b, c];
    }
  }

  return [];
}

export default function Board({ onGameEnd, resetKey }: BoardProps) {
  const [board, setBoard] = useState<BoardState>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [gameOver, setGameOver] = useState(false);
  const [winningCells, setWinningCells] = useState<number[]>([]);
  const aiThinking = useRef(false);

  // Reset game when resetKey changes
  useEffect(() => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setGameOver(false);
    setWinningCells([]);
    aiThinking.current = false;
  }, [resetKey]);

  // Handle game end checks
  const checkGameEnd = useCallback(
    (newBoard: BoardState) => {
      const winner = checkWinner(newBoard);
      if (winner) {
        setGameOver(true);
        if (winner === 'draw') {
          onGameEnd('draw');
        } else if (winner === 'X') {
          setWinningCells(getWinningCells(newBoard));
          onGameEnd('win');
        } else if (winner === 'O') {
          setWinningCells(getWinningCells(newBoard));
          onGameEnd('loss');
        }
        return true;
      }
      return false;
    },
    [onGameEnd]
  );

  // AI move
  useEffect(() => {
    if (currentPlayer === 'O' && !gameOver && !aiThinking.current) {
      aiThinking.current = true;
      // Small delay so the UI updates before AI "thinks"
      const timer = setTimeout(() => {
        setBoard((prevBoard) => {
          const newBoard = [...prevBoard] as BoardState;
          const move = getBestMove(newBoard);
          if (move !== -1) {
            newBoard[move] = 'O';
          }
          checkGameEnd(newBoard);
          setCurrentPlayer('X');
          aiThinking.current = false;
          return newBoard;
        });
      }, 300);
      return () => {
        clearTimeout(timer);
        aiThinking.current = false;
      };
    }
  }, [currentPlayer, gameOver, checkGameEnd]);

  const handleCellClick = useCallback(
    (index: number) => {
      if (gameOver || currentPlayer !== 'X' || board[index] !== null) return;

      setBoard((prevBoard) => {
        const newBoard = [...prevBoard] as BoardState;
        newBoard[index] = 'X';
        const ended = checkGameEnd(newBoard);
        if (!ended) {
          setCurrentPlayer('O');
        }
        return newBoard;
      });
    },
    [gameOver, currentPlayer, board, checkGameEnd]
  );

  return (
    <div className="board">
      {board.map((cell, index) => (
        <Cell
          key={index}
          value={cell}
          onClick={() => handleCellClick(index)}
          disabled={gameOver || currentPlayer === 'O'}
          isWinningCell={winningCells.includes(index)}
        />
      ))}
    </div>
  );
}
