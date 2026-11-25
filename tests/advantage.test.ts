// Tests avantage/désavantage automatiques (src/lib/dnd/advantage.ts) et règles du perso à 0 PV (resolve.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoMode, modeTag } from '../src/lib/dnd/advantage';
import { normalizeCombat, startCombat, type Combatant } from '../src/lib/dnd/combat';
import { resolveAction } from '../src/lib/dnd/resolve';
import type { Character } from '../src/lib/types';

test('avantage automatique : états, cible, MJ, annulation', () => {
  assert.equal(autoMode({ kind: 'attack', self: [] }).mode, 'normal');
  assert.equal(autoMode({ kind: 'attack', self: ['poisoned'] }).mode, 'dis');
  assert.equal(autoMode({ kind: 'check', self: ['poisoned'] }).mode, 'dis');
  assert.equal(autoMode({ kind: 'save', ability: 'con', self: ['poisoned'] }).mode, 'normal', 'pas sur les sauvegardes');
  assert.equal(autoMode({ kind: 'save', ability: 'dex', self: ['restrained'] }).mode, 'dis');
  assert.equal(autoMode({ kind: 'attack', self: [], target: ['prone'], melee: true }).mode, 'adv');
  assert.equal(autoMode({ kind: 'attack', self: [], target: ['prone'], melee: false }).mode, 'dis');
  assert.equal(autoMode({ kind: 'attack', self: [], target: ['stunned'] }).mode, 'adv');
  assert.equal(autoMode({ kind: 'check', self: [], grant: 'adv' }).mode, 'adv');
  const both = autoMode({ kind: 'attack', self: ['poisoned'], grant: 'adv' });
  assert.equal(both.mode, 'normal', 'avantage + désavantage s’annulent');
  assert.match(modeTag(both), /s’annulent/);
  assert.equal(modeTag(autoMode({ kind: 'check', self: [], grant: 'adv' })), ' (avantage : donné par le MJ)');
});

test('perso à 0 PV : plus d’action', () => {
  const cb = (id: string, extra: Partial<Combatant>): Combatant => ({ id, name: id, kind: 'pc', avatar: '', initiative: 10, initBonus: 0, conditions: [], ...extra });
  const combat = startCombat(normalizeCombat({ combatants: [cb('me', { initiative: 20, characterId: 'c1' }), cb('g', { kind: 'monster', status: 'indemne' })] }));
  const ch = { id: 'c1', resources: { pv: { current: 0, max: 20 } }, sheet: {} } as unknown as Character;
  const world = { combat, secrets: { monsters: { g: { hp: 7, maxHp: 7, ac: 10, notes: '' } } }, characters: [ch] };
  assert.throws(() => resolveAction(world, 'me', { kind: 'none', economy: 'action', targets: [], label: 'x' }, false, () => 10), /À terre/);
  const up = { ...world, characters: [{ ...ch, resources: { pv: { current: 5, max: 20 } } } as unknown as Character] };
  assert.doesNotThrow(() => resolveAction(up, 'me', { kind: 'none', economy: 'action', targets: [], label: 'x' }, false, () => 10));
});

test('Esquiver et Aider : désavantage contre celui qui esquive, avantage consommé par l’aidé', () => {
  assert.equal(autoMode({ kind: 'attack', self: [], targetDodging: true }).mode, 'dis');
  assert.equal(autoMode({ kind: 'attack', self: [], helped: true }).mode, 'adv');
  const cb = (id: string, extra: Partial<Combatant>): Combatant => ({ id, name: id, kind: 'pc', avatar: '', initiative: 10, initBonus: 0, conditions: [], ...extra });
  const combat = startCombat(normalizeCombat({ combatants: [cb('me', { initiative: 20 }), cb('ally', {}), cb('g', { kind: 'monster', status: 'indemne' })] }));
  const world = { combat, secrets: { monsters: { g: { hp: 7, maxHp: 7, ac: 30, notes: '' } } }, characters: [] };
  const helped = resolveAction(world, 'me', { kind: 'none', economy: 'action', targets: ['ally'], label: 'Aider', help: true }, false, () => 10);
  assert.equal(helped.combat.combatants.find((x) => x.id === 'ally')!.helped, true);
  const after = resolveAction({ ...world, combat: helped.combat }, 'ally', { kind: 'attack', economy: 'free', targets: ['g'], label: 'x', total: 5, natural: 5, damage: 1 }, true, () => 10);
  assert.equal(after.combat.combatants.find((x) => x.id === 'ally')!.helped, undefined, 'aide consommée');
  const dodged = resolveAction(world, 'me', { kind: 'none', economy: 'action', targets: [], label: 'Esquiver', dodge: true }, false, () => 10);
  assert.equal(dodged.combat.combatants.find((x) => x.id === 'me')!.used!.dodge, 1);
});
