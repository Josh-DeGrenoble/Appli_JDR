// MJ : effets temporaires d'un combattant (Bénédiction, Bouclier, Rage…) : liste avec rounds restants, retrait, ajout.
import { activeEffects, addEffect, EFFECT_PRESETS, removeEffect } from '../../lib/dnd/effects';
import type { Combatant } from '../../lib/dnd/combat';
import type { CombatCtx } from './useCombat';

/** Texte court d'un effet : « +5 CA · +1d4 attaques ». */
const effectLine = (e: { ac?: number; attack?: string; saves?: string; resist?: string[] }) =>
  [e.ac ? `${e.ac > 0 ? '+' : ''}${e.ac} CA` : '', e.attack ? `${e.attack.startsWith('-') ? '' : '+'}${e.attack} attaques` : '', e.saves ? `${e.saves.startsWith('-') ? '' : '+'}${e.saves} sauvegardes` : '', e.resist?.length ? `résiste ${e.resist.join(', ')}` : '']
    .filter(Boolean)
    .join(' · ');

export function EffectsEditor({ cx, x }: { cx: CombatCtx; x: Combatant }) {
  const round = Math.max(1, cx.combat.round);
  const list = activeEffects(x, round);
  return (
    <div className="stack-xs">
      <span className="label">Effets en cours</span>
      {list.length === 0 && <span className="muted small">Aucun.</span>}
      {list.map((e) => (
        <div key={e.id} className="row between effect-row">
          <span className="small">
            {e.icon} <strong>{e.name}</strong> · {e.until - round + 1} round{e.until - round > 0 ? 's' : ''}
            {e.conc && ' · concentration'}
            <span className="muted"> · {effectLine(e)}</span>
          </span>
          <button className="icon-btn" onClick={() => cx.mutate((c) => ({ combat: removeEffect(c, x.id, e.id) }))} aria-label={`Retirer ${e.name}`}>
            ✕
          </button>
        </div>
      ))}
      <div className="chips">
        {EFFECT_PRESETS.map((p) => (
          <button key={p.name} className="chip" onClick={() => cx.mutate((c) => ({ combat: addEffect(c, [x.id], p) }))} title={effectLine(p)}>
            + {p.icon} {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
