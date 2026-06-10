import { PrismaClient } from '@prisma/client';
import { GameState } from '../../../shared/types/index';

const prisma = new PrismaClient();

// Evita guardar la misma partida dos veces (varios eventos pueden disparar el final)
const persistedGames = new Set<string>();

/** Guarda en PostgreSQL una partida terminada: Game, GameResults y UserStats. */
export async function persistFinishedGame(game: GameState): Promise<void> {
  if (game.status !== 'finished' || persistedGames.has(game.id)) return;
  persistedGames.add(game.id);

  try {
    await prisma.room.update({
      where: { id: game.roomId },
      data: { status: 'FINISHED' },
    });

    const dbGame = await prisma.game.create({
      data: {
        roomId: game.roomId,
        finishedAt: new Date(),
        winnerId: game.winner?.userId,
        status: 'FINISHED',
      },
    });

    // Ranking: ganador primero, luego por dinero, bancarrotas al final
    const ranked = [...game.players].sort((a, b) => {
      if (a.isBankrupt !== b.isBankrupt) return a.isBankrupt ? 1 : -1;
      return b.money - a.money;
    });

    await prisma.gameResult.createMany({
      data: ranked.map((p, i) => ({
        gameId: dbGame.id,
        userId: p.userId,
        characterId: p.characterId,
        finalMoney: p.money,
        isWinner: p.id === game.winner?.id,
        isBankrupt: p.isBankrupt,
        position: i + 1,
      })),
    });

    for (const p of game.players) {
      await prisma.userStats
        .update({
          where: { userId: p.userId },
          data: {
            gamesPlayed: { increment: 1 },
            gamesWon: { increment: p.id === game.winner?.id ? 1 : 0 },
            bankruptcies: { increment: p.isBankrupt ? 1 : 0 },
            propertiesBought: { increment: p.properties.length },
            favoriteCharacter: p.characterId,
          },
        })
        .catch(() => { /* usuario sin stats: ignorar */ });
    }

    console.log(`[Persistence] Partida ${game.id} guardada. Ganador: ${game.winner?.username}`);
  } catch (err) {
    console.error('[Persistence] Error guardando partida:', err);
  }
}
