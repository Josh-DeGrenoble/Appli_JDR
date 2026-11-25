// Tests marchands, bibliothèque d'objets, bestiaire (src/lib/dnd/shop.ts, srd/items.ts, srd/monsters.ts) et mode démo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addCoins, fmtPrice, itemValue, payCoins, poToCp, purseCp, resalePrice } from '../src/lib/dnd/shop';
import { libraryCp } from '../src/lib/dnd/srd/items';
import { ITEM_LIBRARY, libraryItem, searchItems } from '../src/lib/dnd/srd/items';
import { BESTIARY, findMonsters } from '../src/lib/dnd/srd/monsters';

test('paiement : monnaie rendue, plus grosses pièces gardées (= SQL _pay_coins)', () => {
  assert.deepEqual(payCoins({ po: 20 }, 150), { pp: 0, po: 18, pe: 0, pa: 5, pc: 0 });
  assert.deepEqual(payCoins({ pp: 1, pc: 3 }, 1), { pp: 1, po: 0, pe: 0, pa: 0, pc: 2 });
  assert.deepEqual(payCoins({ pe: 1 }, 30), { pp: 0, po: 0, pe: 0, pa: 2, pc: 0 });
  assert.throws(() => payCoins({ po: 1 }, 101), /il manque 1 pc/);
  assert.equal(purseCp({ pp: 1, po: 2, pa: 3 }), 1230);
  assert.equal(fmtPrice(150), '1 po 5 pa');
  assert.equal(fmtPrice(0), 'gratuit');
  assert.equal(poToCp(0.1), 10);
  assert.deepEqual(addCoins({ po: 1 }, 750), { pp: 0, po: 8, pe: 0, pa: 5, pc: 0 });
  assert.equal(resalePrice(1500), 750);
  assert.equal(itemValue('Épée longue', [], libraryCp('Épée longue')), 1500);
  assert.equal(itemValue('épée longue', [{ name: 'Épée longue', price_cp: 2000 }], 1500), 2000, 'prix du marchand d’abord');
  assert.equal(itemValue('Caillou', [], libraryCp('Caillou')), null);
});

test('bibliothèque d’objets et bestiaire', () => {
  assert.equal(libraryItem('potion de soins')?.heal, '2d4+2');
  assert.ok(searchItems('epee').length >= 3, 'recherche sans accents');
  assert.ok(searchItems('', 'potion').every((x) => x.cat === 'potion'));
  assert.equal(new Set(ITEM_LIBRARY.map((x) => x.name)).size, ITEM_LIBRARY.length, 'noms uniques');
  assert.equal(new Set(BESTIARY.map((x) => x.name)).size, BESTIARY.length);
  const dragon = findMonsters('dragon rouge')[0];
  assert.equal(dragon.attacks[1].kind, 'save');
  assert.deepEqual(dragon.attacks[1].shape, { kind: 'cone', size: 9 });
  assert.ok(BESTIARY.every((m) => m.hp > 0 && m.ac >= 8 && m.attacks.length > 0));
});

test('mode démo : achat, stock, quantités', async () => {
  const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
  const g = globalThis as unknown as Record<string, unknown>;
  g.localStorage ??= mem();
  g.sessionStorage ??= mem();
  g.window ??= { addEventListener() {} };
  const { LocalStore } = await import('../src/data/localStore');
  const { DND_TEMPLATE } = await import('../src/lib/templates');
  const store = new LocalStore();
  await store.signInLocal('MJ');
  const camp = await store.createCampaign('Marché', structuredClone(DND_TEMPLATE), 'MJ');
  const gmChar = await store.createCharacter({ campaign_id: camp.id, owner_id: (await store.currentUser())!.id, name: 'PNJ', avatar: '', subtitle: '', stats: {}, resources: {}, currency: 0, notes: '', sheet: { coins: { po: 5, pp: 0, pe: 0, pa: 0, pc: 0 } } });
  const shop = await store.saveShop({ campaign_id: camp.id, name: 'Échoppe', kind: 'merchant', visible: false });
  const it = await store.saveShopItem({ shop_id: shop.id, campaign_id: camp.id, name: 'Potion de soins', qty: 3, price_cp: 50, description: '', heal: '2d4+2' });
  await store.buyItem(it.id, gmChar.id, 2);
  const d = await store.loadCampaign(camp.id);
  assert.equal(d.shopItems[0].qty, 1);
  assert.equal(d.items.find((x) => x.name === 'Potion de soins')?.qty, 2);
  assert.equal((d.characters[0].sheet.coins as { po: number }).po, 4);
  await assert.rejects(store.buyItem(it.id, gmChar.id, 5), /Quantité/);
  await assert.rejects(store.buyItem(it.id, gmChar.id, 1).then(() => store.buyItem(it.id, gmChar.id, 1)), /introuvable/);
});

test('mode démo : revente', async () => {
  const { LocalStore } = await import('../src/data/localStore');
  const { DND_TEMPLATE } = await import('../src/lib/templates');
  const store = new LocalStore();
  await store.signInLocal('MJ2');
  const gm = (await store.currentUser())!;
  const camp = await store.createCampaign('Vente', structuredClone(DND_TEMPLATE), 'MJ2');
  await store.signInLocal('Jo');
  const jo = (await store.currentUser())!;
  await store.joinCampaign(camp.join_code, 'Jo');
  const ch = await store.createCharacter({ campaign_id: camp.id, owner_id: jo.id, name: 'Thalia', avatar: '', subtitle: '', stats: {}, resources: {}, currency: 0, notes: '', sheet: {} });
  await store.signInLocal('MJ2');
  const shop = await store.saveShop({ campaign_id: camp.id, name: 'Bartolo', kind: 'merchant', visible: true });
  await store.addItem({ campaign_id: camp.id, character_id: ch.id, name: 'Épée longue', qty: 1, description: '' });
  await store.signInLocal('Jo');
  const d = await store.loadCampaign(camp.id);
  await store.sellItem(d.items[0].id, shop.id, 1);
  const after = await store.loadCampaign(camp.id);
  assert.equal(after.items.length, 0);
  assert.equal((after.characters[0].sheet.coins as { po: number }).po, 7);
  assert.equal(after.shopItems[0].price_cp, 1500);
});
