import { useState } from 'react';
import { Player, GameState } from '@shared/types/index';
import { getCharacter } from '../../data/characters';
import { socketEmit } from '../../sockets/socketClient';

interface Props {
  me: Player;
  game: GameState;
  isMyTurn: boolean;
}

export default function AbilityButton({ me, game, isMyTurn }: Props) {
  const char = getCharacter(me.characterId);
  const [showTargets, setShowTargets] = useState(false);
  const [abilityId, setAbilityId] = useState('');

  if (!char?.specialAbility) return null;

  const cd = me.cooldowns[char.specialAbility] ?? 0;
  const disabled = cd > 0 || me.abilitiesDisabled;
  const needsTarget = ['forcedTradeProposal', 'hitPlayer', 'cyberSteal', 'medicalCurse'].includes(char.specialAbility);

  const activateAbility = (id: string, targetPlayerId?: string) => {
    socketEmit.useAbility(id, targetPlayerId);
    setShowTargets(false);
  };

  const handleClick = () => {
    if (!isMyTurn) return;
    if (needsTarget) {
      setAbilityId(char.specialAbility!);
      setShowTargets(true);
    } else {
      activateAbility(char.specialAbility!);
    }
  };

  const otherPlayers = game.players.filter((p) => p.id !== me.id && !p.isBankrupt);

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled || !isMyTurn}
        className={`w-full btn ${disabled || !isMyTurn ? 'btn-secondary opacity-50' : 'btn-primary'} text-sm`}
      >
        <span className="mr-1">{char.emoji}</span>
        {char.specialAbility?.replace(/([A-Z])/g, ' $1').trim()}
        {cd > 0 && <span className="ml-2 badge bg-red-500/20 text-red-300">CD {cd}</span>}
        {me.abilitiesDisabled && <span className="ml-2 badge bg-orange-500/20 text-orange-300">Bloqueada</span>}
      </button>

      {showTargets && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-game-card border border-white/20 rounded-xl p-3 z-10 shadow-xl">
          <p className="text-xs text-white/60 mb-2">Elige objetivo:</p>
          {otherPlayers.map((p) => (
            <button
              key={p.id}
              onClick={() => activateAbility(abilityId, p.id)}
              className="w-full text-left py-2 px-3 hover:bg-white/10 rounded-lg text-sm transition-colors mb-1"
            >
              {getCharacter(p.characterId)?.emoji} {p.username} (${p.money})
            </button>
          ))}
          <button onClick={() => setShowTargets(false)} className="w-full text-xs text-white/40 mt-1">Cancelar</button>
        </div>
      )}

    </div>
  );
}
