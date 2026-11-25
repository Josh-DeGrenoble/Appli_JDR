// Tests v0.15 : objets équipés (gear.ts), parité des effets et prix avec le SQL (06_equipement.sql), lieux (places.ts),
// et mode démo : équiper / retirer / déposer dans un coffre (LocalStore).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

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

const { applyGear, describeEffects, effectsOf } = await import('../src/lib/dnd/gear');
const { ITEM_LIBRARY } = await import('../src/lib/dnd/srd/items');
const { normalizeSheet } = await import('../src/lib/dnd/sheet');
const { saveBonus } = await import('../src/lib/dnd/rules');
const { favoritesFirst, toggleFav } = await import('../src/lib/dnd/places');
const { LocalStore } = await import('../src/data/localStore');
const { DND_TEMPLATE, blankCharacterValues } = await import('../src/lib/templates');

const base = () => normalizeSheet({ ac: 12, speed: 9, abilities: { str: 12, dex: 14, con: 12, int: 10, wis: 10, cha: 10 }, saveProf: ['str'], attacks: [{ id: 'a1', name: 'Poing' } as never] });

test('équiper : armure, cape, gantelets, arme ; retirer revient exactement au départ', () => {
  const s0 = base();
  const eq = [
    { id: 'm', name: 'Cotte de mailles' },
    { id: 'c', name: 'Cape de protection' },
    { id: 'r', name: 'Rapière +1' },
    { id: 'g', name: 'Gantelets de puissance d’ogre' },
  ];
  const s1 = normalizeSheet({ ...s0, ...applyGear(s0, eq) });
  assert.equal(s1.ac, 17);
  assert.equal(s1.abilities.str, 19);
  assert.equal(saveBonus(s1, 'dex'), 2 + 1, 'DEX +2, cape +1');
  const sword = s1.attacks.find((a) => a.id === 'gear-r')!;
  assert.equal(sword.ability, 'str');
  assert.equal(sword.bonus, 1);
  assert.equal(s1.attacks.length, 2);
  const again = normalizeSheet({ ...s1, ...applyGear(s1, eq) });
  assert.equal(again.ac, 17, 'pas de cumul');
  const s2 = normalizeSheet({ ...s1, ...applyGear(s1, []) });
  assert.equal(s2.ac, 12);
  assert.equal(s2.abilities.str, 12);
  assert.deepEqual(s2.attacks.map((a) => a.id), ['a1']);
  const cuir = normalizeSheet({ ...s0, ...applyGear(s0, [{ id: 'l', name: 'Armure de cuir' }, { id: 'b', name: 'Bouclier' }]) });
  assert.equal(cuir.ac, 11 + 2 + 2);
  const brac = normalizeSheet({ ...s0, ...applyGear(s0, [{ id: 'x', name: 'Bracelets de défense' }]) });
  assert.equal(brac.ac, 14, 'sans armure : +2');
  assert.equal(describeEffects(effectsOf('Chemise de mailles')), 'CA 13 + Dex (max 2)');
  assert.equal(describeEffects(effectsOf('Cotte de mailles +1')), 'CA 17 (armure 16 + 1 magique)');
  assert.equal(describeEffects(effectsOf('Bouclier +1')), '+3 CA (bouclier 2 + 1 magique)');
  assert.equal(describeEffects(effectsOf('Rapière +1')), '1d8 perforant, +1 au toucher et aux dégâts (magique)');
});

test('parité : effets et prix identiques dans la dernière migration de la bibliothèque', () => {
  // Dernière migration qui redéfinit la bibliothèque côté serveur
  const dir = new URL('../supabase/migrations/', import.meta.url);
  const file = readdirSync(dir).sort().filter((f) => readFileSync(new URL(f, dir), 'utf8').includes('function public._item_effects')).pop()!;
  const sql = readFileSync(new URL(file, dir), 'utf8');
  const lit = sql.match(/select \('(.*)'::jsonb\)->trim\(p_name\)/)![1].replace(/''/g, "'");
  const fx = JSON.parse(lit);
  const ts = Object.fromEntries(ITEM_LIBRARY.filter((x) => x.effects).map((x) => [x.name, x.effects]));
  assert.deepEqual(fx, JSON.parse(JSON.stringify(ts)));
  for (const it of ITEM_LIBRARY) assert.ok(sql.includes(`('${it.name.replace(/'/g, "''")}', ${Math.round(it.price * 100)})`), `prix de ${it.name}`);
});

test('lieux : favoris en premier', () => {
  const r = favoritesFirst([{ id: 'a' }, { id: 'b' }, { id: 'c' }], (x) => x.id, ['c']);
  assert.deepEqual(r.map((x) => `${x.item.id}${x.fav ? '*' : ''}`), ['c*', 'a', 'b']);
  assert.deepEqual(toggleFav(['a'], 'a'), []);
  assert.deepEqual(toggleFav([], 'a'), ['a']);
});

