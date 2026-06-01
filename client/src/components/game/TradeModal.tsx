import { useState } from 'react';
import { GameState, Player, Property } from '@shared/types/index';
import { getCharacter } from '../../data/characters';
import { GROUP_COLORS } from '../../data/board';
import { socketEmit } from '../../sockets/socketClient';

interface Props {
  game: GameState;
  me: Player;
}

export default function TradeModal({ game, me }: Props) {
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [wantPropertyId, setWantPropertyId] = useState<number | null>(null);
  const [offerMoney, setOfferMoney] = useState(0);

  const cd = me.cooldowns['forcedTradeProposal'] ?? 0;
  const disabled = cd > 0 || me.abilitiesDisabled;

  const target = game.players.find(p => p.id === targetId && !p.isBankrupt);
  const targetProperties = target
    ? game.properties.filter(p => p.ownerId === target.id && !p.mortgaged)
    : [];

  const propose = () => {
    if (!targetId || wantPropertyId === null) return;
    socketEmit.proposeTrade(targetId, wantPropertyId, offerMoney);
    setOpen(false);
    setWantPropertyId(null);
    setOfferMoney(0);
  };

  if (!open) {
    return (
      <div className="absolute bottom-0 right-0 p-2" style={{ bottom: 'calc(46vh + 8px)' }}>
        <button
          onClick={() => setOpen(true)}
          disabled={disabled}
          className={`btn text-xs px-3 py-1.5 ${disabled ? 'btn-secondary opacity-40' : 'btn-primary'}`}
        >
          🤝 Trade {cd > 0 && `(CD ${cd})`}
        </button>
      </div>
    );
  }

  const otherPlayers = game.players.filter(p => p.id !== me.id && !p.isBankrupt);

  return (
    <div className="absolute inset-0 bg-black/80 flex items-end z-50" onClick={() => setOpen(false)}>
      <div
        className="w-full bg-game-card border-t-2 border-primary-500 rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-bold text-lg mb-1 text-game-gold">🤝 Intercambio Forzado</h2>
        <p className="text-white/50 text-xs mb-4">Arthur elige un jugador y qué propiedad quiere. Puede ofrecer dinero.</p>

        {/* Elegir jugador */}
        <p className="text-xs text-white/60 font-semibold mb-2 uppercase tracking-wide">1. Elige el objetivo</p>
        <div className="flex gap-2 mb-4 flex-wrap">
          {otherPlayers.map(p => {
            const c = getCharacter(p.characterId);
            return (
              <button
                key={p.id}
                onClick={() => { setTargetId(p.id); setWantPropertyId(null); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm transition-all ${
                  targetId === p.id
                    ? 'border-primary-500 bg-primary-500/20'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                <span style={{ color: c?.color }}>{c?.emoji}</span>
                <div className="text-left">
                  <div className="font-semibold">{p.username}</div>
                  <div className="text-xs text-white/40">${p.money}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Propiedades del target */}
        {target && (
          <>
            <p className="text-xs text-white/60 font-semibold mb-2 uppercase tracking-wide">
              2. Qué quieres de {target.username}
            </p>
            {targetProperties.length === 0 ? (
              <p className="text-white/30 text-xs mb-4">No tiene propiedades disponibles.</p>
            ) : (
              <div className="flex flex-col gap-1.5 mb-4 max-h-40 overflow-y-auto">
                {targetProperties.map(prop => {
                  const color = GROUP_COLORS[prop.group] ?? '#6b7280';
                  return (
                    <button
                      key={prop.id}
                      onClick={() => setWantPropertyId(prop.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm text-left transition-all ${
                        wantPropertyId === prop.id
                          ? 'border-green-500 bg-green-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/25'
                      }`}
                    >
                      <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: color }} />
                      <div>
                        <div className="font-semibold">{prop.name}</div>
                        <div className="text-xs text-white/40">Precio: ${prop.price} · Renta: ${prop.baseRent}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Oferta de dinero */}
            <p className="text-xs text-white/60 font-semibold mb-2 uppercase tracking-wide">3. Tu oferta en dinero (opcional)</p>
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setOfferMoney(Math.max(0, offerMoney - 50))} className="btn-secondary px-3 py-1 text-lg">−</button>
              <span className="text-game-gold font-bold text-xl flex-1 text-center">${offerMoney}</span>
              <button onClick={() => setOfferMoney(Math.min(me.money, offerMoney + 50))} className="btn-secondary px-3 py-1 text-lg">+</button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={propose}
                disabled={wantPropertyId === null}
                className="btn-primary flex-1 py-3 font-bold disabled:opacity-40"
              >
                Proponer Intercambio ⚡
              </button>
              <button onClick={() => setOpen(false)} className="btn-secondary px-4 py-3">
                Cancelar
              </button>
            </div>
          </>
        )}

        {!target && (
          <button onClick={() => setOpen(false)} className="btn-secondary w-full py-2 mt-2">Cancelar</button>
        )}
      </div>
    </div>
  );
}
