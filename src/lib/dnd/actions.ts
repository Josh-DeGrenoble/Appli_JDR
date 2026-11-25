// Calculs D&D des attaques, capacités et repos (fonctions pures, testées dans tests/dndActions.test.ts).
import type { Attack, DndSheet, Feature } from './sheet';
import { fmtBonus, modOf, profBonus } from './rules';
import { spellAbility } from './spells';

/** Caractéristique réellement utilisée par une attaque (« spell » = caractéristique d'incantation). */
export function attackAbility(s: DndSheet, a: Attack) {
  return a.ability === 'spell' ? spellAbility(s) || 'int' : a.ability;
}

/** Bonus d'attaque : mod + maîtrise (si maîtrisée) + bonus divers. */
export function attackBonus(s: DndSheet, a: Attack) {
  return modOf(s, attackAbility(s, a)) + (a.proficient ? profBonus(s.level) : 0) + (a.bonus || 0);
}

/** Bonus fixe ajouté aux dégâts. */
export function damageBonus(s: DndSheet, a: Attack) {
  return (a.addMod ? modOf(s, attackAbility(s, a)) : 0) + (a.damageBonus || 0);
}

/** Formule de dégâts (critique = dés doublés, bonus fixe une seule fois). */
export function damageFormula(s: DndSheet, a: Attack, crit = false) {
  const dice = (a.damage || '').replace(/\s+/g, '');
  const doubled = crit ? doubleDice(dice) : dice;
  const b = damageBonus(s, a);
  if (!doubled) return b ? String(b) : '0';
  return b ? `${doubled}${fmtBonus(b)}` : doubled;
}

/** Double le nombre de dés de chaque groupe : "1d8+2d6" -> "2d8+4d6". */
export function doubleDice(formula: string) {
  return formula.replace(/(\d*)d(\d+|%)/gi, (_, n: string, f: string) => `${(parseInt(n || '1', 10) || 1) * 2}d${f}`);
}

/** Libellé court d'une attaque pour l'affichage : « +5 · 1d8+3 tranchant ». */
export function attackSummary(s: DndSheet, a: Attack) {
  return `${fmtBonus(attackBonus(s, a))} · ${damageFormula(s, a)}${a.damageType ? ' ' + a.damageType : ''}`;
}

export const newAttack = (id: string): Attack => ({
  id,
  name: '',
  ability: 'str',
  proficient: true,
  bonus: 0,
  damage: '1d8',
  addMod: true,
  damageBonus: 0,
  damageType: '',
  notes: '',
});

export const newFeature = (id: string): Feature => ({ id, name: '', max: 1, used: 0, recharge: 'long', notes: '' });

/** Remet à zéro les utilisations des capacités concernées par le repos. */
function restoreFeatures(features: Feature[], kind: 'short' | 'long') {
  return features.map((f) => (f.recharge === 'short' || (kind === 'long' && f.recharge === 'long') ? { ...f, used: 0 } : f));
}

/** Effets d'un repos court sur la fiche : capacités « repos court » et magie de pacte. */
export function shortRestPatch(s: DndSheet): Partial<DndSheet> {
  const patch: Partial<DndSheet> = { features: restoreFeatures(s.features, 'short') };
  if (s.spellcasting.pact) patch.spellcasting = { ...s.spellcasting, slots: resetSlots(s.spellcasting.slots) };
  return patch;
}

/** Effets d'un repos long sur la fiche (hors PV) : capacités, emplacements, concentration. */
export function longRestSheetPatch(s: DndSheet): Partial<DndSheet> {
  return {
    features: restoreFeatures(s.features, 'long'),
    spellcasting: { ...s.spellcasting, slots: resetSlots(s.spellcasting.slots) },
    concentration: '',
  };
}

function resetSlots(slots: DndSheet['spellcasting']['slots']) {
  const out: DndSheet['spellcasting']['slots'] = {};
  for (const [k, v] of Object.entries(slots)) out[k] = { ...v, used: 0 };
  return out;
}
