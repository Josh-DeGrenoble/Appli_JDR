// Fiche : PV, PV temporaires, CA, initiative, vitesse, perception passive, maîtrise, inspiration, jets contre la mort.
import { useState } from 'react';
import { useSession } from '../../data/session';
import { setMaxHp } from '../../data/actions';
import {
  effectiveSpeed, fmtBonus, hitDieOf, hitDiceLeft, initiative, passivePerception, profBonus, suggestedMaxHp,
} from '../../lib/dnd/rules';
import { HpDialog } from './HpDialog';
import type { SheetCtx } from './useSheet';

export function VitalsSection({ ctx }: { ctx: SheetCtx }) {
  const { store } = useSession();
  const { c, s, hp, can, editing, patch, rollD20, roll, view, fail } = ctx;
  const [hpOpen, setHpOpen] = useState(false);
  const pct = hp.max > 0 ? Math.min(100, (hp.current / hp.max) * 100) : 0;
  const suggested = suggestedMaxHp(s);

  const deathSave = async () => {
    const nat = await roll('Jet contre la mort', '1d20', true);
    if (nat === null) return;
    await store.deathSave(c.id, nat).catch(fail);
    view.reload();
  };

  const num = (label: string, value: number, onSet: (v: number) => void, step = 1) => (
    <input
      key={value}
      className="vital-input"
      type="number"
      step={step}
      defaultValue={value}
      aria-label={label}
      onBlur={(e) => {
        const v = parseFloat(e.target.value);
        if (!Number.isNaN(v) && v !== value) onSet(v);
      }}
    />
  );

  return (
    <section className="card stack-sm">
      <div className="hp-block">
        <button className="hp-main" disabled={!can.hp} onClick={() => setHpOpen(true)} aria-label="Modifier les PV">
          <span className="label">Points de vie</span>
          <span className="hp-value">
            <strong>{hp.current}</strong> / {hp.max}
            {hp.temp > 0 && <span className="hp-temp">+{hp.temp}</span>}
          </span>
          <span className={`bar bar-hp ${pct <= 25 ? 'low' : ''}`}>
            <span className="bar-fill" style={{ width: pct + '%' }} />
          </span>
        </button>
        <div className="hp-steps">
          <button className="step" disabled={!can.hp} onClick={() => store.applyHp(c.id, -1).then(view.reload).catch(fail)} aria-label="−1 PV">
            −
          </button>
          <button className="step" disabled={!can.hp} onClick={() => store.applyHp(c.id, 1).then(view.reload).catch(fail)} aria-label="+1 PV">
            +
          </button>
        </div>
      </div>

      {editing && can.hp && (
        <div className="row gap wrap">
          <label className="grow">
            PV max {num('PV max', hp.max, (v) => setMaxHp(store, c, v).then(view.reload).catch(fail))}
          </label>
          <button className="btn small" onClick={() => setMaxHp(store, c, suggested).then(view.reload).catch(fail)}>
            Calculer ({suggested})
          </button>
        </div>
      )}
      {editing && (
        <label className="row between">
          <span>Attaques par action (Attaque supplémentaire)</span>
          {num('Attaques par action', s.attacksPerAction, (v) => patch({ attacksPerAction: Math.max(1, Math.round(v)) }))}
        </label>
      )}

      {hp.current === 0 && hp.max > 0 && (
        <div className="death">
          <span className="label">Jets contre la mort</span>
          <div className="row between">
            <span>
              Réussites {[0, 1, 2].map((i) => <span key={i} className={`dot ok ${i < s.deathSaves.success ? 'on' : ''}`} />)}
            </span>
            <span>
              Échecs {[0, 1, 2].map((i) => <span key={i} className={`dot ko ${i < s.deathSaves.failure ? 'on' : ''}`} />)}
            </span>
          </div>
          {s.deathSaves.failure >= 3 ? (
            <p className="error">{c.name} est mort…</p>
          ) : s.deathSaves.success >= 3 ? (
            <p className="muted">Stabilisé (inconscient, 0 PV).</p>
          ) : (
            can.id && (
              <button className="btn primary" onClick={deathSave}>
                🎲 Jet contre la mort
              </button>
            )
          )}
        </div>
      )}

      <div className="vitals">
        <div className="vital">
          <span className="label">CA</span>
          {editing ? num('Classe d’armure', s.ac, (v) => patch({ ac: v })) : <strong>{s.ac}</strong>}
          {!!s.gear?.ac && <span className="muted small gear-hint">{s.gear.ac > 0 ? '+' : ''}{s.gear.ac} objets</span>}
        </div>
        {editing ? (
          <div className="vital">
            <span className="label">Init. (divers)</span>
            {num('Bonus divers d’initiative', s.initMisc, (v) => patch({ initMisc: v }))}
          </div>
        ) : (
          <button className="vital" onClick={() => rollD20('Initiative', initiative(s), 'initiative')}>
            <span className="label">Initiative</span>
            <strong>{fmtBonus(initiative(s))}</strong>
          </button>
        )}
        <div className="vital">
          <span className="label">Vitesse</span>
          {editing ? num('Vitesse en mètres', s.speed, (v) => patch({ speed: v }), 1.5) : <strong>{effectiveSpeed(s)} m</strong>}
        </div>
        <div className="vital">
          <span className="label">Perc. passive</span>
          <strong>{passivePerception(s)}</strong>
        </div>
        <div className="vital">
          <span className="label">Maîtrise</span>
          <strong>{fmtBonus(profBonus(s.level))}</strong>
        </div>
        <button className={`vital insp ${s.inspiration ? 'on' : ''}`} disabled={!can.id || (!ctx.gm && !s.inspiration)} onClick={() => patch({ inspiration: !s.inspiration })} aria-pressed={s.inspiration}>
          <span className="label">Inspiration</span>
          <strong>{s.inspiration ? '★' : '☆'}</strong>
        </button>
      </div>
      <p className="muted small">
        Dés de vie : {hitDiceLeft(s)}/{s.level} (d{hitDieOf(s)})
      </p>
      {hpOpen && <HpDialog c={c} onClose={() => setHpOpen(false)} onDone={view.reload} />}
    </section>
  );
}
