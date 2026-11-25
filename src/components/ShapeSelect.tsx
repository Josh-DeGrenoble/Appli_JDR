// Choix d'une zone d'effet (aucune, sphère, cube, cône, ligne) et de sa taille en mètres.
import type { AreaShape } from '../lib/dnd/combat';

const KINDS: [AreaShape['kind'] | '', string][] = [
  ['', 'Pas de zone'],
  ['sphere', 'Sphère (rayon)'],
  ['cube', 'Cube (côté)'],
  ['cone', 'Cône (longueur)'],
  ['line', 'Ligne (longueur)'],
];
const SIZES = [1.5, 3, 4.5, 6, 9, 12, 18, 30];

/** Zone d'effet : la portée 0 (« soi-même ») fait partir cône, ligne et cube du lanceur. */
export function ShapeSelect({ id, value, onChange }: { id: string; value?: AreaShape; onChange: (v: AreaShape | undefined) => void }) {
  const sizes = value && !SIZES.includes(value.size) ? [...SIZES, value.size].sort((a, b) => a - b) : SIZES;
  return (
    <div className="row gap">
      <select id={id} className="grow" value={value?.kind ?? ''} aria-label="Zone d’effet" onChange={(e) => onChange(e.target.value ? { kind: e.target.value as AreaShape['kind'], size: value?.size ?? 4.5 } : undefined)}>
        {KINDS.map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
      {value && (
        <select value={value.size} aria-label="Taille de la zone" onChange={(e) => onChange({ ...value, size: parseFloat(e.target.value) })}>
          {sizes.map((s) => (
            <option key={s} value={s}>
              {String(s).replace('.', ',')} m
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
