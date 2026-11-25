// Bibliothèque de sorts (MJ) : recherche par nom, niveau et classe, ajout en un tap sur la fiche du perso.
import { useMemo, useState } from 'react';
import { Modal } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { CLASSES, findClass } from '../../lib/dnd/data';
import { SRD_ATTRIBUTION, librarySpellToSheet, searchSpells, type LibrarySpell } from '../../lib/dnd/srd/library';
import { uid } from '../../lib/ids';
import type { Spell } from '../../lib/dnd/sheet';
import type { SheetCtx } from './useSheet';

const LEVELS: (number | null)[] = [null, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function SpellLibraryDialog({ ctx, onClose }: { ctx: SheetCtx; onClose: () => void }) {
  const toast = useToast();
  const { s, patch } = ctx;
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<number | null>(null);
  const [cls, setCls] = useState(findClass(s.className)?.name ?? '');
  const [open, setOpen] = useState<string | null>(null);
  const [added, setAdded] = useState<Spell[]>([]);
  const results = useMemo(() => searchSpells(query, level, cls), [query, level, cls]);
  const owned = new Set([...s.spells, ...added].map((x) => x.name.toLowerCase()));

  /** Ajoute un sort ; garde en mémoire les ajouts récents pour ne rien perdre si on en ajoute plusieurs d'affilée. */
  const add = (sp: LibrarySpell) => {
    const spell = librarySpellToSheet(sp, uid());
    const known = new Set(s.spells.map((x) => x.id));
    const next = [...s.spells, ...added.filter((x) => !known.has(x.id)), spell];
    patch({ spells: next });
    setAdded((a) => [...a, spell]);
    toast(`📖 ${sp.name} ajouté à ${ctx.c.name}`);
  };

  return (
    <Modal title="Bibliothèque de sorts" onClose={onClose}>
      <input id="lib-search" placeholder="Rechercher un sort…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      <div className="row gap">
        <select id="lib-class" className="grow" value={cls} onChange={(e) => setCls(e.target.value)} aria-label="Classe">
          <option value="">Toutes les classes</option>
          {CLASSES.filter((c) => c.caster).map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
        <select
          id="lib-level"
          className="lib-level"
          value={level === null ? '' : level}
          onChange={(e) => setLevel(e.target.value === '' ? null : parseInt(e.target.value, 10))}
          aria-label="Niveau"
        >
          {LEVELS.map((l) => (
            <option key={String(l)} value={l === null ? '' : l}>
              {l === null ? 'Tous niveaux' : l === 0 ? 'Mineurs' : `Niveau ${l}`}
            </option>
          ))}
        </select>
      </div>
      <p className="muted small">{results.length} sort(s)</p>
      <ul className="spells library">
        {results.map((sp) => {
          const has = owned.has(sp.name.toLowerCase());
          return (
            <li key={sp.name}>
              <div className="lib-row">
                <button className="lib-main" onClick={() => setOpen(open === sp.name ? null : sp.name)} aria-expanded={open === sp.name}>
                  <span className="grow">
                    <strong>{sp.name}</strong>{' '}
                    <span className="muted small">
                      {sp.level === 0 ? 'mineur' : `niv. ${sp.level}`}
                      {sp.damage ? ` · ${sp.damage}` : ''}
                    </span>
                  </span>
                  {sp.concentration && <span className="tag">C</span>}
                  {sp.ritual && <span className="tag">R</span>}
                </button>
                <button className="btn small" disabled={has} onClick={() => add(sp)} aria-label={`Ajouter ${sp.name}`}>
                  {has ? '✓' : '+'}
                </button>
              </div>
              {open === sp.name && (
                <p className="lib-notes small">
                  {sp.notes}
                  <br />
                  <span className="muted">{sp.classes.join(', ')}</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="muted small">{SRD_ATTRIBUTION}</p>
    </Modal>
  );
}
