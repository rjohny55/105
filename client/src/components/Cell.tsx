import type { Player } from '../types';

interface CellProps {
  value: Player;
  onClick: () => void;
  disabled: boolean;
  isWinningCell: boolean;
}

export default function Cell({
  value,
  onClick,
  disabled,
  isWinningCell,
}: CellProps) {
  const handleClick = () => {
    if (!disabled && value === null) {
      onClick();
    }
  };

  return (
    <button
      className={`cell ${value ? 'cell--filled' : ''} ${
        isWinningCell ? 'cell--winning' : ''
      }`}
      onClick={handleClick}
      disabled={disabled}
      aria-label={`Cell ${value ? `contains ${value}` : 'empty'}`}
    >
      {value && <span className="cell__mark">{value}</span>}
    </button>
  );
}
