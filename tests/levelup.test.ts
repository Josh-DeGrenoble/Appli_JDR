// Tests de la montée de niveau (src/lib/dnd/levelup.ts, srd/progression.ts) et des nouveaux éléments de carte (terrain.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyLevelUp, checkLevelUp, levelUpPlan } from '../src/lib/dnd/levelup';
import { attacksAt, cantripsAt, featuresAt, isAsiLevel, preparedAt } from '../src/lib/dnd/srd/progression';
import { normalizeSheet, type Spell } from '../src/lib/dnd/sheet';
import { blocksMove, blocksSight, isSlow, nextMaterial, playerKind } from '../src/lib/dnd/terrain';
import { CLASSES } from '../src/lib/dnd/data';

test('progression : chaque classe a 20 niveaux, tables cohérentes', () => {
  for (const c of CLASSES) for (let l = 1; l <= 20; l++) assert.ok(Array.isArray(featuresAt(c.name, l)));
  assert.deepEqual(featuresAt('Guerrier', 5), ['Attaque supplémentaire', 'Changement tactique']);
  assert.ok(featuresAt('Roublard', 3).includes('Attaque sournoise 2d6'));
  assert.equal(isAsiLevel('Guerrier', 6), true);
  assert.equal(isAsiLevel('Magicien', 6), false);
  assert.equal(attacksAt('Guerrier', 11), 3);
  assert.equal(preparedAt('Clerc', 5), 9);
  assert.equal(cantripsAt('Magicien', 10), 5);
});

test('montée de niveau : Magicien 3 → 4 (amélioration, sorts, emplacements, PV)', () => {
  const s = normalizeSheet({ className: 'Magicien', level: 3, hitDie: 6, abilities: { str: 8, dex: 14, con: 14, int: 16, wis: 12, cha: 10 }, spellcasting: { ability: 'int', slots: { 1: { max: 4, used: 3 }, 2: { max: 2, used: 0 } }, pact: false, preparedMax: 6 } });
  const plan = levelUpPlan(s);
  assert.equal(plan.to, 4);
  assert.equal(plan.average, 6, 'd6 → 4 + CON 2');
  assert.equal(plan.asi, true);
  assert.equal(plan.newCantrips, 1);
  assert.equal(plan.newSpells, 3, '2 sorts de magicien + 1 mineur');
  const spell = (id: string, level: number): Spell => ({ id, name: id, level, prepared: false, ritual: false, concentration: false, damage: '', notes: '' });
  const { patch, hpGain } = applyLevelUp(s, { hpGain: plan.average, asi: { int: 2 }, spells: [spell('a', 0), spell('b', 2), spell('c', 1)] });
  assert.equal(hpGain, 6);
  assert.equal(patch.abilities!.int, 18);
  assert.equal(patch.spellcasting!.slots['1'].used, 3, 'emplacements dépensés conservés');
  assert.equal(patch.spellcasting!.slots['2'].max, 3);
  assert.equal(patch.spells!.length, 3);
  assert.doesNotThrow(() => checkLevelUp(s, patch, hpGain));
  assert.throws(() => checkLevelUp(s, { ...patch, level: 5 }, 1), /un seul niveau/);
  assert.throws(() => checkLevelUp(s, patch, 20), /PV/);
  assert.throws(() => checkLevelUp(s, { ...patch, abilities: { ...patch.abilities!, int: 19 } }, 1), /amélioration/);
  assert.throws(() => checkLevelUp(s, { ...patch, spells: [spell('z', 5)] }, 1), /Sorts invalides|Trop de sorts/);
});

test('montée de niveau : Guerrier 4 → 5 (attaque supplémentaire, utilisations)', () => {
  const s = normalizeSheet({ className: 'Guerrier', level: 4, hitDie: 10, features: [{ id: 'f', name: 'Second souffle', max: 3, used: 1, recharge: 'short', notes: '' }] });
  const { patch } = applyLevelUp(s, { hpGain: 6 });
  assert.equal(patch.attacksPerAction, 2);
  assert.ok(patch.features!.some((f) => f.name === 'Attaque supplémentaire'));
  assert.equal(patch.abilities!.str, 10, 'pas d’amélioration au niveau 5');
});

test('carte : murs, terrain, portes verrouillées, objets, piège caché', () => {
  assert.equal(blocksMove('chest') && !blocksSight('chest'), true);
  assert.equal(blocksMove('grate') && !blocksSight('grate'), true);
  assert.equal(blocksMove('door-locked') && blocksSight('door-locked'), true);
  assert.equal(isSlow('water') && isSlow('rubble'), true);
  assert.equal(blocksMove('treasure'), false);
  assert.equal(playerKind('trap'), undefined);
  assert.equal(playerKind('chest'), 'chest');
  assert.equal(nextMaterial('ice'), 'grate');
  assert.equal(nextMaterial('chest'), null);
});
