// Tests v0.20 : test demandé au groupe (requests.ts), suggestion du tour des monstres (monsterAi.ts),
// résistances des espèces à la création (srd/creation.ts, creation.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanLabel, requestBonus, requestLabel, requestResults, requestTag } from '../src/lib/dnd/requests';
import { suggestMonster } from '../src/lib/dnd/monsterAi';
import { speciesDefenses } from '../src/lib/dnd/srd/creation';
import { normalizeSheet } from '../src/lib/dnd/sheet';
import { normalizeCombat, type Combatant } from '../src/lib/dnd/combat';
import { monsterActions } from '../src/lib/dnd/combatActions';
import { distance } from '../src/lib/dnd/grid';
import type { Roll } from '../src/lib/types';

test('test demandé : nom, bonus, réponses (premier jet de chaque perso)', () => {
  const req = { id: 'r1', kind: 'skill' as const, key: 'perception', dc: 15, targets: ['a', 'b'] };
  assert.equal(requestLabel(req), 'Perception');
  assert.equal(requestLabel({ kind: 'save', key: 'dex' }), 'Sauvegarde de DEX');
  const s = normalizeSheet({ level: 1, abilities: { str: 10, dex: 14, con: 10, int: 10, wis: 14, cha: 10 }, skills: { perception: 1 } });
  assert.equal(requestBonus(s, req).bonus, 4);
  const roll = (label: string, total: number, t: string): Roll => ({ id: label + t, campaign_id: 'c', user_id: 'u', author_name: 'x', label, formula: '', detail: '', total, secret: false, created_at: t });
  const res = requestResults([roll(`${requestTag('r1', 'a')}🎯 Perception`, 17, '2'), roll(`${requestTag('r1', 'a')}🎯 Perception`, 3, '3'), roll(`${requestTag('r0', 'b')}x`, 9, '1')], 'r1');
  assert.deepEqual([...res], [['a', 17]]);
  assert.equal(cleanLabel(`${requestTag('r1', 'a')}🎯 Perception`), '🎯 Perception');
});

test('suggestion du monstre : l’ennemi debout le plus proche à portée', () => {
  const tok = (id: string, kind: 'pc' | 'monster', x: number, y: number): Combatant => ({ id, name: id, kind, avatar: '', initiative: 1, initBonus: 0, conditions: [], x, y });
  const combat = normalizeCombat({ active: true, combatants: [tok('g', 'monster', 0, 0), tok('loin', 'pc', 6, 0), tok('pres', 'pc', 1, 1), tok('ko', 'pc', 0, 1)] });
  const acts = monsterActions({ hp: 7, maxHp: 7, ac: 13, notes: '', attacks: [
    { id: 'c', name: 'Cimeterre', bonus: 4, damage: '1d6+2', range: 1.5, type: 'tranchant' },
    { id: 'a', name: 'Arc court', bonus: 4, damage: '1d6+2', range: 24, type: 'perçant' },
  ] });
  const inReach = (a: { range: number }, x: Combatant) => distance(combat.combatants[0], x) <= Math.max(1.5, a.range);
  const s = suggestMonster(combat, combat.combatants[0], acts, inReach, (x) => x.id !== 'ko')!;
  assert.equal(s.target.id, 'pres');
  assert.equal(s.action.name, 'Cimeterre');
  const far = suggestMonster(combat, combat.combatants[0], acts, inReach, (x) => x.id === 'loin')!;
  assert.equal(far.action.name, 'Arc court');
  assert.equal(suggestMonster(combat, combat.combatants[0], acts, () => false, () => true), null);
});

test('espèces : résistances à la création', () => {
  assert.deepEqual(speciesDefenses('Nain'), { resist: ['poison'] });
  assert.deepEqual(speciesDefenses('Tieffelin'), { resist: ['feu'] });
  assert.deepEqual(speciesDefenses('Tieffelin', 'nécrotique'), { resist: ['nécrotique'] });
  assert.deepEqual(speciesDefenses('Drakéide', 'froid'), { resist: ['froid'] });
  assert.equal(speciesDefenses('Elfe'), undefined);
});
