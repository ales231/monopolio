import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { connectSocket, socketEmit } from '../sockets/socketClient';
import Board from '../components/game/Board';
import DiceRoller from '../components/game/DiceRoller';
import PlayerCard from '../components/game/PlayerCard';
import EventLog from '../components/game/EventLog';
import ChatBox from '../components/game/ChatBox';
import AbilityButton from '../components/game/AbilityButton';
import PropertyList from '../components/game/PropertyList';
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

  useEffect(() => { connectSocket(); }, []);

  useEffect(() => {
    if (game?.status === 'finished') setShowWinner(true);
  }, [game?.status]);

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

  const handleRollDice = () => {
    setRolling(true);
    socketEmit.rollDice();
    setTimeout(() => setRolling(false), 900);
  };

  if (showWinner && game.winner) {
    const winnerChar = getCharacter(game.winner.characterId);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-8xl mb-4">🏆</div>
          <h1 className="text-5xl font-game text-game-gold mb-2">¡GANÓ!</h1>
          <div
            className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl border-4 border-game-gold mb-3"
            style={{ background: winnerChar?.color }}
          >
            {winnerChar?.emoji}
          </div>
          <h2 className="text-3xl font-bold mb-1">{game.winner.username}</h2>
          <p className="text-game-gold text-xl mb-1">como {winnerChar?.name}</p>
          <p className="text-white/50 italic mb-2">"{winnerChar?.phrase}"</p>
          <p className="text-white/70 mb-6">Dinero final: <span className="text-green-400 font-bold">${game.winner.money}</span></p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary w-full py-3 text-lg">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-game-board border-b border-white/10 flex-shrink-0">
        <div className="font-game text-game-gold text-sm">JUEGO DE VARONES</div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-white/40">Turno {game.turn}</span>
          {error && <span className="text-red-400 text-xs">{error}</span>}
        </div>
      </div>

      {/* Current turn banner */}
      {currentPlayer && (
        <div
          className="px-3 py-1.5 text-xs font-semibold flex items-center gap-2 flex-shrink-0"
          style={{ background: `${getCharacter(currentPlayer.characterId)?.color}30` }}
        >
          <span className="text-lg">{currentChar?.emoji}</span>
          <span>
            {isMyTurn ? '🎯 Tu turno!' : `Turno de ${currentPlayer.username}`}
            {' — '}<span className="text-white/60">{currentTile.name}</span>
          </span>
          <span className="ml-auto text-white/40">{game.phase}</span>
        </div>
      )}

      {/* Players row (compact) */}
      <div className="flex gap-1 px-2 py-1 overflow-x-auto flex-shrink-0">
        {game.players.map((p) => (
          <div key={p.id} className="flex-shrink-0 w-36">
            <PlayerCard
              player={p}
              isCurrentTurn={p.id === game.currentPlayerId}
              isMe={p.userId === user?.id}
              compact
            />
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="flex-1 px-2 min-h-0 overflow-hidden">
        <div className="h-full max-w-lg mx-auto">
          <Board game={game} />
        </div>
      </div>

      {/* Action panel */}
      <div className="flex-shrink-0 bg-game-board border-t border-white/10">
        {/* Dice display */}
        {lastDice && lastDice.length > 0 && (
          <div className="py-2 px-3">
            <DiceRoller dice={lastDice} rolling={rolling} />
          </div>
        )}

        {/* Actions (only for my turn) */}
        {isMyTurn && me && (
          <div className="px-3 pb-2 grid grid-cols-2 gap-2">
            {game.phase === 'roll' && (
              <button
                onClick={handleRollDice}
                className="btn-primary col-span-2 py-3 text-lg"
              >
                🎲 Lanzar Dados
              </button>
            )}

            {game.phase === 'buy' && (
              <>
                <button onClick={() => socketEmit.buyProperty()} className="btn-success py-2">
                  💰 Comprar ${BOARD_TILES[me.position].price ?? 0}
                </button>
                <button onClick={() => socketEmit.skipBuy()} className="btn-secondary py-2">
                  Pasar
                </button>
              </>
            )}

            {game.phase === 'end' && (
              <button onClick={() => socketEmit.endTurn()} className="btn-primary col-span-2 py-2">
                Terminar Turno ▶
              </button>
            )}

            {/* Ability */}
            {['roll', 'resolve', 'end'].includes(game.phase) && (
              <div className="col-span-2">
                <AbilityButton me={me} game={game} isMyTurn={isMyTurn} />
              </div>
            )}

            {/* Bankruptcy */}
            {me.money < 0 && !me.isBankrupt && (
              <button
                onClick={() => socketEmit.declareBankruptcy()}
                className="btn-danger col-span-2 py-2 text-sm"
              >
                💀 Declarar Bancarrota
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-t border-white/10">
          {(['log', 'chat', 'properties'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                activeTab === tab ? 'text-primary-400 border-t-2 border-primary-400' : 'text-white/40'
              }`}
            >
              {tab === 'log' ? '📋 Eventos' : tab === 'chat' ? '💬 Chat' : '🏠 Props'}
            </button>
          ))}
        </div>

        <div className="px-3 pb-3" style={{ height: 160 }}>
          {activeTab === 'log' && <EventLog events={game.events} />}
          {activeTab === 'chat' && <ChatBox />}
          {activeTab === 'properties' && me && (
            <PropertyList properties={game.properties} player={me} isMyTurn={isMyTurn} />
          )}
        </div>
      </div>
    </div>
  );
}
