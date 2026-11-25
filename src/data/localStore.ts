// Mode démo (implémentation de Store sans serveur).
// Compte + campagnes + chargement ici ; opérations de jeu dans localGameOps.ts ;
// stockage et synchro entre onglets dans localDb.ts.

import { joinCode, now, uid } from '../lib/ids';
import type { Campaign, CampaignData, CampaignSummary, CampaignTemplate, Character, Item, User } from '../lib/types';
import { DEFAULT_SETTINGS } from '../lib/types';
import type { Coin } from '../lib/dnd/data';
import type { DndSheet } from '../lib/dnd/sheet';
import * as ops from './localGameOps';
import * as sheetOps from './localSheetOps';
import * as combatOps from './localCombatOps';
import * as shopOps from './localShopOps';
import { LocalTableStore } from './localTableStore';
import type { CampaignPatch, CharacterPatch, ItemPatch, NewRoll, Store } from './store';

export class LocalStore extends LocalTableStore implements Store {
  readonly mode = 'local' as const;
  private authListeners = new Set<(u: User | null) => void>();

  get lastLocalWrite() {
    return this.db.lastLocalWrite;
  }

  // ---------- compte ----------
  async currentUser() {
    try {
      return this.db.me();
    } catch {
      return null;
    }
  }

  onAuthChange(cb: (u: User | null) => void) {
    this.authListeners.add(cb);
    return () => {
      this.authListeners.delete(cb);
    };
  }

  private setUser(u: User | null) {
    this.db.setCurrentUserId(u?.id ?? null);
    this.authListeners.forEach((l) => l(u));
  }

  async signIn() {
    throw new Error('Mode démo : choisis simplement un pseudo.');
  }

  async signUp() {
    throw new Error('Mode démo : choisis simplement un pseudo.');
  }

  /** Connexion par pseudo : crée le profil s'il n'existe pas. */
  async signInLocal(name: string) {
    const clean = name.trim();
    if (!clean) throw new Error('Choisis un pseudo');
    let user = this.db.read().users.find((u) => u.name.toLowerCase() === clean.toLowerCase());
    if (!user) {
      const u: User = { id: uid(), name: clean };
      this.db.write((d) => d.users.push(u));
      user = u;
    }
    this.setUser(user);
  }

  listLocalProfiles() {
    return [...this.db.read().users];
  }

  async signOut() {
    this.setUser(null);
  }

  // Emails et mots de passe : seulement en ligne (Supabase). En démo, un profil = un pseudo sur cet appareil.
  async resetPassword() {
    throw new Error('Disponible en mode en ligne');
  }
  async sendLoginLink() {
    throw new Error('Disponible en mode en ligne');
  }
  async updatePassword() {
    throw new Error('Disponible en mode en ligne');
  }
  onPasswordRecovery() {
    return () => undefined;
  }

  /** Change mon pseudo (profil et nom affiché dans mes campagnes). */
  async updateName(name: string) {
    const clean = name.trim();
    const me = this.db.me();
    if (!clean) throw new Error('Choisis un pseudo');
    if (this.db.read().users.some((u) => u.id !== me.id && u.name.toLowerCase() === clean.toLowerCase())) throw new Error('Pseudo déjà pris sur cet appareil');
    this.db.write((d) => {
      d.users.find((u) => u.id === me.id)!.name = clean;
      for (const m of d.members) if (m.user_id === me.id) m.display_name = clean;
    });
    this.setUser({ ...me, name: clean });
  }

