// Sac : objets portés par emplacement (armure, tête, cape, bottes…), ce que l'équipement change sur la fiche, et
// boutons Équiper / Harmoniser. Équiper un objet retire celui qui occupait déjà la place (2 anneaux au plus).
import { useSession } from '../../data/session';
import type { CampaignView } from '../../data/useCampaign';
import { useToast } from '../../components/Toast';
import type { Character, Item } from '../../lib/types';
import { abilityShort, type Ability } from '../../lib/dnd/data';
import { describeEffects, effectsOf, GEAR_ATTACK } from '../../lib/dnd/gear';
import { normalizeSheet } from '../../lib/dnd/sheet';
import { SLOTS, isTwoHanded, slotConflicts, slotInfo, slotOf } from '../../lib/dnd/slots';

/** Petite étiquette d'emplacement (« 🥾 Pieds ») à côté du nom d'un objet. */
export function SlotTag({ name }: { name: string }) {
  const s = slotOf(name);
  if (isTwoHanded(name)) return <span className="slot-tag">🤲 Deux mains</span>;
  return s ? <span className="slot-tag">{slotInfo(s).icon} {slotInfo(s).label}</span> : null;
}

/** Ce que l'équipement porté change sur la fiche, et les emplacements occupés. */
export function WornPanel({ view, c }: { view: CampaignView; c: Character }) {
  const s = normalizeSheet(c.sheet);
  const worn = view.data!.items.filter((i) => i.character_id === c.id && i.equipped);
  const g = s.gear;
  const changes: string[] = [];
  if (g?.ac) changes.push(`CA ${s.ac - g.ac} → ${s.ac}`);
  for (const [k, d] of Object.entries(g?.abilities ?? {})) if (d) changes.push(`${abilityShort(k as Ability)} ${s.abilities[k as Ability] - d} → ${s.abilities[k as Ability]}`);
  if (g?.speed) changes.push(`vitesse +${g.speed} m`);
  if (g?.saves) changes.push(`sauvegardes +${g.saves}`);
  const weapons = s.attacks.filter((a) => a.id.startsWith(GEAR_ATTACK)).map((a) => a.name);
  if (weapons.length) changes.push(`attaques : ${weapons.join(', ')}`);
  const manual = worn.filter((i) => !effectsOf(i.name));

  return (
    <section className="card stack-xs worn-panel">
      <h3 className="section-title">⚔️ Équipement porté</h3>
      <div className="slot-grid">
        {SLOTS.map((sl) => {
          const here = worn.filter((i) => slotOf(i.name) === sl.key);
          return (
            <div key={sl.key} className={`slot ${here.length ? 'on' : ''}`} title={sl.label}>
              <span aria-hidden>{sl.icon}</span>
              <span className="small">{here.length ? here.map((i) => i.name).join(', ') : <span className="muted">{sl.label}</span>}</span>
            </div>
          );
        })}
      </div>
      <p className="small">
        <strong>Sur ta fiche : </strong>
        {changes.length ? changes.join(' · ') : <span className="muted">rien pour l’instant (équipe une armure, une arme ou un objet magique).</span>}
      </p>
      {manual.length > 0 && <p className="muted small">Sans effet calculé (à appliquer avec le MJ) : {manual.map((i) => i.name).join(', ')}.</p>}
    </section>
  );
}

/** Boutons Équiper / Harmoniser (3 objets harmonisés maximum par personnage). */
export function EquipToggles({ view, item }: { view: CampaignView; item: Item }) {
  const { store } = useSession();
  const toast = useToast();
  const mine = view.data!.items.filter((i) => i.character_id === item.character_id);
  const attunedCount = mine.filter((i) => i.attuned).length;
  const live = mine.find((i) => i.id === item.id) ?? item;
  const fail = (e: Error) => toast(e.message, 'error');
  const toggle = (patch: { equipped?: boolean; attuned?: boolean }) => store.updateItem(item.id, patch).then(view.reload).catch(fail);

  const equip = async () => {
    if (live.equipped) return toggle({ equipped: false });
    try {
      const out = slotConflicts(live.name, mine.filter((i) => i.equipped && i.id !== live.id));
      for (const o of out) await store.updateItem(o.id, { equipped: false });
      await store.updateItem(live.id, { equipped: true });
      const fx = describeEffects(effectsOf(live.name));
      toast(`⚔️ ${live.name} équipé${out.length ? ` (à la place de ${out.map((o) => o.name).join(', ')})` : ''} : ${fx || 'pas d’effet calculé, voir la description'}`);
      view.reload();
    } catch (e) {
      fail(e as Error);
    }
  };

  return (
    <div className="stack-xs">
      {slotOf(live.name) && <p className="small muted">Emplacement : {slotInfo(slotOf(live.name)!).icon} {slotInfo(slotOf(live.name)!).label}</p>}
      {isTwoHanded(live.name) && <p className="small muted">🤲 Arme à deux mains : pas de bouclier en même temps.</p>}
      <div className="row gap">
        <button type="button" className={`btn grow ${live.equipped ? 'primary' : ''}`} onClick={equip} aria-pressed={!!live.equipped}>
          ⚔️ {live.equipped ? 'Équipé' : 'Équiper'}
        </button>
        <button
          type="button"
          className={`btn grow ${live.attuned ? 'primary' : ''}`}
          disabled={!live.attuned && attunedCount >= 3}
          onClick={() => toggle({ attuned: !live.attuned })}
          aria-pressed={!!live.attuned}
        >
          ✨ {live.attuned ? 'Harmonisé' : `Harmoniser (${attunedCount}/3)`}
        </button>
      </div>
    </div>
  );
}
