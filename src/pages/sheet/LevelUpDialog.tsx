// Montée de niveau (accordée par le MJ, choisie par le joueur) : PV (moyenne ou dé), sous-classe au niveau 3,
// nouveautés de la classe, amélioration de caractéristiques, expertise, nouveaux sorts (bibliothèque de sa classe). Calculs dans lib/dnd/levelup.ts.
import { FeatPicker, featChoiceReady } from './FeatPicker';
import { featHpPerLevel, type FeatChoice } from '../../lib/dnd/feats';
import { LEVELUP_FEATS } from '../../lib/dnd/srd/feats';
import { useMemo, useState } from 'react';
import { useSession } from '../../data/session';
import { useRoller } from '../../data/useRoller';
import { Modal } from '../../components/ui';
import { logEvent } from '../../data/actions';
import { ABILITIES, SKILLS, type Ability } from '../../lib/dnd/data';
import { applyLevelUp, levelUpPlan } from '../../lib/dnd/levelup';
import { fmtBonus } from '../../lib/dnd/rules';
import { SPELL_LIBRARY, librarySpellToSheet } from '../../lib/dnd/srd/library';
import { SpellPicker } from './SpellPicker';
import { findClass } from '../../lib/dnd/data';
import { subclassesOf } from '../../lib/dnd/srd/subclasses';
import { uid } from '../../lib/ids';
import type { SheetCtx } from './useSheet';

