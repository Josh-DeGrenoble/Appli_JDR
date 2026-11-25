// Assistant de création, étape Caractéristiques : tableau standard, achat de points ou 4d6, puis bonus d'historique.
import { ABILITIES, type Ability } from '../../lib/dnd/data';
import { BASE_SCORES, POINT_BUDGET, POINT_COST, STANDARD_ARRAY, bonusValid, finalScores, pointsSpent, roll4d6, suggestStandard, type Method, type Scores } from '../../lib/dnd/creation';
import { abilityMod } from '../../lib/dnd/rules';
import { fmtBonus } from '../../lib/dnd/rules';
import { BACKGROUND_INFO } from '../../lib/dnd/srd/creation';

interface Props {
  className: string;
  background: string;
  method: Method;
  base: Scores;
  pool: number[];
  bonus: Partial<Scores>;
  onChange: (p: { method?: Method; base?: Scores; pool?: number[]; bonus?: Partial<Scores> }) => void;
}

const METHODS: [Method, string, string][] = [
  ['standard', 'Tableau standard', '15, 14, 13, 12, 10, 8 à répartir (conseillé)'],
  ['points', 'Achat de points', '27 points, valeurs de 8 à 15'],
  ['dice', 'Dés', '4d6 six fois, on garde les 3 meilleurs'],
];

export function AbilitiesStep({ className, background, method, base, pool, bonus, onChange }: Props) {
  const bg = BACKGROUND_INFO.find((b) => b.name === background);
  const spent = pointsSpent(base);
  const final = finalScores(base, bonus);
  const ok = bonusValid(background, bonus);

  const pickMethod = (m: Method) => {
    if (m === 'standard') onChange({ method: m, base: suggestStandard(className), pool: STANDARD_ARRAY });
    if (m === 'points') onChange({ method: m, base: { ...BASE_SCORES }, pool: [] });
    if (m === 'dice') {
      const rolls = Array.from({ length: 6 }, () => roll4d6()).sort((a, b) => b - a);
      const order = Object.entries(suggestStandard(className)).sort((a, b) => b[1] - a[1]).map(([k]) => k as Ability);
      const next = { ...BASE_SCORES };
      order.forEach((a, i) => (next[a] = rolls[i]));
      onChange({ method: m, base: next, pool: rolls });
    }
  };

  /** Tableau standard / dés : échange la valeur de deux caractéristiques. */
  const swap = (a: Ability, value: number) => {
    const other = ABILITIES.find((x) => base[x.key] === value && x.key !== a)?.key;
    onChange({ base: { ...base, [a]: value, ...(other ? { [other]: base[a] } : {}) } });
  };
  const setPoint = (a: Ability, d: number) => {
    const v = base[a] + d;
    if (v < 8 || v > 15) return;
    const next = { ...base, [a]: v };
    if (pointsSpent(next) <= POINT_BUDGET) onChange({ base: next });
  };
  const toggleBonus = (a: Ability, v: 1 | 2) => onChange({ bonus: bonus[a] === v ? { ...bonus, [a]: 0 } : { ...(v === 2 ? Object.fromEntries(Object.entries(bonus).filter(([, x]) => x !== 2)) : bonus), [a]: v } });

  return (
    <div className="stack-sm">
      <div className="stack-xs">
        {METHODS.map(([m, l, hint]) => (
          <button key={m} className={`choice ${method === m ? 'on' : ''}`} onClick={() => pickMethod(m)}>
            <strong>{l}</strong>
            <span className="muted small">{hint}</span>
          </button>
        ))}
      </div>
      {method === 'points' && <p className={`small ${spent > POINT_BUDGET ? 'error' : 'muted'}`}>Points dépensés : {spent} / {POINT_BUDGET}</p>}
      {method === 'dice' && <p className="muted small">Tirage : {pool.join(', ')} (touche une valeur pour l’échanger).</p>}
      <ul className="wiz-abilities">
        {ABILITIES.map((a) => (
          <li key={a.key} className="row between">
            <span className="wiz-ab-name">{a.label}</span>
            {method === 'points' ? (
              <span className="row gap">
                <button className="icon-btn" onClick={() => setPoint(a.key, -1)} aria-label={`Baisser ${a.label}`}>
                  −
                </button>
                <strong>{base[a.key]}</strong>
                <button className="icon-btn" onClick={() => setPoint(a.key, 1)} disabled={POINT_COST[base[a.key] + 1] === undefined} aria-label={`Monter ${a.label}`}>
                  +
                </button>
              </span>
            ) : (
              <select value={base[a.key]} onChange={(e) => swap(a.key, parseInt(e.target.value, 10))} aria-label={`Valeur de ${a.label}`}>
                {[...new Set(method === 'dice' ? pool : STANDARD_ARRAY)].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            )}
            <span className="wiz-bonus">
              {bg?.abilities.includes(a.key) && (
                <>
                  <button className={`chip ${bonus[a.key] === 2 ? 'on' : ''}`} onClick={() => toggleBonus(a.key, 2)} aria-label={`+2 en ${a.label}`}>
                    +2
                  </button>
                  <button className={`chip ${bonus[a.key] === 1 ? 'on' : ''}`} onClick={() => toggleBonus(a.key, 1)} aria-label={`+1 en ${a.label}`}>
                    +1
                  </button>
                </>
              )}
            </span>
            <strong className="wiz-final">
              {final[a.key]} <span className="muted small">({fmtBonus(abilityMod(final[a.key]))})</span>
            </strong>
          </li>
        ))}
      </ul>
      <p className={`small ${ok ? 'muted' : 'error'}`}>
        Historique {background} : +2 et +1, ou +1 / +1 / +1, sur {bg?.abilities.map((x) => ABILITIES.find((y) => y.key === x)?.short).join(', ')}.
      </p>
    </div>
  );
}
