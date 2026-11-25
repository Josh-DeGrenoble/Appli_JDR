// Mode en ligne : opérations de table (combat, carte, marchands) partagées par SupabaseStore.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CampaignSecrets } from '../lib/dnd/combat';
import type { ActPayload } from '../lib/dnd/resolve';
import * as ops from './supabaseGameOps';
import * as shopOps from './supabaseShopOps';
import type { ShopInput, ShopItemInput } from './store';
import { CampaignCache } from './supabaseCache';
import { isNetworkError, waitForNetwork } from './network';

/** Base de SupabaseStore : client Supabase, horodatage des écritures locales, opérations de table. */
export class SupabaseTableStore {
  lastLocalWrite = 0;
  protected sb: SupabaseClient;
  /** Dernière version des campagnes ouvertes, rechargées par morceaux (supabaseCache.ts). */
  protected cache: CampaignCache;

  constructor(url: string, key: string) {
    this.sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
    this.cache = new CampaignCache(this.sb);
  }

  /** Écriture locale : notée (pas de notification à soi-même) et campagnes à relire (sauf l'historique des jets). */
  protected touch() {
    this.lastLocalWrite = Date.now();
    this.cache.invalidate(undefined, false);
  }

  /**
   * Envoie une écriture : marquée comme locale (pas de notification à soi-même), et renvoyée jusqu'à 2 fois si le
   * réseau a coupé (attente du retour de la connexion, 20 s au plus). Une erreur du serveur n'est jamais renvoyée.
   */
  protected async w<T>(run: () => Promise<T>): Promise<T> {
    this.touch();
    for (let attempt = 0; ; attempt++) {
      try {
        return await run();
      } catch (e) {
        if (!isNetworkError(e)) throw e;
        if (attempt >= 2) throw new Error('📡 Pas de connexion : action non envoyée, réessaie quand le réseau revient');
        await waitForNetwork(1000 * 2 ** attempt);
      }
    }
  }

  // ---------- combat ----------
  setInitiative(campaignId: string, combatantId: string, value: number) {
    return this.w(async () => ops.setInitiative(this.sb, campaignId, combatantId, value));
  }
  saveSecrets(campaignId: string, secrets: CampaignSecrets) {
    return this.w(async () => ops.saveSecrets(this.sb, campaignId, secrets));
  }
  combatAct(campaignId: string, actorId: string, payload: ActPayload) {
    return this.w(async () => ops.combatAct(this.sb, campaignId, actorId, payload));
  }
  summonCompanion(campaignId: string, characterId: string, companionId: string) {
    return this.w(async () => ops.rpcVoid(this.sb, 'summon_companion', { p_campaign: campaignId, p_char: characterId, p_companion: companionId }));
  }
  dismissCompanion(campaignId: string, tokenId: string) {
    return this.w(async () => ops.rpcVoid(this.sb, 'dismiss_companion', { p_campaign: campaignId, p_token: tokenId }));
  }
  combatMove(campaignId: string, combatantId: string, x: number, y: number) {
    return this.w(async () => ops.combatMove(this.sb, campaignId, combatantId, x, y));
  }
  endTurn(campaignId: string) {
    return this.w(async () => ops.rpcVoid(this.sb, 'end_turn', { p_campaign: campaignId }));
  }
  toggleDoor(campaignId: string, x: number, y: number) {
    return this.w(async () => ops.rpcVoid(this.sb, 'toggle_door', { p_campaign: campaignId, p_x: x, p_y: y }));
  }
  combatDismiss(campaignId: string, reactionId: string) {
    return this.w(async () => ops.combatDismiss(this.sb, campaignId, reactionId));
  }
  saveMapImage(campaignId: string, dataUrl: string | null, key = 'current') {
    return this.w(async () => ops.saveMapImage(this.sb, campaignId, dataUrl, key));
  }
  loadMapImage(campaignId: string, key = 'current') {
    return ops.loadMapImage(this.sb, campaignId, key);
  }
  // ---------- marchands (voir supabaseShopOps.ts) ----------
  saveShop(s: ShopInput) {
    return this.w(async () => shopOps.saveShop(this.sb, s));
  }
  deleteShop(id: string) {
    return this.w(async () => shopOps.deleteShop(this.sb, id));
  }
  saveShopItem(i: ShopItemInput) {
    return this.w(async () => shopOps.saveShopItem(this.sb, i));
  }
  deleteShopItem(id: string) {
    return this.w(async () => shopOps.deleteShopItem(this.sb, id));
  }
  buyItem(shopItemId: string, characterId: string, qty: number) {
    return this.w(async () => shopOps.buyItem(this.sb, shopItemId, characterId, qty));
  }
  sellItem(itemId: string, shopId: string, qty: number) {
    return this.w(async () => shopOps.sellItem(this.sb, itemId, shopId, qty));
  }
  depositItem(itemId: string, shopId: string, qty: number) {
    return this.w(async () => shopOps.depositItem(this.sb, itemId, shopId, qty));
  }
  useItem(itemId: string, heal: number, targetCharacterId?: string) {
    return this.w(async () => ops.useItem(this.sb, itemId, heal, targetCharacterId));
  }
}
