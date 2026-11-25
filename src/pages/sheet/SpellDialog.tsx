// Fenêtre d'un sort : lancer (emplacement, concentration, dégâts) ; le MJ peut aussi le créer ou le modifier.
import { useState } from 'react';
import { ConfirmButton, Modal } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useSession } from '../../data/session';
import { logEvent } from '../../data/actions';
import type { Spell } from '../../lib/dnd/sheet';
import { spellLevelLabel } from '../../lib/dnd/spells';
import { uid } from '../../lib/ids';
import { RangeSelect } from '../../components/RangeSelect';
import { ShapeSelect } from '../../components/ShapeSelect';
import { ABILITIES } from '../../lib/dnd/data';
import { atSlot } from '../../lib/dnd/combatActions';
import type { SheetCtx } from './useSheet';

/** Sort vide pour la création par le MJ. */
export const blankSpell = (): Spell => ({ id: uid(), name: '', level: 1, prepared: false, ritual: false, concentration: false, damage: '', notes: '' });

export function SpellDialog({ ctx, spell, startEdit, onClose }: { ctx: SheetCtx; spell: Spell; startEdit: boolean; onClose: () => void }) {
  const toast = useToast();
  const { store } = useSession();
  const { s, c, can, gm, patch, roll, saveIn, removeIn, view, fail } = ctx;
  const [edit, setEdit] = useState(startEdit);
  const [sp, setSp] = useState<Spell>(spell);
  const isNew = !s.spells.some((x) => x.id === spell.id);
  const set = <K extends keyof Spell>(k: K, v: Spell[K]) => setSp((x) => ({ ...x, [k]: v }));
  const freeLevels = Object.entries(s.spellcasting.slots)
    .filter(([l, v]) => parseInt(l, 10) >= spell.level && v.max - v.used > 0)
    .map(([l]) => parseInt(l, 10))
    .sort((a, b) => a - b);

  /** Lance le sort : dépense un emplacement (sauf mineur/rituel), gère la concentration, lance les dégâts. */
  const cast = async (slotLevel: number | null) => {
    const p: Parameters<typeof patch>[0] = {};
    if (slotLevel) {
      try {
        await store.spendSlot(c.id, slotLevel);
      } catch (e) {
        fail(e as Error);
        return;
      }
    }
    if (spell.concentration) {
      if (s.concentration && s.concentration !== spell.name) toast(`Fin de la concentration sur ${s.concentration}`);
      p.concentration = spell.name;
    }
    if (Object.keys(p).length) patch(p);
    else view.reload();
    onClose();
    const slotTxt = slotLevel ? ` (emplacement niv. ${slotLevel})` : '';
    // Sorts sans jet de dégâts : la dépense apparaît dans l'historique (sauf en mode vrais dés)
    if (!ctx.realDice && !spell.damage) logEvent(store, c.campaign_id, `✨ ${c.name} lance ${spell.name}${slotTxt}`, c.name);
    if (spell.damage) await roll(`${spell.name}${slotLevel ? ` (niv. ${slotLevel})` : ''}`, atSlot(spell.damage, { spellLevel: spell.level, upcast: spell.upcast }, slotLevel ?? undefined));
    else toast(`✨ ${spell.name} lancé${slotLevel ? ` (emplacement niv. ${slotLevel})` : ''}`);
  };

  if (!edit)
    return (
      <Modal title={spell.name} onClose={onClose}>
        <p className="muted">
          {spellLevelLabel(spell.level)}
          {spell.concentration ? ' · concentration' : ''}
          {spell.ritual ? ' · rituel' : ''}
          {spell.damage ? ` · ${spell.damage}` : ''}
        </p>
        {spell.notes && <p className="prewrap">{spell.notes}</p>}
        {can.id && spell.level > 0 && !spell.prepared && !gm && (
          <p className="muted small">Sort non préparé : prépare-le dans « 📖 Mes sorts » pour pouvoir le lancer.</p>
        )}
        {can.id && spell.level === 0 && (
          <button className="btn primary" onClick={() => cast(null)}>
            ✨ Lancer
          </button>
        )}
        {can.id && spell.level > 0 && (spell.prepared || gm) && (
          <div className="stack-sm">
            {freeLevels.length === 0 && <p className="muted small">Plus d’emplacement disponible de niveau {spell.level} ou plus.</p>}
            <div className="chips">
              {freeLevels.map((l) => (
                <button key={l} className="btn small primary" onClick={() => cast(l)}>
                  ✨ Lancer niv. {l}
                </button>
              ))}
              {spell.ritual && (
                <button className="btn small" onClick={() => cast(null)}>
                  📜 En rituel
                </button>
              )}
            </div>
          </div>
        )}
        {gm && (
          <button className="btn ghost" onClick={() => setEdit(true)}>
            ✏️ Modifier le sort
          </button>
        )}
      </Modal>
    );

  return (
    <Modal title={isNew ? 'Nouveau sort' : 'Modifier le sort'} onClose={onClose}>
      <form
        className="stack-sm"
        onSubmit={(e) => {
          e.preventDefault();
          saveIn('spells', { ...sp, name: sp.name.trim() || 'Sort' });
          onClose();
        }}
      >
        <label className="field">
          <span>Nom</span>
          <input id="spell-name" value={sp.name} onChange={(e) => set('name', e.target.value)} placeholder="Boule de feu" autoFocus />
        </label>
        <div className="row gap">
          <label className="field">
            <span>Niveau</span>
            <select id="spell-level" value={sp.level} onChange={(e) => set('level', parseInt(e.target.value, 10))}>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? 'Mineur' : i}
                </option>
              ))}
            </select>
          </label>
          <label className="field grow">
            <span>Dés (dégâts/soins)</span>
            <input id="spell-dmg" value={sp.damage} onChange={(e) => set('damage', e.target.value)} placeholder="8d6" />
          </label>
          <label className="field">
            <span>+ / niveau</span>
            <input id="spell-upcast" className="num-input" value={sp.upcast ?? ''} onChange={(e) => set('upcast', e.target.value || undefined)} placeholder="1d6" aria-label="Dés en plus par niveau d’emplacement" />
          </label>
        </div>
        <div className="row gap wrap">
          <label className="field grow">
            <span>Effet en combat</span>
            <select id="spell-effect" value={sp.effect ?? (sp.damage ? 'attack' : 'utility')} onChange={(e) => set('effect', e.target.value as Spell['effect'])}>
              <option value="attack">Attaque de sort</option>
              <option value="save">Jet de sauvegarde</option>
              <option value="auto">Touche toujours</option>
              <option value="heal">Soin</option>
              <option value="utility">Utilitaire</option>
            </select>
          </label>
          <label className="field">
            <span>Portée</span>
            <RangeSelect id="spell-range" value={sp.range ?? 18} onChange={(v) => set('range', v)} />
          </label>
          <label className="field">
            <span>Temps</span>
            <select id="spell-cast" value={sp.cast ?? 'action'} onChange={(e) => set('cast', e.target.value as Spell['cast'])}>
              <option value="action">Action</option>
              <option value="bonus">Action bonus</option>
              <option value="reaction">Réaction</option>
            </select>
          </label>
        </div>
        {(sp.effect ?? '') === 'save' && (
          <div className="row gap">
            <label className="field grow">
              <span>Sauvegarde</span>
              <select id="spell-save" value={sp.save ?? 'dex'} onChange={(e) => set('save', e.target.value as Spell['save'])}>
                {ABILITIES.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="check">
              <input type="checkbox" checked={sp.half ?? true} onChange={(e) => set('half', e.target.checked)} /> Moitié si réussie
            </label>
          </div>
        )}
        <label className="field">
          <span>Zone d’effet sur la carte (portée « soi-même » : part du lanceur)</span>
          <ShapeSelect id="spell-shape" value={sp.shape} onChange={(v) => setSp((x) => ({ ...x, shape: v, area: v ? true : x.area }))} />
        </label>
        <div className="chips">
          <label className="check">
            <input type="checkbox" checked={!!sp.area} onChange={(e) => set('area', e.target.checked)} /> Plusieurs cibles
          </label>
          <label className="check">
            <input type="checkbox" checked={sp.prepared} onChange={(e) => set('prepared', e.target.checked)} /> Préparé
          </label>
          <label className="check">
            <input type="checkbox" checked={sp.concentration} onChange={(e) => set('concentration', e.target.checked)} /> Concentration
          </label>
          <label className="check">
            <input type="checkbox" checked={sp.ritual} onChange={(e) => set('ritual', e.target.checked)} /> Rituel
          </label>
        </div>
        <label className="field">
          <span>Notes (portée, durée, effet, sauvegarde)</span>
          <textarea id="spell-notes" rows={4} value={sp.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>
        <button className="btn primary">Enregistrer</button>
        {!isNew && (
          <ConfirmButton
            onConfirm={() => {
              removeIn('spells', sp.id);
              onClose();
            }}
          >
            Supprimer le sort
          </ConfirmButton>
        )}
      </form>
    </Modal>
  );
}
