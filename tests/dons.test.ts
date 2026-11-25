// Tests v0.21 : dons (création, montée de niveau, parité SQL), vision dans le noir, compagnons sur la carte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FEATS } from '../src/lib/dnd/srd/feats';
import { checkFeatLevelUp, featInitiative, featPatch } from '../src/lib/dnd/feats';
import { applyLevelUp, checkLevelUp, levelUpPlan } from '../src/lib/dnd/levelup';
import { buildCharacter, suggestStandard } from '../src/lib/dnd/creation';
import { normalizeSheet, type DndSheet } from '../src/lib/dnd/sheet';
import { initiative } from '../src/lib/dnd/rules';
import { darkView, playerView } from '../src/lib/dnd/sight';
import { COMPANION_TEMPLATES, companionFrom, dismissCompanion, summonCompanion } from '../src/lib/dnd/companions';
import { normalizeCombat, startCombat, type Combatant } from '../src/lib/dnd/combat';
import { resolveAction } from '../src/lib/dnd/resolve';
import { blankCharacterValues } from '../src/lib/templates';
import type { Character } from '../src/lib/types';

const fighter = (extra: Partial<DndSheet> = {}) => normalizeSheet({ className: 'Guerrier', level: 3, hitDie: 10, speed: 9,
  abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 }, saveProf: ['str', 'con'], ...extra });

test('parité : dons identiques dans le SQL (04_niveaux_dons.sql)', () => {
  const sql = readFileSync(new URL('../supabase/migrations/04_niveaux_dons.sql', import.meta.url), 'utf8');
  const lit = sql.match(/select \('(.*)'::jsonb\)->regexp_replace/)![1].replace(/''/g, "'");
  const json = JSON.parse(lit);
  assert.deepEqual(Object.keys(json), FEATS.map((f) => f.name));
  for (const { name, text: _t, kind: _k, ...rest } of FEATS) assert.deepEqual(json[name], JSON.parse(JSON.stringify(rest)), name);
});

test('création : don d’historique (Vigilant, Robuste) et don en plus pour l’humain', () => {
  const base = { className: 'Roublard', level: 1, base: suggestStandard('Roublard'), bonus: { dex: 2, con: 1 }, classSkills: [], equipment: 'gold' as const };
  const crim = buildCharacter({ ...base, background: 'Criminel', species: 'Elfe' });
  const s = normalizeSheet(crim.sheet);
  assert.deepEqual(s.feats, ['Vigilant']);
  assert.equal(initiative(s), initiative({ ...s, feats: [] }) + 2, 'Vigilant : + maîtrise');
  const farm = buildCharacter({ ...base, background: 'Fermier', species: 'Humain', extraSkill: 'arcana', humanFeat: 'Chanceux' });
  const plain = buildCharacter({ ...base, background: 'Criminel', species: 'Humain', extraSkill: 'arcana' });
  assert.equal(farm.maxHp - plain.maxHp, 2 + (normalizeSheet(farm.sheet).abilities.con - normalizeSheet(plain.sheet).abilities.con >= 2 ? 1 : 0), 'Robuste +2 au niveau 1');
  const f = normalizeSheet(farm.sheet);
  assert.deepEqual(f.feats, ['Robuste', 'Chanceux']);
  assert.equal(f.features.find((x) => x.name === 'Chanceux')?.max, 2, 'points de chance');
  const doue = normalizeSheet(buildCharacter({ ...base, background: 'Noble', species: 'Elfe', featSkills: ['arcana', 'nature', 'medicine'] }).sheet);
  assert.equal(doue.skills.arcana, 1);
  assert.equal(doue.skills.medicine, 1);
});

