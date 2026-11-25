// Mode en ligne : opérations de jeu (personnages, PV, pièces, inventaire, dés, notes) via Supabase.
// Fonctions appelées par SupabaseStore ; les opérations sensibles passent par des fonctions SQL atomiques.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Coin } from '../lib/dnd/data';
import type { DndSheet } from '../lib/dnd/sheet';
import type { CampaignSecrets } from '../lib/dnd/combat';
import type { ActPayload, ActResult } from '../lib/dnd/resolve';
import type { Character, Item, Roll } from '../lib/types';
import type { CharacterPatch, ItemPatch, NewRoll } from './store';
import { check } from './supabaseUtils';

type Sb = SupabaseClient;
const rpc = async (sb: Sb, fn: string, args: Record<string, unknown>) => {
  check(await sb.rpc(fn, args));
};
/** Appel d'une fonction SQL sans résultat. */
export const rpcVoid = rpc;

// ---------- combat ----------
export const setInitiative = (sb: Sb, campaignId: string, combatantId: string, value: number) =>
  rpc(sb, 'set_initiative', { p_campaign: campaignId, p_combatant: combatantId, p_value: value });

export async function saveSecrets(sb: Sb, campaignId: string, secrets: CampaignSecrets) {
  check(await sb.from('campaign_secrets').upsert({ campaign_id: campaignId, data: secrets, updated_at: new Date().toISOString() }));
}

/** Action de combat résolue côté serveur (CA et sauvegardes des monstres restent secrètes). */
export async function combatAct(sb: Sb, campaignId: string, actorId: string, payload: ActPayload): Promise<ActResult[]> {
  return (check(await sb.rpc('combat_act', { p_campaign: campaignId, p_actor: actorId, p_payload: payload })) as ActResult[]) ?? [];
}

/** Déplacement (renvoie le récit d'un piège déclenché, sinon null). */
export async function combatMove(sb: Sb, campaignId: string, combatantId: string, x: number, y: number): Promise<string | null> {
  return (check(await sb.rpc('combat_move', { p_campaign: campaignId, p_combatant: combatantId, p_x: x, p_y: y })) as string | null) ?? null;
}

export const combatDismiss = (sb: Sb, campaignId: string, reactionId: string) =>
  rpc(sb, 'combat_dismiss', { p_campaign: campaignId, p_reaction: reactionId });

/** Image de fond (table campaign_maps, clé (campagne, map_id) : lecture membres pour 'current', écriture MJ). */
export async function saveMapImage(sb: Sb, campaignId: string, dataUrl: string | null, key = 'current'): Promise<string | null> {
  if (!dataUrl) {
    check(await sb.from('campaign_maps').delete().eq('campaign_id', campaignId).eq('map_id', key));
    return null;
  }
  check(await sb.from('campaign_maps').upsert({ campaign_id: campaignId, map_id: key, data: dataUrl, updated_at: new Date().toISOString() }));
  return Date.now().toString(36);
}

export async function loadMapImage(sb: Sb, campaignId: string, key = 'current'): Promise<string | null> {
  const res = await sb.from('campaign_maps').select('data').eq('campaign_id', campaignId).eq('map_id', key).maybeSingle();
  return res.error || !res.data ? null : (res.data as { data: string }).data;
}

export const useItem = (sb: Sb, itemId: string, heal: number, targetCharacterId?: string) =>
  rpc(sb, 'use_item', { p_item: itemId, p_heal: heal, p_target: targetCharacterId ?? null });

/** Secrets du MJ (la base ne renvoie rien aux joueurs). */
export async function loadSecrets(sb: Sb, campaignId: string): Promise<CampaignSecrets | null> {
  const res = await sb.from('campaign_secrets').select('data').eq('campaign_id', campaignId).maybeSingle();
  if (res.error) return null;
  return (res.data?.data as CampaignSecrets | undefined) ?? null;
}

// ---------- personnages ----------
export async function createCharacter(sb: Sb, c: Omit<Character, 'id' | 'updated_at'>) {
  return check(await sb.from('characters').insert(c).select().single()) as Character;
}

export async function updateCharacter(sb: Sb, id: string, patch: CharacterPatch) {
  check(await sb.from('characters').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id));
}

