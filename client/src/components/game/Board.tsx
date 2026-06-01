import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, Player } from '@shared/types/index';
import { BOARD_TILES, GROUP_COLORS, TILE_ICONS } from '../../data/board';
import { getCharacter } from '../../data/characters';
import clsx from 'clsx';

interface Props {
  game: GameState;
  onTileClick?: (id: number) => void;
}

// Grid positions: 11x11 grid, corners at (1,1),(1,11),(11,1),(11,11)
function getGridPos(id: number): { gridRow: number; gridCol: number } {
  if (id === 0)  return { gridRow: 11, gridCol: 11 };
  if (id <= 9)   return { gridRow: 11, gridCol: 11 - id };
  if (id === 10) return { gridRow: 11, gridCol: 1 };
  if (id <= 19)  return { gridRow: 11 - (id - 10), gridCol: 1 };
  if (id === 20) return { gridRow: 1, gridCol: 1 };
  if (id <= 29)  return { gridRow: 1, gridCol: id - 19 };
  if (id === 30) return { gridRow: 1, gridCol: 11 };
  return { gridRow: id - 29, gridCol: 11 };
}

function abbreviate(name: string, max = 10): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name;
}

function PlayerPiece({ player, isCurrentTurn }: { player: Player; isCurrentTurn: boolean }) {
  const char = getCharacter(player.characterId);
  return (
    <motion.div
      key={`${player.id}-${player.position}`}
      initial={{ scale: 0, y: -8 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0 }}
      transition={{ type: 'spring', stiffness: 600, damping: 25 }}
      title={`${player.username} ($${player.money})`}
      className={clsx(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center shadow-lg text-[9px] font-bold select-none',
        isCurrentTurn ? 'border-game-gold ring-1 ring-game-gold ring-offset-0 z-20' : 'border-white/60 z-10'
      )}
      style={{ background: char?.color ?? '#7c3aed' }}
    >
      {char?.emoji}
    </motion.div>
  );
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
        'relative flex flex-col items-center justify-start overflow-hidden cursor-pointer select-none transition-all h-full w-full',
        isActive && 'ring-2 ring-inset ring-game-gold z-10',
        !isCorner && 'hover:brightness-125'
      )}
      style={{
        background: isCorner
          ? 'rgba(30,27,75,0.9)'
          : `linear-gradient(to bottom, ${color}30, transparent)`,
        borderTop: !isCorner ? `3px solid ${color}` : 'none',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {isCorner ? (
        // Corner tiles — bigger content
        <div className="flex flex-col items-center justify-center w-full h-full p-1 text-center gap-0.5">
          <span className="text-xl leading-none">{icon}</span>
          <span className="text-white/80 font-bold leading-tight" style={{ fontSize: '7.5px' }}>
            {tile.name}
          </span>
        </div>
      ) : (
        // Regular tiles
        <div className="flex flex-col items-center justify-between w-full h-full p-0.5">
          <span className="text-sm leading-none mt-0.5">{icon}</span>
          <span
            className="text-white/80 text-center leading-tight font-medium w-full px-0.5"
            style={{ fontSize: '6.5px', wordBreak: 'break-word', lineHeight: '1.2' }}
          >
            {abbreviate(tile.name, 12)}
          </span>
          {tile.price ? (
            <span className="text-game-gold font-bold" style={{ fontSize: '7px' }}>${tile.price}</span>
          ) : tile.amount ? (
            <span className="text-red-400 font-bold" style={{ fontSize: '7px' }}>-${tile.amount}</span>
          ) : (
            <span style={{ fontSize: '6px' }}>&nbsp;</span>
          )}
        </div>
      )}

      {/* Player pieces */}
      {players.length > 0 && (
        <div className="absolute bottom-0.5 left-0 right-0 flex flex-wrap gap-0.5 justify-center px-0.5">
          <AnimatePresence>
            {players.map((p) => (
              <PlayerPiece
                key={p.id}
                player={p}
                isCurrentTurn={p.id === players[0]?.id && isActive}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default function Board({ game, onTileClick }: Props) {
  const activePlayers = game.players.filter((p) => !p.isBankrupt);

  return (
    <div className="w-full" style={{ aspectRatio: '1 / 1' }}>
      <div
        className="w-full h-full grid"
        style={{
          gridTemplateColumns: '1.5fr repeat(9, 1fr) 1.5fr',
          gridTemplateRows: '1.5fr repeat(9, 1fr) 1.5fr',
          background: 'rgba(15,23,42,0.95)',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '2px solid rgba(168,85,247,0.3)',
          boxShadow: '0 0 40px rgba(168,85,247,0.2)',
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

        {/* Centro del tablero */}
        <div
          className="flex flex-col items-center justify-center text-center select-none"
          style={{ gridRow: '2 / 11', gridColumn: '2 / 11', background: 'rgba(15,23,42,0.6)' }}
        >
          <div className="text-3xl mb-1">🎲</div>
          <div className="font-game text-game-gold leading-tight" style={{ fontSize: 'clamp(10px, 2.5vw, 22px)' }}>JUEGO</div>
          <div className="font-game text-primary-400 leading-tight" style={{ fontSize: 'clamp(9px, 2vw, 18px)' }}>DE</div>
          <div className="font-game text-game-gold leading-tight" style={{ fontSize: 'clamp(10px, 2.5vw, 22px)' }}>VARONES</div>
          <div className="text-white/25 mt-1" style={{ fontSize: 'clamp(8px, 1.5vw, 12px)' }}>Turno {game.turn}</div>
          {/* Mini resumen de dinero */}
          <div className="mt-2 flex flex-col gap-0.5 items-center">
            {activePlayers.map(p => {
              const c = getCharacter(p.characterId);
              return (
                <div key={p.id} className="flex items-center gap-1" style={{ fontSize: 'clamp(7px, 1.2vw, 10px)' }}>
                  <span style={{ color: c?.color }}>{c?.emoji}</span>
                  <span className="text-game-gold font-bold">${p.money}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
