// Choix d'un don (montée de niveau à la place de l'amélioration, ou don en plus de l'humain) : liste avec résumé,
// caractéristique +1 à choisir, compétences pour Doué.
import { ABILITIES, SKILLS } from '../../lib/dnd/data';
import type { FeatChoice } from '../../lib/dnd/feats';
import { featOf, type Feat } from '../../lib/dnd/srd/feats';
import type { DndSheet } from '../../lib/dnd/sheet';

interface Props {
  feats: Feat[];
  value: FeatChoice | null;
  onChange: (c: FeatChoice | null) => void;
  /** Fiche actuelle (dons déjà pris, compétences maîtrisées, caractéristiques). */
  sheet?: Pick<DndSheet, 'feats' | 'skills' | 'abilities'>;
}

export function FeatPicker({ feats, value, onChange, sheet }: Props) {
  const taken = new Set((sheet?.feats ?? []).map((f) => featOf(f)?.name));
  const f = value ? featOf(value.name) : undefined;
  return (
    <div className="stack-xs feat-picker">
      <select id="feat-name" value={value?.name ?? ''} onChange={(e) => onChange(e.target.value ? { name: e.target.value } : null)} aria-label="Don">
        <option value="">Choisir un don…</option>
        {feats.filter((x) => !taken.has(x.name)).map((x) => (
          <option key={x.name} value={x.name}>
            {x.name} ({x.kind})
          </option>
        ))}
      </select>
      {f && <p className="small muted">{f.text}</p>}
      {f?.plus && (
        <div className="chips">
          {f.plus.map((a) => {
            const ab = ABILITIES.find((x) => x.key === a)!;
            return (
              <button key={a} type="button" className={`chip ${value?.ability === a ? 'on' : ''}`} disabled={(sheet?.abilities[a] ?? 0) >= 20} onClick={() => onChange({ ...value!, ability: a })} aria-label={`Don : +1 ${ab.label}`}>
                +1 {ab.short}
                {sheet ? ` (${sheet.abilities[a]})` : ''}
              </button>
            );
          })}
        </div>
      )}
      {f?.skills && (
        <div className="chips">
          <span className="muted small">{(value?.skills ?? []).length}/{f.skills} compétences :</span>
          {SKILLS.filter((k) => !sheet?.skills[k.key]).map((k) => {
            const on = (value?.skills ?? []).includes(k.key);
            return (
              <button key={k.key} type="button" className={`chip ${on ? 'on' : ''}`}
                onClick={() => onChange({ ...value!, skills: on ? value!.skills!.filter((x) => x !== k.key) : (value?.skills ?? []).length < f.skills! ? [...(value?.skills ?? []), k.key] : value?.skills })}>
                {k.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Le choix est-il complet (caractéristique et compétences choisies si le don en demande) ? */
export function featChoiceReady(c: FeatChoice | null) {
  const f = c ? featOf(c.name) : undefined;
  return !!f && (!f.plus || !!c!.ability) && (!f.skills || (c!.skills ?? []).length === f.skills);
}
