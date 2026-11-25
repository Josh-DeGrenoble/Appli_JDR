// Grimoire d'un perso : tous les sorts possibles (ajoutés par le MJ). Le joueur coche ceux qu'il prépare ;
// le MJ ajoute (bibliothèque ou sort maison), modifie, et fixe le nombre maximum de sorts préparés.
import { useState } from 'react';
import { Modal } from '../../components/ui';
import { useSession } from '../../data/session';
import { preparedCount } from '../../lib/dnd/permissions';
import type { Spell } from '../../lib/dnd/sheet';
import { spellLevelLabel } from '../../lib/dnd/spells';
import { SpellDialog, blankSpell } from './SpellDialog';
import { SpellLibraryDialog } from './SpellLibraryDialog';
import type { SheetCtx } from './useSheet';

export function SpellBookDialog({ ctx, onClose }: { ctx: SheetCtx; onClose: () => void }) {
  const { store } = useSession();
  const { s, c, can, gm, patch, view, fail } = ctx;
  const [open, setOpen] = useState<{ spell: Spell; edit: boolean } | null>(null);
  const [library, setLibrary] = useState(false);
  const levels = [...new Set(s.spells.map((x) => x.level))].sort((a, b) => a - b);
  const max = s.spellcasting.preparedMax;
  const count = preparedCount(s);
  const full = max > 0 && count >= max;

  const toggle = (sp: Spell) =>
    gm
      ? ctx.saveIn('spells', { ...sp, prepared: !sp.prepared })
      : store.setPrepared(c.id, sp.id, !sp.prepared).then(view.reload).catch(fail);

  return (
    <Modal title={`Sorts de ${c.name}`} onClose={onClose}>
      <div className="row between">
        <span>
          Préparés : <strong>{count}</strong>
          {max > 0 ? ` / ${max}` : ''}
        </span>
        {gm && (
          <label className="row gap small">
            Max
            <input
              id="prepared-max"
              className="num-input"
              type="number"
              min={0}
              value={max}
              aria-label="Nombre maximum de sorts préparés (0 = libre)"
              onChange={(e) => patch({ spellcasting: { ...s.spellcasting, preparedMax: Math.max(0, parseInt(e.target.value, 10) || 0) } })}
            />
          </label>
        )}
      </div>
      {gm && (
        <div className="row gap">
          <button className="btn small primary grow" onClick={() => setLibrary(true)}>
            📚 Bibliothèque
          </button>
          <button className="btn small grow" onClick={() => setOpen({ spell: blankSpell(), edit: true })}>
            + Sort maison
          </button>
        </div>
      )}
      {s.spells.length === 0 && <p className="muted small">{gm ? 'Ajoute les sorts que ce perso peut connaître.' : 'Le MJ n’a pas encore ajouté de sorts.'}</p>}
      {!gm && s.spells.length > 0 && <p className="muted small">Coche les sorts que tu prépares : ce sont ceux que tu pourras lancer.</p>}
      {levels.map((lvl) => (
        <div key={lvl} className="stack-xs">
          <span className="label">{spellLevelLabel(lvl)}</span>
          <ul className="spells">
            {s.spells
              .filter((x) => x.level === lvl)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((sp) => (
                <li key={sp.id} className="book-row">
                  {lvl > 0 ? (
                    <input
                      type="checkbox"
                      checked={sp.prepared}
                      disabled={!can.id || (!sp.prepared && full && !gm)}
                      onChange={() => toggle(sp)}
                      aria-label={`Préparer ${sp.name}`}
                    />
                  ) : (
                    <span className="book-always" title="Sort mineur : toujours disponible">∞</span>
                  )}
                  <button className="spell-row" onClick={() => setOpen({ spell: sp, edit: false })}>
                    <span className="grow">{sp.name}</span>
                    {sp.concentration && <span className="tag">C</span>}
                    {sp.ritual && <span className="tag">R</span>}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
      {open && <SpellDialog ctx={ctx} spell={open.spell} startEdit={open.edit} onClose={() => setOpen(null)} />}
      {library && <SpellLibraryDialog ctx={ctx} onClose={() => setLibrary(false)} />}
    </Modal>
  );
}
