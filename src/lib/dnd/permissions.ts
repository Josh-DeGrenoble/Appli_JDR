// Ce qu'un joueur peut modifier lui-même sur sa fiche (le MJ peut tout faire).
// Règle de la table : un joueur ne se redonne jamais seul PV, sorts, emplacements, capacités, objets ou pièces ;
// niveau, XP et épuisement sont gérés par le MJ (le joueur choisit ses gains via « Monter de niveau ») ;
// un joueur peut se mettre un état (à terre…) mais seul le MJ le retire.
// Même liste côté serveur : supabase/migrations/03_fiche.sql (patch_sheet).
// Règle de la table « les joueurs modifient leur fiche » désactivée : seulement PLAY_SHEET_KEYS (en jeu).
import type { DndSheet } from './sheet';

/** Champs de la fiche qu'un joueur peut modifier librement (identité, caracs, compétences, attaques, états…). */
export const PLAYER_SHEET_KEYS: (keyof DndSheet)[] = [
  'species', 'className', 'subclass', 'background', 'alignment', 'size',
  'abilities', 'saveProf', 'skills', 'ac', 'speed', 'initMisc', 'hitDie',
  'conditions', 'inspiration', 'companions', 'darkvision', 'languages', 'training', 'attacks', 'concentration', 'attacksPerAction',
];

/** Ce qu'un joueur modifie encore quand le MJ a bloqué les fiches : états, concentration, inspiration dépensée. */
export const PLAY_SHEET_KEYS: (keyof DndSheet)[] = ['conditions', 'concentration', 'inspiration'];

/**
 * Lève une erreur si un joueur tente de modifier un champ réservé au MJ (ou de se retirer un état).
 * `canEditStats` : règle de la table « les joueurs modifient leur fiche ».
 */
export function checkPlayerSheetPatch(patch: Partial<DndSheet>, current?: Pick<DndSheet, 'conditions'>, canEditStats = true) {
  const forbidden = Object.keys(patch).filter((k) => !PLAYER_SHEET_KEYS.includes(k as keyof DndSheet));
  if (forbidden.length) throw new Error('Réservé au MJ');
  if (!canEditStats && Object.keys(patch).some((k) => !PLAY_SHEET_KEYS.includes(k as keyof DndSheet))) throw new Error('Le MJ a bloqué les modifications de fiche');
  if (patch.inspiration === true) throw new Error('Seul le MJ donne l’inspiration');
  if (patch.conditions && current?.conditions.some((k) => !patch.conditions!.includes(k))) throw new Error('Seul le MJ retire un état');
}

/** Utilise une fois une capacité (jamais au-delà du maximum). */
export function useFeaturePatch(s: DndSheet, featureId: string): Partial<DndSheet> {
  const f = s.features.find((x) => x.id === featureId);
  if (!f || f.used >= f.max) throw new Error('Plus d’utilisation disponible');
  return { features: s.features.map((x) => (x.id === featureId ? { ...x, used: x.used + 1 } : x)) };
}

/** Dépense un emplacement de sort du niveau donné. */
export function spendSlotPatch(s: DndSheet, level: number): Partial<DndSheet> {
  const key = String(level);
  const slot = s.spellcasting.slots[key];
  if (!slot || slot.used >= slot.max) throw new Error(`Plus d’emplacement de niveau ${level}`);
  return { spellcasting: { ...s.spellcasting, slots: { ...s.spellcasting.slots, [key]: { ...slot, used: slot.used + 1 } } } };
}

/** Nombre de sorts préparés (les sorts mineurs ne comptent pas). */
export const preparedCount = (s: DndSheet) => s.spells.filter((x) => x.level > 0 && x.prepared).length;

/** Prépare ou retire un sort de la liste des sorts préparés (limite fixée par le MJ). */
export function setPreparedPatch(s: DndSheet, spellId: string, prepared: boolean): Partial<DndSheet> {
  const max = s.spellcasting.preparedMax;
  if (prepared && max > 0 && preparedCount(s) >= max) throw new Error(`Maximum de ${max} sorts préparés atteint`);
  return { spells: s.spells.map((x) => (x.id === spellId ? { ...x, prepared } : x)) };
}
