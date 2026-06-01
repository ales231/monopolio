import { GameEvent } from '@shared/types/index';

interface Props {
  events: GameEvent[];
}

const EVENT_ICONS: Record<string, string> = {
  move: '👟',
  property_bought: '🏠',
  rent_paid: '💸',
  card_drawn: '🃏',
  bankrupt: '💀',
  winner: '🏆',
  go_to_jail: '🔒',
  jail: '🔒',
  skip_turn: '⏭',
  passed_go: '🚀',
  injury: '🩹',
  ability_used: '⚡',
  collision: '💥',
  mortgaged: '🏦',
  camila_claimed: '✨',
  dehivid_push: '👊',
  tax_shield: '🛡',
  rent_shield: '🛡',
  hack_fail: '❌',
  luis_no_move: '🛑',
};

export default function EventLog({ events }: Props) {
  return (
    <div className="h-48 overflow-y-auto space-y-1.5 pr-1">
      {events.length === 0 && (
        <p className="text-white/30 text-xs text-center py-4">El juego comenzará pronto...</p>
      )}
      {events.map((ev) => (
        <div key={ev.id} className="flex gap-2 text-xs animate-slide-in">
          <span className="flex-shrink-0 w-5">{EVENT_ICONS[ev.type] ?? '▸'}</span>
          <span className="text-white/70 leading-tight">{ev.message}</span>
        </div>
      ))}
    </div>
  );
}
