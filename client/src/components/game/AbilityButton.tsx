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

  // Arthur's trade is handled by TradeModal in GamePage
  if (!char?.specialAbility || char.specialAbility === 'forcedTradeProposal') return null;

  const cd = me.cooldowns[char.specialAbility] ?? 0;
  const disabled = cd > 0 || me.abilitiesDisabled;
  const needsTarget = ['hitPlayer', 'cyberSteal', 'medicalCurse'].includes(char.specialAbility);

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

  const abilityLabels: Record<string, string> = {
    dogAvoidPayment: '🐕 Escudo del Perro',
    hitPlayer: '🤙 No Bro (skip turno)',
    cyberSteal: '💻 Hackear',
    medicalCurse: '💊 Maldición Médica',
    comebackDice: '🏈 Comeback Dice',
    richStart: '👑 Soy Dios',
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled || !isMyTurn}
        className={`w-full btn text-sm py-2 ${disabled || !isMyTurn ? 'btn-secondary opacity-50' : 'btn-primary'}`}
      >
        {abilityLabels[char.specialAbility] ?? char.specialAbility}
        {cd > 0 && <span className="ml-2 text-xs opacity-70">CD {cd}</span>}
        {me.abilitiesDisabled && <span className="ml-2 text-xs opacity-70">Bloqueada</span>}
      </button>

      {showTargets && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#1a1035] border border-white/20 rounded-xl p-3 z-20 shadow-2xl">
          <p className="text-xs text-white/60 mb-2">Elige objetivo:</p>
          {otherPlayers.map((p) => (
            <button
              key={p.id}
              onClick={() => activateAbility(abilityId, p.id)}
              className="w-full text-left py-2 px-3 hover:bg-white/10 rounded-lg text-sm transition-colors mb-1 flex items-center gap-2"
            >
              <span>{getCharacter(p.characterId)?.emoji}</span>
              <span>{p.username}</span>
              <span className="ml-auto text-white/40">${p.money}</span>
            </button>
          ))}
          <button onClick={() => setShowTargets(false)} className="w-full text-xs text-white/30 mt-1 py-1">Cancelar</button>
        </div>
      )}
    </div>
  );
}
