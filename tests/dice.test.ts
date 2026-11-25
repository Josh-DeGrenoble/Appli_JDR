import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendDie, bumpModifier, rollDice, statFormula, DiceError } from '../src/lib/dice';

// Générateur déterministe : renvoie toujours la valeur max, ou une séquence.
const max = (s: number) => s;
const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

test('2d6+3 avec dés au max = 15', () => {
  const r = rollDice('2d6+3', max);
  assert.equal(r.total, 15);
  assert.equal(r.detail, '[6, 6] + 3');
});

test('d20 et d% sont acceptés', () => {
  assert.equal(rollDice('d20', max).total, 20);
  assert.equal(rollDice('d%', max).total, 100);
});

test('4d6kh3 garde les 3 meilleurs', () => {
  const r = rollDice('4d6kh3', seq([1, 5, 3, 6]));
  assert.equal(r.total, 14);
  assert.match(r.detail, /~1~/);
});

test('2d20kl1 = désavantage', () => {
  assert.equal(rollDice('2d20kl1', seq([17, 4])).total, 4);
});

test('soustraction et combinaisons', () => {
  assert.equal(rollDice('1d8+1d6-2', max).total, 12);
  assert.equal(rollDice('10-1d4', max).total, 6);
});

test('dés Fudge', () => {
  // rng(3) -> 3 donne +1
  assert.equal(rollDice('4dF', max).total, 4);
});

test('signes doubles produits par {mod} négatif', () => {
  assert.equal(statFormula('1d20+{mod}', 8), '1d20+-1');
  assert.equal(rollDice('1d20+-1', max).total, 19);
});

test('formules invalides', () => {
  assert.throws(() => rollDice('', max), DiceError);
  assert.throws(() => rollDice('abc', max), DiceError);
  assert.throws(() => rollDice('101d6', max), DiceError);
  assert.throws(() => rollDice('1d1', max), DiceError);
});

test('appendDie et bumpModifier', () => {
  assert.equal(appendDie('', 6), '1d6');
  assert.equal(appendDie('1d6', 6), '2d6');
  assert.equal(appendDie('2d6', 8), '2d6+1d8');
  assert.equal(bumpModifier('1d20', 1), '1d20+1');
  assert.equal(bumpModifier('1d20+1', -1), '1d20');
  assert.equal(bumpModifier('1d20+1', -2), '1d20-1');
});

test('le vrai hasard reste dans les bornes', () => {
  for (let i = 0; i < 500; i++) {
    const t = rollDice('1d20').total;
    assert.ok(t >= 1 && t <= 20);
  }
});