  // ---------- campagnes ----------
  async listCampaigns(): Promise<CampaignSummary[]> {
    const me = this.db.me();
    const d = this.db.read();
    return d.members
      .filter((m) => m.user_id === me.id)
      .map((m) => {
        const c = d.campaigns.find((x) => x.id === m.campaign_id);
        return c ? { ...c, role: m.role } : null;
      })
      .filter((x): x is CampaignSummary => !!x)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async createCampaign(name: string, template: CampaignTemplate, displayName: string) {
    const me = this.db.me();
    const c: Campaign = {
      id: uid(),
      name: name.trim() || 'Nouvelle campagne',
      gm_id: me.id,
      join_code: joinCode(),
      template,
      settings: { ...DEFAULT_SETTINGS },
      created_at: now(),
    };
    this.db.write((d) => {
      d.campaigns.push(c);
      d.members.push({ campaign_id: c.id, user_id: me.id, role: 'gm', display_name: displayName || me.name });
    });
    return c;
  }

  async joinCampaign(code: string, displayName: string) {
    const me = this.db.me();
    const d = this.db.read();
    const c = d.campaigns.find((x) => x.join_code === code.trim().toUpperCase());
    if (!c) throw new Error('Aucune campagne avec ce code');
    if (!d.members.some((m) => m.campaign_id === c.id && m.user_id === me.id)) {
      this.db.write((w) =>
        w.members.push({ campaign_id: c.id, user_id: me.id, role: 'player', display_name: displayName || me.name })
      );
    }
    return c;
  }

  async updateCampaign(id: string, patch: CampaignPatch) {
    this.db.requireGM(id);
    this.db.write((d) => {
      const c = d.campaigns.find((x) => x.id === id);
      if (c) Object.assign(c, patch);
    });
  }

  async deleteCampaign(id: string) {
    this.db.requireGM(id);
    this.db.write((d) => {
      d.campaigns = d.campaigns.filter((x) => x.id !== id);
      d.members = d.members.filter((x) => x.campaign_id !== id);
      d.characters = d.characters.filter((x) => x.campaign_id !== id);
      d.items = d.items.filter((x) => x.campaign_id !== id);
      d.rolls = d.rolls.filter((x) => x.campaign_id !== id);
      d.notes = d.notes.filter((x) => x.campaign_id !== id);
      d.shops = d.shops.filter((x) => x.campaign_id !== id);
      d.shopItems = d.shopItems.filter((x) => x.campaign_id !== id);
    });
  }

  async leaveCampaign(id: string) {
    const me = this.db.me();
    this.db.write((d) => {
      d.members = d.members.filter((m) => !(m.campaign_id === id && m.user_id === me.id));
    });
  }

  async removeMember(campaignId: string, userId: string) {
    this.db.requireGM(campaignId);
    this.db.write((d) => {
      d.members = d.members.filter((m) => !(m.campaign_id === campaignId && m.user_id === userId));
    });
  }

  /** Charge toute la campagne en appliquant les mêmes règles de visibilité que Supabase. */
  async loadCampaign(id: string): Promise<CampaignData> {
    const me = this.db.me();
    const d = this.db.read();
    const campaign = d.campaigns.find((c) => c.id === id);
    const role = this.db.role(id);
    if (!campaign || !role) throw new Error('Campagne introuvable ou accès refusé');
    const gm = role === 'gm';
    return {
      campaign: structuredClone(campaign),
      members: d.members.filter((m) => m.campaign_id === id),
      characters: structuredClone(d.characters.filter((c) => c.campaign_id === id)),
      items: d.items.filter((i) => i.campaign_id === id),
      rolls: d.rolls
        .filter((r) => r.campaign_id === id && (!r.secret || gm || r.user_id === me.id))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 200),
      notes: d.notes
        .filter((n) => n.campaign_id === id && (n.author_id === me.id || n.visibility === 'all' || (n.visibility === 'gm' && gm) || (n.reader_ids ?? []).includes(me.id)))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
      secrets: combatOps.loadSecrets(this.db, id),
      ...shopOps.shopsFor(this.db, id, gm),
    };
  }

  subscribe(_campaignId: string, onChange: () => void) {
    return this.db.subscribe(onChange);
  }

  // ---------- opérations de jeu (voir localGameOps.ts) ----------
  async createCharacter(c: Omit<Character, 'id' | 'updated_at'>) {
    return ops.createCharacter(this.db, c);
  }
  async updateCharacter(id: string, patch: CharacterPatch) {
    ops.updateCharacter(this.db, id, patch);
  }
  async adjustResource(id: string, key: string, delta: number) {
    ops.adjustResource(this.db, id, key, delta);
  }
  async applyHp(id: string, delta: number) {
    ops.applyHp(this.db, id, delta);
  }
  async setTempHp(id: string, value: number) {
    ops.setTempHp(this.db, id, value);
  }
  async deathSave(id: string, natural: number) {
    ops.deathSave(this.db, id, natural);
  }
  async adjustCoins(id: string, coin: Coin, delta: number) {
    sheetOps.adjustCoins(this.db, id, coin, delta);
  }
  async patchSheet(id: string, patch: Partial<DndSheet>) {
    sheetOps.patchSheet(this.db, id, patch);
  }
  async levelUp(id: string, patch: Partial<DndSheet>, hpGain: number) {
    sheetOps.levelUp(this.db, id, patch, hpGain);
  }
  async levelDown(id: string) {
    sheetOps.levelDown(this.db, id);
  }
  async useFeature(id: string, featureId: string) {
    sheetOps.useFeature(this.db, id, featureId);
  }
  async spendSlot(id: string, level: number) {
    sheetOps.spendSlot(this.db, id, level);
  }
  async setPrepared(id: string, spellId: string, prepared: boolean) {
    sheetOps.setPrepared(this.db, id, spellId, prepared);
  }
  async deleteCharacter(id: string) {
    ops.deleteCharacter(this.db, id);
  }
  async addItem(i: Omit<Item, 'id' | 'created_at'>) {
    ops.addItem(this.db, i);
  }
  async updateItem(id: string, patch: ItemPatch) {
    ops.updateItem(this.db, id, patch);
  }
  async deleteItem(id: string) {
    ops.deleteItem(this.db, id);
  }
  async transferItem(itemId: string, toCharacterId: string, qty: number) {
    ops.transferItem(this.db, itemId, toCharacterId, qty);
  }
  async addRoll(r: NewRoll) {
    return ops.addRoll(this.db, r);
  }
  async clearRolls(campaignId: string) {
    ops.clearRolls(this.db, campaignId);
  }
  async saveNote(n: ops.NoteInput) {
    ops.saveNote(this.db, n);
  }
  async deleteNote(id: string) {
    ops.deleteNote(this.db, id);
  }
}