export function LevelUpDialog({ ctx, onClose }: { ctx: SheetCtx; onClose: () => void }) {
  const { store } = useSession();
  const roller = useRoller(ctx.view);
  const { s, c } = ctx;
  const cls = findClass(s.className)?.name ?? '';
  const [subclass, setSubclass] = useState('');
  const plan = useMemo(() => levelUpPlan(s, subclass), [s, subclass]);
  const [hpRoll, setHpRoll] = useState<number | null>(null);
  const [asi, setAsi] = useState<Partial<Record<Ability, number>>>({});
  const [expertise, setExpertise] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'asi' | 'feat'>('asi');
  const [feat, setFeat] = useState<FeatChoice | null>(null);
  const robust = featHpPerLevel(s);

  const pickedSpells = SPELL_LIBRARY.filter((x) => picked.includes(x.name));
  const asiTotal = Object.values(asi).reduce((n, v) => n + (v ?? 0), 0);
  const hpGain = hpRoll === null ? plan.average : Math.max(1, hpRoll + plan.flat);
  const proficient = SKILLS.filter((k) => s.skills[k.key] === 1);

  const rollHp = async () => {
    const r = await roller(`1d${plan.hitDie}`, { label: `Dé de vie (niveau ${plan.to})`, author: c.name });
    if (r) setHpRoll(r.total);
  };
  const addAsi = (a: Ability) => {
    if (asiTotal >= 2 && !asi[a]) return;
    if (asiTotal >= 2) return setAsi({ ...asi, [a]: 0 });
    if (s.abilities[a] + (asi[a] ?? 0) >= 20) return;
    setAsi({ ...asi, [a]: (asi[a] ?? 0) + 1 });
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const spells = pickedSpells.map((x) => librarySpellToSheet(x, uid()));
      const { patch, hpGain: gain } = applyLevelUp(s, { hpGain, asi: mode === 'asi' ? asi : {}, expertise, spells, subclass, ...(plan.asi && mode === 'feat' && feat ? { feat } : {}) });
      await store.levelUp(c.id, patch, gain);
      logEvent(store, c.campaign_id, `⬆️ ${c.name} passe niveau ${plan.to} (+${gain} PV)`, c.name);
      ctx.view.reload();
      onClose();
    } catch (e) {
      ctx.fail(e as Error);
      setBusy(false);
    }
  };

  return (
    <Modal title={`Niveau ${plan.to} : ${s.className || 'perso'}`} onClose={onClose}>
      <section className="stack-xs">
        <span className="label">❤️ Points de vie</span>
        <div className="row gap">
          <button className={`choice grow ${hpRoll === null ? 'on' : ''}`} onClick={() => setHpRoll(null)}>
            <strong>Moyenne : +{plan.average}</strong>
            <span className="muted small">d{plan.hitDie} → {plan.hitDie / 2 + 1}, {fmtBonus(plan.flat)}</span>
          </button>
          <button className={`choice grow ${hpRoll !== null ? 'on' : ''}`} onClick={rollHp}>
            <strong>{hpRoll === null ? `🎲 Lancer 1d${plan.hitDie}` : `Dé : ${hpRoll} → +${hpGain}`}</strong>
            <span className="muted small">au moins 1 PV{robust ? ` · +${robust} (Robuste)` : ''}</span>
          </button>
        </div>
      </section>

      {plan.chooseSubclass && (
        <section className="stack-xs">
          <span className="label">🌟 Sous-classe</span>
          <div className="stack-xs">
            {subclassesOf(cls).map((x) => (
              <button key={x.name} className={`choice ${subclass === x.name ? 'on' : ''}`} onClick={() => setSubclass(x.name)}>
                <strong>{x.name}</strong>
                <span className="muted small">{x.features ? x.features[3].join(', ') : 'Aptitudes : voir le manuel'}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="stack-xs">
        <span className="label">✨ Nouveautés</span>
        <ul className="levelup-list small">
          {plan.features.map((f) => <li key={f}>{f}</li>)}
          {plan.attacksPerAction > s.attacksPerAction && <li>{plan.attacksPerAction} attaques par action</li>}
          {plan.prepared[1] > plan.prepared[0] && <li>Sorts préparés : {plan.prepared[0]} → {plan.prepared[1]}</li>}
          {plan.maxSpellLevel > 0 && <li>Emplacements : {Object.entries(plan.slots ?? {}).map(([l, v]) => `niv. ${l} ×${v.max}`).join(', ')}</li>}
          <li>Bonus de maîtrise, DD et attaque des sorts recalculés tout seuls.</li>
        </ul>
      </section>

      {plan.asi && (
        <div className="segmented small" aria-label="Amélioration ou don">
          <button className={mode === 'asi' ? 'on' : ''} onClick={() => setMode('asi')}>
            💪 Amélioration
          </button>
          <button className={mode === 'feat' ? 'on' : ''} onClick={() => setMode('feat')}>
            🎖️ Un don
          </button>
        </div>
      )}
      {plan.asi && mode === 'feat' && <FeatPicker feats={LEVELUP_FEATS} value={feat} onChange={setFeat} sheet={s} />}
      {plan.asi && mode === 'asi' && (
        <section className="stack-xs">
          <span className="label">💪 Amélioration de caractéristiques ({asiTotal}/2)</span>
          <div className="chips">
            {ABILITIES.map((a) => (
              <button key={a.key} className={`chip ${asi[a.key] ? 'on' : ''}`} onClick={() => addAsi(a.key)} aria-label={`Améliorer ${a.label}`}>
                {a.short} {s.abilities[a.key] + (asi[a.key] ?? 0)}{asi[a.key] ? ` (+${asi[a.key]})` : ''}
              </button>
            ))}
          </div>
          <p className="muted small">+2 sur une caractéristique (touche-la deux fois) ou +1 sur deux. Tu préfères un don ? Vois-le avec le MJ.</p>
        </section>
      )}

      {plan.expertise > 0 && (
        <section className="stack-xs">
          <span className="label">🎯 Expertise : {expertise.length}/{plan.expertise} (maîtrise doublée)</span>
          <div className="chips">
            {proficient.map((k) => (
              <button key={k.key} className={`chip ${expertise.includes(k.key) ? 'on' : ''}`}
                onClick={() => setExpertise((e) => (e.includes(k.key) ? e.filter((x) => x !== k.key) : e.length < plan.expertise ? [...e, k.key] : e))}>
                {k.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {plan.newSpells > 0 && (
        <SpellPicker className={cls} maxLevel={plan.maxSpellLevel} cantrips={plan.newCantrips} spells={plan.newSpells - plan.newCantrips}
          known={s.spells.map((x) => x.name)} picked={picked} onChange={setPicked} />
      )}

      <button className="btn primary big" disabled={busy || (plan.asi && mode === 'asi' && asiTotal !== 2 && asiTotal !== 0) || (plan.asi && mode === 'feat' && !featChoiceReady(feat)) || (plan.chooseSubclass && !subclass)} onClick={confirm}>
        ⬆️ Passer niveau {plan.to}
      </button>
    </Modal>
  );
}
