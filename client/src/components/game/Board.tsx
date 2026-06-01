import { GameState, Player } from '@shared/types/index';
import { BOARD_TILES, GROUP_COLORS, TILE_ICONS } from '../../data/board';
import { getCharacter } from '../../data/characters';
import clsx from 'clsx';

interface Props {
  game: GameState;
  onTileClick?: (id: number) => void;
}

// Layout: 40 tiles around a square.
// Bottom row (0-10): left to right
// Right column (11-20): bottom to top
// Top row (21-30): right to left
// Left column (31-39): top to bottom

function getTilePosition(id: number): { row: number; col: number } {
  if (id <= 10) return { row: 10, col: 10 - id }; // bottom row, right to left so 0 is bottom-right
  if (id <= 20) return { row: 10 - (id - 10), col: 0 }; // right col going up — wait, let's fix
  if (id <= 30) return { row: 0, col: id - 20 };
  return { row: id - 30, col: 10 };
}

// Correct board layout for a 11x11 grid (0-10 index)
// Corners: 0=bottom-right, 10=bottom-left, 20=top-left, 30=top-right
function getGridPos(id: number): { gridRow: number; gridCol: number } {
  if (id === 0) return { gridRow: 11, gridCol: 11 }; // bottom-right corner
  if (id <= 9) return { gridRow: 11, gridCol: 11 - id }; // bottom row left
  if (id === 10) return { gridRow: 11, gridCol: 1 }; // bottom-left corner
  if (id <= 19) return { gridRow: 11 - (id - 10), gridCol: 1 }; // left col up
  if (id === 20) return { gridRow: 1, gridCol: 1 }; // top-left corner
  if (id <= 29) return { gridRow: 1, gridCol: id - 19 }; // top row right
  if (id === 30) return { gridRow: 1, gridCol: 11 }; // top-right corner
  return { gridRow: id - 29, gridCol: 11 }; // right col down
}

function TileCell({ tile, players, isActive, onClick }: {
  tile: (typeof BOARD_TILES)[0];
  players: Player[];
  isActive: boolean;
  onClick?: () => void;
}) {
  const color = GROUP_COLORS[tile.group ?? 'none'] ?? '#6b7280';
  const icon = TILE_ICONS[tile.type] ?? '🏠';
  const isCorner = [0, 10, 20, 30].includes(tile.id);

  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative flex flex-col items-center justify-center overflow-hidden cursor-pointer border border-white/10 transition-all select-none',
        isCorner ? 'text-xs' : 'text-[8px]',
        isActive && 'ring-2 ring-game-gold ring-offset-1 ring-offset-game-bg',
        'hover:bg-white/5'
      )}
      style={{
        background: isCorner ? 'rgba(255,255,255,0.05)' : `${color}15`,
        borderTop: !isCorner ? `2px solid ${color}` : undefined,
        minHeight: isCorner ? 48 : 36,
      }}
    >
      {/* Color strip */}
      {!isCorner && tile.group && (
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: color }} />
      )}

      <span className="text-sm leading-none mb-0.5">{icon}</span>
      <span className="text-white/70 leading-tight text-center px-0.5 line-clamp-2 font-medium" style={{ fontSize: '7px' }}>
        {tile.name}
      </span>
      {tile.price && (
        <span className="text-game-gold font-bold" style={{ fontSize: '7px' }}>${tile.price}</span>
      )}

      {/* Player pieces */}
      {players.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
          {players.map((p) => {
            const char = getCharacter(p.characterId);
            return (
              <div
                key={p.id}
                className="w-4 h-4 rounded-full border border-white flex items-center justify-center text-[8px] shadow-lg"
                style={{ background: char?.color ?? '#7c3aed' }}
                title={p.username}
              >
                {char?.emoji ?? '?'}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Board({ game, onTileClick }: Props) {
  const activePlayers = game.players.filter((p) => !p.isBankrupt);

  return (
    <div className="relative w-full aspect-square">
      <div
        className="grid w-full h-full"
        style={{
          gridTemplateColumns: 'repeat(11, 1fr)',
          gridTemplateRows: 'repeat(11, 1fr)',
        }}
      >
        {BOARD_TILES.map((tile) => {
          const pos = getGridPos(tile.id);
          const playersOnTile = activePlayers.filter((p) => p.position === tile.id);
          const isCurrentTurn = playersOnTile.some((p) => p.id === game.currentPlayerId);

          return (
            <div
              key={tile.id}
              style={{ gridRow: pos.gridRow, gridColumn: pos.gridCol }}
            >
              <TileCell
                tile={tile}
                players={playersOnTile}
                isActive={isCurrentTurn}
                onClick={() => onTileClick?.(tile.id)}
              />
            </div>
          );
        })}

        {/* Center */}
        <div
          className="flex flex-col items-center justify-center text-center p-2"
          style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}
        >
          <div className="text-4xl mb-1">🎲</div>
          <div className="font-game text-game-gold text-xl leading-tight">JUEGO</div>
          <div className="font-game text-primary-400 text-lg leading-tight">DE</div>
          <div className="font-game text-game-gold text-xl leading-tight">VARONES</div>
          <div className="text-white/30 text-xs mt-2">Turno {game.turn}</div>
        </div>
      </div>
    </div>
  );
}
