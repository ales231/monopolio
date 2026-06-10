import { v4 as uuid } from 'uuid';
import { Room, RoomPlayer } from '../../../shared/types/index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// In-memory room store (fast access during game)
const rooms = new Map<string, Room>();

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createRoom(hostUser: { userId: string; username: string; avatarUrl?: string }): Promise<Room> {
  const code = generateCode();
  const roomId = uuid();

  await prisma.room.create({
    data: { id: roomId, code, hostUserId: hostUser.userId },
  });

  const room: Room = {
    id: roomId,
    code,
    hostUserId: hostUser.userId,
    players: [{
      userId: hostUser.userId,
      username: hostUser.username,
      avatarUrl: hostUser.avatarUrl,
      isReady: false,
      isHost: true,
    }],
    status: 'LOBBY',
    createdAt: new Date(),
  };

  rooms.set(roomId, room);
  return room;
}

export function getRoomByCode(code: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.code === code) return room;
  }
  return undefined;
}

export function getRoomById(id: string): Room | undefined {
  return rooms.get(id);
}

export function joinRoom(roomId: string, player: RoomPlayer): Room | undefined {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'LOBBY') return undefined;
  if (room.players.find((p) => p.userId === player.userId)) return room;
  if (room.players.length >= 7) return undefined;
  room.players.push(player);
  return room;
}

export function leaveRoom(roomId: string, userId: string): Room | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  room.players = room.players.filter((p) => p.userId !== userId);
  if (room.players.length === 0) {
    rooms.delete(roomId);
    return undefined;
  }
  if (room.hostUserId === userId) {
    room.hostUserId = room.players[0].userId;
    room.players[0].isHost = true;
  }
  return room;
}

export function selectCharacter(roomId: string, userId: string, characterId: string): Room | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  const takenBy = room.players.find((p) => p.characterId === characterId && p.userId !== userId);
  if (takenBy) return undefined; // duplicate
  const player = room.players.find((p) => p.userId === userId);
  if (!player) return undefined;
  player.characterId = characterId;
  return room;
}

export function setReady(roomId: string, userId: string, ready: boolean): Room | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  const player = room.players.find((p) => p.userId === userId);
  if (!player) return undefined;
  player.isReady = ready;
  return room;
}

export function allReady(room: Room): boolean {
  return room.players.length >= 2 && room.players.every((p) => p.isReady && p.characterId);
}

export function setRoomStatus(roomId: string, status: Room['status']): void {
  const room = rooms.get(roomId);
  if (room) room.status = status;
}

export async function finishRoom(roomId: string): Promise<void> {
  const room = rooms.get(roomId);
  if (room) {
    room.status = 'FINISHED';
    await prisma.room.update({ where: { id: roomId }, data: { status: 'FINISHED' } });
  }
}
