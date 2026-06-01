import { useState } from 'react';
import { GameState, Player } from '@shared/types/index';
import { getCharacter } from '../../data/characters';
import { GROUP_COLORS } from '../../data/board';
import { socketEmit } from '../../sockets/socketClient';

interface Props {
  game: GameState;
  me: Player;
  isMyTurn: boolean;
}

export default function TradeModal({ game, me, isMyTurn }: Props) {
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [wantPropertyId, setWantPropertyId] = useState<number | null>(null);
  const [offerMoney, setOfferMoney] = useState(0);

  const cd = me.cooldowns['forcedTradeProposal'] ?? 0;
  const canPropose = cd === 0 && !me.abilitiesDisabled && isMyTurn;

  const target = game.players.find((p) => p.id === targetId && !p.isBankrupt);
  const targetProperties = target
    ? game.properties.filter((p) => p.ownerId === target.id && !p.mortgaged)
    : [];

  const propose = () => {
    if (!targetId || wantPropertyId === null) return;
    socketEmit.proposeTrade(targetId, wantPropertyId, offerMoney);
    setOpen(false);
    setTargetId('');
    setWantPropertyId(null);
    setOfferMoney(0);
  };

  const otherPlayers = game.players.filter((p) => p.id !== me.id && !p.isBankrupt);

  return (
    <>
      {/* Botón inline en panel de acciones */}
      <button
        onClick={() => setOpen(true)}
        disabled={!canPropose}
        className={`w-full btn text-sm py-2 ${!canPropose ? 'btn-secondary opacity-50' : 'btn-primary'}`}
      >
        🤝 Intercambio Forzado {cd > 0 && <span className="ml-1 text-xs opacity-70">CD {cd}</span>}
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/75 flex items-end z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg mx-auto rounded-t-2xl overflow-hidden"
            style={{ background: '#120d2a', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div>
                <h2 className="font-bold text-base">🤝 Intercambio Forzado — Arthur</h2>
                <p className="text-white/40 text-xs">Si rechaza, paga $30 al banco</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white text-xl px-2">✕</button>
            </div>

            <div className="overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(85vh - 60px)' }}>
              {/* Paso 1: elegir objetivo */}
              <div>
                <p className="text-xs text-white/50 font-semibold uppercase tracking-widest mb-2">1. Elige el objetivo</p>
                <div className="grid grid-cols-2 gap-2">
                  {otherPlayers.map((p) => {
                    const c = getCharacter(p.characterId);
                    return (
                      <button
                        key={p.id}
                        onClick={() => { setTargetId(p.id); setWantPropertyId(null); }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all text-left ${
                          targetId === p.id
                            ? 'border-amber-400 bg-amber-400/10'
                            : 'border-white/10 bg-white/5 hover:border-white/25'
                        }`}
                      >
                        <span className="text-xl">{c?.emoji}</span>
                        <div>
                          <div className="font-semibold text-xs">{p.username}</div>
                          <div className="text-game-gold text-xs font-bold">${p.money}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paso 2: elegir propiedad */}
              {target && (
                <div>
                  <p className="text-xs text-white/50 font-semibold uppercase tracking-widest mb-2">
                    2. Qué quieres de {target.username}
                  </p>
                  {targetProperties.length === 0 ? (
                    <div className="text-center py-4 text-white/30 text-sm bg-white/5 rounded-xl">
                      {target.username} no tiene propiedades disponibles
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {targetProperties.map((prop) => {
                        const color = GROUP_COLORS[prop.group] ?? '#6b7280';
                        return (
                          <button
                            key={prop.id}
                            onClick={() => setWantPropertyId(prop.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                              wantPropertyId === prop.id
                                ? 'border-green-400 bg-green-400/10'
                                : 'border-white/10 bg-white/5 hover:border-white/25'
                            }`}
                          >
                            <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ background: color }} />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate">{prop.name}</div>
                              <div className="text-xs text-white/40">Renta ${prop.baseRent} · Valor ${prop.price}</div>
                            </div>
                            {wantPropertyId === prop.id && <span className="text-green-400">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Paso 3: dinero a ofrecer */}
              {target && wantPropertyId !== null && (
                <div>
                  <p className="text-xs text-white/50 font-semibold uppercase tracking-widest mb-2">3. Dinero que ofreces (opcional)</p>
                  <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                    <button
                      onClick={() => setOfferMoney(Math.max(0, offerMoney - 50))}
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 font-bold text-lg flex items-center justify-center"
                    >−</button>
                    <span className="flex-1 text-center text-game-gold font-bold text-2xl">${offerMoney}</span>
                    <button
                      onClick={() => setOfferMoney(Math.min(me.money, offerMoney + 50))}
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 font-bold text-lg flex items-center justify-center"
                    >+</button>
                  </div>
                  <p className="text-xs text-white/30 mt-1 text-center">Tienes ${me.money}</p>
                </div>
              )}

              {/* Botón proponer */}
              {target && (
                <button
                  onClick={propose}
                  disabled={wantPropertyId === null}
                  className="w-full btn-primary py-3 font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {wantPropertyId === null ? 'Selecciona una propiedad' : `⚡ Proponer Intercambio a ${target.username}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
