// Calculs D&D 2024 (fonctions pures, testées dans tests/dndRules.test.ts).

import { featInitiative } from './feats';
import { COIN_VALUE, SKILLS, abilityMod, findClass, type Ability, type Coin, type RollMode } from './data';
export { abilityMod };
import type { DndSheet } from './sheet';


/** Bonus de maîtrise selon le niveau : +2 (1-4) … +6 (17-20). */
export const profBonus = (level: number) => 2 + Math.floor((Math.min(20, Math.max(1, level)) - 1) / 4);

export const fmtBonus = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function modOf(s: DndSheet, a: Ability) {
  return abilityMod(s.abilities[a]);
}

/** Bonus de sauvegarde : mod + maîtrise si la sauvegarde est maîtrisée + bonus des objets équipés. */
export function saveBonus(s: DndSheet, a: Ability) {
  return modOf(s, a) + (s.saveProf.includes(a) ? profBonus(s.level) : 0) + (s.gear?.saves ?? 0);
}

/** Bonus de compétence : mod + maîtrise × (0, 1 ou 2 pour l'expertise). */
export function skillBonus(s: DndSheet, key: string) {
  const sk = SKILLS.find((x) => x.key === key);
  if (!sk) return 0;
  return modOf(s, sk.ability) + (s.skills[key] ?? 0) * profBonus(s.level);
}

export const initiative = (s: DndSheet) => modOf(s, 'dex') + s.initMisc + featInitiative(s);

/** Perception passive = 10 + bonus de Perception. */
export const passivePerception = (s: DndSheet) => 10 + skillBonus(s, 'perception');

/** Vitesse réduite par l'épuisement (1,5 m par niveau en 2024). */
export const effectiveSpeed = (s: DndSheet) => Math.max(0, s.speed - 1.5 * s.exhaustion);

/** Malus d'épuisement aux tests d20 (−2 par niveau). */
export const exhaustionPenalty = (s: DndSheet) => -2 * s.exhaustion;

/** Formule d'un test d20 avec avantage/désavantage et épuisement inclus. */
export function d20Formula(bonus: number, mode: RollMode = 'normal', exhaustion = 0) {
  const die = mode === 'adv' ? '2d20kh1' : mode === 'dis' ? '2d20kl1' : '1d20';
  const total = bonus - 2 * exhaustion;
  return total === 0 ? die : `${die}${fmtBonus(total)}`;
}

/** Dé de vie de la classe (ou celui saisi si classe inconnue). */
export const hitDieOf = (s: DndSheet) => findClass(s.className)?.hitDie ?? s.hitDie;

/** PV max conseillés : dé max au niv. 1 puis moyenne arrondie au-dessus, + CON par niveau. */
export function suggestedMaxHp(s: DndSheet) {
  const die = hitDieOf(s);
  const con = modOf(s, 'con');
  return Math.max(1, die + con + (s.level - 1) * (die / 2 + 1 + con));
}

export interface Hp {
  current: number;
  max: number;
  temp: number;
}

/**
 * Applique dégâts (delta < 0) ou soins (delta > 0).
 * Les dégâts entament d'abord les PV temporaires ; les soins sont plafonnés au max.
 */
export function applyHpDelta(hp: Hp, delta: number): Hp {
  if (delta >= 0) return { ...hp, current: hp.max > 0 ? Math.min(hp.max, hp.current + delta) : hp.current + delta };
  const dmg = -delta;
  const absorbed = Math.min(hp.temp, dmg);
  return { ...hp, temp: hp.temp - absorbed, current: Math.max(0, hp.current - (dmg - absorbed)) };
}

/** Résultat d'un jet contre la mort (d20 naturel). */
export function deathSaveResult(natural: number, ds: { success: number; failure: number }) {
  if (natural === 20) return { revive: true, success: 0, failure: 0 };
  if (natural === 1) return { revive: false, success: ds.success, failure: Math.min(3, ds.failure + 2) };
  if (natural >= 10) return { revive: false, success: Math.min(3, ds.success + 1), failure: ds.failure };
  return { revive: false, success: ds.success, failure: Math.min(3, ds.failure + 1) };
}

/** Repos long 2024 : PV au max, PV temporaires perdus, tous les dés de vie récupérés, épuisement −1. */
export function longRest(s: DndSheet, hp: Hp): { sheet: Partial<DndSheet>; hp: Hp } {
  return {
    sheet: {
      hitDiceUsed: 0,
      exhaustion: Math.max(0, s.exhaustion - 1),
      deathSaves: { success: 0, failure: 0 },
    },
    hp: { current: hp.max, max: hp.max, temp: 0 },
  };
}

export const hitDiceLeft = (s: DndSheet) => Math.max(0, s.level - s.hitDiceUsed);

/** Formule pour dépenser un dé de vie (repos court) : 1dX + mod CON (minimum 0 en pratique). */
export const hitDieFormula = (s: DndSheet) => {
  const con = modOf(s, 'con');
  return con === 0 ? `1d${hitDieOf(s)}` : `1d${hitDieOf(s)}${fmtBonus(con)}`;
};

/** Valeur totale de la bourse, exprimée en po (arrondie à 2 décimales). */
export function totalGold(coins: Record<Coin, number>) {
  const cp = (Object.keys(COIN_VALUE) as Coin[]).reduce((s, k) => s + (coins[k] || 0) * COIN_VALUE[k], 0);
  return Math.round(cp) / 100;
}
