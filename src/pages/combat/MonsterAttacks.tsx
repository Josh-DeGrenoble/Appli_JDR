// MJ : attaques d'un monstre (secrètes) : attaque (bonus contre la CA) ou effet à sauvegarde (souffle : DD, carac,
// moitié si réussite, zone d'effet). Jouées depuis l'onglet Carte pendant le tour du monstre.
import { useState } from 'react';
import type { MonsterAttack } from '../../lib/dnd/combat';
import { ABILITIES, type Ability } from '../../lib/dnd/data';
import { fmtBonus } from '../../lib/dnd/rules';
import { fmtRange } from '../../lib/dnd/grid';
import { fmtShape } from '../../lib/dnd/area';
import { uid } from '../../lib/ids';
import { RangeSelect } from '../../components/RangeSelect';
import { ShapeSelect } from '../../components/ShapeSelect';

const BLANK = { name: '', bonus: 4, damage: '1d6+2', range: 1.5, kind: 'attack' as 'attack' | 'save', dc: 12, ability: 'dex' as Ability, half: true, shape: undefined as MonsterAttack['shape'] };

/** Résumé : « +4 · 1d6+2 · contact » ou « DD 13 DEX · 7d6 · cône 4,5 m ». */
export const attackLine = (a: MonsterAttack) =>
  a.kind === 'save'
    ? `DD ${a.dc ?? 12} ${(a.ability ?? 'dex').toUpperCase()} · ${a.damage}${a.half === false ? '' : ' (½)'} · ${a.shape ? fmtShape(a.shape) : fmtRange(a.range)}`
    : `${fmtBonus(a.bonus)} · ${a.damage} · ${fmtRange(a.range)}`;

export function MonsterAttacks({ attacks, multi, onChange }: { attacks: MonsterAttack[]; multi: number; onChange: (a: MonsterAttack[], multi: number) => void }) {
  const [n, setN] = useState(BLANK);
  const add = () => {
    const base = { id: uid(), name: n.name.trim(), damage: n.damage.trim() || '1', range: n.range, type: '' };
    const a: MonsterAttack =
      n.kind === 'save' ? { ...base, bonus: 0, kind: 'save', dc: n.dc, ability: n.ability, half: n.half, ...(n.shape ? { shape: n.shape } : {}) } : { ...base, bonus: n.bonus };
    onChange([...attacks, a], multi);
    setN({ ...n, name: '' });
  };

  return (
    <div className="stack-xs">
      <span className="label">Attaques (jouées depuis l’onglet Carte pendant son tour)</span>
      {attacks.map((a) => (
        <div key={a.id} className="row between small">
          <span>
            <strong>{a.name}</strong> {attackLine(a)}
          </span>
          <button className="icon-btn" onClick={() => onChange(attacks.filter((x) => x.id !== a.id), multi)} aria-label={`Supprimer ${a.name}`}>
            ✕
          </button>
        </div>
      ))}
      <div className="segmented small">
        <button className={n.kind === 'attack' ? 'on' : ''} onClick={() => setN({ ...n, kind: 'attack' })}>
          Attaque
        </button>
        <button className={n.kind === 'save' ? 'on' : ''} onClick={() => setN({ ...n, kind: 'save' })}>
          Sauvegarde (souffle…)
        </button>
      </div>
      <div className="row gap">
        <input className="grow" placeholder={n.kind === 'save' ? 'Ex. Souffle de feu' : 'Nouvelle attaque'} value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} aria-label="Nom" />
        {n.kind === 'attack' ? (
          <input className="num-input" type="number" value={n.bonus} onChange={(e) => setN({ ...n, bonus: parseInt(e.target.value, 10) || 0 })} aria-label="Bonus" />
        ) : (
          <input className="num-input" type="number" value={n.dc} onChange={(e) => setN({ ...n, dc: parseInt(e.target.value, 10) || 10 })} aria-label="DD" />
        )}
      </div>
      {n.kind === 'save' && (
        <div className="row gap">
          <select value={n.ability} onChange={(e) => setN({ ...n, ability: e.target.value as Ability })} aria-label="Sauvegarde">
            {ABILITIES.map((a) => (
              <option key={a.key} value={a.key}>
                JS {a.short}
              </option>
            ))}
          </select>
          <label className="check grow">
            <input type="checkbox" checked={n.half} onChange={(e) => setN({ ...n, half: e.target.checked })} />
            Moitié si réussi
          </label>
        </div>
      )}
      {n.kind === 'save' && <ShapeSelect id="matk-shape" value={n.shape} onChange={(shape) => setN({ ...n, shape })} />}
      <div className="row gap">
        <input className="grow" value={n.damage} onChange={(e) => setN({ ...n, damage: e.target.value })} aria-label="Dégâts" />
        <RangeSelect id="matk-range" value={n.range} allowSelf={n.kind === 'save'} onChange={(v) => setN({ ...n, range: v })} />
        <button className="btn small" disabled={!n.name.trim()} onClick={add} aria-label="Ajouter l’attaque">
          +
        </button>
      </div>
      <label className="row between small">
        <span>Attaques par action</span>
        <input className="num-input" type="number" min={1} defaultValue={multi} onBlur={(e) => onChange(attacks, Math.max(1, parseInt(e.target.value, 10) || 1))} />
      </label>
    </div>
  );
}
