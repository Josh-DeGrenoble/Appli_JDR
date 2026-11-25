// Tests v0.14 : niveaux accordés par le MJ (levels.ts), sous-classes (srd/subclasses.ts), pièges (traps.ts),
// et le parcours complet en mode démo (LocalStore) : droits, montée, annulation, piège au déplacement.
import { test } from 'node:test';
import assert from 'node:assert/strict';

class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}
const g = globalThis as unknown as Record<string, unknown>;
g.localStorage = new MemStorage();
g.sessionStorage = new MemStorage();
g.window = { addEventListener() {} };

const { LocalStore } = await import('../src/data/localStore');
const { DND_TEMPLATE, blankCharacterValues, hpOf } = await import('../src/lib/templates');
const { levelForXp, xpPatch, grantLevelPatch, canLevelUp, levelDownPatch, pushHistory } = await import('../src/lib/dnd/levels');
const { applyLevelUp, checkLevelUp, levelUpPlan } = await import('../src/lib/dnd/levelup');
const { featuresAt } = await import('../src/lib/dnd/srd/progression');
const { subclassesOf } = await import('../src/lib/dnd/srd/subclasses');
const { springTrap, trapsArmed } = await import('../src/lib/dnd/traps');
const { normalizeSheet } = await import('../src/lib/dnd/sheet');
const { normalizeCombat } = await import('../src/lib/dnd/combat');

test('XP et niveau accordé', () => {
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(299), 1);
  assert.equal(levelForXp(300), 2);
  assert.equal(levelForXp(355000), 20);
  const s = normalizeSheet({ level: 2, xp: 300 });
  assert.equal(canLevelUp(s), false);
  assert.deepEqual(xpPatch(s, 600), { xp: 900, allowedLevel: 3 });
  assert.deepEqual(xpPatch(s, 100), { xp: 400, allowedLevel: 2 });
  assert.equal(grantLevelPatch(s).allowedLevel, 3);
  assert.equal(canLevelUp({ ...s, allowedLevel: 3 }), true);
});

test('sous-classes : 4 par classe, aptitudes du SRD à la place des lignes génériques', () => {
  assert.equal(subclassesOf('Guerrier').length, 4);
  assert.deepEqual(featuresAt('Guerrier', 3, 'Champion'), ['Critique amélioré', 'Athlète remarquable']);
  assert.ok(!featuresAt('Guerrier', 3, 'Champion').includes('Archétype martial'));
  assert.ok(featuresAt('Guerrier', 3).includes('Archétype martial'));
  assert.deepEqual(featuresAt('Barbare', 6, 'Voie du Berserker'), ['Rage aveugle']);
  assert.deepEqual(featuresAt('Moine', 6, 'Voie de l’Ombre'), ['Frappes renforcées', 'Voie de l’Ombre : aptitude de niveau 6']);
  const s = normalizeSheet({ className: 'Guerrier', level: 2, hitDie: 10 });
  assert.equal(levelUpPlan(s).chooseSubclass, true);
  const { patch } = applyLevelUp(s, { hpGain: 6, subclass: 'Champion' });
  assert.equal(patch.subclass, 'Champion');
  assert.ok(patch.features!.some((f) => f.name === 'Critique amélioré'));
  assert.throws(() => checkLevelUp(s, { level: 3, subclass: 'Inventée' }, 6), /Sous-classe/);
  assert.throws(() => checkLevelUp(s, patch, 6, false), /pas encore accordé/);
  checkLevelUp({ ...s, allowedLevel: 3 }, patch, 6, false);
});

test('−1 niveau : retire un accord, annule une montée, ou baisse simplement', () => {
  const s = normalizeSheet({ className: 'Guerrier', level: 2, hitDie: 10, subclass: '' });
  assert.deepEqual(levelDownPatch({ ...s, allowedLevel: 3 }), { patch: { allowedLevel: 2 }, hpLoss: 0 });
  const { patch } = applyLevelUp(s, { hpGain: 7, subclass: 'Champion' });
  const after = normalizeSheet({ ...s, ...patch, allowedLevel: 3, levelHistory: pushHistory(s, 7) });
  const back = levelDownPatch(after);
  assert.equal(back.hpLoss, 7);
  assert.equal(back.patch.level, 2);
  assert.equal(back.patch.subclass, '');
  assert.deepEqual(back.patch.levelHistory, []);
  const plain = levelDownPatch(normalizeSheet({ className: 'Magicien', level: 5 }));
  assert.equal(plain.patch.level, 4);
  assert.equal(plain.patch.spellcasting!.slots['3'], undefined, 'plus d’emplacement niv. 3');
  assert.throws(() => levelDownPatch(normalizeSheet({ level: 1 })), /niveau 1/);
});

