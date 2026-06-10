import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import {
  createRoom, getRoomByCode, getRoomById, joinRoom, leaveRoom,
  selectCharacter, setReady, allReady, setRoomStatus,
} from '../rooms/service';
import { GameEngine } from '../game/engine/GameEngine';
import { persistFinishedGame } from '../game/persistence';
import { GameState, RoomPlayer } from '../../../shared/types/index';

interface SocketUser {
  userId: string;
  username: string;
  avatarUrl?: string;
  roomId?: string;
}

const socketUsers = new Map<string, SocketUser>();

export function initSockets(io: Server): void {

  // Emite el estado a toda la sala; si terminó, anuncia ganador y persiste en DB
  function broadcastGame(roomId: string, game: GameState): void {
    io.to(roomId).emit('game:state', { gameState: game });
    if (game.status === 'finished') {
      io.to(roomId).emit('game:finished', { winner: game.winner });
      void persistFinishedGame(game);
    }
  }

  // JWT auth para sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Token requerido.'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; username: string };
      socketUsers.set(socket.id, { userId: payload.userId, username: payload.username });
      next();
    } catch {
      next(new Error('Token inválido.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Conectado: ${socket.id}`);

    const getUser = (): SocketUser | undefined => socketUsers.get(socket.id);

    // ── Rooms ───────────────────────────────────────────────────────────

    socket.on('room:create', async () => {
      const user = getUser();
      if (!user) return;
      const room = await createRoom({ userId: user.userId, username: user.username, avatarUrl: user.avatarUrl });
      user.roomId = room.id;
      socket.join(room.id);
      socket.emit('room:updated', { room });
    });

    socket.on('room:join', ({ code }: { code: string }) => {
      const user = getUser();
      if (!user) return;

      const existingRoom = getRoomByCode(code);
      if (!existingRoom) {
        socket.emit('error', { message: 'Sala no encontrada.' });
        return;
      }

      // Reconexión: si la partida ya empezó y el usuario es un jugador, lo reconectamos
      if (existingRoom.status === 'IN_GAME') {
        const game = GameEngine.getGame(existingRoom.id);
        const player = game?.players.find((p) => p.userId === user.userId);
        if (game && player) {
          user.roomId = existingRoom.id;
          socket.join(existingRoom.id);
          player.connectionStatus = 'connected';
          socket.emit('room:updated', { room: existingRoom });
          broadcastGame(existingRoom.id, game);
          return;
        }
        socket.emit('error', { message: 'La partida ya comenzó.' });
        return;
      }

      if (existingRoom.players.length >= 7 && !existingRoom.players.find((p) => p.userId === user.userId)) {
        socket.emit('error', { message: 'Sala llena (máx. 7 jugadores).' });
        return;
      }

      const player: RoomPlayer = {
        userId: user.userId,
        username: user.username,
        avatarUrl: user.avatarUrl,
        isReady: false,
        isHost: false,
      };

      const room = joinRoom(existingRoom.id, player);
      if (!room) { socket.emit('error', { message: 'No se pudo unir.' }); return; }

      user.roomId = room.id;
      socket.join(room.id);
      io.to(room.id).emit('room:updated', { room });
    });

    socket.on('room:leave', () => {
      const user = getUser();
      if (!user?.roomId) return;
      const room = leaveRoom(user.roomId, user.userId);
      socket.leave(user.roomId);
      if (room) io.to(room.id).emit('room:updated', { room });
      user.roomId = undefined;
    });

    socket.on('player:selectCharacter', ({ characterId }: { characterId: string }) => {
      const user = getUser();
      if (!user?.roomId) return;
      const room = selectCharacter(user.roomId, user.userId, characterId);
      if (!room) { socket.emit('error', { message: 'Personaje ya tomado o sala inválida.' }); return; }
      io.to(room.id).emit('room:updated', { room });
    });

    socket.on('player:setReady', ({ ready }: { ready: boolean }) => {
      const user = getUser();
      if (!user?.roomId) return;
      const room = setReady(user.roomId, user.userId, ready);
      if (!room) return;
      io.to(room.id).emit('room:updated', { room });
    });

    // ── Game lifecycle ──────────────────────────────────────────────────

    socket.on('game:start', () => {
      const user = getUser();
      if (!user?.roomId) return;

      const room = getRoomById(user.roomId);
      if (!room) { socket.emit('error', { message: 'Sala no encontrada.' }); return; }
      if (room.hostUserId !== user.userId) { socket.emit('error', { message: 'Solo el host puede iniciar.' }); return; }
      if (!allReady(room)) { socket.emit('error', { message: 'No todos los jugadores están listos.' }); return; }

      setRoomStatus(room.id, 'IN_GAME');

      const gamePlayers = room.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        avatarUrl: p.avatarUrl,
        characterId: p.characterId!,
      }));

      const game = GameEngine.createGame(room.id, gamePlayers);
      io.to(room.id).emit('game:started', { gameState: game });
    });

    // ── Game actions ────────────────────────────────────────────────────

    socket.on('game:rollDice', () => {
      const user = getUser();
      if (!user?.roomId) return;

      const result = GameEngine.rollDice(user.roomId, findPlayerId(user.roomId, user.userId));
      if ('error' in result) { socket.emit('error', { message: result.error }); return; }

      io.to(user.roomId).emit('game:diceRolled', {
        dice: result.result.dice,
        playerId: result.game.currentPlayerId,
      });
      broadcastGame(user.roomId, result.game);
    });

    socket.on('game:buyProperty', () => {
      const user = getUser();
      if (!user?.roomId) return;
      const result = GameEngine.buyProperty(user.roomId, findPlayerId(user.roomId, user.userId));
      if ('error' in result) { socket.emit('error', { message: result.error }); return; }
      broadcastGame(user.roomId, result.game);
    });

    socket.on('game:skipBuy', () => {
      const user = getUser();
      if (!user?.roomId) return;
      const result = GameEngine.skipBuy(user.roomId, findPlayerId(user.roomId, user.userId));
      if ('error' in result) { socket.emit('error', { message: result.error }); return; }
      broadcastGame(user.roomId, result.game);
    });

    socket.on('game:mortgageProperty', ({ propertyId }: { propertyId: number }) => {
      const user = getUser();
      if (!user?.roomId) return;
      const result = GameEngine.mortgageProperty(user.roomId, findPlayerId(user.roomId, user.userId), propertyId);
      if ('error' in result) { socket.emit('error', { message: result.error }); return; }
      broadcastGame(user.roomId, result.game);
    });

    socket.on('game:useAbility', ({ abilityId, targetPlayerId }: { abilityId: string; targetPlayerId?: string }) => {
      const user = getUser();
      if (!user?.roomId) return;
      const result = GameEngine.useAbility(user.roomId, findPlayerId(user.roomId, user.userId), abilityId, targetPlayerId);
      if ('error' in result) { socket.emit('error', { message: result.error }); return; }
      broadcastGame(user.roomId, result.game);
    });

    socket.on('game:proposeTrade', ({ targetPlayerId, wantPropertyId, offerMoney }: { targetPlayerId: string; wantPropertyId: number; offerMoney: number }) => {
      const user = getUser();
      if (!user?.roomId) return;
      const result = GameEngine.proposeTrade(
        user.roomId,
        findPlayerId(user.roomId, user.userId),
        targetPlayerId,
        Number(wantPropertyId),
        Math.max(0, Number(offerMoney) || 0)
      );
      if ('error' in result) { socket.emit('error', { message: result.error }); return; }
      broadcastGame(user.roomId, result.game);
    });

    socket.on('game:respondTrade', ({ accept }: { accept: boolean }) => {
      const user = getUser();
      if (!user?.roomId) return;
      const result = GameEngine.respondTrade(user.roomId, findPlayerId(user.roomId, user.userId), Boolean(accept));
      if ('error' in result) { socket.emit('error', { message: result.error }); return; }
      broadcastGame(user.roomId, result.game);
    });

    socket.on('game:endTurn', () => {
      const user = getUser();
      if (!user?.roomId) return;
      const result = GameEngine.nextTurn(user.roomId, findPlayerId(user.roomId, user.userId));
      if ('error' in result) { socket.emit('error', { message: result.error }); return; }
      broadcastGame(user.roomId, result.game);
    });

    socket.on('game:declareBankruptcy', () => {
      const user = getUser();
      if (!user?.roomId) return;
      const result = GameEngine.declareBankruptcy(user.roomId, findPlayerId(user.roomId, user.userId));
      if ('error' in result) { socket.emit('error', { message: result.error }); return; }
      io.to(user.roomId).emit('game:playerBankrupt', { playerId: findPlayerId(user.roomId, user.userId) });
      broadcastGame(user.roomId, result.game);
    });

    // ── Chat ────────────────────────────────────────────────────────────

    socket.on('chat:message', ({ message }: { message: string }) => {
      const user = getUser();
      if (!user?.roomId || typeof message !== 'string' || !message.trim()) return;
      io.to(user.roomId).emit('chat:message', {
        userId: user.userId,
        username: user.username,
        message: message.slice(0, 200),
        timestamp: new Date().toISOString(),
      });
    });

    // ── Disconnect ──────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      const user = getUser();
      if (user?.roomId) {
        const room = getRoomById(user.roomId);
        if (room?.status === 'LOBBY') {
          const updated = leaveRoom(user.roomId, user.userId);
          if (updated) io.to(updated.id).emit('room:updated', { room: updated });
        } else if (room?.status === 'IN_GAME') {
          const game = GameEngine.getGame(user.roomId);
          const player = game?.players.find((p) => p.userId === user.userId);
          if (game && player) {
            player.connectionStatus = 'disconnected';
            io.to(user.roomId).emit('game:state', { gameState: game });
          }
        }
      }
      socketUsers.delete(socket.id);
      console.log(`[Socket] Desconectado: ${socket.id}`);
    });
  });
}

function findPlayerId(roomId: string, userId: string): string {
  const game = GameEngine.getGame(roomId);
  if (!game) return '';
  return game.players.find((p) => p.userId === userId)?.id ?? '';
}
