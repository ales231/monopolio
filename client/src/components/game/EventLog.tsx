import { GameEvent } from '@shared/types/index';

interface Props {
  events: GameEvent[];
}

const EVENT_STYLES: Record<string, { icon: string; color: string }> = {
  move:           { icon: '👟', color: 'text-white/70' },
  property_bought:{ icon: '🏠', color: 'text-green-300' },
  rent_paid:      { icon: '💸', color: 'text-red-300' },
  card_drawn:     { icon: '🃏', color: 'text-purple-300' },
  bankrupt:       { icon: '💀', color: 'text-red-400 font-bold' },
  winner:         { icon: '🏆', color: 'text-game-gold font-bold' },
  go_to_jail:     { icon: '🔒', color: 'text-orange-300' },
  jail:           { icon: '🔒', color: 'text-orange-300' },
  skip_turn:      { icon: '⏭', color: 'text-yellow-300' },
  passed_go:      { icon: '🚀', color: 'text-green-300' },
  injury:         { icon: '🩹', color: 'text-red-300' },
  ability_used:   { icon: '⚡', color: 'text-purple-300' },
  collision:      { icon: '💥', color: 'text-orange-300' },
  mortgaged:      { icon: '🏦', color: 'text-yellow-300' },
  camila_claimed: { icon: '✨', color: 'text-pink-300 font-bold' },
  dehivid_push:   { icon: '👊', color: 'text-cyan-300' },
  tax_shield:     { icon: '🛡', color: 'text-green-300' },
  rent_shield:    { icon: '🛡', color: 'text-green-300' },
  hack_fail:      { icon: '❌', color: 'text-red-300' },
  luis_no_move:   { icon: '🛑', color: 'text-orange-300' },
  tax:            { icon: '💸', color: 'text-red-300' },
  card_pay:       { icon: '💸', color: 'text-red-300' },
  passed_go_arthur: { icon: '🤝', color: 'text-amber-300' },
  trade:          { icon: '🔄', color: 'text-blue-300' },
  mateo_party:    { icon: '🎉', color: 'text-pink-300' },
};

export default function EventLog({ events }: Props) {
  if (events.length === 0) {
    return <p className="text-white/30 text-xs text-center pt-4">El juego comenzará pronto...</p>;
  }

  return (
    <div className="space-y-1 overflow-y-auto h-full">
      {events.map((ev) => {
        const style = EVENT_STYLES[ev.type] ?? { icon: '▸', color: 'text-white/60' };
        return (
          <div
            key={ev.id}
            className="flex gap-2 items-start py-1 px-2 rounded-lg bg-white/5 hover:bg-white/8 transition-colors"
          >
            <span className="text-base flex-shrink-0 leading-tight mt-0.5">{style.icon}</span>
            <span className={`text-xs leading-snug ${style.color}`}>{ev.message}</span>
          </div>
        );
      })}
    </div>
  );
}