test('piège : sauvegarde, dégâts, piège visible ; armé pour les joueurs et en combat', () => {
  const combat = normalizeCombat({ active: true, map: { cols: 10, rows: 10, cells: { '2,2': 'trap' } }, combatants: [{ id: 'g', name: 'Gobelin', kind: 'monster', x: 2, y: 2, conditions: [] } as never] });
  const secrets = { monsters: { g: { hp: 10, maxHp: 10, ac: 12, saves: { dex: 0 } } } as never, traps: { '2,2': { name: 'Fosse', dc: 15, ability: 'dex' as const, damage: '4', half: false } } };
  const out = springTrap(combat, secrets, [], 'g', () => 1)!;
  assert.equal(out.text, '🪤 Fosse ! Gobelin : sauvegarde DEX 1 contre DD 15, ratée · 4 dégâts');
  assert.equal(out.secrets.monsters.g.hp, 6);
  assert.equal(out.combat.map!.cells!['2,2'], 'trap-sprung');
  assert.equal(out.combat.combatants[0].status, 'blessé');
  assert.equal(springTrap(out.combat, out.secrets, [], 'g', () => 1), null, 'ne se déclenche qu’une fois');
  assert.equal(trapsArmed({ ...combat, active: false }, true), false);
  assert.equal(trapsArmed({ ...combat, active: false }, false), true);
});

test('mode démo : le MJ accorde, le joueur choisit, le MJ annule ; épuisement réservé au MJ ; piège', async () => {
  const s = new LocalStore();
  await s.signInLocal('Maître');
  const camp = await s.createCampaign('Niveaux', structuredClone(DND_TEMPLATE), 'Maître');
  await s.signInLocal('Aria');
  const player = (await s.currentUser())!;
  await s.joinCampaign(camp.join_code, 'Aria');
  const ch = await s.createCharacter({
    campaign_id: camp.id, owner_id: player.id, name: 'Thalia', avatar: '🏹', subtitle: '', currency: 0, notes: '',
    ...blankCharacterValues({ className: 'Guerrier', level: 2, hitDie: 10 }, 20),
  });
  await assert.rejects(s.patchSheet(ch.id, { level: 3 }), /Réservé au MJ/);
  await assert.rejects(s.patchSheet(ch.id, { exhaustion: 1 }), /Réservé au MJ/);
  const sheet = () => s.loadCampaign(camp.id).then((d) => normalizeSheet(d.characters.find((c) => c.id === ch.id)!.sheet));
  const lvl = (sub?: string) => sheet().then((sh) => applyLevelUp(sh, { hpGain: 6, subclass: sub }));
  await assert.rejects(lvl().then((r) => s.levelUp(ch.id, r.patch, r.hpGain)), /pas encore accordé/);

  await s.signInLocal('Maître');
  await s.patchSheet(ch.id, { ...xpPatch(await sheet(), 900), exhaustion: 1 });
  await assert.rejects(s.levelDown('nope'), /introuvable/);
  await s.signInLocal('Aria');
  const r = await lvl('Champion');
  await s.levelUp(ch.id, r.patch, r.hpGain);
  assert.equal((await sheet()).level, 3);
  assert.equal((await sheet()).subclass, 'Champion');
  await assert.rejects(s.levelDown(ch.id), /Réservé au MJ/);

  await s.signInLocal('Maître');
  await s.levelDown(ch.id);
  const back = await sheet();
  assert.equal(back.level, 2);
  assert.equal(back.subclass, '');
  const d = await s.loadCampaign(camp.id);
  assert.equal(hpOf(d.characters.find((c) => c.id === ch.id)!).max, 20);

  // Piège : le MJ place le pion (rien), le joueur marche dessus (déclenché)
  await s.updateCampaign(camp.id, { combat: { active: false, round: 0, turn: 0, map: { cols: 8, rows: 8, cells: { '3,3': 'trap' } }, combatants: [{ id: 'p', name: 'Thalia', kind: 'pc', characterId: ch.id, x: 1, y: 1, conditions: [] } as never] } });
  assert.equal(await s.combatMove(camp.id, 'p', 3, 3), null);
  await s.combatMove(camp.id, 'p', 1, 1);
  await s.signInLocal('Aria');
  const text = await s.combatMove(camp.id, 'p', 3, 3);
  assert.match(text ?? '', /^🪤 Piège ! Thalia : sauvegarde DEX \d+ contre DD 13/);
  assert.equal(normalizeCombat((await s.loadCampaign(camp.id)).campaign.combat).map!.cells!['3,3'], 'trap-sprung');
});

test('historique léger : sorts mémorisés par identifiant, annuler retire seulement les sorts appris', async () => {
  const { pushHistory, levelDownPatch } = await import('../src/lib/dnd/levels');
  const { normalizeSheet } = await import('../src/lib/dnd/sheet');
  const sp = (id: string, prepared = false) => ({ id, name: id, level: 1, prepared, ritual: false, concentration: false, damage: '', notes: '' });
  const s = normalizeSheet({ className: 'Magicien', level: 1, spells: [sp('a')] });
  const hist = pushHistory(s, 4);
  assert.deepEqual(hist[0].before.spellIds, ['a']);
  assert.equal(hist[0].before.spells, undefined);
  const after = normalizeSheet({ ...s, level: 2, spells: [sp('a', true), sp('b')], levelHistory: hist });
  const { patch } = levelDownPatch(after);
  assert.deepEqual(patch.spells!.map((x) => [x.id, x.prepared]), [['a', true]], 'sort appris retiré, préparation gardée');
});
