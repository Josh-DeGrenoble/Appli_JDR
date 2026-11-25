// Tests v0.19 : types de dégâts (damage.ts), effets temporaires (effects.ts), concentration et résistances dans
// la résolution des actions (resolve.ts), actions « buff » (Bénédiction, Bouclier, Rage).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adjustDamage, cycleDefense, damageTypeOf } from '../src/lib/dnd/damage';
import { addEffect, activeEffects, concentrationDc, effectsAc, effectsDice, EFFECT_PRESETS, presetOf } from '../src/lib/dnd/effects';
import { normalizeCombat, type Combatant } from '../src/lib/dnd/combat';
import { describeResults, resolveAction } from '../src/lib/dnd/resolve';
import { combatActions } from '../src/lib/dnd/combatActions';
import { normalizeSheet } from '../src/lib/dnd/sheet';
import { blankCharacterValues } from '../src/lib/templates';
import type { Character } from '../src/lib/types';

test('types de dégâts : lus dans le texte ; résistance, immunité, vulnérabilité', () => {
  assert.equal(damageTypeOf('Sphère de 6 m, dégâts de feu'), 'feu');
  assert.equal(damageTypeOf('perçant'), 'perforant');
  assert.equal(damageTypeOf('Souffle de froid'), 'froid');
  assert.equal(damageTypeOf(''), undefined);
  assert.deepEqual(adjustDamage(9, 'feu', { resist: ['feu'] }), { amount: 4, note: 'résistant' });
  assert.deepEqual(adjustDamage(9, 'poison', { immune: ['poison'] }), { amount: 0, note: 'immunisé' });
  assert.deepEqual(adjustDamage(5, 'contondant', { vuln: ['contondant'] }), { amount: 10, note: 'vulnérable' });
  assert.deepEqual(adjustDamage(5, 'feu', { resist: ['feu'], vuln: ['feu'] }), { amount: 5 });
  let d = cycleDefense(undefined, 'feu');
  assert.deepEqual(d.resist, ['feu']);
  d = cycleDefense(cycleDefense(cycleDefense(d, 'feu'), 'feu'), 'feu');
  assert.deepEqual([d.resist, d.immune, d.vuln], [[], [], []]);
});

const pc = (id: string, sheet: object, hp = 20): Character =>
  ({ id, campaign_id: 'c', owner_id: 'u', name: id, avatar: '🙂', subtitle: '', currency: 0, notes: '', updated_at: '', ...blankCharacterValues(sheet, hp) }) as Character;
const tok = (id: string, kind: 'pc' | 'monster', extra: Partial<Combatant> = {}): Combatant =>
  ({ id, name: id, kind, avatar: '🙂', initiative: 10, initBonus: 0, conditions: [], x: 0, y: 0, ...extra }) as Combatant;

test('effets : durée en rounds, CA et dés en plus, remplacement de la concentration', () => {
  let c = normalizeCombat({ active: true, round: 2, combatants: [tok('a', 'pc'), tok('b', 'pc')] });
  c = addEffect(c, ['a', 'b'], presetOf('Bénédiction')!, 'clerc');
  c = addEffect(c, ['a'], presetOf('Bouclier')!);
  const a = c.combatants[0];
  assert.equal(effectsAc(a, 2), 5);
  assert.equal(effectsAc(a, 3), 0, 'Bouclier : 1 round');
  assert.equal(effectsDice(a, 2, 'attack'), '+1d4');
  assert.equal(activeEffects(a, 11).length, 1, 'Bénédiction : rounds 2 à 11');
  assert.equal(activeEffects(a, 12).length, 0);
  c = addEffect(c, ['b'], presetOf('Bouclier de la foi')!, 'clerc');
  assert.deepEqual(c.combatants.map((x) => (x.effects ?? []).map((e) => e.name)), [['Bouclier'], ['Bouclier de la foi']], 'nouvelle concentration du clerc');
  assert.equal(concentrationDc(7), 10);
  assert.equal(concentrationDc(44), 22);
  assert.ok(EFFECT_PRESETS.length >= 6);
});

