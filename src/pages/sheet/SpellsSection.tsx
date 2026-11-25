// Fiche, onglet Combat : carte « Sorts » (DD, attaque, concentration, emplacements, sorts prêts à lancer).
// Réglages d'incantation en mode ✏️ Modifier (MJ). Grimoire complet : SpellBookDialog.
import { useState } from 'react';
import { useSession } from '../../data/session';
import { ABILITIES, abilityShort, type Ability } from '../../lib/dnd/data';
import { fmtBonus } from '../../lib/dnd/rules';
import type { Spell, Spellcasting } from '../../lib/dnd/sheet';
import { isPactCaster, spellAbility, spellAttack, spellDC, suggestedSlots } from '../../lib/dnd/spells';
import { SpellBookDialog } from './SpellBookDialog';
import { SpellDialog } from './SpellDialog';
import type { SheetCtx } from './useSheet';

const LEVELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Le perso a-t-il quelque chose à voir côté sorts ? */
export const hasSpellcasting = (ctx: SheetCtx) =>
  ctx.gm || !!spellAbility(ctx.s) || ctx.s.spells.length > 0 || Object.values(ctx.s.spellcasting.slots).some((x) => x.max > 0);

export function SpellsSection({ ctx }: { ctx: SheetCtx }) {
  const { store } = useSession();
  const { s, c, can, gm, editing, patch, rollD20, view, fail } = ctx;
  const [book, setBook] = useState(false);
  const [cast, setCast] = useState<Spell | null>(null);
  const sc = s.spellcasting;
  const ability = spellAbility(s);
  const config = editing && gm;
  const ready = s.spells.filter((x) => x.level === 0 || x.prepared).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  const suggested = suggestedSlots(s.className, s.level);
  const setSc = (p: Partial<Spellcasting>) => patch({ spellcasting: { ...sc, ...p } });
  const setSlot = (lvl: string, v: { max: number; used: number }) => setSc({ slots: { ...sc.slots, [lvl]: v } });

  if (!hasSpellcasting(ctx)) return null;

  return (
    <section className="card stack-sm">
      <div className="row between">
        <h3 className="section-title">Sorts</h3>
        <button className="btn small" onClick={() => setBook(true)}>
          📖 {gm ? 'Grimoire' : 'Mes sorts'}
        </button>
      </div>

      {config && (
        <div className="row gap wrap">
          <select id="sc-ability" className="grow" value={sc.ability} onChange={(e) => setSc({ ability: e.target.value as Ability | '' })} aria-label="Caractéristique d’incantation">
            <option value="">Caract. selon la classe{ability && !sc.ability ? ` (${abilityShort(ability)})` : ''}</option>
            {ABILITIES.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>
          {suggested && (
            <button className="btn small" onClick={() => setSc({ slots: suggested, pact: isPactCaster(s.className) })}>
              Remplir ({s.className} {s.level})
            </button>
          )}
        </div>
      )}

      {ability && (
        <div className="spell-stats">
          <span>
            {abilityShort(ability)} · DD <strong>{spellDC(s)}</strong>
          </span>
          <button className="btn small" onClick={() => rollD20('Attaque de sort', spellAttack(s) ?? 0, 'attack')}>
            🎯 Attaque {fmtBonus(spellAttack(s) ?? 0)}
          </button>
        </div>
      )}

      {s.concentration && (
        <div className="concentration">
          <span>
            🧠 Concentration : <strong>{s.concentration}</strong>
          </span>
          {can.id && (
            <button className="btn small ghost" onClick={() => patch({ concentration: '' })}>
              Arrêter
            </button>
          )}
        </div>
      )}

      {LEVELS.map((l) => {
        const slot = sc.slots[l] ?? { max: 0, used: 0 };
        if (!config && !slot.max) return null;
        return (
          <div key={l} className="slot-row">
            <span className="slot-level">Niv. {l}</span>
            {config ? (
              <input
                className="num-input"
                type="number"
                min={0}
                max={9}
                value={slot.max}
                aria-label={`Emplacements de niveau ${l}`}
                onChange={(e) => setSlot(l, { max: Math.max(0, parseInt(e.target.value, 10) || 0), used: 0 })}
              />
            ) : (
              <div className="pips">
                {Array.from({ length: slot.max }, (_, i) => {
                  const free = i < slot.max - slot.used;
                  return (
                    <button
                      key={i}
                      className={`pip ${free ? 'on' : ''}`}
                      disabled={!can.id || (!gm && !free)}
                      onClick={() =>
                        gm
                          ? setSlot(l, { ...slot, used: Math.min(slot.max, Math.max(0, slot.used + (free ? 1 : -1))) })
                          : store.spendSlot(c.id, parseInt(l, 10)).then(view.reload).catch(fail)
                      }
                      aria-label={free ? `Dépenser un emplacement de niveau ${l}` : `Emplacement de niveau ${l} dépensé`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {config && (
        <label className="check">
          <input id="sc-pact" type="checkbox" checked={sc.pact} onChange={(e) => setSc({ pact: e.target.checked })} /> Magie de pacte (repos court)
        </label>
      )}

      {ready.length > 0 ? (
        <ul className="spells">
          {ready.map((sp) => (
            <li key={sp.id}>
              <button className="spell-row" onClick={() => setCast(sp)}>
                <span className="spell-lvl">{sp.level === 0 ? '∞' : sp.level}</span>
                <span className="grow">{sp.name}</span>
                {sp.damage && <span className="muted small">{sp.damage}</span>}
                {sp.concentration && <span className="tag">C</span>}
                <span className="cast-hint">✨</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">{s.spells.length ? 'Aucun sort préparé : ouvre « 📖 Mes sorts » pour en préparer.' : 'Aucun sort pour l’instant.'}</p>
      )}

      {book && <SpellBookDialog ctx={ctx} onClose={() => setBook(false)} />}
      {cast && <SpellDialog ctx={ctx} spell={cast} startEdit={false} onClose={() => setCast(null)} />}
    </section>
  );
}
