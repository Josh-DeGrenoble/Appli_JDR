// Objets équipés → fiche : armure (CA), bouclier, bonus de CA et de sauvegardes, caractéristique fixée (gantelets…),
// vitesse, et attaque ajoutée pour une arme. Les bonus déjà appliqués sont gardés dans `sheet.gear` : on les retire
// avant de recalculer, donc le calcul peut être refait à chaque changement d'inventaire sans rien cumuler.
// Même calcul côté serveur : 06_equipement.sql (_apply_gear, déclenché à chaque changement d'objet).
import { abilityMod, abilityShort, type Ability } from './data';
import type { Attack, DndSheet } from './sheet';
import { libraryItem } from './srd/items';

export interface ItemEffects {
  /** Armure portée : CA de base + DEX (plafonnée ; null = sans limite, 0 = pas de DEX). */
  armor?: { base: number; dexMax: number | null };
  /** Bouclier (+2). */
  shield?: number;
  /** Bonus de CA (objet magique). */
  ac?: number;
  /** Bonus de CA sans armure ni bouclier (bracelets de défense). */
  acUnarmored?: number;
  /** Bonus à tous les jets de sauvegarde. */
  saves?: number;
  /** Vitesse en plus (m). */
  speed?: number;
  /** Caractéristique portée à cette valeur (si elle est plus basse). */
  setAbility?: Partial<Record<Ability, number>>;
  /** Arme : l'attaque apparaît sur la fiche. `finesse` = la meilleure de FOR et DEX. */
  weapon?: { damage: string; type: string; ability: 'str' | 'dex' | 'finesse'; range: number; bonus?: number };
}

/** Bonus des objets actuellement appliqués à la fiche. */
export interface Gear {
  ac: number;
  speed: number;
  saves: number;
  abilities: Partial<Record<Ability, number>>;
}

export const NO_GEAR: Gear = { ac: 0, speed: 0, saves: 0, abilities: {} };

/** Effets d'un objet (ceux de la bibliothèque, d'après son nom). */
export const effectsOf = (name: string): ItemEffects | undefined => libraryItem(name)?.effects;

/** Préfixe des attaques ajoutées par une arme équipée. */
export const GEAR_ATTACK = 'gear-';

const mod = abilityMod;

/**
 * Recalcule la fiche à partir des objets équipés (`equipped` : id et nom). Renvoie les champs modifiés :
 * CA, caractéristiques, vitesse, attaques et `gear` (bonus appliqués).
 */
export function applyGear(s: DndSheet, equipped: { id: string; name: string }[]): Partial<DndSheet> {
  const prev = { ...NO_GEAR, ...(s.gear ?? {}) };
  const base = {
    ac: s.ac - prev.ac,
    speed: s.speed - prev.speed,
    abilities: Object.fromEntries(Object.entries(s.abilities).map(([k, v]) => [k, v - (prev.abilities[k as Ability] ?? 0)])) as Record<Ability, number>,
  };
  const list = equipped.map((it) => ({ it, e: effectsOf(it.name) })).filter((x): x is { it: { id: string; name: string }; e: ItemEffects } => !!x.e);

  // Caractéristiques fixées par un objet (la plus haute valeur l'emporte)
  const abilityDelta: Partial<Record<Ability, number>> = {};
  for (const { e } of list)
    for (const [k, v] of Object.entries(e.setAbility ?? {})) {
      const d = Math.max(0, (v ?? 0) - base.abilities[k as Ability]);
      if (d > (abilityDelta[k as Ability] ?? 0)) abilityDelta[k as Ability] = d;
    }
  const abilities = { ...base.abilities };
  for (const [k, d] of Object.entries(abilityDelta)) abilities[k as Ability] += d ?? 0;

  // CA : la meilleure armure remplace la CA de base ; bouclier et bonus s'ajoutent
  const dex = mod(abilities.dex);
  const armors = list.filter((x) => x.e.armor).map((x) => x.e.armor!.base + Math.min(dex, x.e.armor!.dexMax ?? 99));
  const shields = list.reduce((n, x) => n + (x.e.shield ?? 0), 0);
  let ac = armors.length ? Math.max(...armors) : base.ac;
  ac += shields + list.reduce((n, x) => n + (x.e.ac ?? 0), 0);
  if (!armors.length && !shields) ac += list.reduce((n, x) => n + (x.e.acUnarmored ?? 0), 0);

  const speed = base.speed + list.reduce((n, x) => n + (x.e.speed ?? 0), 0);
  const saves = list.reduce((n, x) => n + (x.e.saves ?? 0), 0);

  // Armes : une attaque par arme équipée
  const weapons: Attack[] = list
    .filter((x) => x.e.weapon)
    .map(({ it, e }) => {
      const wp = e.weapon!;
      const ability = wp.ability === 'finesse' ? (mod(abilities.dex) > mod(abilities.str) ? 'dex' : 'str') : wp.ability;
      return {
        id: GEAR_ATTACK + it.id, name: it.name, ability, proficient: true, bonus: wp.bonus ?? 0, damage: wp.damage, addMod: true,
        damageBonus: wp.bonus ?? 0, damageType: wp.type, notes: 'Arme équipée', range: wp.range,
      };
    });

  return {
    ac,
    speed,
    abilities,
    attacks: [...s.attacks.filter((x) => !x.id.startsWith(GEAR_ATTACK)), ...weapons],
    gear: { ac: ac - base.ac, speed: speed - base.speed, saves, abilities: abilityDelta },
  };
}

/**
 * Résumé lisible des effets d'un objet. Le « +1 » d'un objet magique est détaillé : armure « CA 17 (16 + 1 magique) »,
 * bouclier « +3 CA (2 + 1 magique) », arme « 1d8 tranchant, +1 au toucher et aux dégâts ».
 */
export function describeEffects(e: ItemEffects | undefined): string {
  if (!e) return '';
  const out: string[] = [];
  const magic = e.ac ?? 0;
  const dex = (m: number | null) => (m === 0 ? '' : m ? ` + Dex (max ${m})` : ' + Dex');
  if (e.armor) out.push(magic ? `CA ${e.armor.base + magic}${dex(e.armor.dexMax)} (armure ${e.armor.base} + ${magic} magique)` : `CA ${e.armor.base}${dex(e.armor.dexMax)}`);
  else if (e.shield) out.push(magic ? `+${e.shield + magic} CA (bouclier ${e.shield} + ${magic} magique)` : `+${e.shield} CA (bouclier)`);
  else if (magic) out.push(`+${magic} CA`);
  if (e.acUnarmored) out.push(`+${e.acUnarmored} CA sans armure ni bouclier`);
  if (e.saves) out.push(`+${e.saves} à tous les jets de sauvegarde`);
  if (e.speed) out.push(`+${e.speed} m de vitesse`);
  for (const [k, v] of Object.entries(e.setAbility ?? {})) out.push(`${abilityShort(k as Ability)} passe à ${v}`);
  if (e.weapon) out.push(`${e.weapon.damage} ${e.weapon.type}${e.weapon.bonus ? `, +${e.weapon.bonus} au toucher et aux dégâts (magique)` : ''}`);
  return out.join(' · ');
}
