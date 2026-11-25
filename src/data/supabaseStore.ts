// Mode en ligne : données partagées via Supabase (Postgres + Auth + Realtime).
// Compte, campagnes, chargement et temps réel ici ; opérations de jeu dans supabaseGameOps.ts.
// Les règles d'accès sont appliquées côté serveur (RLS, voir supabase/migrations).

import type { Campaign, CampaignData, CampaignSummary, CampaignTemplate, Character, Item, Member, User } from '../lib/types';
import type { Coin } from '../lib/dnd/data';
import type { DndSheet } from '../lib/dnd/sheet';
import type { CampaignPatch, CharacterPatch, ItemPatch, NewRoll, Store } from './store';
import { SupabaseTableStore } from './supabaseTableStore';
import * as ops from './supabaseGameOps';
import { check, toUser, withSettings } from './supabaseUtils';
import { TABLES, type Change, type Table } from './supabaseCache';

export class SupabaseStore extends SupabaseTableStore implements Store {
  readonly mode = 'supabase' as const;
  private user: User | null = null;

  private async uidOrThrow(): Promise<string> {
    const u = await this.currentUser();
    if (!u) throw new Error('Non connecté');
    return u.id;
  }

  // ---------- compte ----------
  async currentUser() {
    if (this.user) return this.user;
    const { data } = await this.sb.auth.getSession();
    this.user = toUser(data.session?.user);
    return this.user;
  }

  onAuthChange(cb: (u: User | null) => void) {
    const { data } = this.sb.auth.onAuthStateChange((_e, session) => {
      this.user = toUser(session?.user);
      cb(this.user);
    });
    return () => data.subscription.unsubscribe();
  }

  async signIn(email: string, password: string) {
    check(await this.sb.auth.signInWithPassword({ email: email.trim(), password }));
  }

