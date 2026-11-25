// Droits joueur : ce qu'un joueur peut (ou non) faire seul sur sa fiche (src/lib/dnd/permissions.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPlayerSheetPatch, setPreparedPatch, spendSlotPatch, useFeaturePatch } from '../src/lib/dnd/permissions';
import { normalizeSheet } from '../src/lib/dnd/sheet';
import { SPELL_LIBRARY, searchSpells } from '../src/lib/dnd/srd/library';

test('champs autorisés / interdits au joueur', () => {
  assert.doesNotThrow(() => checkPlayerSheetPatch({ abilities: { str: 12, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, conditions: [] }));
  assert.doesNotThrow(() => checkPlayerSheetPatch({ inspiration: false, concentration: '' }));
  assert.throws(() => checkPlayerSheetPatch({ spells: [] }), /MJ/);
  assert.throws(() => checkPlayerSheetPatch({ features: [] }), /MJ/);
  assert.throws(() => checkPlayerSheetPatch({ coins: { pc: 0, pa: 0, pe: 0, po: 999, pp: 0 } }), /MJ/);
  assert.throws(() => checkPlayerSheetPatch({ hitDiceUsed: 0 }), /MJ/);
  assert.throws(() => checkPlayerSheetPatch({ inspiration: true }), /inspiration/);
});

test('utiliser une capacité, un emplacement, préparer un sort', () => {
  const s = normalizeSheet({
    features: [{ id: 'f', name: 'Rage', max: 2, used: 1, recharge: 'long', notes: '' }],
    spellcasting: { ability: 'int', pact: false, slots: { 1: { max: 2, used: 2 }, 2: { max: 1, used: 0 } } },
    spells: [{ id: 'x', name: 'Boule de feu', level: 3, prepared: false, ritual: false, concentration: false, damage: '8d6', notes: '' }],
  });
  assert.equal(useFeaturePatch(s, 'f').features![0].used, 2);
  assert.throws(() => useFeaturePatch({ ...s, features: [{ ...s.features[0], used: 2 }] }, 'f'), /Plus/);
  assert.equal(spendSlotPatch(s, 2).spellcasting!.slots['2'].used, 1);
  assert.throws(() => spendSlotPatch(s, 1), /Plus/);
  assert.equal(setPreparedPatch(s, 'x', true).spells![0].prepared, true);
});

test('bibliothèque de sorts', () => {
  assert.ok(SPELL_LIBRARY.length >= 100);
  const names = SPELL_LIBRARY.map((s) => s.name);
  assert.equal(new Set(names).size, names.length, 'pas de doublon');
  assert.ok(SPELL_LIBRARY.every((s) => s.level >= 0 && s.level <= 9 && s.classes.length > 0));
  assert.deepEqual(searchSpells('boule', null, '').map((s) => s.name), ['Boule de feu']);
  assert.ok(searchSpells('', 0, 'Occultiste').some((s) => s.name === 'Décharge occulte'));
  assert.ok(searchSpells('eclair', null, '').length >= 2, 'recherche sans accents');
});
