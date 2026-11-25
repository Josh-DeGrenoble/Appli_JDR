// Fiche : attaques (arme ou sort). Un tap pour le jet d'attaque, un pour les dégâts, un pour le critique.
import { useState } from 'react';
import { ConfirmButton, Modal } from '../../components/ui';
import { ABILITIES } from '../../lib/dnd/data';
import { attackBonus, attackSummary, damageFormula, newAttack } from '../../lib/dnd/actions';
import type { Attack } from '../../lib/dnd/sheet';
import { fmtBonus } from '../../lib/dnd/rules';
import { uid } from '../../lib/ids';
import { RangeSelect } from '../../components/RangeSelect';
import type { SheetCtx } from './useSheet';

export function AttacksSection({ ctx }: { ctx: SheetCtx }) {
  const { s, can, rollD20, roll } = ctx;
  const [edit, setEdit] = useState<Attack | null>(null);

  return (
    <section className="card stack-sm">
      <div className="row between">
        <h3 className="section-title">Attaques</h3>
        {can.stats && (
          <button className="btn small ghost" onClick={() => setEdit({ ...newAttack(uid()) })}>
            + Attaque
          </button>
        )}
      </div>
      {s.attacks.length === 0 && <p className="muted small">Ajoute tes armes et sorts d’attaque : jet et dégâts en un tap.</p>}
      <ul className="attacks">
        {s.attacks.map((a) => (
          <li key={a.id} className="attack">
            <button className="attack-name" onClick={() => can.stats && setEdit(a)} disabled={!can.stats}>
              <strong>{a.name || 'Sans nom'}</strong>
              <span className="muted small">{attackSummary(s, a)}</span>
            </button>
            <div className="attack-btns">
              <button className="btn small" onClick={() => rollD20(`Attaque : ${a.name}`, attackBonus(s, a), 'attack')} aria-label={`Attaque ${a.name}`}>
                🎯 {fmtBonus(attackBonus(s, a))}
              </button>
              <button className="btn small" onClick={() => roll(`Dégâts : ${a.name}`, damageFormula(s, a))} aria-label={`Dégâts ${a.name}`}>
                💥
              </button>
              <button className="btn small" onClick={() => roll(`Critique : ${a.name}`, damageFormula(s, a, true))} aria-label={`Dégâts critiques ${a.name}`}>
                ✴️
              </button>
            </div>
          </li>
        ))}
      </ul>
      {edit && <AttackDialog ctx={ctx} attack={edit} onClose={() => setEdit(null)} />}
    </section>
  );
}

function AttackDialog({ ctx, attack, onClose }: { ctx: SheetCtx; attack: Attack; onClose: () => void }) {
  const [a, setA] = useState<Attack>(attack);
  const isNew = !ctx.s.attacks.some((x) => x.id === attack.id);
  const set = <K extends keyof Attack>(k: K, v: Attack[K]) => setA((x) => ({ ...x, [k]: v }));
  const int = (v: string) => parseInt(v, 10) || 0;

  return (
    <Modal title={isNew ? 'Nouvelle attaque' : a.name || 'Attaque'} onClose={onClose}>
      <form
        className="stack-sm"
        onSubmit={(e) => {
          e.preventDefault();
          ctx.saveIn('attacks', { ...a, name: a.name.trim() || 'Attaque' });
          onClose();
        }}
      >
        <label className="field">
          <span>Nom</span>
          <input id="atk-name" value={a.name} onChange={(e) => set('name', e.target.value)} placeholder="Épée longue, Trait de feu…" autoFocus />
        </label>
        <div className="row gap">
          <label className="field grow">
            <span>Caractéristique</span>
            <select id="atk-ability" value={a.ability} onChange={(e) => set('ability', e.target.value as Attack['ability'])}>
              {ABILITIES.map((ab) => (
                <option key={ab.key} value={ab.key}>
                  {ab.short}
                </option>
              ))}
              <option value="spell">Incantation</option>
            </select>
          </label>
          <label className="field">
            <span>Bonus divers</span>
            <input id="atk-bonus" className="num-input" type="number" value={a.bonus} onChange={(e) => set('bonus', int(e.target.value))} />
          </label>
        </div>
        <label className="check">
          <input id="atk-prof" type="checkbox" checked={a.proficient} onChange={(e) => set('proficient', e.target.checked)} /> Maîtrisée (ajoute le bonus de maîtrise)
        </label>
        <div className="row gap">
          <label className="field grow">
            <span>Dés de dégâts</span>
            <input id="atk-dmg" value={a.damage} onChange={(e) => set('damage', e.target.value)} placeholder="1d8" />
          </label>
          <label className="field">
            <span>+ fixe</span>
            <input id="atk-dmg-bonus" className="num-input" type="number" value={a.damageBonus} onChange={(e) => set('damageBonus', int(e.target.value))} />
          </label>
        </div>
        <label className="check">
          <input id="atk-addmod" type="checkbox" checked={a.addMod} onChange={(e) => set('addMod', e.target.checked)} /> Ajouter le modificateur aux dégâts
        </label>
        <div className="row gap">
          <label className="field grow">
            <span>Type de dégâts</span>
            <input id="atk-type" value={a.damageType} onChange={(e) => set('damageType', e.target.value)} placeholder="tranchant, feu…" />
          </label>
          <label className="field">
            <span>Portée</span>
            <RangeSelect id="atk-range" value={a.range ?? 1.5} allowSelf={false} onChange={(v) => set('range', v)} />
          </label>
        </div>
        <label className="field">
          <span>Notes (portée, propriétés)</span>
          <input id="atk-notes" value={a.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Polyvalente (1d10), portée 1,5 m" />
        </label>
        <p className="muted small">Résultat : {attackSummary(ctx.s, a)}</p>
        <button className="btn primary">Enregistrer</button>
        {!isNew && (
          <ConfirmButton
            onConfirm={() => {
              ctx.removeIn('attacks', a.id);
              onClose();
            }}
          >
            Supprimer l’attaque
          </ConfirmButton>
        )}
      </form>
    </Modal>
  );
}
