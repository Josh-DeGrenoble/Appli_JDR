// Mode démo : base de données stockée dans le localStorage du navigateur.
// Gère la lecture/écriture, la synchro entre onglets (BroadcastChannel) et
// l'utilisateur courant (mémorisé par onglet dans sessionStorage).

import { gearKeys, syncGear } from './localGear';
import type { Campaign, Character, Item, Member, Note, Roll, Shop, ShopItem, User } from '../lib/types';
import type { CampaignSecrets } from '../lib/dnd/combat';

export interface DB {
  users: User[];
  campaigns: Campaign[];
  members: Member[];
  characters: Character[];
  items: Item[];
  rolls: Roll[];
  notes: Note[];
  /** Données secrètes du MJ par campagne (PV des monstres). */
  secrets: { campaign_id: string; data: CampaignSecrets }[];
  shops: Shop[];
  shopItems: ShopItem[];
}

const DB_KEY = 'grimoire-local-db';
const USER_KEY = 'grimoire-local-user';
const empty = (): DB => ({ users: [], campaigns: [], members: [], characters: [], items: [], rolls: [], notes: [], secrets: [], shops: [], shopItems: [] });

function safeGet(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: () => Storage, key: string, value: string | null) {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    /* stockage indisponible : on reste en mémoire */
  }
}

export class LocalDb {
  lastLocalWrite = 0;
  private mem: DB | null = null;
  private listeners = new Set<() => void>();
  private channel: BroadcastChannel | null = null;

  constructor() {
    try {
      this.channel = new BroadcastChannel('grimoire-local');
      this.channel.onmessage = () => this.invalidate();
      // Sous Node (tests), ne bloque pas la fin du processus.
      (this.channel as unknown as { unref?: () => void }).unref?.();
    } catch {
      this.channel = null;
    }
    try {
      window.addEventListener('storage', (e) => e.key === DB_KEY && this.invalidate());
    } catch {
      /* hors navigateur */
    }
  }

  private invalidate() {
    this.mem = null;
    this.emit();
  }

  /** Lit la base (cache mémoire, rechargé quand un autre onglet écrit). */
  read(): DB {
    if (this.mem) return this.mem;
    const raw = safeGet(() => localStorage, DB_KEY);
    let db = empty();
    if (raw) {
      try {
        db = { ...empty(), ...JSON.parse(raw) };
      } catch {
        db = empty();
      }
    }
    this.mem = db;
    return db;
  }

  /** Modifie la base, l'enregistre et prévient les autres onglets. */
  write(mut: (db: DB) => void) {
    const db = this.read();
    const gear = gearKeys(db);
    mut(db);
    syncGear(db, gear);
    this.mem = db;
    this.lastLocalWrite = Date.now();
    safeSet(() => localStorage, DB_KEY, JSON.stringify(db));
    this.channel?.postMessage('change');
    this.emit();
  }

  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private emit() {
    // Différé pour laisser l'appelant finir son await.
    setTimeout(() => this.listeners.forEach((l) => l()), 0);
  }

  // ---------- utilisateur courant ----------
  currentUserId(): string | null {
    return safeGet(() => sessionStorage, USER_KEY) ?? safeGet(() => localStorage, USER_KEY);
  }

  setCurrentUserId(id: string | null) {
    safeSet(() => sessionStorage, USER_KEY, id);
    safeSet(() => localStorage, USER_KEY, id);
  }

  /** Utilisateur connecté, ou erreur. */
  me(): User {
    const id = this.currentUserId();
    const u = this.read().users.find((x) => x.id === id);
    if (!u) throw new Error('Non connecté');
    return u;
  }

  /** Rôle de l'utilisateur courant dans une campagne (null si non membre). */
  role(campaignId: string): Member['role'] | null {
    const me = this.me();
    return this.read().members.find((m) => m.campaign_id === campaignId && m.user_id === me.id)?.role ?? null;
  }

  /** L'utilisateur courant est-il MJ de la campagne de ce personnage ? */
  isGmOfCharacter(characterId: string): boolean {
    const c = this.read().characters.find((x) => x.id === characterId);
    return !!c && this.role(c.campaign_id) === 'gm';
  }

  requireGM(campaignId: string) {
    if (this.role(campaignId) !== 'gm') throw new Error('Réservé au MJ');
  }
}
