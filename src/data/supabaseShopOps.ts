// Mode en ligne : marchands et coffres (tables shops / shop_items, achat atomique par la fonction buy_item).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Shop, ShopItem } from '../lib/types';
import { check } from './supabaseUtils';
import type { ShopInput, ShopItemInput } from './store';

type Sb = SupabaseClient;

/** Marchands visibles (RLS : joueurs → seulement les visibles) et leurs objets. */
export async function loadShops(sb: Sb, campaignId: string): Promise<{ shops: Shop[]; shopItems: ShopItem[] }> {
  const [s, i] = await Promise.all([
    sb.from('shops').select('*').eq('campaign_id', campaignId).order('created_at'),
    sb.from('shop_items').select('*').eq('campaign_id', campaignId).order('created_at'),
  ]);
  return { shops: check(s) as Shop[], shopItems: check(i) as ShopItem[] };
}

export async function saveShop(sb: Sb, s: ShopInput): Promise<Shop> {
  if (s.id) return check(await sb.from('shops').update(s).eq('id', s.id).select().single()) as Shop;
  return check(await sb.from('shops').insert(s).select().single()) as Shop;
}

export async function deleteShop(sb: Sb, id: string) {
  check(await sb.from('shops').delete().eq('id', id));
}

export async function saveShopItem(sb: Sb, i: ShopItemInput): Promise<ShopItem> {
  if (i.id) return check(await sb.from('shop_items').update(i).eq('id', i.id).select().single()) as ShopItem;
  return check(await sb.from('shop_items').insert(i).select().single()) as ShopItem;
}

export async function deleteShopItem(sb: Sb, id: string) {
  check(await sb.from('shop_items').delete().eq('id', id));
}

export async function buyItem(sb: Sb, shopItemId: string, characterId: string, qty: number) {
  check(await sb.rpc('buy_item', { p_item: shopItemId, p_character: characterId, p_qty: qty }));
}

export async function sellItem(sb: Sb, itemId: string, shopId: string, qty: number) {
  check(await sb.rpc('sell_item', { p_item: itemId, p_shop: shopId, p_qty: qty }));
}

export async function depositItem(sb: Sb, itemId: string, shopId: string, qty: number) {
  check(await sb.rpc('deposit_item', { p_item: itemId, p_shop: shopId, p_qty: qty }));
}
