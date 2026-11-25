// Tests v0.22 : torches allumées / éteintes, sorts de lumière dans l'obscurité.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { darkView } from '../src/lib/dnd/sight';
import { toggleDoor } from '../src/lib/dnd/movement';
import { addEffect, checkEffect, presetOf } from '../src/lib/dnd/effects';
import { normalizeCombat, type Combatant } from '../src/lib/dnd/combat';

const cb = (id: string, kind: Combatant['kind'], extra: Partial<Combatant> = {}): Combatant => ({ id, name: id, kind, avatar: '', initiative: 10, initBonus: 0, conditions: [], ...extra });

test('torche : éteinte au contact, plus de lumière ; rallumée', () => {
  let c = normalizeCombat({ map: { cols: 12, rows: 12, dark: true, cells: { '6,6': 'torch' } }, combatants: [cb('a', 'pc', { x: 5, y: 5 }), cb('far', 'pc', { x: 0, y: 0 })] });
  const eyes = [c.combatants[1]];
  assert.ok(darkView(c, eyes, new Map()).has('6,6'), 'torche allumée vue de loin');
  assert.throws(() => toggleDoor(c, 6, 6, false, [c.combatants[1]]), /torche/);
  c = toggleDoor(c, 6, 6, false, [c.combatants[0]]);
  assert.equal(c.map!.cells!['6,6'], 'torch-off');
  assert.ok(!darkView(c, eyes, new Map()).has('6,6'), 'éteinte : plus rien');
  assert.equal(toggleDoor(c, 6, 6, true, []).map!.cells!['6,6'], 'torch', 'le MJ la rallume de loin');
});

test('sort Lumière : la cible éclaire 6 m, même un ennemi (Lueurs féeriques)', () => {
  let c = normalizeCombat({ round: 1, map: { cols: 14, rows: 14, dark: true }, combatants: [cb('a', 'pc', { x: 0, y: 0 }), cb('g', 'monster', { x: 10, y: 10 })] });
  const eyes = [c.combatants[0]];
  assert.ok(!darkView(c, eyes, new Map()).has('10,10'));
  c = addEffect(c, ['g'], presetOf('Lueurs féeriques')!, 'a');
  const v = darkView(c, eyes, new Map());
  assert.ok(v.has('10,10') && v.has('9,9') && !v.has('7,7'), 'gobelin éclairé (3 m)');
  c = addEffect(c, ['a'], presetOf('Lumière')!);
  assert.ok(darkView(c, eyes, new Map()).has('4,0'), 'Lumière sur soi : 4 cases');
  assert.throws(() => checkEffect({ name: 'Soleil', icon: '', rounds: 5, light: 100 }), /invalide/);
});
