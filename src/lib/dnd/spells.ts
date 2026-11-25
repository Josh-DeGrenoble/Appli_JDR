// Incantation D&D 2024 : caractéristique, DD et bonus d'attaque des sorts, emplacements par classe et niveau.
import { findClass, type Ability } from './data';
import { modOf, profBonus } from './rules';
import type { DndSheet, Spellcasting } from './sheet';

/** Emplacements des lanceurs complets (niveaux de personnage 1 à 20 → emplacements des sorts de niveau 1 à 9). */
const FULL: number[][] = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

const FULL_CASTERS = ['Barde', 'Clerc', 'Druide', 'Ensorceleur', 'Magicien'];
const HALF_CASTERS = ['Paladin', 'Rôdeur'];

/** Magie de pacte de l'Occultiste : [nombre d'emplacements, niveau des emplacements]. */
function pactSlots(level: number): [number, number] {
  if (level >= 17) return [4, 5];
  if (level >= 11) return [3, 5];
  const lvl = Math.min(5, Math.ceil(level / 2));
  return [level === 1 ? 1 : 2, lvl];
}

/** Caractéristique d'incantation : celle choisie sur la fiche, sinon celle de la classe. */
export function spellAbility(s: DndSheet): Ability | '' {
  return s.spellcasting.ability || findClass(s.className)?.caster || '';
}

/** DD des sorts = 8 + mod + maîtrise. */
export function spellDC(s: DndSheet) {
  const a = spellAbility(s);
  return a ? 8 + modOf(s, a) + profBonus(s.level) : null;
}

/** Bonus d'attaque des sorts = mod + maîtrise. */
export function spellAttack(s: DndSheet) {
  const a = spellAbility(s);
  return a ? modOf(s, a) + profBonus(s.level) : null;
}

/** Emplacements conseillés selon la classe et le niveau (null si la classe ne lance pas de sorts). */
export function suggestedSlots(className: string, level: number): Spellcasting['slots'] | null {
  const name = findClass(className)?.name;
  if (!name) return null;
  const out: Spellcasting['slots'] = {};
  if (name === 'Occultiste') {
    const [count, lvl] = pactSlots(level);
    out[String(lvl)] = { max: count, used: 0 };
    return out;
  }
  let row: number[] | undefined;
  if (FULL_CASTERS.includes(name)) row = FULL[level - 1];
  else if (HALF_CASTERS.includes(name)) row = FULL[Math.ceil(level / 2) - 1];
  if (!row) return null;
  row.forEach((n, i) => (out[String(i + 1)] = { max: n, used: 0 }));
  return out;
}

export const isPactCaster = (className: string) => findClass(className)?.name === 'Occultiste';

/** Libellé d'un niveau de sort. */
export const spellLevelLabel = (lvl: number) => (lvl === 0 ? 'Sorts mineurs' : `Niveau ${lvl}`);
