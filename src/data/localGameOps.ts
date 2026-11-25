// Mode démo : opérations de jeu (personnages, inventaire, dés, notes).
// Fonctions pures sur LocalDb, appelées par LocalStore.

import { now, uid } from '../lib/ids';
import type { Character, Item, Note, Roll } from '../lib/types';
import { applyHpDelta, deathSaveResult, type Hp } from '../lib/dnd/rules';
import { normalizeSheet } from '../lib/dnd/sheet';
import type { LocalDb } from './localDb';
import { checkSlot } from '../lib/dnd/slots';
import type { CharacterPatch, ItemPatch, NewRoll } from './store';

const sameItem = (a: Pick<Item, 'name' | 'description'>, b: Pick<Item, 'name' | 'description'>) =>
  a.name.toLowerCase() === b.name.toLowerCase() && a.description === b.description;

// ---------- personnages ----------
export function createCharacter(db: LocalDb, c: Omit<Character, 'id' | 'updated_at'>): Character {
  const ch: Character = { ...c, id: uid(), updated_at: now() };
  db.write((d) => d.characters.push(ch));
  return ch;
}

export function patchChar(db: LocalDb, id: string, fn: (c: Character) => void) {
  db.write((d) => {
    const c = d.characters.find((x) => x.id === id);
    if (c) {
      fn(c);
      c.updated_at = now();
    }
  });
}

export const updateCharacter = (db: LocalDb, id: string, patch: CharacterPatch) =>
  patchChar(db, id, (c) => Object.assign(c, patch));

/** Ajuste une jauge, bornée entre 0 et son max. */
export const adjustResource = (db: LocalDb, id: string, key: string, delta: number) =>
  patchChar(db, id, (c) => {
    const r = c.resources[key] ?? { current: 0, max: 0 };
    const cap = r.max > 0 ? r.max : Infinity;
    c.resources[key] = { ...r, current: Math.max(0, Math.min(cap, r.current + delta)) };
  });

const hpOf = (c: Character): Hp => ({
  current: c.resources?.pv?.current ?? 0,
  max: c.resources?.pv?.max ?? 0,
  temp: c.resources?.pvtemp?.current ?? 0,
});

function writeHp(c: Character, hp: Hp) {
  c.resources = { ...c.resources, pv: { current: hp.current, max: hp.max }, pvtemp: { current: hp.temp, max: 0 } };
  if (hp.current > 0) c.sheet = { ...c.sheet, deathSaves: { success: 0, failure: 0 } };
}

/** Refuse si l'utilisateur n'est pas MJ et que la table interdit aux joueurs de gérer leurs PV. */
function requireHpRight(db: LocalDb, id: string) {
  const d = db.read();
  const c = d.characters.find((x) => x.id === id);
  if (!c) throw new Error('Personnage introuvable');
  const camp = d.campaigns.find((x) => x.id === c.campaign_id);
  if (db.role(c.campaign_id) !== 'gm' && !camp?.settings.playersEditHp) throw new Error('Seul le MJ peut modifier les PV');
}

/** Dégâts ou soins (PV temporaires absorbés d'abord). */
export function applyHp(db: LocalDb, id: string, delta: number) {
  requireHpRight(db, id);
  patchChar(db, id, (c) => writeHp(c, applyHpDelta(hpOf(c), delta)));
}

export function setTempHp(db: LocalDb, id: string, value: number) {
  requireHpRight(db, id);
  patchChar(db, id, (c) => writeHp(c, { ...hpOf(c), temp: Math.max(0, value) }));
}

/** Jet contre la mort : autorisé au propriétaire même si les PV sont réservés au MJ. */
export const deathSave = (db: LocalDb, id: string, natural: number) =>
  patchChar(db, id, (c) => {
    const hp = hpOf(c);
    if (hp.current > 0) return;
    const r = deathSaveResult(natural, normalizeSheet(c.sheet).deathSaves);
    if (r.revive) writeHp(c, { ...hp, current: 1 });
    else c.sheet = { ...c.sheet, deathSaves: { success: r.success, failure: r.failure } };
  });

export function deleteCharacter(db: LocalDb, id: string) {
  db.write((d) => {
    d.characters = d.characters.filter((c) => c.id !== id);
    d.items = d.items.filter((i) => i.character_id !== id);
  });
}

