// Tests des calculs D&D 2024 (src/lib/dnd).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  abilityMod, applyHpDelta, d20Formula, deathSaveResult, effectiveSpeed, longRest, passivePerception,
  profBonus, saveBonus, skillBonus, suggestedMaxHp, totalGold,
} from '../src/lib/dnd/rules';
import { normalizeSheet } from '../src/lib/dnd/sheet';

test('modificateurs', () => {
  assert.deepEqual([1, 8, 9, 10, 11, 15, 20, 30].map(abilityMod), [-5, -1, -1, 0, 0, 2, 5, 10]);
});

test('bonus de maîtrise par niveau', () => {
  assert.deepEqual([1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(profBonus), [2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
});

test('sauvegardes, compétences, expertise, perception passive', () => {
  const s = normalizeSheet({ level: 5, abilities: { str: 10, dex: 16, con: 14, int: 8, wis: 13, cha: 10 }, saveProf: ['dex'], skills: { stealth: 2, perception: 1 } });
  assert.equal(saveBonus(s, 'dex'), 6); // +3 mod +3 maîtrise
  assert.equal(saveBonus(s, 'int'), -1);
  assert.equal(skillBonus(s, 'stealth'), 9); // +3 + 2×3
  assert.equal(skillBonus(s, 'perception'), 4); // +1 + 3
  assert.equal(passivePerception(s), 14);
});

test('formule d20 : avantage, désavantage, épuisement', () => {
  assert.equal(d20Formula(5), '1d20+5');
  assert.equal(d20Formula(5, 'adv'), '2d20kh1+5');
  assert.equal(d20Formula(-1, 'dis'), '2d20kl1-1');
  assert.equal(d20Formula(3, 'normal', 2), '1d20-1');
  assert.equal(d20Formula(0), '1d20');
});

test('dégâts : PV temporaires d’abord ; soins plafonnés', () => {
  assert.deepEqual(applyHpDelta({ current: 20, max: 30, temp: 5 }, -8), { current: 17, max: 30, temp: 0 });
  assert.deepEqual(applyHpDelta({ current: 20, max: 30, temp: 5 }, -3), { current: 20, max: 30, temp: 2 });
  assert.deepEqual(applyHpDelta({ current: 4, max: 30, temp: 0 }, -10), { current: 0, max: 30, temp: 0 });
  assert.deepEqual(applyHpDelta({ current: 25, max: 30, temp: 0 }, 10), { current: 30, max: 30, temp: 0 });
});

test('jets contre la mort', () => {
  const z = { success: 0, failure: 0 };
  assert.deepEqual(deathSaveResult(20, z), { revive: true, success: 0, failure: 0 });
  assert.deepEqual(deathSaveResult(1, { success: 1, failure: 0 }), { revive: false, success: 1, failure: 2 });
  assert.deepEqual(deathSaveResult(10, z), { revive: false, success: 1, failure: 0 });
  assert.deepEqual(deathSaveResult(9, { success: 0, failure: 2 }), { revive: false, success: 0, failure: 3 });
});

test('PV conseillés et repos long', () => {
  const s = normalizeSheet({ className: 'Guerrier', level: 3, abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 } });
  assert.equal(suggestedMaxHp(s), 28); // 10+2 puis 2×(6+2)
  const r = longRest({ ...s, hitDiceUsed: 2, exhaustion: 2 }, { current: 3, max: 28, temp: 4 });
  assert.deepEqual(r.hp, { current: 28, max: 28, temp: 0 });
  assert.equal(r.sheet.hitDiceUsed, 0);
  assert.equal(r.sheet.exhaustion, 1);
});

test('épuisement et vitesse ; bourse ; fiche incomplète', () => {
  assert.equal(effectiveSpeed(normalizeSheet({ speed: 9, exhaustion: 2 })), 6);
  assert.equal(totalGold({ pp: 1, po: 2, pe: 1, pa: 3, pc: 5 }), 12.85);
  const n = normalizeSheet({ level: 99 } as never);
  assert.equal(n.level, 20);
  assert.equal(n.abilities.cha, 10);
});
