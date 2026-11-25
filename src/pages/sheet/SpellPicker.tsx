// Choix de sorts dans la bibliothèque de sa classe (création et montée de niveau) : sorts mineurs et sorts de
// niveau 1+ comptés séparément, jusqu'au niveau de sort accessible.
import { useState } from 'react';
import { SPELL_LIBRARY, searchSpells } from '../../lib/dnd/srd/library';

interface Props {
  className: string;
  maxLevel: number;
  /** Nombre de sorts mineurs et de sorts de niveau 1+ à choisir. */
  cantrips: number;
  spells: number;
  /** Noms déjà connus (exclus). */
  known: string[];
  picked: string[];
  onChange: (names: string[]) => void;
}

/** Noms choisis → nombre de sorts mineurs parmi eux. */
export const countCantrips = (names: string[]) => SPELL_LIBRARY.filter((x) => names.includes(x.name) && x.level === 0).length;

export function SpellPicker({ className, maxLevel, cantrips, spells, known, picked, onChange }: Props) {
  const [q, setQ] = useState('');
  const knownSet = new Set(known.map((n) => n.toLowerCase()));
  const list = searchSpells(q, null, className).filter((x) => x.level <= maxLevel && !knownSet.has(x.name.toLowerCase()));
  const c = countCantrips(picked);
  const s = picked.length - c;
  const can = (x: { level: number; name: string }) => picked.includes(x.name) || (x.level === 0 ? c < cantrips : s < spells);

  return (
    <div className="stack-xs">
      <span className="label">
        📖 Sorts mineurs {c}/{cantrips} · Sorts {s}/{spells}
      </span>
      <input placeholder="Rechercher un sort…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un sort" />
      <ul className="inv lib-items">
        {list.slice(0, 50).map((x) => (
          <li key={x.name} className="inv-row">
            <span className="list-main">
              <strong className="ellipsis">{x.name}</strong>
              <span className="muted small">
                {x.level === 0 ? 'mineur' : `niveau ${x.level}`}
                {x.concentration ? ' · concentration' : ''}
                {x.damage ? ` · ${x.damage}` : ''}
              </span>
            </span>
            <button
              className={`btn small ${picked.includes(x.name) ? 'primary' : ''}`}
              disabled={!can(x)}
              onClick={() => onChange(picked.includes(x.name) ? picked.filter((n) => n !== x.name) : [...picked, x.name])}
              aria-label={`Choisir ${x.name}`}
            >
              {picked.includes(x.name) ? '✓' : '+'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
