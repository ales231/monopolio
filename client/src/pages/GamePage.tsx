import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { connectSocket, socketEmit } from '../sockets/socketClient';
import Board from '../components/game/Board';
import DiceRoller3D from '../components/game/Dice3D';
import EventLog from '../components/game/EventLog';
import ChatBox from '../components/game/ChatBox';
import AbilityButton from '../components/game/AbilityButton';
import PropertyList from '../components/game/PropertyList';
import TradeModal from '../components/game/TradeModal';
import { BOARD_TILES } from '../data/board';
import { getCharacter } from '../data/characters';

type DrawerTab = 'log' | 'chat' | 'properties';

export default function GamePage() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const game = useGameStore((s) => s.game);
  const error = useGameStore((s) => s.error);
  const lastDice = useGameStore((s) => s.lastDice);
  const showPhraseFor = useGameStore((s) => s.showPhraseFor);
  const { user } = useAuthStore();
  const [showWinner, setShowWinner] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('log');

  // Conexión + reconexión: si recargaste la página, vuelve a entrar a la sala
  useEffect(() => {
    connectSocket();
    if (roomCode) socketEmit.joinRoom(roomCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (game?.status === 'finished') setShowWinner(true); }, [game?.status]);

  // Burbuja con la frase del personaje cuando alguien usa habilidad
  const latestEvent = game?.events[0];
  useEffect(() => {
    if (latestEvent && ['ability_used', 'injury', 'camila_claimed', 'dehivid_push'].includes(latestEvent.type)) {
      useGameStore.getState().showPhrase(latestEvent.playerId);
    }
  }, [latestEvent?.id]);

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1525' }}>
        <div className="text-center">
          <div className="text-5xl animate-spin mb-4">🎲</div>
          <p className="text-white/40">Conectando a la partida...</p>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          <button onClick={() => navigate('/dashboard')} className="btn-secondary mt-6 text-sm">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const me = game.players.find((p) => p.userId === user?.id);
  const isMyTurn = me?.id === game.currentPlayerId;
  const currentPlayer = game.players.find((p) => p.id === game.currentPlayerId);
  const currentChar = getCharacter(currentPlayer?.characterId ?? '');
  const currentTile = BOARD_TILES[currentPlayer?.position ?? 0];

  const pendingTrade = game.pendingAction?.type === 'trade' ? game.pendingAction : null;
  const tradeTargetId = (pendingTrade?.data as { toPlayerId?: string })?.toPlayerId;
  const isTradeTarget = tradeTargetId === me?.id;

  const phrasePlayer = showPhraseFor ? game.players.find((p) => p.id === showPhraseFor) : null;
  const phraseChar = phrasePlayer ? getCharacter(phrasePlayer.characterId) : null;

  const openDrawer = (tab: DrawerTab) => { setDrawerTab(tab); setDrawerOpen(true); };

  if (showWinner && game.winner) {
    const winnerChar = getCharacter(game.winner.characterId);
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f1525' }}>
        <div className="text-center max-w-sm w-full">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            className="text-8xl mb-4"
          >
            🏆
          </motion.div>
          <h1 className="text-5xl font-game text-yellow-400 mb-3">¡GANÓ!</h1>
          <div
            className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-5xl border-4 border-yellow-400 mb-4 shadow-xl"
            style={{ background: winnerChar?.color }}
          >
            {winnerChar?.emoji}
          </div>
          <h2 className="text-3xl font-bold mb-1">{game.winner.username}</h2>
          <p className="text-yellow-400 text-xl mb-1">como {winnerChar?.name}</p>
          <p className="text-white/40 italic mb-3">"{winnerChar?.phrase}"</p>
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
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#0f1525' }}>

      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-3 py-1.5"
        style={{ background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <span className="font-game text-yellow-400 text-sm tracking-wider">JUEGO DE VARONES</span>
        <div className="flex items-center gap-3">
          {error && <span className="text-red-400 text-xs">{error}</span>}
          <button onClick={() => openDrawer('log')} className="text-white/50 hover:text-white transition-colors text-sm">📋</button>
          <button onClick={() => openDrawer('chat')} className="text-white/50 hover:text-white transition-colors text-sm">💬</button>
          <span className="text-white/25 text-xs">T{game.turn}</span>
        </div>
      </header>

      {/* Burbuja de frase del personaje */}
      <AnimatePresence>
        {phrasePlayer && phraseChar && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="fixed left-1/2 z-[60] flex items-center gap-2"
            style={{ top: 52, transform: 'translateX(-50%)' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 border-white shadow-lg flex-shrink-0"
              style={{ background: phraseChar.color }}
            >
              {phraseChar.emoji}
            </div>
            <div className="bg-white text-gray-900 rounded-2xl rounded-bl-sm px-4 py-2 shadow-xl text-sm font-semibold max-w-[240px]">
              "{phraseChar.phrase}"
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Turno banner */}
      {currentPlayer && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5"
          style={{ background: '#161f35', borderBottom: `2px solid ${currentChar?.color ?? '#444'}50` }}
        >
          <span className="text-xl">{currentChar?.emoji}</span>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-sm">{isMyTurn ? '🎯 Tu turno' : currentPlayer.username}</span>
            <span className="text-white/40 text-xs ml-2 truncate">en {currentTile.name}</span>
          </div>
          <div className="flex -space-x-1.5">
            {game.players.filter((p) => !p.isBankrupt).map((p) => {
              const c = getCharacter(p.characterId);
              return (
                <div
                  key={p.id}
                  title={`${p.username}: $${p.money}${p.connectionStatus === 'disconnected' ? ' (desconectado)' : ''}`}
                  className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs shadow transition-transform ${
                    p.id === game.currentPlayerId ? 'border-yellow-400 scale-110 z-10' : 'border-white/20'
                  }`}
                  style={{ background: c?.color ?? '#7c3aed', opacity: p.connectionStatus === 'disconnected' ? 0.4 : 1 }}
                >
                  {c?.emoji}
                </div>
              );
            })}
          </div>
          <span className={`font-bold text-sm ml-1 ${currentPlayer.money < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
            ${currentPlayer.money}
          </span>
        </div>
      )}

      {/* TABLERO */}
      <div className="flex-1 min-h-0 overflow-auto flex items-start justify-center p-1.5">
        <div style={{ width: 'min(100vw - 12px, 100vh - 270px)', flexShrink: 0 }}>
          <Board game={game} />
        </div>
      </div>

      {/* Panel de acciones */}
      <div className="flex-shrink-0" style={{ background: '#111827', borderTop: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Dados 3D */}
        {lastDice && lastDice.length > 0 && (
          <div className="border-b border-white/5">
            <DiceRoller3D dice={lastDice} />
          </div>
        )}

        {/* Acciones de mi turno */}
        {isMyTurn && me && (
          <div className="px-3 pt-2 pb-1 space-y-2">
            {game.phase === 'roll' && (
              <button onClick={() => socketEmit.rollDice()} className="btn-primary w-full py-3 text-base font-bold">
                🎲 Lanzar Dados
              </button>
            )}

            {game.phase === 'buy' && (
              <div className="flex gap-2">
                <button onClick={() => socketEmit.buyProperty()} className="btn-success flex-1 py-2 font-bold">
                  💰 Comprar{' '}
                  {BOARD_TILES[me.position].group === 'camila'
                    ? '(GRATIS)'
                    : `$${BOARD_TILES[me.position].price ?? 0}`}
                </button>
                <button onClick={() => socketEmit.skipBuy()} className="btn-secondary px-4 py-2">Pasar</button>
              </div>
            )}

            {game.phase === 'end' && (
              <button onClick={() => socketEmit.endTurn()} className="btn-primary w-full py-2.5 font-bold">
                Siguiente Turno ▶
              </button>
            )}

            {me.money < 0 && !me.isBankrupt && (
              <div className="flex gap-2">
                <button onClick={() => openDrawer('properties')} className="btn-secondary flex-1 py-2 text-sm">
                  🏦 Hipotecar (debes ${-me.money})
                </button>
                <button onClick={() => socketEmit.declareBankruptcy()} className="btn-danger flex-1 py-2 text-sm">
                  💀 Bancarrota
                </button>
              </div>
            )}

            {['roll', 'resolve', 'end'].includes(game.phase) && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <AbilityButton me={me} game={game} isMyTurn={isMyTurn} />
                </div>
                {me.characterId === 'arthur' && (
                  <div className="flex-1">
                    <TradeModal game={game} me={me} isMyTurn={isMyTurn} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Respuesta al trade (cuando soy el objetivo) */}
        {isTradeTarget && pendingTrade && (
          <div className="mx-3 my-2 p-3 rounded-xl" style={{ background: '#2a1f00', border: '1px solid #f59e0b60' }}>
            <p className="text-sm font-bold text-amber-300 mb-1.5">⚡ Arthur te propone un intercambio</p>
            <p className="text-xs text-white/50 mb-2">Si rechazas, pagas $30 al banco.</p>
            <div className="flex gap-2">
              <button onClick={() => socketEmit.respondTrade(true)} className="btn-success flex-1 py-2 text-sm font-bold">
                ✓ Aceptar
              </button>
              <button onClick={() => socketEmit.respondTrade(false)} className="btn-danger flex-1 py-2 text-sm font-bold">
                ✗ Rechazar
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-t border-white/5">
          {([
            { id: 'log', label: '📋 Eventos' },
            { id: 'chat', label: '💬 Chat' },
            { id: 'properties', label: '🏠 Props' },
          ] as { id: DrawerTab; label: string }[]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => openDrawer(id)}
              className="flex-1 py-2 text-xs font-semibold text-white/40 hover:text-white/70 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* DRAWER desplegable */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-hidden flex flex-col"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '70vh' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            >
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex gap-1">
                  {([
                    { id: 'log', label: '📋 Eventos' },
                    { id: 'chat', label: '💬 Chat' },
                    { id: 'properties', label: '🏠 Propiedades' },
                  ] as { id: DrawerTab; label: string }[]).map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setDrawerTab(id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        drawerTab === id ? 'bg-primary-600 text-white' : 'text-white/40 hover:text-white/60'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setDrawerOpen(false)} className="text-white/40 hover:text-white text-xl px-1">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 min-h-0">
                {drawerTab === 'log' && <EventLog events={game.events} />}
                {drawerTab === 'chat' && <ChatBox />}
                {drawerTab === 'properties' && me && (
                  <PropertyList properties={game.properties} player={me} isMyTurn={isMyTurn} />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
