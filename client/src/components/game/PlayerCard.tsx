import { Player } from '@shared/types/index';
import { getCharacter } from '../../data/characters';
import clsx from 'clsx';

interface Props {
  player: Player;
  isCurrentTurn: boolean;
  isMe: boolean;
  compact?: boolean;
}

export default function PlayerCard({ player, isCurrentTurn, isMe, compact }: Props) {
  const char = getCharacter(player.characterId);

  if (compact) {
    return (
      <div
        className={clsx(
          'flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all',
          player.isBankrupt ? 'opacity-40 border-white/5' : 'border-white/10',
          isCurrentTurn && !player.isBankrupt && 'border-game-gold bg-game-gold/10 animate-pulse-glow',
          isMe && !isCurrentTurn && 'border-primary-500/40',
        )}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm border border-white/20"
          style={{ background: char?.color ?? '#7c3aed' }}
        >
          {char?.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">{player.username} {isMe ? '(yo)' : ''}</div>
          <div className="text-game-gold text-xs font-bold">${player.money}</div>
        </div>
        {isCurrentTurn && !player.isBankrupt && (
          <span className="text-game-gold text-xs">▶</span>
        )}
        {player.isBankrupt && <span className="text-red-400 text-xs">💀</span>}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'card transition-all',
        player.isBankrupt ? 'opacity-40' : '',
        isCurrentTurn && !player.isBankrupt && 'ring-2 ring-game-gold',
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 border-white/20"
          style={{ background: char?.color ?? '#7c3aed' }}
        >
          {char?.emoji}
        </div>
        <div>
          <div className="font-bold">{player.username} {isMe ? '(yo)' : ''}</div>
          <div className="text-xs text-white/50 italic">"{char?.phrase}"</div>
        </div>
        {isCurrentTurn && <span className="ml-auto text-game-gold text-lg">▶</span>}
        {player.isBankrupt && <span className="ml-auto text-red-400">💀 Eliminado</span>}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-game-gold">${player.money}</div>
          <div className="text-xs text-white/40">{player.properties.length} propiedades</div>
        </div>
        <div className="text-right text-xs text-white/40">
          {player.skipNextTurn && <div className="text-yellow-400">⏭ Pierde turno</div>}
          {player.jailTurns > 0 && <div className="text-red-400">🔒 Castigado {player.jailTurns}T</div>}
          {player.rentShield && <div className="text-green-400">🛡 Escudo renta</div>}
          {player.abilitiesDisabled && <div className="text-orange-400">⚡ Sin habilidades</div>}
        </div>
      </div>

      {/* Cooldowns */}
      {char?.specialAbility && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-xs text-white/40">Habilidad:</span>
          {(player.cooldowns[char.specialAbility] ?? 0) > 0 ? (
            <span className="badge bg-red-500/20 text-red-400">CD {player.cooldowns[char.specialAbility]}T</span>
          ) : (
            <span className="badge bg-green-500/20 text-green-400">Lista ✓</span>
          )}
        </div>
      )}
    </div>
  );
}
