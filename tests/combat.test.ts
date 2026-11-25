// Tests du combat : ordre d'initiative, tours, rounds, monstres vaincus (src/lib/dnd/combat.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  currentCombatant, monsterStatus, nextTurn, normalizeCombat, numberedNames, previousTurn, removeCombatant,
  sortedCombatants, startCombat, upsertCombatant, type Combatant,
} from '../src/lib/dnd/combat';

const cb = (id: string, initiative: number | null, initBonus = 0, kind: Combatant['kind'] = 'pc', status?: Combatant['status']): Combatant => ({
  id, name: id, kind, avatar: '', initiative, initBonus, conditions: [], status,
});

test('ordre d’initiative et égalités', () => {
  const c = normalizeCombat({ combatants: [cb('gob', 15, 2, 'monster'), cb('aria', 15, 3), cb('bram', 20), cb('zed', null)] });
  assert.deepEqual(sortedCombatants(c).map((x) => x.id), ['bram', 'aria', 'gob', 'zed']);
});

test('tours, rounds, monstres vaincus sautés', () => {
  let c = startCombat(normalizeCombat({ combatants: [cb('a', 20), cb('m', 10, 0, 'monster', 'vaincu'), cb('b', 5)] }));
  assert.equal(currentCombatant(c)!.id, 'a');
  c = nextTurn(c);
  assert.equal(currentCombatant(c)!.id, 'b', 'le monstre vaincu est sauté');
  c = nextTurn(c);
  assert.equal(c.round, 2);
  assert.equal(currentCombatant(c)!.id, 'a');
  c = previousTurn(c);
  assert.equal(c.round, 1);
  assert.equal(currentCombatant(c)!.id, 'b');
});

test('ajouter / retirer en gardant le tour en cours', () => {
  let c = startCombat(normalizeCombat({ combatants: [cb('a', 20), cb('b', 10)] }));
  c = nextTurn(c); // tour de b
  c = upsertCombatant(c, cb('rapide', 25)); // arrive en tête de l'ordre
  assert.equal(currentCombatant(c)!.id, 'b');
  c = removeCombatant(c, 'a');
  assert.equal(currentCombatant(c)!.id, 'b');
  assert.equal(currentCombatant(normalizeCombat(null)), null);
});

test('état des monstres et noms numérotés', () => {
  assert.equal(monsterStatus(10, 10), 'indemne');
  assert.equal(monsterStatus(7, 10), 'blessé');
  assert.equal(monsterStatus(5, 10), 'en sang');
  assert.equal(monsterStatus(0, 10), 'vaincu');
  assert.deepEqual(numberedNames('Gobelin', 3, ['Gobelin 1']), ['Gobelin 2', 'Gobelin 3', 'Gobelin 4']);
  assert.deepEqual(numberedNames('Ogre', 1, []), ['Ogre']);
});
