import { Property, Player } from '@shared/types/index';
import { GROUP_COLORS } from '../../data/board';
import { socketEmit } from '../../sockets/socketClient';

interface Props {
  properties: Property[];
  player: Player;
  isMyTurn: boolean;
}

export default function PropertyList({ properties, player, isMyTurn }: Props) {
  const myProps = properties.filter((p) => p.ownerId === player.id);

  if (myProps.length === 0) {
    return <p className="text-white/30 text-xs text-center py-3">Sin propiedades</p>;
  }

  return (
    <div className="space-y-1 max-h-40 overflow-y-auto">
      {myProps.map((p) => {
        const color = GROUP_COLORS[p.group] ?? '#6b7280';
        return (
          <div
            key={p.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10"
          >
            <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: color }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{p.name}</div>
              <div className="text-[10px] text-white/40">
                Renta: ${p.mortgaged ? '—' : p.baseRent} {p.mortgaged && '(hipotecada)'}
              </div>
            </div>
            {!p.mortgaged && p.canBeMortgaged && isMyTurn && (
              <button
                onClick={() => socketEmit.mortgageProperty(p.id)}
                className="text-[10px] text-orange-400 hover:text-orange-300 flex-shrink-0"
              >
                Hipotecar
              </button>
            )}
            {p.mortgaged && <span className="text-[10px] text-red-400">🏦</span>}
          </div>
        );
      })}
    </div>
  );
}