// ---------- inventaire ----------
/** Ajoute un objet ; fusionne avec un objet identique déjà possédé. */
export function addItem(db: LocalDb, i: Omit<Item, 'id' | 'created_at'>) {
  if (!db.isGmOfCharacter(i.character_id)) throw new Error('Seul le MJ donne des objets');
  db.write((d) => {
    const same = d.items.find((x) => x.character_id === i.character_id && sameItem(x, i));
    if (same) same.qty += i.qty;
    else d.items.push({ ...i, id: uid(), created_at: now() });
  });
}

export function updateItem(db: LocalDb, id: string, patch: ItemPatch) {
  const cur = db.read().items.find((x) => x.id === id);
  if (cur && !db.isGmOfCharacter(cur.character_id)) {
    const renamed = (patch.name !== undefined && patch.name !== cur.name) || (patch.description !== undefined && patch.description !== cur.description);
    if (renamed || (patch.qty !== undefined && patch.qty > cur.qty)) throw new Error('Seul le MJ peut ajouter ou modifier un objet');
  }
  // Un seul objet par emplacement (deux anneaux) = SQL items_slot (06_equipement.sql)
  if (cur && (patch.equipped ?? cur.equipped) && (patch.equipped || patch.name !== undefined))
    checkSlot(patch.name ?? cur.name, db.read().items.filter((x) => x.character_id === cur.character_id && x.equipped && x.id !== id));
  db.write((d) => {
    const it = d.items.find((x) => x.id === id);
    if (it) Object.assign(it, patch);
  });
}

export function deleteItem(db: LocalDb, id: string) {
  db.write((d) => {
    d.items = d.items.filter((x) => x.id !== id);
  });
}

/** Donne `qty` exemplaires d'un objet à un autre personnage. */
export function transferItem(db: LocalDb, itemId: string, toCharacterId: string, qty: number) {
  const it = db.read().items.find((x) => x.id === itemId);
  if (!it) throw new Error('Objet introuvable');
  const n = Math.min(Math.max(1, qty), it.qty);
  db.write((d) => {
    const src = d.items.find((x) => x.id === itemId)!;
    const dest = d.items.find((x) => x.character_id === toCharacterId && sameItem(x, src));
    if (dest) dest.qty += n;
    else d.items.push({ ...src, id: uid(), character_id: toCharacterId, qty: n, equipped: false, attuned: false, created_at: now() });
    src.qty -= n;
    if (src.qty <= 0) d.items = d.items.filter((x) => x.id !== itemId);
  });
}

// ---------- dés ----------
const MAX_ROLLS = 200;

export function addRoll(db: LocalDb, r: NewRoll): Roll {
  const roll: Roll = { ...r, id: uid(), user_id: db.me().id, created_at: now() };
  db.write((d) => {
    d.rolls.push(roll);
    const camp = d.rolls.filter((x) => x.campaign_id === r.campaign_id);
    if (camp.length > MAX_ROLLS) {
      const oldest = camp
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .slice(0, camp.length - MAX_ROLLS)
        .map((x) => x.id);
      const drop = new Set(oldest);
      d.rolls = d.rolls.filter((x) => !drop.has(x.id));
    }
  });
  return roll;
}

export function clearRolls(db: LocalDb, campaignId: string) {
  db.requireGM(campaignId);
  db.write((d) => {
    d.rolls = d.rolls.filter((x) => x.campaign_id !== campaignId);
  });
}

// ---------- notes ----------
export type NoteInput = Partial<Note> & { campaign_id: string; title: string; content: string; visibility: Note['visibility'] };

export function saveNote(db: LocalDb, n: NoteInput) {
  const me = db.me();
  const member = db.read().members.find((m) => m.campaign_id === n.campaign_id && m.user_id === me.id);
  db.write((d) => {
    const existing = n.id ? d.notes.find((x) => x.id === n.id) : undefined;
    if (existing) {
      Object.assign(existing, { title: n.title, content: n.content, visibility: n.visibility, reader_ids: n.reader_ids ?? existing.reader_ids ?? [], updated_at: now() });
      return;
    }
    d.notes.push({
      id: uid(),
      campaign_id: n.campaign_id,
      author_id: me.id,
      author_name: member?.display_name ?? me.name,
      title: n.title,
      content: n.content,
      visibility: n.visibility,
      reader_ids: n.reader_ids ?? [],
      updated_at: now(),
    });
  });
}

export function deleteNote(db: LocalDb, id: string) {
  db.write((d) => {
    d.notes = d.notes.filter((x) => x.id !== id);
  });
}
