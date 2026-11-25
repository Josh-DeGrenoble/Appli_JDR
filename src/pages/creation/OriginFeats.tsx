// Assistant de création : don d'origine de l'historique (Doué : 3 compétences ; Initié à la magie : 2 sorts mineurs
// + 1 sort de niveau 1 de la classe indiquée) et, pour l'humain, un don d'origine en plus.
import { SKILLS } from '../../lib/dnd/data';
import { featClass, featOf, SIMPLE_ORIGIN_FEATS } from '../../lib/dnd/srd/feats';
import { SpellPicker } from '../sheet/SpellPicker';

export interface OriginFeatChoices {
  humanFeat: string;
  skills: string[];
  spells: string[];
}

interface Props {
  bgFeat: string;
  human: boolean;
  /** Compétences déjà maîtrisées (classe, historique…). */
  taken: string[];
  value: OriginFeatChoices;
  onChange: (v: OriginFeatChoices) => void;
}

/** Les choix des dons sont-ils complets ? */
export function originFeatsReady(bgFeat: string, v: OriginFeatChoices) {
  const f = featOf(bgFeat);
  return !f?.skills || v.skills.length === f.skills;
}

export function OriginFeats({ bgFeat, human, taken, value, onChange }: Props) {
  const f = featOf(bgFeat);
  return (
    <div className="stack-sm origin-feats">
      <span className="label">🎖️ Don d’origine : {bgFeat}</span>
      {f && <p className="small muted">{f.text}</p>}
      {f?.skills && (
        <div className="chips">
          <span className="muted small">{value.skills.length}/{f.skills} :</span>
          {SKILLS.filter((k) => !taken.includes(k.key)).map((k) => {
            const on = value.skills.includes(k.key);
            return (
              <button key={k.key} className={`chip ${on ? 'on' : ''}`} onClick={() => onChange({ ...value, skills: on ? value.skills.filter((x) => x !== k.key) : value.skills.length < f.skills! ? [...value.skills, k.key] : value.skills })}>
                {k.label}
              </button>
            );
          })}
        </div>
      )}
      {f?.spellsOf && (
        <SpellPicker className={featClass(bgFeat)} maxLevel={1} cantrips={2} spells={1} known={[]} picked={value.spells} onChange={(spells) => onChange({ ...value, spells })} />
      )}
      {human && (
        <label className="field">
          <span>Humain : un don d’origine en plus</span>
          <select id="wiz-human-feat" value={value.humanFeat} onChange={(e) => onChange({ ...value, humanFeat: e.target.value })} aria-label="Don de l’humain">
            <option value="">—</option>
            {SIMPLE_ORIGIN_FEATS.filter((x) => x.name !== f?.name).map((x) => (
              <option key={x.name} value={x.name}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