export const adjustResource = (sb: Sb, id: string, key: string, delta: number) =>
  rpc(sb, 'adjust_resource', { p_char: id, p_key: key, p_delta: delta });

export const applyHp = (sb: Sb, id: string, delta: number) => rpc(sb, 'apply_hp', { p_char: id, p_delta: delta });

export const setTempHp = (sb: Sb, id: string, value: number) => rpc(sb, 'set_temp_hp', { p_char: id, p_value: value });

export const deathSave = (sb: Sb, id: string, natural: number) => rpc(sb, 'death_save', { p_char: id, p_natural: natural });

export const adjustCoins = (sb: Sb, id: string, coin: Coin, delta: number) =>
  rpc(sb, 'adjust_coins', { p_char: id, p_coin: coin, p_delta: delta });

export const patchSheet = (sb: Sb, id: string, patch: Partial<DndSheet>) => rpc(sb, 'patch_sheet', { p_char: id, p_patch: patch });

export const useFeature = (sb: Sb, id: string, featureId: string) => rpc(sb, 'use_feature', { p_char: id, p_feature: featureId });

export const spendSlot = (sb: Sb, id: string, level: number) => rpc(sb, 'spend_slot', { p_char: id, p_level: level });

export const setPrepared = (sb: Sb, id: string, spellId: string, prepared: boolean) =>
  rpc(sb, 'set_prepared', { p_char: id, p_spell: spellId, p_prepared: prepared });

export async function deleteCharacter(sb: Sb, id: string) {
  check(await sb.from('characters').delete().eq('id', id));
}

// ---------- inventaire ----------
/** Le MJ donne un objet (fusionné avec un objet identique) ; formule de soin ajoutée ensuite (potions). */
export async function addItem(sb: Sb, i: Omit<Item, 'id' | 'created_at'>) {
  await rpc(sb, 'give_item', { p_char: i.character_id, p_name: i.name, p_qty: i.qty, p_description: i.description });
  if (i.heal) check(await sb.from('items').update({ heal: i.heal }).eq('character_id', i.character_id).eq('name', i.name.trim()).eq('description', i.description));
}

export async function updateItem(sb: Sb, id: string, patch: ItemPatch) {
  check(await sb.from('items').update(patch).eq('id', id));
}

export async function deleteItem(sb: Sb, id: string) {
  check(await sb.from('items').delete().eq('id', id));
}

export const transferItem = (sb: Sb, itemId: string, toCharacterId: string, qty: number) =>
  rpc(sb, 'transfer_item', { p_item: itemId, p_to: toCharacterId, p_qty: qty });

// ---------- dés ----------
export async function addRoll(sb: Sb, uid: string, r: NewRoll) {
  return check(await sb.from('rolls').insert({ ...r, user_id: uid }).select().single()) as Roll;
}

export async function clearRolls(sb: Sb, campaignId: string) {
  check(await sb.from('rolls').delete().eq('campaign_id', campaignId));
}

// ---------- notes ----------
export interface NoteInput {
  id?: string;
  campaign_id: string;
  title: string;
  content: string;
  visibility: 'all' | 'gm' | 'private';
  reader_ids?: string[];
}

export async function saveNote(sb: Sb, uid: string, fallbackName: string, n: NoteInput) {
  const now = new Date().toISOString();
  if (n.id) {
    check(await sb.from('notes').update({ title: n.title, content: n.content, visibility: n.visibility, ...(n.reader_ids ? { reader_ids: n.reader_ids } : {}), updated_at: now }).eq('id', n.id));
    return;
  }
  const me = check(
    await sb.from('members').select('display_name').eq('campaign_id', n.campaign_id).eq('user_id', uid).maybeSingle()
  ) as { display_name: string } | null;
  check(
    await sb.from('notes').insert({
      campaign_id: n.campaign_id,
      author_id: uid,
      author_name: me?.display_name || fallbackName,
      title: n.title,
      content: n.content,
      visibility: n.visibility,
      ...(n.reader_ids ? { reader_ids: n.reader_ids } : {}),
    })
  );
}

export async function deleteNote(sb: Sb, id: string) {
  check(await sb.from('notes').delete().eq('id', id));
}
