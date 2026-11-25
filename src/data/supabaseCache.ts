// Mode en ligne : chargement d'une campagne par morceaux. On garde la dernière version en mémoire et on ne recharge
// que les tables qui ont changé (signalées par le temps réel). Un jet de dé d'un autre joueur est ajouté tel quel à
// l'historique, sans rien recharger. Après une écriture locale, au retour de veille ou de connexion : tout est rechargé.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Campaign, CampaignData, Character, Item, Member, Note, Roll } from '../lib/types';
import * as ops from './supabaseGameOps';
import * as shopOps from './supabaseShopOps';
import { check, withSettings } from './supabaseUtils';

/** Tables suivies en temps réel (toutes ont une colonne campaign_id, sauf campaigns). */
export const TABLES = ['campaigns', 'members', 'characters', 'items', 'rolls', 'notes', 'campaign_secrets', 'shops', 'shop_items'] as const;
export type Table = (typeof TABLES)[number];

const ROLLS_MAX = 200;

/** Changement reçu du temps réel (forme réduite des événements Supabase). */
export interface Change {
  table: Table;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
}

export class CampaignCache {
  private data = new Map<string, CampaignData>();
  private dirty = new Map<string, Set<Table>>();

  constructor(private sb: SupabaseClient) {}

  /**
   * Tout recharger au prochain chargement. Après une écriture locale (`withRolls` false) l'historique des jets n'est pas
   * relu : mes jets y sont ajoutés directement (addRoll), ceux des autres par le temps réel.
   */
  invalidate(campaignId?: string, withRolls = true) {
    for (const id of campaignId ? [campaignId] : [...this.data.keys()]) this.dirty.set(id, new Set(TABLES.filter((t) => withRolls || t !== 'rolls')));
  }

  /**
   * Applique un changement reçu. Renvoie false s'il ne concerne pas cette campagne (suppression ailleurs : Supabase ne
   * filtre pas les suppressions, on vérifie que l'identifiant supprimé est bien chez nous).
   */
  apply(campaignId: string, c: Change): boolean {
    const d = this.data.get(campaignId);
    if (!d) return true;
    if (c.eventType === 'DELETE') {
      const old = c.old ?? {};
      if (old.campaign_id !== undefined && old.campaign_id !== campaignId) return false;
      if (old.campaign_id === undefined && c.table !== 'campaigns' && !(old.id && this.idsOf(d, c.table).has(String(old.id)))) return false;
    }
    if (c.table === 'rolls' && c.eventType === 'INSERT' && c.new) {
      const r = c.new as unknown as Roll;
      if (!d.rolls.some((x) => x.id === r.id)) this.data.set(campaignId, { ...d, rolls: [r, ...d.rolls].slice(0, ROLLS_MAX) });
      return true;
    }
    this.mark(campaignId, c.table);
    return true;
  }

  /** Ajoute mon propre jet à l'historique (sans attendre le temps réel). */
  addRoll(r: Roll) {
    const d = this.data.get(r.campaign_id);
    if (d && !d.rolls.some((x) => x.id === r.id)) this.data.set(r.campaign_id, { ...d, rolls: [r, ...d.rolls].slice(0, ROLLS_MAX) });
  }

  /** Charge la campagne : tout la première fois, ensuite seulement les tables marquées. */
  async load(id: string): Promise<CampaignData> {
    const cur = this.data.get(id);
    const todo = cur ? this.dirty.get(id) ?? new Set<Table>() : new Set<Table>(TABLES);
    this.dirty.set(id, new Set());
    if (cur && !todo.size) return cur;
    const next: Partial<CampaignData> = { ...cur };
    const q = (t: Table) => todo.has(t);
    const tasks: Promise<void>[] = [];
    const sb = this.sb;
    if (q('campaigns'))
      tasks.push((async () => {
        const c = check(await sb.from('campaigns').select('*').eq('id', id).maybeSingle()) as Campaign | null;
        if (!c) throw new Error('Campagne introuvable ou accès refusé');
        next.campaign = withSettings(c);
      })());
    if (q('members')) tasks.push((async () => void (next.members = check(await sb.from('members').select('*').eq('campaign_id', id)) as Member[]))());
    if (q('characters')) tasks.push((async () => void (next.characters = check(await sb.from('characters').select('*').eq('campaign_id', id).order('name')) as Character[]))());
    if (q('items')) tasks.push((async () => void (next.items = check(await sb.from('items').select('*').eq('campaign_id', id).order('created_at')) as Item[]))());
    if (q('rolls'))
      tasks.push((async () => void (next.rolls = check(await sb.from('rolls').select('*').eq('campaign_id', id).order('created_at', { ascending: false }).limit(ROLLS_MAX)) as Roll[]))());
    if (q('notes')) tasks.push((async () => void (next.notes = check(await sb.from('notes').select('*').eq('campaign_id', id).order('updated_at', { ascending: false })) as Note[]))());
    if (q('campaign_secrets')) tasks.push((async () => void (next.secrets = await ops.loadSecrets(sb, id)))());
    if (q('shops') || q('shop_items')) tasks.push((async () => void Object.assign(next, await shopOps.loadShops(sb, id)))());
    try {
      await Promise.all(tasks);
    } catch (e) {
      for (const t of todo) this.mark(id, t); // réessayer au prochain chargement
      throw e;
    }
    const d = next as CampaignData;
    this.data.set(id, d);
    return d;
  }

  private mark(id: string, t: Table) {
    const s = this.dirty.get(id) ?? new Set<Table>();
    s.add(t);
    this.dirty.set(id, s);
  }

  private idsOf(d: CampaignData, t: Table): Set<string> {
    const list = { characters: d.characters, items: d.items, rolls: d.rolls, notes: d.notes, shops: d.shops, shop_items: d.shopItems }[t as string] as { id: string }[] | undefined;
    return new Set((list ?? []).map((x) => x.id));
  }
}
