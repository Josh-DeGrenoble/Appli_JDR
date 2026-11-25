// Tests des actions de combat : liste d'actions, économie, distances, résolution (src/lib/dnd/combatActions.ts, resolve.ts, grid.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAfford, cantripDice, combatActions, remaining } from '../src/lib/dnd/combatActions';
import { FRESH_ECONOMY, normalizeCombat, startCombat, type Combatant } from '../src/lib/dnd/combat';
import { describeResults, payEconomy, resolveAction } from '../src/lib/dnd/resolve';
import { normalizeSheet } from '../src/lib/dnd/sheet';
import { distance, fmtDistance, inRange, movementLeft, posOf } from '../src/lib/dnd/grid';
import { blankCharacterValues } from '../src/lib/templates';
import type { Character } from '../src/lib/types';

const sheet = normalizeSheet({
  className: 'Magicien', level: 5, abilities: { str: 10, dex: 14, con: 12, int: 18, wis: 10, cha: 10 },
  attacks: [{ id: 'dag', name: 'Dague', ability: 'dex', proficient: true, bonus: 0, damage: '1d4', addMod: true, damageBonus: 0, damageType: 'perforant', notes: '', range: 1.5 }],
  spells: [
    { id: 'tf', name: 'Trait de feu', level: 0, prepared: true, ritual: false, concentration: false, damage: '1d10', notes: '', range: 36, effect: 'attack' },
    { id: 'bf', name: 'Boule de feu', level: 3, prepared: true, ritual: false, concentration: false, damage: '8d6', notes: '', range: 45, effect: 'save', save: 'dex', half: true, area: true },
    { id: 'mg', name: 'Mot de guérison', level: 1, prepared: false, ritual: false, concentration: false, damage: '2d4', notes: '', effect: 'heal', cast: 'bonus' },
  ],
  spellcasting: { ability: 'int', pact: false, preparedMax: 0, slots: { 3: { max: 2, used: 1 } } },
});

test('liste d’actions : attaque, sort mineur amélioré, sort à sauvegarde, sort non préparé exclu', () => {
  const all = combatActions(sheet, []);
  const acts = all.filter((a) => a.source !== 'standard');
  assert.deepEqual(acts.map((a) => a.name), ['Dague', 'Trait de feu', 'Boule de feu']);
  assert.ok(all.some((a) => a.name === 'Foncer' && a.dash), 'actions standard');
  assert.equal(acts[1].damage, '2d10', 'sort mineur niveau 5');
  assert.equal(acts[2].dc, 15);
  assert.deepEqual(acts[2].uses, { left: 1, max: 2 });
  assert.equal(cantripDice('1d8', 17), '4d8');
});

test('économie d’actions et attaque supplémentaire', () => {
  let u = payEconomy({ ...FRESH_ECONOMY }, 'attack', 2);
  u = payEconomy(u, 'attack', 2);
  assert.throws(() => payEconomy(u, 'attack', 2), /attaque/);
  assert.throws(() => payEconomy(u, 'action'), /Action/);
  assert.deepEqual(remaining(payEconomy(u, 'bonus'), 2), { action: 0, bonus: 0, reaction: 1, attacks: 0 });
  const acts = combatActions(sheet, []);
  assert.equal(canAfford(acts[0], { ...FRESH_ECONOMY, action: 1 }, 1), false);
});

test('distances sur la carte (1 case = 1,5 m, diagonale = 1 case)', () => {
  assert.equal(distance({ x: 2, y: 2 }, { x: 3, y: 3 }), 1.5);
  assert.equal(distance({ x: 0, y: 0 }, { x: 4, y: 6 }), 9);
  assert.equal(fmtDistance(1.5), 'contact');
  assert.deepEqual(posOf({ zone: 3 }), { x: 6, y: 0 }, 'ancienne zone convertie');
  const a = { id: 'a', x: 0, y: 0 } as Combatant;
  assert.equal(inRange(a, { id: 'b', x: 2, y: 0 } as Combatant, 1.5), false);
  assert.equal(inRange(a, { id: 'b', x: 1, y: 1 } as Combatant, 1.5), true);
  assert.equal(movementLeft(9, { moved: 6 }), 3);
  assert.equal(movementLeft(9, { moved: 6, dash: 1 }), 12);
});

