import { motion, AnimatePresence } from 'framer-motion';
import { GameState, Player } from '@shared/types/index';
import { BOARD_TILES, GROUP_COLORS, TILE_ICONS } from '../../data/board';
import { getCharacter } from '../../data/characters';
import clsx from 'clsx';

interface Props {
  game: GameState;
  onTileClick?: (id: number) => void;
}

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

function abbreviate(name: string, max = 11): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name;
}

function PlayerPiece({ player, isCurrentTurn }: { player: Player; isCurrentTurn: boolean }) {
  const char = getCharacter(player.characterId);
  return (
    <motion.div
      key={`${player.id}-${player.position}`}
      initial={{ scale: 0, y: -10 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      title={`${player.username} ($${player.money})`}
      className={clsx(
        'w-5 h-5 rounded-full flex items-center justify-center shadow-md text-[9px] font-bold select-none border-2',
        isCurrentTurn ? 'border-yellow-400 z-20' : 'border-white/50 z-10'
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
  const color = GROUP_COLORS[tile.group ?? 'none'] ?? '#546E7A';
  const icon = TILE_ICONS[tile.type] ?? '🏠';
  const isCorner = [0, 10, 20, 30].includes(tile.id);

  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative flex flex-col items-center justify-start h-full w-full select-none cursor-pointer transition-all overflow-hidden',
        isActive && 'outline outline-2 outline-yellow-400 outline-offset-[-2px] z-10'
      )}
      style={{
        background: isCorner ? '#1a2035' : '#1e2540',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Color strip top */}
      {!isCorner && (
        <div className="w-full flex-shrink-0" style={{ height: 5, background: color }} />
      )}

      {isCorner ? (
        <div className="flex flex-col items-center justify-center w-full h-full p-1 text-center gap-0.5">
          <span className="text-lg leading-none">{icon}</span>
          <span className="font-semibold text-white/80 leading-tight" style={{ fontSize: '7px' }}>{tile.name}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-between w-full flex-1 py-0.5 px-0.5">
          <span className="text-xs leading-none">{icon}</span>
          <span
            className="text-white/75 text-center leading-tight w-full"
            style={{ fontSize: '6px', wordBreak: 'break-word', lineHeight: '1.15' }}
          >
            {abbreviate(tile.name, 13)}
          </span>
          {tile.price ? (
            <span className="text-yellow-300 font-semibold" style={{ fontSize: '6.5px' }}>${tile.price}</span>
          ) : tile.amount ? (
            <span className="text-red-400 font-semibold" style={{ fontSize: '6.5px' }}>-${tile.amount}</span>
          ) : (
            <span style={{ height: 8 }} />
          )}
        </div>
      )}

      {/* Jugadores en la casilla */}
      {players.length > 0 && (
        <div className="absolute bottom-0.5 left-0 right-0 flex flex-wrap gap-px justify-center px-0.5">
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
          gridTemplateColumns: '1.6fr repeat(9, 1fr) 1.6fr',
          gridTemplateRows: '1.6fr repeat(9, 1fr) 1.6fr',
          background: '#141b2d',
          borderRadius: '6px',
          overflow: 'hidden',
          border: '2px solid #2a3550',
        }}
      >
        {BOARD_TILES.map((tile) => {
          const pos = getGridPos(tile.id);
          const playersOnTile = activePlayers.filter((p) => p.position === tile.id);
          const isCurrentTurn = playersOnTile.some((p) => p.id === game.currentPlayerId);

          return (
            <div key={tile.id} style={{ gridRow: pos.gridRow, gridColumn: pos.gridCol }}>
              <TileCell
                tile={tile}
                players={playersOnTile}
                isActive={isCurrentTurn}
                onClick={() => onTileClick?.(tile.id)}
              />
            </div>
          );
        })}

        {/* Centro */}
        <div
          className="flex flex-col items-center justify-center text-center select-none"
          style={{ gridRow: '2 / 11', gridColumn: '2 / 11', background: '#0f1525' }}
        >
          <div style={{ fontSize: 'clamp(18px, 4vw, 36px)' }}>🎲</div>
          <div className="font-game text-yellow-400 leading-none" style={{ fontSize: 'clamp(9px, 2.2vw, 20px)' }}>JUEGO</div>
          <div className="font-game text-white/50 leading-none" style={{ fontSize: 'clamp(7px, 1.6vw, 15px)' }}>DE</div>
          <div className="font-game text-yellow-400 leading-none" style={{ fontSize: 'clamp(9px, 2.2vw, 20px)' }}>VARONES</div>
          <div className="text-white/20 mt-1" style={{ fontSize: 'clamp(7px, 1.2vw, 11px)' }}>T{game.turn}</div>
          <div className="mt-1.5 flex flex-col items-center gap-px">
            {activePlayers.map((p) => {
              const c = getCharacter(p.characterId);
              return (
                <div key={p.id} className="flex items-center gap-1" style={{ fontSize: 'clamp(6px, 1vw, 9px)' }}>
                  <span style={{ color: c?.color }}>{c?.emoji}</span>
                  <span className="text-yellow-300 font-bold">${p.money}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
