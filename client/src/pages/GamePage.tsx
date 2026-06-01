import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { connectSocket, socketEmit } from '../sockets/socketClient';
import Board from '../components/game/Board';
import DiceRoller from '../components/game/DiceRoller';
import EventLog from '../components/game/EventLog';
import ChatBox from '../components/game/ChatBox';
import AbilityButton from '../components/game/AbilityButton';
import PropertyList from '../components/game/PropertyList';
import TradeModal from '../components/game/TradeModal';
import { BOARD_TILES } from '../data/board';
import { getCharacter } from '../data/characters';

export default function GamePage() {
  const navigate = useNavigate();
  const game = useGameStore((s) => s.game);
  const error = useGameStore((s) => s.error);
  const lastDice = useGameStore((s) => s.lastDice);
  const { user } = useAuthStore();
  const [rolling, setRolling] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [activeTab, setActiveTab] = useState<'log' | 'chat' | 'properties'>('log');
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => { connectSocket(); }, []);
  useEffect(() => { if (game?.status === 'finished') setShowWinner(true); }, [game?.status]);

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl animate-spin mb-4">🎲</div>
          <p className="text-white/50">Cargando partida...</p>
        </div>
      </div>
    );
  }

  const me = game.players.find((p) => p.userId === user?.id);
  const isMyTurn = me?.id === game.currentPlayerId;
  const currentPlayer = game.players.find((p) => p.id === game.currentPlayerId);
  const currentChar = getCharacter(currentPlayer?.characterId ?? '');
  const currentTile = BOARD_TILES[currentPlayer?.position ?? 0];

  // Detect pending trade targeting me
  const pendingTrade = game.pendingAction?.type === 'trade' ? game.pendingAction : null;
  const tradeTargetId = (pendingTrade?.data as { toPlayerId?: string })?.toPlayerId;
  const isTradeTarget = tradeTargetId === me?.id;

  const handleRollDice = () => {
    setRolling(true);
    socketEmit.rollDice();
    setTimeout(() => setRolling(false), 900);
  };

  if (showWinner && game.winner) {
    const winnerChar = getCharacter(game.winner.characterId);
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-game-bg">
        <div className="text-center max-w-sm w-full">
          <div className="text-8xl mb-4 animate-bounce">🏆</div>
          <h1 className="text-5xl font-game text-game-gold mb-3">¡GANÓ!</h1>
          <div
            className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-5xl border-4 border-game-gold mb-4 shadow-2xl"
            style={{ background: winnerChar?.color }}
          >
            {winnerChar?.emoji}
          </div>
          <h2 className="text-3xl font-bold mb-1">{game.winner.username}</h2>
          <p className="text-game-gold text-xl mb-1">como {winnerChar?.name}</p>
          <p className="text-white/50 italic mb-3">"{winnerChar?.phrase}"</p>
          <p className="text-white/70 mb-8">
            Dinero final: <span className="text-green-400 font-bold text-xl">${game.winner.money}</span>
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary w-full py-4 text-lg">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-game-bg overflow-hidden">

      {/* Header compacto */}
      <header className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 bg-game-board border-b border-white/10">
        <span className="font-game text-game-gold text-sm tracking-wider">JUEGO DE VARONES</span>
        <div className="flex items-center gap-3">
          {error && <span className="text-red-400 text-xs">{error}</span>}
          <span className="text-white/30 text-xs">T{game.turn}</span>
        </div>
      </header>

      {/* Turno actual - banner fino */}
      {currentPlayer && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 text-sm font-semibold"
          style={{ background: `${currentChar?.color ?? '#7c3aed'}25`, borderBottom: `2px solid ${currentChar?.color ?? '#7c3aed'}60` }}
        >
          <span className="text-xl">{currentChar?.emoji}</span>
          <div className="flex-1 min-w-0">
            <span className="font-bold">{isMyTurn ? '🎯 Tu turno' : currentPlayer.username}</span>
            <span className="text-white/50 text-xs ml-2">en {currentTile.name}</span>
          </div>
          {/* Mini player avatars */}
          <div className="flex -space-x-1">
            {game.players.filter(p => !p.isBankrupt).map(p => {
              const c = getCharacter(p.characterId);
              return (
                <div
                  key={p.id}
                  title={`${p.username}: $${p.money}`}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-sm transition-all ${p.id === game.currentPlayerId ? 'border-game-gold scale-110 z-10' : 'border-white/30'}`}
                  style={{ background: c?.color ?? '#7c3aed' }}
                >
                  {c?.emoji}
                </div>
              );
            })}
          </div>
          <span className="text-white/30 text-xs ml-1">
            ${currentPlayer.money}
          </span>
        </div>
      )}

      {/* TABLERO — ocupa el espacio disponible */}
      <div className="flex-1 min-h-0 overflow-auto flex items-start justify-center p-1">
        <div style={{ width: 'min(100vw, 100vh - 280px)', flexShrink: 0 }}>
          <Board game={game} />
        </div>
      </div>

      {/* Panel inferior */}
      <div className="flex-shrink-0 bg-game-board border-t-2 border-primary-500/30" style={{ maxHeight: '46vh' }}>

        {/* Dados */}
        {lastDice && lastDice.length > 0 && (
          <div className="py-2 border-b border-white/10">
            <DiceRoller dice={lastDice} rolling={rolling} />
          </div>
        )}

        {/* Botones de acción */}
        {isMyTurn && me && (
          <div className="px-3 pt-2 pb-1 flex flex-wrap gap-2">
            {game.phase === 'roll' && (
              <button onClick={handleRollDice} className="btn-primary flex-1 py-2.5 text-base font-bold">
                🎲 Lanzar Dados
              </button>
            )}
            {game.phase === 'buy' && (
              <>
                <button onClick={() => socketEmit.buyProperty()} className="btn-success flex-1 py-2 text-sm font-bold">
                  💰 Comprar {BOARD_TILES[me.position].group === 'camila' ? '(GRATIS)' : `$${BOARD_TILES[me.position].price ?? 0}`}
                </button>
                <button onClick={() => socketEmit.skipBuy()} className="btn-secondary px-4 py-2 text-sm">
                  Pasar
                </button>
              </>
            )}
            {game.phase === 'end' && (
              <button onClick={() => socketEmit.endTurn()} className="btn-primary flex-1 py-2 font-bold">
                Siguiente Turno ▶
              </button>
            )}
            {me.money < 0 && !me.isBankrupt && (
              <button onClick={() => socketEmit.declareBankruptcy()} className="btn-danger flex-1 py-2 text-sm">
                💀 Declarar Bancarrota
              </button>
            )}
            {['roll', 'resolve', 'end'].includes(game.phase) && (
              <div className="w-full">
                <AbilityButton me={me} game={game} isMyTurn={isMyTurn} />
              </div>
            )}
          </div>
        )}

        {/* Trade response (target) */}
        {isTradeTarget && pendingTrade && (
          <div className="mx-3 mb-2 p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl">
            <p className="text-sm font-bold text-amber-300 mb-2">
              ⚡ Arthur te propone un intercambio
            </p>
            <div className="flex gap-2">
              <button onClick={() => socketEmit.respondTrade(true)} className="btn-success flex-1 py-1.5 text-sm">
                ✓ Aceptar
              </button>
              <button onClick={() => socketEmit.respondTrade(false)} className="btn-danger flex-1 py-1.5 text-sm">
                ✗ Rechazar (-$30)
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-t border-white/10">
          {(['log', 'chat', 'properties'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-bold tracking-wide transition-all ${
                activeTab === tab
                  ? 'text-primary-300 bg-primary-500/10 border-t-2 border-primary-400'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {tab === 'log' ? '📋 Eventos' : tab === 'chat' ? '💬 Chat' : '🏠 Props'}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-3 pb-3 pt-1" style={{ height: 150 }}>
          {activeTab === 'log' && <EventLog events={game.events} />}
          {activeTab === 'chat' && <ChatBox />}
          {activeTab === 'properties' && me && (
            <PropertyList properties={game.properties} player={me} isMyTurn={isMyTurn} />
          )}
        </div>
      </div>

      {/* Trade Modal (Arthur proposing) */}
      {me?.characterId === 'arthur' && game.phase !== 'end' && (
        <TradeModal game={game} me={me} />
      )}
    </div>
  );
}
