// Tests des attaques, sorts et repos D&D (src/lib/dnd/actions.ts, spells.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attackBonus, damageFormula, doubleDice, longRestSheetPatch, newAttack, newFeature, shortRestPatch } from '../src/lib/dnd/actions';
import { spellAttack, spellDC, suggestedSlots } from '../src/lib/dnd/spells';
import { normalizeSheet } from '../src/lib/dnd/sheet';

const fighter = normalizeSheet({ className: 'Guerrier', level: 5, abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 } });

test('attaque : bonus et dégâts', () => {
  const a = { ...newAttack('a'), name: 'Épée longue', ability: 'str' as const, damage: '1d8', damageType: 'tranchant' };
  assert.equal(attackBonus(fighter, a), 6); // +3 FOR +3 maîtrise
  assert.equal(damageFormula(fighter, a), '1d8+3');
  assert.equal(damageFormula(fighter, a, true), '2d8+3');
  assert.equal(attackBonus(fighter, { ...a, proficient: false, bonus: 1 }), 4);
  assert.equal(damageFormula(fighter, { ...a, addMod: false }), '1d8');
});

test('dés doublés au critique', () => {
  assert.equal(doubleDice('1d8+2d6'), '2d8+4d6');
  assert.equal(doubleDice('d6'), '2d6');
});

test('sorts : DD, attaque, emplacements', () => {
  const wiz = normalizeSheet({ className: 'Magicien', level: 5, abilities: { str: 8, dex: 14, con: 12, int: 18, wis: 10, cha: 10 } });
  assert.equal(spellDC(wiz), 15); // 8 + 4 + 3
  assert.equal(spellAttack(wiz), 7);
  assert.equal(spellDC(fighter), null);
  assert.deepEqual(suggestedSlots('Magicien', 5), { 1: { max: 4, used: 0 }, 2: { max: 3, used: 0 }, 3: { max: 2, used: 0 } });
  assert.deepEqual(suggestedSlots('Paladin', 1), { 1: { max: 2, used: 0 } });
  assert.deepEqual(suggestedSlots('Rôdeur', 5), { 1: { max: 4, used: 0 }, 2: { max: 2, used: 0 } });
  assert.deepEqual(suggestedSlots('Occultiste', 5), { 3: { max: 2, used: 0 } });
  assert.equal(suggestedSlots('Guerrier', 5), null);
  assert.equal(Object.keys(suggestedSlots('Clerc', 20)!).length, 9);
});

test('repos court et long : capacités, pacte, concentration', () => {
  const s = normalizeSheet({
    features: [
      { ...newFeature('f1'), name: 'Second souffle', recharge: 'short', used: 1 },
      { ...newFeature('f2'), name: 'Fougue', recharge: 'long', used: 1 },
    ],
    spellcasting: { ability: 'cha', pact: true, slots: { 2: { max: 2, used: 2 } } },
    concentration: 'Hâte',
  });
  const sr = shortRestPatch(s);
  assert.deepEqual(sr.features!.map((f) => f.used), [0, 1]);
  assert.equal(sr.spellcasting!.slots['2'].used, 0);
  const lr = longRestSheetPatch(s);
  assert.deepEqual(lr.features!.map((f) => f.used), [0, 0]);
  assert.equal(lr.concentration, '');
  const noPact = shortRestPatch({ ...s, spellcasting: { ...s.spellcasting, pact: false } });
  assert.equal(noPact.spellcasting, undefined);
});