test('résolution : résistance du monstre, Bouclier du perso, concentration perdue', () => {
  const caster = pc('mage', { abilities: { str: 10, dex: 10, con: 8, int: 16, wis: 10, cha: 10 }, concentration: 'Bénédiction' });
  let combat = normalizeCombat({ active: true, round: 1, turn: 0, combatants: [tok('orc', 'monster', { initiative: 20 }), tok('p', 'pc', { characterId: 'mage', initiative: 5 }), tok('ally', 'pc', { initiative: 4 })] });
  combat = addEffect(combat, ['ally'], presetOf('Bénédiction')!, 'p');
  const secrets = { monsters: { orc: { hp: 20, maxHp: 20, ac: 12, notes: '', defenses: { resist: ['feu'] } } } };
  // Bouclier : CA 10 + 5 → l'attaque à 14 rate
  const shielded = addEffect(combat, ['p'], presetOf('Bouclier')!);
  const miss = resolveAction({ combat: shielded, secrets, characters: [caster] }, 'orc', { kind: 'attack', economy: 'attack', targets: ['p'], label: 'x', total: 14, natural: 10, damage: 6 }, true, () => 1);
  assert.equal(miss.results[0].hit, false);
  // Touché : 12 dégâts, sauvegarde de CON (1 - 1 = 0 < DD 10) ratée → concentration et Bénédiction perdues
  const hit = resolveAction({ combat, secrets, characters: [caster] }, 'orc', { kind: 'attack', economy: 'attack', targets: ['p'], label: 'x', total: 18, natural: 15, damage: 12, damageType: 'tranchant' }, true, () => 1);
  assert.deepEqual(hit.results[0].conc, { dc: 10, roll: 0, kept: false });
  assert.deepEqual(hit.sheets.get('mage'), { concentration: '' });
  assert.equal(hit.combat.combatants.find((x) => x.id === 'ally')!.effects?.length, 0, 'Bénédiction tombée');
  assert.match(describeResults(hit.results), /perd sa concentration/);
  // Le mage lance un sort de feu sur l'orc résistant : moitié
  const fire = resolveAction({ combat: { ...combat, turn: 1 }, secrets, characters: [caster] }, 'p', { kind: 'auto', economy: 'action', targets: ['orc'], label: 'x', damage: 9, damageType: 'feu' }, false, () => 1);
  assert.equal(fire.results[0].amount, 4);
  assert.equal(fire.results[0].note, 'résistant');
  assert.equal(fire.secrets.monsters.orc.hp, 16);
});

test('actions « buff » : sorts et capacités avec un effet prêt', () => {
  const s = normalizeSheet({
    className: 'Clerc', level: 3,
    spells: [{ id: 'b', name: 'Bénédiction', level: 1, prepared: true, ritual: false, concentration: true, damage: '', notes: '', range: 9 }],
    features: [{ id: 'r', name: 'Rage', max: 3, used: 0, recharge: 'long', notes: '' }],
    spellcasting: { ability: 'wis', pact: false, preparedMax: 4, slots: { 1: { max: 2, used: 0 } } },
  });
  const acts = combatActions(s, []);
  const bless = acts.find((a) => a.name === 'Bénédiction')!;
  assert.equal(bless.effect, 'buff');
  assert.equal(bless.targeting, 'ally');
  const rage = acts.find((a) => a.name === 'Rage')!;
  assert.equal(rage.targeting, 'self');
  const combat = normalizeCombat({ active: true, round: 1, combatants: [tok('c', 'pc'), tok('d', 'pc')] });
  const r = resolveAction({ combat, secrets: { monsters: {} }, characters: [] }, 'c', { kind: 'buff', economy: 'action', targets: ['c', 'd'], label: 'x', effect: bless.buff }, true, () => 1);
  assert.equal(r.results.length, 2);
  assert.equal(r.combat.combatants[1].effects?.[0].source, 'c');
  assert.throws(() => resolveAction({ combat, secrets: { monsters: {} }, characters: [] }, 'c', { kind: 'buff', economy: 'action', targets: ['c'], label: 'x', effect: { name: 'Triche', icon: '', rounds: 500, ac: 20 } }, true, () => 1), /Effet invalide/);
});
