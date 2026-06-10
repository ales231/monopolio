import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GameState, Player } from '@shared/types/index';
import { BOARD_TILES, GROUP_COLORS, TILE_ICONS } from '../../data/board';
import { getCharacter } from '../../data/characters';
import clsx from 'clsx';

interface Props {
  game: GameState;
  onTileClick?: (id: number) => void;
}

// ── Geometría del tablero ──────────────────────────────────────────────────
// Grid 11x11: esquinas en (1,1),(1,11),(11,1),(11,11). Columnas: 1.6fr + 9×1fr + 1.6fr

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

const EDGE_FR = 1.6;
const TOTAL_FR = EDGE_FR * 2 + 9;

// Posición inicial y tamaño (en %) de una pista (fila o columna) del grid
function trackPos(i: number): { start: number; size: number } {
  if (i === 1) return { start: 0, size: (EDGE_FR / TOTAL_FR) * 100 };
  if (i === 11) return { start: ((EDGE_FR + 9) / TOTAL_FR) * 100, size: (EDGE_FR / TOTAL_FR) * 100 };
  return { start: ((EDGE_FR + (i - 2)) / TOTAL_FR) * 100, size: (1 / TOTAL_FR) * 100 };
}

// Centro de una casilla en % del tablero
function tileCenter(id: number): { x: number; y: number } {
  const { gridRow, gridCol } = getGridPos(id);
  const col = trackPos(gridCol);
  const row = trackPos(gridRow);
  return { x: col.start + col.size / 2, y: row.start + row.size / 2 };
}

// ── Animación de movimiento paso a paso ────────────────────────────────────
// Cada ficha mantiene una posición "visual" que avanza una casilla cada tick
// hasta alcanzar la posición real del servidor.

const STEP_MS = 190;

function useSteppedPositions(players: Player[]): Record<string, number> {
  const [display, setDisplay] = useState<Record<string, number>>({});

  useEffect(() => {
    const tick = () => {
      setDisplay((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const p of players) {
          const cur = prev[p.id];
          if (cur === undefined) {
            next[p.id] = p.position;
            changed = true;
            continue;
          }
          if (cur === p.position) continue;
          const fwd = (p.position - cur + 40) % 40;
          const back = (cur - p.position + 40) % 40;
          if (fwd <= 12) {
            next[p.id] = (cur + 1) % 40;           // camina hacia adelante
          } else if (back <= 4) {
            next[p.id] = (cur - 1 + 40) % 40;      // camina hacia atrás (empujón, carta)
          } else {
            next[p.id] = p.position;               // teletransporte (cárcel)
          }
          changed = true;
        }
        return changed ? next : prev;
      });
    };
    tick();
    const interval = setInterval(tick, STEP_MS);
    return () => clearInterval(interval);
  }, [players]);

  return display;
}

function PiecesLayer({ game }: { game: GameState }) {
  const players = game.players.filter((p) => !p.isBankrupt);
  const display = useSteppedPositions(players);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 30 }}>
      {players.map((p) => {
        const pos = display[p.id] ?? p.position;
        const { x, y } = tileCenter(pos);
        // Si hay varias fichas en la misma casilla, las separa en racimo
        const peers = players.filter((o) => (display[o.id] ?? o.position) === pos);
        const idx = peers.findIndex((o) => o.id === p.id);
        const ox = ((idx % 3) - (Math.min(peers.length, 3) - 1) / 2) * 13;
        const oy = (Math.floor(idx / 3) - 0.5) * (peers.length > 3 ? 13 : 0);
        const char = getCharacter(p.characterId);
        const isCurrent = p.id === game.currentPlayerId;
        const isWalking = pos !== p.position;

        return (
          <motion.div
            key={p.id}
            animate={{
              left: `${x}%`,
              top: `${y}%`,
              x: ox,
              y: oy,
              scale: isWalking ? 1.25 : isCurrent ? 1.12 : 1,
            }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className={clsx(
              'flex items-center justify-center rounded-full select-none',
              isCurrent && 'ring-2 ring-yellow-400'
            )}
            style={{
              position: 'absolute',
              width: 24,
              height: 24,
              marginLeft: -12,
              marginTop: -12,
              fontSize: 11,
              background: char?.color ?? '#7c3aed',
              border: '2px solid rgba(255,255,255,0.75)',
              boxShadow: '0 3px 8px rgba(0,0,0,0.5)',
              zIndex: isCurrent ? 32 : 31,
            }}
            title={`${p.username} ($${p.money})`}
          >
            {char?.emoji}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Casillas ───────────────────────────────────────────────────────────────

function abbreviate(name: string, max = 13): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name;
}

function TileCell({ tile, isActive, onClick }: {
  tile: (typeof BOARD_TILES)[0];
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
        'relative flex flex-col items-center justify-start h-full w-full select-none cursor-pointer overflow-hidden transition-all',
        isActive && 'outline outline-2 outline-yellow-400 outline-offset-[-2px] z-10'
      )}
      style={{
        background: isCorner ? '#1a2035' : '#1e2540',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {!isCorner && <div className="w-full flex-shrink-0" style={{ height: 5, background: color }} />}

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
            {abbreviate(tile.name)}
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
    </div>
  );
}

// ── Tablero ────────────────────────────────────────────────────────────────

export default function Board({ game, onTileClick }: Props) {
  const activePlayers = game.players.filter((p) => !p.isBankrupt);
  const currentPlayer = game.players.find((p) => p.id === game.currentPlayerId);

  return (
    <div className="w-full relative" style={{ aspectRatio: '1 / 1' }}>
      <div
        className="w-full h-full grid"
        style={{
          gridTemplateColumns: `${EDGE_FR}fr repeat(9, 1fr) ${EDGE_FR}fr`,
          gridTemplateRows: `${EDGE_FR}fr repeat(9, 1fr) ${EDGE_FR}fr`,
          background: '#141b2d',
          borderRadius: 6,
          overflow: 'hidden',
          border: '2px solid #2a3550',
        }}
      >
        {BOARD_TILES.map((tile) => {
          const pos = getGridPos(tile.id);
          return (
            <div key={tile.id} style={{ gridRow: pos.gridRow, gridColumn: pos.gridCol }}>
              <TileCell
                tile={tile}
                isActive={currentPlayer?.position === tile.id}
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
                  <span className={clsx('font-bold', p.money < 0 ? 'text-red-400' : 'text-yellow-300')}>${p.money}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Capa de fichas animadas (encima del grid) */}
      <PiecesLayer game={game} />
    </div>
  );
}
