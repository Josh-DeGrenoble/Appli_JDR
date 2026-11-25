// Mode démo : après chaque écriture, recalcule la fiche des persos dont les objets équipés ont changé
// (équivalent du déclencheur SQL items_gear (supabase/migrations/06_equipement.sql)).
import type { Character, Item } from '../lib/types';
import { applyGear, effectsOf } from '../lib/dnd/gear';
import { normalizeSheet } from '../lib/dnd/sheet';

type Tables = { characters: Character[]; items: Item[] };

/** Signature des objets équipés (avec effets) de chaque perso. */
export function gearKeys(d: Tables): Map<string, string> {
  const lists = new Map<string, string[]>();
  for (const it of d.items) if (it.equipped && effectsOf(it.name)) lists.set(it.character_id, [...(lists.get(it.character_id) ?? []), `${it.id}:${it.name}`]);
  return new Map([...lists].map(([k, v]) => [k, v.sort().join('|')]));
}

/** Applique les objets aux persos dont la signature a changé depuis `before`. */
export function syncGear(d: Tables, before: Map<string, string>) {
  const after = gearKeys(d);
  for (const c of d.characters) {
    if ((before.get(c.id) ?? '') === (after.get(c.id) ?? '')) continue;
    const equipped = d.items.filter((i) => i.character_id === c.id && i.equipped);
    c.sheet = { ...c.sheet, ...applyGear(normalizeSheet(c.sheet), equipped) };
  }
}