test('mode démo : équiper change la fiche, déposer dans un coffre la rétablit', async () => {
  const s = new LocalStore();
  await s.signInLocal('Maître');
  const camp = await s.createCampaign('Objets', structuredClone(DND_TEMPLATE), 'Maître');
  await s.signInLocal('Aria');
  const player = (await s.currentUser())!;
  await s.joinCampaign(camp.join_code, 'Aria');
  const ch = await s.createCharacter({
    campaign_id: camp.id, owner_id: player.id, name: 'Thalia', avatar: '🏹', subtitle: '', currency: 0, notes: '',
    ...blankCharacterValues({ ac: 12, abilities: { str: 10, dex: 16, con: 12, int: 10, wis: 10, cha: 10 } }, 10),
  });
  await s.signInLocal('Maître');
  await s.addItem({ campaign_id: camp.id, character_id: ch.id, name: 'Chemise de mailles', qty: 1, description: '' });
  const chest = await s.saveShop({ campaign_id: camp.id, kind: 'chest', name: 'Coffre', visible: true });
  await s.signInLocal('Aria');
  const load = () => s.loadCampaign(camp.id);
  const item = (await load()).items.find((i) => i.name === 'Chemise de mailles')!;
  await s.updateItem(item.id, { equipped: true });
  const sheet = async () => normalizeSheet((await load()).characters.find((c) => c.id === ch.id)!.sheet);
  assert.equal((await sheet()).ac, 15, '13 + DEX 3 plafonnée à 2');
  await s.updateItem(item.id, { equipped: false });
  await s.depositItem(item.id, chest.id, 1);
  const d = await load();
  assert.equal(d.items.length, 0);
  assert.equal(d.shopItems.find((x) => x.shop_id === chest.id)?.name, 'Chemise de mailles');
  assert.equal((await sheet()).ac, 12);
});

test('mode démo : changer de pseudo (profil et campagnes), pseudo déjà pris refusé', async () => {
  const s = new LocalStore();
  await s.signInLocal('Bram');
  const camp = await s.createCampaign('Pseudos', structuredClone(DND_TEMPLATE), 'Bram');
  await s.signInLocal('Cora');
  await s.signInLocal('Bram');
  await assert.rejects(s.updateName('cora'), /déjà pris/);
  await s.updateName('Bram le Rouge');
  assert.equal((await s.currentUser())!.name, 'Bram le Rouge');
  assert.ok((await s.loadCampaign(camp.id)).members.some((m) => m.display_name === 'Bram le Rouge'));
  await assert.rejects(s.resetPassword('a@b.c'), /en ligne/);
});

test('emplacements : même liste que le SQL, conflits (une paire de bottes, deux anneaux)', async () => {
  const { slotOf, slotConflicts, checkSlot } = await import('../src/lib/dnd/slots');
  const want: [string, string | null][] = [
    ['Cotte de mailles +1', 'armure'], ['Bouclier +2', 'bouclier'], ['Bottes elfiques', 'bottes'], ['Gantelets de puissance d’ogre', 'gants'],
    ['Bandeau d’intellect', 'tete'], ['Amulette de santé', 'cou'], ['Ceinturon de force de géant des collines', 'ceinture'], ['Cape de protection', 'cape'],
    ['Anneau de protection', 'anneau'], ['Bracelets de défense', 'bracelets'], ['Diadème en or', 'tete'], ['Écu du roi', 'bouclier'],
    ['Épée longue +1', null], ['Pierre de Ioun (protection)', null],
  ];
  for (const [n, s] of want) assert.equal(slotOf(n), s, n);
  const worn = [{ id: 'b', name: 'Bottes de vitesse' }, { id: 'r1', name: 'Anneau de protection' }, { id: 'r2', name: 'Bague en argent' }];
  assert.deepEqual(slotConflicts('Bottes elfiques', worn).map((x) => x.id), ['b']);
  assert.deepEqual(slotConflicts('Anneau de feu', worn).map((x) => x.id), ['r1'], 'le plus ancien des deux anneaux');
  assert.deepEqual(slotConflicts('Cape de protection', worn), []);
  assert.throws(() => checkSlot('Bottes elfiques', worn), /pieds déjà pris \(Bottes de vitesse\)/);
  // La migration recopie les mêmes motifs
  const sql = readFileSync(new URL('../supabase/migrations/06_equipement.sql', import.meta.url), 'utf8');
  const { SLOT_PATTERNS } = await import('../src/lib/dnd/slots');
  for (const [, re] of SLOT_PATTERNS) assert.ok(sql.includes(`'${re}'`), re);
});

test('arme à deux mains et bouclier : l’un retire l’autre (même motif que le SQL)', async () => {
  const { isTwoHanded, slotConflicts, checkSlot, TWO_HANDED_PATTERN } = await import('../src/lib/dnd/slots');
  assert.ok(isTwoHanded('Épée à deux mains +2') && isTwoHanded('Arc long') && isTwoHanded('Arbalète lourde'));
  assert.ok(!isTwoHanded('Épée longue') && !isTwoHanded('Bouclier'));
  assert.deepEqual(slotConflicts('Bouclier +1', [{ id: 'g', name: 'Épée à deux mains' }, { id: 'd', name: 'Dague' }]).map((x) => x.id), ['g']);
  assert.deepEqual(slotConflicts('Arc long', [{ id: 's', name: 'Bouclier' }, { id: 'c', name: 'Cape de protection' }]).map((x) => x.id), ['s']);
  assert.throws(() => checkSlot('Bouclier', [{ id: 'g', name: 'Hache à deux mains' }]), /deux mains et bouclier/);
  const sql = readFileSync(new URL('../supabase/migrations/06_equipement.sql', import.meta.url), 'utf8');
  assert.ok(sql.includes(`'${TWO_HANDED_PATTERN}'`));
});
