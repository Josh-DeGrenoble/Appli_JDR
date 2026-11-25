// Résistances / immunités / vulnérabilités aux types de dégâts : le MJ touche un type pour passer de « rien » à
// « résistance » (½), « immunité » (0) puis « vulnérabilité » (×2). Lecture seule pour les joueurs.
import { DAMAGE_TYPES, cycleDefense, type Defenses } from '../lib/dnd/damage';

const MARK = { resist: '½', immune: '🚫', vuln: '×2' } as const;

/** État d'un type de dégâts dans les défenses. */
const stateOf = (d: Defenses | undefined, t: string) => (d?.resist?.includes(t) ? 'resist' : d?.immune?.includes(t) ? 'immune' : d?.vuln?.includes(t) ? 'vuln' : null);

/** Résumé : « Résiste : feu, froid · Immunisé : poison ». */
export function defensesLine(d: Defenses | undefined) {
  const parts = [
    d?.resist?.length ? `Résiste : ${d.resist.join(', ')}` : '',
    d?.immune?.length ? `Immunisé : ${d.immune.join(', ')}` : '',
    d?.vuln?.length ? `Vulnérable : ${d.vuln.join(', ')}` : '',
  ];
  return parts.filter(Boolean).join(' · ');
}

export function DefensesEditor({ value, onChange, readOnly }: { value: Defenses | undefined; onChange?: (d: Defenses) => void; readOnly?: boolean }) {
  if (readOnly) {
    const line = defensesLine(value);
    return line ? <p className="small muted">🛡️ {line}</p> : null;
  }
  return (
    <div className="stack-xs">
      <span className="label">Défenses (touche : ½ résistance → 🚫 immunité → ×2 vulnérabilité)</span>
      <div className="chips defenses">
        {DAMAGE_TYPES.map((t) => {
          const st = stateOf(value, t);
          return (
            <button key={t} className={`chip ${st ? `on def-${st}` : ''}`} onClick={() => onChange?.(cycleDefense(value, t))} aria-label={`Défense ${t}`}>
              {st ? `${MARK[st]} ` : ''}
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}
