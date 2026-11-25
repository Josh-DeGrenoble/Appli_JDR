// Tests de l'assistant de création (src/lib/dnd/creation.ts) et des données 2024 (srd/creation.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_SCORES, bonusValid, buildCharacter, finalScores, pointsSpent, roll4d6, suggestStandard } from '../src/lib/dnd/creation';
import { BACKGROUND_INFO, CLASS_INFO, SPECIES_INFO } from '../src/lib/dnd/srd/creation';
import { BACKGROUNDS, CLASSES, SKILLS, SPECIES } from '../src/lib/dnd/data';

test('données : toutes les classes, historiques et espèces, compétences valides', () => {
  assert.deepEqual(CLASS_INFO.map((c) => c.name), CLASSES.map((c) => c.name));
  assert.deepEqual(BACKGROUND_INFO.map((b) => b.name).sort(), [...BACKGROUNDS].sort());
  assert.deepEqual(SPECIES_INFO.map((s) => s.name), SPECIES);
  const keys = new Set(SKILLS.map((s) => s.key));
  for (const c of CLASS_INFO) for (const k of c.skills) assert.ok(keys.has(k), `${c.name} : ${k}`);
  for (const b of BACKGROUND_INFO) for (const k of b.skills) assert.ok(keys.has(k), `${b.name} : ${k}`);
});

test('caractéristiques : tableau standard, achat de points, 4d6, bonus d’historique', () => {
  assert.deepEqual(suggestStandard('Magicien'), { int: 15, con: 14, dex: 13, wis: 12, str: 10, cha: 8 });
  assert.equal(pointsSpent(BASE_SCORES), 0);
  assert.equal(pointsSpent({ str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: 8 }), 27);
  const r = roll4d6(() => 0.99);
  assert.equal(r, 18);
  assert.equal(bonusValid('Soldat', { str: 2, dex: 1 }), true);
  assert.equal(bonusValid('Soldat', { str: 1, dex: 1, con: 1 }), true);
  assert.equal(bonusValid('Soldat', { str: 2, wis: 1 }), false, 'hors historique');
  assert.equal(bonusValid('Soldat', { str: 2, dex: 2 }), false);
  assert.equal(finalScores({ ...BASE_SCORES, str: 19 }, { str: 2 }).str, 20, 'plafond 20');
});

test('fiche construite : Guerrier nain soldat', () => {
  const { sheet, maxHp, notes } = buildCharacter({
    className: 'Guerrier', background: 'Soldat', species: 'Nain', level: 1, base: suggestStandard('Guerrier'),
    bonus: { str: 2, dex: 1 }, classSkills: ['perception', 'survival'], equipment: 'kit',
  });
  assert.equal(maxHp, 12, 'd10 + CON 13 (+1) + robustesse naine');
  assert.equal(sheet.ac, 16);
  assert.deepEqual(Object.keys(sheet.skills!).sort(), ['athletics', 'intimidation', 'perception', 'survival']);
  assert.equal(sheet.attacks!.length, 2);
  assert.match(notes, /Cotte de mailles/);
  const rogue = buildCharacter({ className: 'Roublard', background: 'Criminel', species: 'Humain', level: 1, base: suggestStandard('Roublard'), bonus: { dex: 2, con: 1 }, classSkills: [], extraSkill: 'arcana', equipment: 'gold' });
  assert.equal(rogue.sheet.coins?.po, 100);
  assert.equal(rogue.sheet.ac, 11 + 3, 'cuir + DEX 17 (+3)');
  assert.equal(rogue.sheet.inspiration, true);
  assert.ok(rogue.sheet.skills!.arcana);
});
