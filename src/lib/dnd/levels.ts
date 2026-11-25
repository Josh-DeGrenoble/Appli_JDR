// Niveaux accordés par le MJ (règles 2024) : seuils d'XP, niveau accordé (bouton +1 ou XP), historique des montées
// et retour d'un niveau en arrière (fausse manip). Mêmes règles côté serveur : 04_niveaux_dons.sql (level_up, level_down).
import type { DndSheet, LevelStep } from './sheet';
import { suggestedSlots } from './spells';
import { findClass } from './data';

/** XP totale pour atteindre chaque niveau (index 0 = niveau 1). */
export const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

/** Niveau correspondant à une XP totale. */
export const levelForXp = (xp: number) => XP_THRESHOLDS.filter((t) => xp >= t).length || 1;

/** XP manquante pour le niveau suivant (null au niveau 20). */
export const xpToNext = (s: Pick<DndSheet, 'xp' | 'level'>) => (s.level >= 20 ? null : Math.max(0, XP_THRESHOLDS[s.level] - s.xp));

/** Niveau jusqu'où le joueur peut monter (jamais sous son niveau actuel). */
export const allowedLevelOf = (s: Pick<DndSheet, 'level' | 'allowedLevel'>) => Math.min(20, Math.max(s.level, s.allowedLevel ?? s.level));

/** Le joueur a un niveau à choisir. */
export const canLevelUp = (s: Pick<DndSheet, 'level' | 'allowedLevel'>) => s.level < 20 && allowedLevelOf(s) > s.level;

/** MJ : accorde un niveau de plus. */
export const grantLevelPatch = (s: DndSheet): Partial<DndSheet> => ({ allowedLevel: Math.min(20, allowedLevelOf(s) + 1) });

/** MJ : ajoute de l'XP ; atteindre un seuil accorde le niveau correspondant. */
export function xpPatch(s: DndSheet, delta: number): Partial<DndSheet> {
  const xp = Math.max(0, s.xp + delta);
  return { xp, allowedLevel: Math.max(allowedLevelOf(s), Math.min(20, levelForXp(xp))) };
}

/** Champs de la fiche sauvegardés avant une montée (pour pouvoir l'annuler). */
export const SNAPSHOT_KEYS = ['level', 'subclass', 'abilities', 'skills', 'features', 'attacksPerAction', 'spellcasting', 'spells', 'feats', 'speed', 'saveProf', 'attacks'] as const;
const HISTORY_MAX = 3;

/**
 * Historique après une montée de niveau (les 3 dernières sont gardées). Pour rester léger, les sorts sont mémorisés
 * par leur identifiant seulement (`spellIds`) : annuler retire les sorts appris, sans toucher aux autres.
 */
export function pushHistory(s: DndSheet, hpGain: number): LevelStep[] {
  const before = { ...Object.fromEntries(SNAPSHOT_KEYS.filter((k) => k !== 'spells').map((k) => [k, s[k]])), spellIds: s.spells.map((x) => x.id) } as LevelStep['before'];
  return [...(s.levelHistory ?? []), { from: s.level, hpGain, before }].slice(-HISTORY_MAX);
}

/**
 * MJ : −1 niveau. Si un niveau accordé n'a pas encore été pris, on le retire. Sinon on annule la dernière montée
 * (fiche d'avant et PV gagnés retirés) ; sans historique, le niveau baisse simplement (emplacements recalculés).
 */
export function levelDownPatch(s: DndSheet): { patch: Partial<DndSheet>; hpLoss: number } {
  if (allowedLevelOf(s) > s.level) return { patch: { allowedLevel: allowedLevelOf(s) - 1 }, hpLoss: 0 };
  if (s.level <= 1) throw new Error('Déjà niveau 1');
  const hist = s.levelHistory ?? [];
  const last = hist[hist.length - 1];
  if (last && last.from === s.level - 1) {
    const { spellIds, ...before } = last.before;
    const spells = spellIds ? { spells: s.spells.filter((x) => spellIds.includes(x.id)) } : {};
    return { patch: { ...before, ...spells, level: last.from, allowedLevel: last.from, levelHistory: hist.slice(0, -1) }, hpLoss: last.hpGain };
  }
  const to = s.level - 1;
  const slots = suggestedSlots(findClass(s.className)?.name ?? s.className, to);
  const spellcasting = slots
    ? { ...s.spellcasting, slots: Object.fromEntries(Object.entries(slots).map(([l, v]) => [l, { max: v.max, used: Math.min(v.max, s.spellcasting.slots[l]?.used ?? 0) }])) }
    : s.spellcasting;
  return { patch: { level: to, allowedLevel: to, spellcasting, levelHistory: [] }, hpLoss: 0 };
}
