// Mode démo : marchands et coffres (même règles que supabase/migrations/05_objets.sql).
import type { Shop, ShopItem } from '../lib/types';
import { normalizeSheet } from '../lib/dnd/sheet';
import { addCoins, itemValue, payCoins, resalePrice } from '../lib/dnd/shop';
import { libraryCp } from '../lib/dnd/srd/items';
import { uid } from '../lib/ids';
import type { LocalDb } from './localDb';
import type { ShopInput, ShopItemInput } from './store';

const now = () => new Date().toISOString();

/** Marchands et objets d'une campagne visibles pour l'utilisateur (joueur : seulement les visibles). */
export function shopsFor(db: LocalDb, campaignId: string, gm: boolean) {
  const d = db.read();
  const shops = d.shops.filter((s) => s.campaign_id === campaignId && (gm || s.visible));
  const ids = new Set(shops.map((s) => s.id));
  return { shops: structuredClone(shops), shopItems: structuredClone(d.shopItems.filter((i) => ids.has(i.shop_id))) };
}

export function saveShop(db: LocalDb, s: ShopInput): Shop {
  db.requireGM(s.campaign_id);
  let out!: Shop;
  db.write((d) => {
    const cur = s.id ? d.shops.find((x) => x.id === s.id) : undefined;
    if (cur) {
      Object.assign(cur, s);
      out = cur;
    } else {
      out = { name: 'Marchand', avatar: '🧙', kind: 'merchant', visible: false, description: '', ...s, id: uid(), created_at: now() } as Shop;
      d.shops.push(out);
    }
  });
  return structuredClone(out);
}

export function deleteShop(db: LocalDb, id: string) {
  const s = db.read().shops.find((x) => x.id === id);
  if (!s) return;
  db.requireGM(s.campaign_id);
  db.write((d) => {
    d.shops = d.shops.filter((x) => x.id !== id);
    d.shopItems = d.shopItems.filter((x) => x.shop_id !== id);
  });
}

export function saveShopItem(db: LocalDb, i: ShopItemInput): ShopItem {
  db.requireGM(i.campaign_id);
  let out!: ShopItem;
  db.write((d) => {
    const cur = i.id ? d.shopItems.find((x) => x.id === i.id) : undefined;
    if (cur) {
      Object.assign(cur, i);
      out = cur;
    } else {
      out = { name: 'Objet', qty: 1, price_cp: 0, description: '', ...i, id: uid(), created_at: now() } as ShopItem;
      d.shopItems.push(out);
    }
  });
  return structuredClone(out);
}

export function deleteShopItem(db: LocalDb, id: string) {
  const it = db.read().shopItems.find((x) => x.id === id);
  if (!it) return;
  db.requireGM(it.campaign_id);
  db.write((d) => {
    d.shopItems = d.shopItems.filter((x) => x.id !== id);
  });
}

/** Achat (marchand, payé avec la bourse) ou prise (coffre, gratuit) : l'objet quitte la boutique et rejoint le sac. */
export function buyItem(db: LocalDb, shopItemId: string, characterId: string, qty: number) {
  const d0 = db.read();
  const it = d0.shopItems.find((x) => x.id === shopItemId);
  const shop = it && d0.shops.find((s) => s.id === it.shop_id);
  const ch = d0.characters.find((c) => c.id === characterId);
  if (!it || !shop || !ch || ch.campaign_id !== shop.campaign_id) throw new Error('Objet introuvable');
  const gm = db.role(shop.campaign_id) === 'gm';
  if (!gm && ch.owner_id !== db.me().id) throw new Error('Ce n’est pas ton personnage');
  if (!gm && !shop.visible) throw new Error('Ce marchand n’est pas disponible');
  const n = Math.floor(qty);
  if (n < 1 || n > it.qty) throw new Error('Quantité indisponible');
  const sheet = normalizeSheet(ch.sheet);
  const coins = shop.kind === 'merchant' ? payCoins(sheet.coins, it.price_cp * n) : sheet.coins;
  db.write((d) => {
    const c = d.characters.find((x) => x.id === characterId)!;
    c.sheet = { ...c.sheet, coins };
    c.updated_at = now();
    const src = d.shopItems.find((x) => x.id === shopItemId)!;
    src.qty -= n;
    if (src.qty <= 0) d.shopItems = d.shopItems.filter((x) => x.id !== shopItemId);
    const same = d.items.find((x) => x.character_id === characterId && x.name.toLowerCase() === it.name.toLowerCase() && x.description === it.description);
    if (same) same.qty += n;
    else
      d.items.push({
        id: uid(), campaign_id: it.campaign_id, character_id: characterId, name: it.name, qty: n, description: it.description,
        ...(it.heal ? { heal: it.heal } : {}), created_at: now(),
      });
  });
}

