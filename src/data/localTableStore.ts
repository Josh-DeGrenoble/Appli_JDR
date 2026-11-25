// Mode démo : opérations de table (combat, carte, marchands) partagées par LocalStore.
// La logique est dans localCombatOps.ts, et localShopOps.ts ; ici seulement l'aiguillage.
import type { CampaignSecrets } from '../lib/dnd/combat';
import type { ActPayload } from '../lib/dnd/resolve';
import { LocalDb } from './localDb';
import * as combatOps from './localCombatOps';
import * as shopOps from './localShopOps';
import type { ShopInput, ShopItemInput } from './store';

/** Base de LocalStore : base locale + opérations de table. */
export class LocalTableStore {
  protected db = new LocalDb();

  // ---------- combat (voir localCombatOps.ts) ----------
  async setInitiative(campaignId: string, combatantId: string, value: number) {
    combatOps.setInitiative(this.db, campaignId, combatantId, value);
  }
  async saveSecrets(campaignId: string, secrets: CampaignSecrets) {
    combatOps.saveSecrets(this.db, campaignId, secrets);
  }
  async combatAct(campaignId: string, actorId: string, payload: ActPayload) {
    return combatOps.combatAct(this.db, campaignId, actorId, payload);
  }
  async combatMove(campaignId: string, combatantId: string, x: number, y: number) {
    return combatOps.combatMove(this.db, campaignId, combatantId, x, y);
  }
  async summonCompanion(campaignId: string, characterId: string, companionId: string) {
    combatOps.summonCompanionOp(this.db, campaignId, characterId, companionId);
  }
  async dismissCompanion(campaignId: string, tokenId: string) {
    combatOps.dismissCompanionOp(this.db, campaignId, tokenId);
  }
  async endTurn(campaignId: string) {
    combatOps.endTurn(this.db, campaignId);
  }
  async toggleDoor(campaignId: string, x: number, y: number) {
    combatOps.toggleDoor(this.db, campaignId, x, y);
  }
  async combatDismiss(campaignId: string, reactionId: string) {
    combatOps.combatDismiss(this.db, campaignId, reactionId);
  }
  async saveMapImage(campaignId: string, dataUrl: string | null, key = 'current') {
    return combatOps.saveMapImage(this.db, campaignId, dataUrl, key);
  }
  async loadMapImage(campaignId: string, key = 'current') {
    return combatOps.loadMapImage(campaignId, key);
  }
  // ---------- marchands (voir localShopOps.ts) ----------
  async saveShop(s: ShopInput) {
    return shopOps.saveShop(this.db, s);
  }
  async deleteShop(id: string) {
    shopOps.deleteShop(this.db, id);
  }
  async saveShopItem(i: ShopItemInput) {
    return shopOps.saveShopItem(this.db, i);
  }
  async deleteShopItem(id: string) {
    shopOps.deleteShopItem(this.db, id);
  }
  async buyItem(shopItemId: string, characterId: string, qty: number) {
    shopOps.buyItem(this.db, shopItemId, characterId, qty);
  }
  async sellItem(itemId: string, shopId: string, qty: number) {
    shopOps.sellItem(this.db, itemId, shopId, qty);
  }
  async depositItem(itemId: string, shopId: string, qty: number) {
    shopOps.depositItem(this.db, itemId, shopId, qty);
  }
  async useItem(itemId: string, heal: number, targetCharacterId?: string) {
    combatOps.useItem(this.db, itemId, heal, targetCharacterId);
  }
}
