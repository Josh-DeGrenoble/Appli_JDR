// Vision du groupe dans l'obscurité : vision dans le noir (fiche, sinon celle de l'espèce) et lumière portée (torche
// ou lanterne équipée), en cases, pour le calcul de ce que voient les joueurs (sight.ts, darkView).
import type { Character, Item } from '../types';
import type { Combatant } from './combat';
import { normalizeSheet } from './sheet';
import { speciesDarkvision } from './srd/creation';
import type { Vision } from './sight';

/** Rayon de lumière (m) d'un objet porté : torche 6 m, lanterne 9 m. */
export const lightOf = (name: string) => (/lanterne/i.test(name) ? 9 : /torche/i.test(name) ? 6 : 0);

/** Vision dans le noir d'un perso (m). */
export const darkvisionOf = (c: Character) => {
  const s = normalizeSheet(c.sheet);
  return s.darkvision ?? speciesDarkvision(s.species);
};

/** Vision de chaque pion du groupe (persos : leur fiche et leurs objets équipés ; compagnons : leurs statistiques). */
export function partyVision(tokens: Combatant[], characters: Character[], items: Item[]): Map<string, Vision> {
  const out = new Map<string, Vision>();
  for (const t of tokens) {
    if (t.companion) {
      out.set(t.id, { dark: Math.round((t.companion.darkvision ?? 0) / 1.5), light: 0 });
      continue;
    }
    const ch = t.characterId ? characters.find((c) => c.id === t.characterId) : undefined;
    if (!ch) continue;
    const light = Math.max(0, ...items.filter((i) => i.character_id === ch.id && i.equipped).map((i) => lightOf(i.name)));
    out.set(t.id, { dark: Math.round(darkvisionOf(ch) / 1.5), light: Math.round(light / 1.5) });
  }
  return out;
}