/** Vente à un marchand visible qui rachète : moitié de la valeur, l'objet passe du sac au stock du marchand. */
export function sellItem(db: LocalDb, itemId: string, shopId: string, qty: number) {
  const d0 = db.read();
  const it = d0.items.find((x) => x.id === itemId);
  const shop = d0.shops.find((s) => s.id === shopId);
  const ch = it && d0.characters.find((c) => c.id === it.character_id);
  if (!it || !shop || !ch || shop.kind !== 'merchant' || ch.campaign_id !== shop.campaign_id) throw new Error('Vente impossible');
  const gm = db.role(shop.campaign_id) === 'gm';
  if (!gm && ch.owner_id !== db.me().id) throw new Error('Ce n’est pas ton objet');
  if (!gm && (!shop.visible || shop.buys === false)) throw new Error('Ce marchand n’achète rien');
  const n = Math.floor(qty);
  if (n < 1 || n > it.qty) throw new Error('Quantité indisponible');
  const stock = d0.shopItems.filter((x) => x.shop_id === shopId);
  const value = itemValue(it.name, stock, libraryCp(it.name));
  if (value === null || resalePrice(value) < 1) throw new Error('Le marchand n’achète pas cet objet');
  db.write((d) => {
    const c = d.characters.find((x) => x.id === ch.id)!;
    c.sheet = { ...c.sheet, coins: addCoins(normalizeSheet(c.sheet).coins, resalePrice(value) * n) };
    c.updated_at = now();
    const src = d.items.find((x) => x.id === itemId)!;
    src.qty -= n;
    if (src.qty <= 0) d.items = d.items.filter((x) => x.id !== itemId);
    const same = d.shopItems.find((x) => x.shop_id === shopId && x.name.toLowerCase() === it.name.toLowerCase());
    if (same) same.qty += n;
    else
      d.shopItems.push({
        id: uid(), shop_id: shopId, campaign_id: shop.campaign_id, name: it.name, qty: n, price_cp: value, description: it.description,
        ...(it.heal ? { heal: it.heal } : {}), created_at: now(),
      });
  });
}

/** Dépôt dans un coffre (joueur : coffre visible ; MJ : tout coffre) : l'objet passe du sac au coffre, gratuitement. */
export function depositItem(db: LocalDb, itemId: string, shopId: string, qty: number) {
  const d0 = db.read();
  const it = d0.items.find((x) => x.id === itemId);
  const shop = d0.shops.find((s) => s.id === shopId);
  const ch = it && d0.characters.find((c) => c.id === it.character_id);
  if (!it || !shop || !ch || shop.kind !== 'chest' || ch.campaign_id !== shop.campaign_id) throw new Error('Dépôt impossible');
  const gm = db.role(shop.campaign_id) === 'gm';
  if (!gm && ch.owner_id !== db.me().id) throw new Error('Ce n’est pas ton objet');
  if (!gm && !shop.visible) throw new Error('Ce coffre n’est pas disponible');
  const n = Math.floor(qty);
  if (n < 1 || n > it.qty) throw new Error('Quantité indisponible');
  db.write((d) => {
    const src = d.items.find((x) => x.id === itemId)!;
    src.qty -= n;
    if (src.qty <= 0) d.items = d.items.filter((x) => x.id !== itemId);
    const same = d.shopItems.find((x) => x.shop_id === shopId && x.name.toLowerCase() === it.name.toLowerCase() && x.description === it.description);
    if (same) same.qty += n;
    else
      d.shopItems.push({
        id: uid(), shop_id: shopId, campaign_id: shop.campaign_id, name: it.name, qty: n, price_cp: libraryCp(it.name) ?? 0, description: it.description,
        ...(it.heal ? { heal: it.heal } : {}), created_at: now(),
      });
  });
}
