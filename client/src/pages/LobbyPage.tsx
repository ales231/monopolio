import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { connectSocket, socketEmit } from '../sockets/socketClient';
import { CHARACTERS } from '../data/characters';

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const room = useGameStore((s) => s.room);
  const game = useGameStore((s) => s.game);
  const error = useGameStore((s) => s.error);
  const { user } = useAuthStore();
  const [chatMsg, setChatMsg] = useState('');
  const chat = useGameStore((s) => s.chat);

  useEffect(() => {
    connectSocket();
    if (code && !room) socketEmit.joinRoom(code);
  }, [code, room]);

  // When game starts, redirect to game page
  useEffect(() => {
    if (game && room) navigate(`/game/${room.code}`);
  }, [game, room, navigate]);

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-spin">🎲</div>
          <p className="text-white/50">Conectando a la sala...</p>
          {error && <p className="text-red-400 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  const me = room.players.find((p) => p.userId === user?.id);
  const isHost = room.hostUserId === user?.id;
  const takenChars = room.players.map((p) => p.characterId).filter(Boolean) as string[];
  const canStart = isHost && room.players.length >= 2 && room.players.every((p) => p.isReady && p.characterId);

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    socketEmit.sendChat(chatMsg);
    setChatMsg('');
  };

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-game text-game-gold">SALA: {room.code}</h1>
          <p className="text-white/50 text-sm">{room.players.length}/7 jugadores</p>
        </div>
        <button
          onClick={() => { socketEmit.leaveRoom(); navigate('/dashboard'); }}
          className="btn-secondary text-sm"
        >
          Salir
        </button>
      </div>

      {/* Copy code */}
      <div
        className="bg-white/5 rounded-xl p-3 mb-4 flex items-center justify-between cursor-pointer"
        onClick={() => navigator.clipboard.writeText(room.code)}
      >
        <span className="text-white/50 text-sm">Comparte el código:</span>
        <span className="font-mono font-bold text-game-gold text-lg tracking-widest">{room.code}</span>
        <span className="text-white/30 text-xs">📋 copiar</span>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {/* Players */}
      <div className="card mb-4">
        <h2 className="font-bold mb-3">Jugadores</h2>
        <div className="space-y-2">
          {room.players.map((p) => {
            const char = CHARACTERS.find((c) => c.id === p.characterId);
            return (
              <div key={p.userId} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
                  {char?.emoji ?? '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.username} {p.isHost ? '👑' : ''}</p>
                  <p className="text-xs text-white/50">{char?.name ?? 'Sin personaje'}</p>
                </div>
                <span className={`badge ${p.isReady ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
                  {p.isReady ? '✓ Listo' : 'Esperando'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Character selector */}
      <div className="card mb-4">
        <h2 className="font-bold mb-3">Elige tu Personaje</h2>
        <div className="grid grid-cols-2 gap-2">
          {CHARACTERS.map((c) => {
            const isTaken = takenChars.includes(c.id) && me?.characterId !== c.id;
            const isSelected = me?.characterId === c.id;
            return (
              <button
                key={c.id}
                disabled={isTaken}
                onClick={() => socketEmit.selectCharacter(c.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-500/20'
                    : isTaken
                    ? 'border-white/5 bg-white/5 opacity-40 cursor-not-allowed'
                    : 'border-white/10 bg-white/5 hover:border-primary-400'
                }`}
              >
                <div className="text-2xl mb-1">{c.emoji}</div>
                <div className="font-bold text-sm" style={{ color: c.color }}>{c.name}</div>
                <div className="text-xs text-white/40 truncate">{c.phrase}</div>
                {isTaken && <div className="text-xs text-red-400 mt-1">Tomado</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ready / Start */}
      <div className="flex gap-2 mb-4">
        {me && (
          <button
            onClick={() => socketEmit.setReady(!me.isReady)}
            disabled={!me.characterId}
            className={`flex-1 py-3 btn ${me.isReady ? 'btn-danger' : 'btn-success'}`}
          >
            {me.isReady ? '⏸ No estoy listo' : '✓ Estoy Listo'}
          </button>
        )}
        {isHost && (
          <button
            onClick={() => socketEmit.startGame()}
            disabled={!canStart}
            className="flex-1 py-3 btn-primary"
          >
            🚀 Iniciar Partida
          </button>
        )}
      </div>

      {/* Chat */}
      <div className="card">
        <h2 className="font-bold mb-2 text-sm">Chat de Sala</h2>
        <div className="h-32 overflow-y-auto space-y-1 mb-2">
          {chat.slice().reverse().map((msg, i) => (
            <div key={i} className="text-xs">
              <span className="text-primary-400 font-semibold">{msg.username}: </span>
              <span className="text-white/70">{msg.message}</span>
            </div>
          ))}
        </div>
        <form onSubmit={sendChat} className="flex gap-2">
          <input
            value={chatMsg}
            onChange={(e) => setChatMsg(e.target.value)}
            placeholder="Mensaje..."
            className="input py-2 text-sm flex-1"
            maxLength={200}
          />
          <button type="submit" className="btn-primary px-3">→</button>
        </form>
      </div>
    </div>
  );
}
