// Mode démo : modifications de la fiche D&D avec les droits joueur/MJ (pièces, champs de fiche, capacités, emplacements, sorts préparés).
import type { Coin } from '../lib/dnd/data';
import { checkPlayerSheetPatch, setPreparedPatch, spendSlotPatch, useFeaturePatch } from '../lib/dnd/permissions';
import { normalizeSheet, type DndSheet } from '../lib/dnd/sheet';
import { checkLevelUp, levelUpPlan } from '../lib/dnd/levelup';
import { levelDownPatch, pushHistory } from '../lib/dnd/levels';
import type { LocalDb } from './localDb';
import { patchChar } from './localGameOps';

/** Pièces : le joueur peut seulement dépenser (delta négatif), le MJ peut tout faire. */
export function adjustCoins(db: LocalDb, id: string, coin: Coin, delta: number) {
  if (delta > 0 && !db.isGmOfCharacter(id)) throw new Error('Seul le MJ donne des pièces');
  patchChar(db, id, (c) => {
    const coins = { ...normalizeSheet(c.sheet).coins };
    coins[coin] = Math.max(0, (coins[coin] || 0) + delta);
    c.sheet = { ...c.sheet, coins };
  });
}

/** Fusionne des champs dans la fiche ; un joueur est limité aux champs autorisés (lib/dnd/permissions.ts). */
export function patchSheet(db: LocalDb, id: string, patch: Partial<DndSheet>) {
  if (!db.isGmOfCharacter(id)) {
    const d = db.read();
    const c = d.characters.find((x) => x.id === id);
    const settings = d.campaigns.find((x) => x.id === c?.campaign_id)?.settings as { playersEditStats?: boolean } | undefined;
    checkPlayerSheetPatch(patch, normalizeSheet(c?.sheet), settings?.playersEditStats ?? true);
  }
  patchChar(db, id, (c) => {
    c.sheet = { ...(c.sheet ?? {}), ...patch };
  });
}

/** Applique une action « joueur » calculée à partir de la fiche actuelle. */
function apply(db: LocalDb, id: string, make: (s: DndSheet) => Partial<DndSheet>) {
  const c = db.read().characters.find((x) => x.id === id);
  if (!c) throw new Error('Personnage introuvable');
  const p = make(normalizeSheet(c.sheet));
  patchChar(db, id, (ch) => {
    ch.sheet = { ...(ch.sheet ?? {}), ...p };
  });
}

export const useFeature = (db: LocalDb, id: string, featureId: string) => apply(db, id, (s) => useFeaturePatch(s, featureId));
export const spendSlot = (db: LocalDb, id: string, level: number) => apply(db, id, (s) => spendSlotPatch(s, level));
export const setPrepared = (db: LocalDb, id: string, spellId: string, prepared: boolean) =>
  apply(db, id, (s) => setPreparedPatch(s, spellId, prepared));

/**
 * Montée de niveau du perso (joueur propriétaire jusqu'au niveau accordé par le MJ, ou MJ) : vérifiée (checkLevelUp),
 * emplacements recalculés, PV max augmentés, fiche d'avant gardée dans l'historique (annulable par le MJ).
 */
export function levelUp(db: LocalDb, id: string, patch: Partial<DndSheet>, hpGain: number) {
  const c = db.read().characters.find((x) => x.id === id);
  if (!c) throw new Error('Personnage introuvable');
  const gm = db.isGmOfCharacter(id);
  if (!gm && c.owner_id !== db.me().id) throw new Error('Ce n’est pas ton personnage');
  const s = normalizeSheet(c.sheet);
  checkLevelUp(s, patch, hpGain, gm);
  const slots = levelUpPlan(s).slots;
  const levelHistory = pushHistory(s, hpGain);
  const allowedLevel = Math.max(s.allowedLevel ?? s.level, s.level + 1);
  patchChar(db, id, (ch) => {
    const sc = { ...s.spellcasting, ...(patch.spellcasting ?? {}) };
    ch.sheet = { ...(ch.sheet ?? {}), ...patch, levelHistory, allowedLevel, spellcasting: slots ? { ...sc, slots: Object.fromEntries(Object.entries(slots).map(([l, v]) => [l, { max: v.max, used: Math.min(v.max, s.spellcasting.slots[l]?.used ?? 0) }])) } : sc };
    const pv = ch.resources.pv ?? { current: 0, max: 0 };
    ch.resources = { ...ch.resources, pv: { max: pv.max + hpGain, current: pv.current + hpGain } };
  });
}

/** MJ : −1 niveau (retire un niveau accordé non pris, ou annule la dernière montée et ses PV). */
export function levelDown(db: LocalDb, id: string) {
  const c = db.read().characters.find((x) => x.id === id);
  if (!c) throw new Error('Personnage introuvable');
  if (!db.isGmOfCharacter(id)) throw new Error('Réservé au MJ');
  const { patch, hpLoss } = levelDownPatch(normalizeSheet(c.sheet));
  patchChar(db, id, (ch) => {
    ch.sheet = { ...(ch.sheet ?? {}), ...patch };
    if (hpLoss) {
      const pv = ch.resources.pv ?? { current: 0, max: 0 };
      const max = Math.max(1, pv.max - hpLoss);
      ch.resources = { ...ch.resources, pv: { max, current: Math.min(pv.current, max) } };
    }
  });
}