  async signUp(email: string, password: string, name: string) {
    const data = check(
      await this.sb.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } })
    );
    if (!data.session) throw new Error('Compte créé ! Confirme ton email (regarde ta boîte mail), puis connecte-toi.');
  }

  async signInLocal() {
    throw new Error('Indisponible en mode en ligne');
  }

  listLocalProfiles() {
    return [];
  }

  async signOut() {
    await this.sb.auth.signOut();
    this.user = null;
  }

  /** Adresse de retour des emails (lien de connexion, nouveau mot de passe) : l'appli elle-même. */
  private siteUrl() {
    return location.origin + location.pathname;
  }

  async resetPassword(email: string) {
    check(await this.sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: this.siteUrl() }));
  }

  async sendLoginLink(email: string) {
    check(await this.sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: this.siteUrl() } }));
  }

  async updatePassword(password: string) {
    if (password.length < 6) throw new Error('6 caractères minimum');
    check(await this.sb.auth.updateUser({ password }));
  }

  async updateName(name: string) {
    const clean = name.trim();
    if (!clean) throw new Error('Choisis un pseudo');
    check(await this.sb.auth.updateUser({ data: { name: clean } }));
    check(await this.sb.rpc('set_display_name', { p_name: clean }));
    this.user = null;
  }

  onPasswordRecovery(cb: () => void) {
    const { data } = this.sb.auth.onAuthStateChange((e) => e === 'PASSWORD_RECOVERY' && cb());
    return () => data.subscription.unsubscribe();
  }

  // ---------- campagnes ----------
  async listCampaigns(): Promise<CampaignSummary[]> {
    const uid = await this.uidOrThrow();
    const rows = check(
      await this.sb.from('members').select('role, campaigns(*)').eq('user_id', uid)
    ) as unknown as { role: Member['role']; campaigns: Campaign | null }[];
    return rows
      .filter((r) => r.campaigns)
      .map((r) => ({ ...withSettings(r.campaigns!), role: r.role }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async createCampaign(name: string, template: CampaignTemplate, displayName: string) {
    this.touch();
    return check(
      await this.sb.rpc('create_campaign', { p_name: name, p_template: template, p_display_name: displayName })
    ) as Campaign;
  }

  async joinCampaign(code: string, displayName: string) {
    this.touch();
    return check(await this.sb.rpc('join_campaign', { p_code: code, p_display_name: displayName })) as Campaign;
  }

  async updateCampaign(id: string, patch: CampaignPatch) {
    this.touch();
    check(await this.sb.from('campaigns').update(patch).eq('id', id));
  }

  async deleteCampaign(id: string) {
    this.touch();
    check(await this.sb.from('campaigns').delete().eq('id', id));
  }

  async leaveCampaign(id: string) {
    const uid = await this.uidOrThrow();
    check(await this.sb.from('members').delete().eq('campaign_id', id).eq('user_id', uid));
  }

  async removeMember(campaignId: string, userId: string) {
    this.touch();
    check(await this.sb.from('members').delete().eq('campaign_id', campaignId).eq('user_id', userId));
  }

  async loadCampaign(id: string): Promise<CampaignData> {
    return this.cache.load(id);
  }

  /** Tout relire au prochain chargement (retour de veille, reconnexion). */
  invalidate(campaignId: string) {
    this.cache.invalidate(campaignId);
  }

  subscribe(campaignId: string, onChange: () => void) {
    const ch = this.sb.channel(`campaign-${campaignId}-${Math.random().toString(36).slice(2)}`);
    const on = (table: Table) => (p: { eventType: Change['eventType']; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
      if (this.cache.apply(campaignId, { table, eventType: p.eventType, new: p.new, old: p.old })) onChange();
    };
    for (const table of TABLES.filter((t) => t !== 'campaigns')) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `campaign_id=eq.${campaignId}` }, on(table));
      // Les suppressions ne sont pas filtrables côté Supabase : on écoute sans filtre et le cache ignore celles d'ailleurs.
      ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, on(table));
    }
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns', filter: `id=eq.${campaignId}` }, on('campaigns'));
    ch.subscribe((status) => {
      // (Re)connexion : des changements ont pu être manqués, on relit tout.
      if (status === 'SUBSCRIBED') {
        this.cache.invalidate(campaignId);
        onChange();
      }
    });
    return () => {
      void this.sb.removeChannel(ch);
    };
  }

  // ---------- opérations de jeu (voir supabaseGameOps.ts) ----------
  createCharacter(c: Omit<Character, 'id' | 'updated_at'>) {
    return this.w(async () => ops.createCharacter(this.sb, c));
  }
  updateCharacter(id: string, patch: CharacterPatch) {
    return this.w(async () => ops.updateCharacter(this.sb, id, patch));
  }
  adjustResource(id: string, key: string, delta: number) {
    return this.w(async () => ops.adjustResource(this.sb, id, key, delta));
  }
  applyHp(id: string, delta: number) {
    return this.w(async () => ops.applyHp(this.sb, id, delta));
  }
  setTempHp(id: string, value: number) {
    return this.w(async () => ops.setTempHp(this.sb, id, value));
  }
  deathSave(id: string, natural: number) {
    return this.w(async () => ops.deathSave(this.sb, id, natural));
  }
  adjustCoins(id: string, coin: Coin, delta: number) {
    return this.w(async () => ops.adjustCoins(this.sb, id, coin, delta));
  }
  patchSheet(id: string, patch: Partial<DndSheet>) {
    return this.w(async () => ops.patchSheet(this.sb, id, patch));
  }
  levelUp(id: string, patch: Partial<DndSheet>, hpGain: number) {
    return this.w(async () => ops.rpcVoid(this.sb, 'level_up', { p_char: id, p_patch: patch, p_hp: hpGain }));
  }
  levelDown(id: string) {
    return this.w(async () => ops.rpcVoid(this.sb, 'level_down', { p_char: id }));
  }
  useFeature(id: string, featureId: string) {
    return this.w(async () => ops.useFeature(this.sb, id, featureId));
  }
  spendSlot(id: string, level: number) {
    return this.w(async () => ops.spendSlot(this.sb, id, level));
  }
  setPrepared(id: string, spellId: string, prepared: boolean) {
    return this.w(async () => ops.setPrepared(this.sb, id, spellId, prepared));
  }
  deleteCharacter(id: string) {
    return this.w(async () => ops.deleteCharacter(this.sb, id));
  }
  addItem(i: Omit<Item, 'id' | 'created_at'>) {
    return this.w(async () => ops.addItem(this.sb, i));
  }
  updateItem(id: string, patch: ItemPatch) {
    return this.w(async () => ops.updateItem(this.sb, id, patch));
  }
  deleteItem(id: string) {
    return this.w(async () => ops.deleteItem(this.sb, id));
  }
  transferItem(itemId: string, toCharacterId: string, qty: number) {
    return this.w(async () => ops.transferItem(this.sb, itemId, toCharacterId, qty));
  }
  async addRoll(r: NewRoll) {
    const roll = await this.w(async () => ops.addRoll(this.sb, await this.uidOrThrow(), r));
    this.cache.addRoll(roll);
    return roll;
  }
  clearRolls(campaignId: string) {
    return this.w(async () => ops.clearRolls(this.sb, campaignId));
  }
  async saveNote(n: ops.NoteInput) {
    return this.w(async () => ops.saveNote(this.sb, await this.uidOrThrow(), this.user?.name ?? '', n));
  }
  deleteNote(id: string) {
    return this.w(async () => ops.deleteNote(this.sb, id));
  }
}