test('résolution : attaque contre CA secrète, sauvegarde, soin, tour', () => {
  const pc = { id: 'c1', campaign_id: 'x', owner_id: 'u', name: 'Elmira', avatar: '', subtitle: '', notes: '', updated_at: '', ...blankCharacterValues({ ac: 12 }, 20) } as Character;
  const cb = (id: string, kind: Combatant['kind'], extra: Partial<Combatant> = {}): Combatant => ({ id, name: id, kind, avatar: '', initiative: 10, initBonus: 0, conditions: [], ...extra });
  const combat = startCombat(normalizeCombat({ combatants: [cb('me', 'pc', { characterId: 'c1', initiative: 20, x: 0, y: 0 }), cb('g1', 'monster', { x: 1, y: 0 }), cb('g2', 'monster', { x: 1, y: 1 })] }));
  const secrets = { monsters: { g1: { hp: 7, maxHp: 7, ac: 15, notes: '', saves: { dex: 2 } }, g2: { hp: 7, maxHp: 7, ac: 15, notes: '' } } };
  const world = { combat, secrets, characters: [pc] };

  const hit = resolveAction(world, 'me', { kind: 'attack', economy: 'attack', targets: ['g1'], label: 'Dague', total: 15, natural: 12, damage: 5 }, false, () => 10);
  assert.equal(hit.results[0].hit, true);
  assert.equal(hit.secrets.monsters.g1.hp, 2);
  assert.equal(hit.combat.combatants[1].status, 'en sang');
  const miss = resolveAction(world, 'me', { kind: 'attack', economy: 'attack', targets: ['g1'], label: 'Dague', total: 14, natural: 12, damage: 5 }, false, () => 10);
  assert.equal(miss.results[0].hit, false);

  const fb = resolveAction(world, 'me', { kind: 'save', economy: 'action', targets: ['g1', 'g2'], label: 'Boule', dc: 15, ability: 'dex', half: true, damage: 20 }, false, () => 13);
  assert.deepEqual(fb.results.map((r) => [r.saved, r.amount]), [[true, 10], [false, 20]]); // g1 : 13+2 = 15 réussi
  assert.equal(fb.combat.combatants[2].status, 'vaincu');
  assert.match(describeResults(fb.results), /g2 : sauvegarde ratée \(13\), 20 dégâts/);

  const heal = resolveAction({ ...world, characters: [{ ...pc, resources: { ...pc.resources, pv: { current: 5, max: 20 } } }] }, 'me', { kind: 'heal', economy: 'bonus', targets: ['me'], label: 'Potion', heal: 7 }, false, () => 1);
  assert.equal(heal.hp.get('c1')!.current, 12);

  const notTurn = startCombat(normalizeCombat({ combatants: [cb('g1', 'monster', { initiative: 25 }), cb('me', 'pc', { characterId: 'c1' })] }));
  assert.throws(() => resolveAction({ ...world, combat: notTurn }, 'me', { kind: 'none', economy: 'action', targets: [], label: '' }, false, () => 1), /tour/);
  assert.doesNotThrow(() => resolveAction({ ...world, combat: notTurn }, 'me', { kind: 'none', economy: 'reaction', targets: [], label: '' }, false, () => 1));
});

test('bibliothèque : données de combat des sorts', async () => {
  const { spellCombatFields, SPELL_META } = await import('../src/lib/dnd/srd/spellMeta');
  const { SPELL_LIBRARY } = await import('../src/lib/dnd/srd/library');
  const names = new Set(SPELL_LIBRARY.map((s) => s.name));
  assert.deepEqual(Object.keys(SPELL_META).filter((n) => !names.has(n)), [], 'chaque entrée correspond à un sort de la bibliothèque');
  assert.deepEqual(spellCombatFields('Boule de feu'), { effect: 'save', range: 45, save: 'dex', half: true, area: true, cast: 'action', upcast: '1d6', shape: { kind: 'sphere', size: 6 } });
  const { SPELL_UPCAST } = await import('../src/lib/dnd/srd/spellMeta');
  assert.deepEqual(Object.keys(SPELL_UPCAST).filter((n) => !names.has(n)), []);
  assert.equal(spellCombatFields('Mot de guérison').cast, 'bonus');
  assert.equal(spellCombatFields('Bouclier').cast, 'reaction');
});

test('déplacement : vitesse, Foncer, case occupée, tour', async () => {
  const { applyMove } = await import('../src/lib/dnd/resolve');
  const cb = (id: string, extra: Partial<Combatant>): Combatant => ({ id, name: id, kind: 'pc', avatar: '', initiative: 10, initBonus: 0, conditions: [], ...extra });
  const c = startCombat(normalizeCombat({ combatants: [cb('me', { initiative: 20, x: 0, y: 0 }), cb('o', { x: 5, y: 0 })] }));
  const moved = applyMove(c, 'me', 4, 4, false, 9); // 4 cases = 6 m
  assert.equal(moved.combatants[0].used!.moved, 6);
  assert.throws(() => applyMove(moved, 'me', 7, 4, false, 9), /Trop loin/); // 3 m restants, 4,5 m demandés
  assert.throws(() => applyMove(c, 'me', 5, 0, false, 9), /occupée/);
  assert.throws(() => applyMove(c, 'o', 6, 0, false, 9), /tour/);
  assert.doesNotThrow(() => applyMove(c, 'o', 11, 15, true, 9), 'le MJ déplace librement');
  const dashed = { ...c, combatants: c.combatants.map((x) => (x.id === 'me' ? { ...x, used: { ...FRESH_ECONOMY, dash: 1 } } : x)) };
  assert.doesNotThrow(() => applyMove(dashed, 'me', 0, 11, false, 9), '16,5 m avec Foncer');
});

test('sorts à niveau supérieur et attaques de monstre', async () => {
  const { atSlot, scaleFormula, monsterActions } = await import('../src/lib/dnd/combatActions');
  assert.equal(scaleFormula('1d4+1', 2), '2d4+2');
  assert.equal(atSlot('8d6', { spellLevel: 3, upcast: '1d6' }, 5), '8d6+2d6');
  assert.equal(atSlot('8d6', { spellLevel: 3, upcast: '1d6' }, 3), '8d6');
  assert.equal(atSlot('2d8', { spellLevel: 1 }, 4), '2d8', 'sans dés en plus définis');
  const acts = monsterActions({ hp: 7, maxHp: 7, ac: 15, notes: '', attacks: [{ id: 'x', name: 'Cimeterre', bonus: 4, damage: '1d6+2', range: 1.5, type: 'tranchant' }] });
  assert.equal(acts[0].summary, '+4 · 1d6+2 tranchant');
  assert.equal(acts[0].critDamage, '2d6+2');
});