test('montée de niveau : don à la place de l’amélioration (Résilient, Robuste, Mobile) et refus', () => {
  const s = fighter();
  const plan = levelUpPlan(s);
  assert.ok(plan.asi);
  const r = applyLevelUp(s, { hpGain: 6, feat: { name: 'Résilient', ability: 'dex' } });
  assert.deepEqual(r.patch.saveProf, ['str', 'con', 'dex']);
  assert.equal(r.patch.abilities!.dex, 15);
  assert.doesNotThrow(() => checkLevelUp(s, r.patch, r.hpGain));
  const rob = applyLevelUp(s, { hpGain: 6, feat: { name: 'Robuste' } });
  assert.equal(rob.hpGain, 6 + 8);
  assert.doesNotThrow(() => checkLevelUp(s, rob.patch, rob.hpGain));
  assert.throws(() => checkLevelUp(s, rob.patch, 6 + 8 + 11), /PV/);
  const mob = applyLevelUp(s, { hpGain: 6, feat: { name: 'Mobile', ability: 'dex' } });
  assert.equal(mob.patch.speed, 12);
  assert.throws(() => checkLevelUp(s, { ...mob.patch, speed: 15 }, mob.hpGain), /Vitesse/);
  assert.throws(() => checkFeatLevelUp(s, { feats: ['Robuste', 'Mobile'] }, 4, true), /Pas de don/);
  assert.throws(() => checkFeatLevelUp(s, { feats: ['Robuste'] }, 5, false), /Pas de don/);
  assert.throws(() => checkFeatLevelUp(s, { feats: ['Initié à la magie (clerc)'] }, 4, true), /Don invalide/);
  // Robuste déjà pris : +2 à chaque niveau
  const s5 = normalizeSheet({ ...s, level: 4, feats: ['Robuste'] });
  assert.equal(applyLevelUp(s5, { hpGain: 6 }).hpGain, 8);
  assert.throws(() => featPatch(s5, { name: 'Robuste' }, 5), /déjà/);
  assert.equal(featInitiative(normalizeSheet({ level: 9, feats: ['Vigilant'] })), 4);
});

const cb = (id: string, kind: Combatant['kind'], extra: Partial<Combatant> = {}): Combatant => ({ id, name: id, kind, avatar: '', initiative: 10, initBonus: 0, conditions: [], ...extra });

test('vision : obscurité, vision dans le noir, torche portée, torche murale', () => {
  const c = normalizeCombat({ map: { cols: 12, rows: 12, dark: true, cells: { '10,10': 'torch' } }, combatants: [cb('a', 'pc', { x: 0, y: 0 }), cb('b', 'pc', { x: 0, y: 6 })] });
  const v = darkView(c, c.combatants, new Map([['a', { dark: 8, light: 0 }], ['b', { dark: 0, light: 0 }]]));
  assert.ok(v.has('5,5'), 'vision dans le noir 12 m');
  assert.ok(v.has('10,10') && v.has('8,8'), 'torche murale visible de loin');
  assert.ok(!v.has('11,0'), 'trop loin dans le noir');
  const human = darkView(c, [c.combatants[1]], new Map([['b', { dark: 0, light: 4 }]]));
  assert.ok(human.has('3,6') && !human.has('6,0'), 'torche portée : 4 cases');
  assert.equal(playerView({ ...c, map: { ...c.map!, dark: false } }), null, 'sans obscurité : tout est visible');
});

test('compagnons : venir près du maître, être blessé à part, repartir', () => {
  const pc = { id: 'c1', campaign_id: 'x', owner_id: 'u', name: 'Thalia', avatar: '', subtitle: '', notes: '', updated_at: '', ...blankCharacterValues({ ac: 12 }, 20) } as Character;
  const wolf = companionFrom(COMPANION_TEMPLATES.find((t) => t.name === 'Loup')!);
  let combat = startCombat(normalizeCombat({ map: { cols: 12, rows: 12 }, combatants: [cb('me', 'pc', { characterId: 'c1', initiative: 20, initBonus: 2, x: 3, y: 3 }), cb('g', 'monster', { x: 6, y: 3, initiative: 5 })] }));
  combat = summonCompanion(combat, pc, wolf);
  assert.throws(() => summonCompanion(combat, pc, wolf), /déjà/);
  const tok = combat.combatants.find((x) => x.companion)!;
  assert.equal(Math.max(Math.abs(tok.x! - 3), Math.abs(tok.y! - 3)), 1, 'à côté');
  assert.equal(tok.initBonus, 1);
  const world = { combat, secrets: { monsters: { g: { hp: 7, maxHp: 7, ac: 12, notes: '' } } }, characters: [pc] };
  const r = resolveAction(world, 'g', { kind: 'attack', economy: 'free', targets: [tok.id], label: 'Morsure', total: 12, natural: 9, damage: 20 }, true, () => 10);
  assert.equal(r.results[0].hit, true, 'CA 12');
  const after = r.combat.combatants.find((x) => x.id === tok.id)!;
  assert.equal(after.companion!.hp, 0);
  assert.equal(after.status, 'vaincu');
  assert.equal(r.hp.get('c1'), undefined, 'le maître ne perd rien');
  assert.equal(dismissCompanion(r.combat, tok.id).combatants.length, 2);
  assert.equal(dismissCompanion(r.combat, 'g').combatants.length, 3, 'un monstre ne repart pas ainsi');
});
