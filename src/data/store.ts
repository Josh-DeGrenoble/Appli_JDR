// Interface unique d'accès aux données. Deux implémentations :
//  - LocalStore    : tout dans le navigateur (mode démo, multi-onglets en direct)
//  - SupabaseStore : base partagée + temps réel entre téléphones
// L'appli choisit automatiquement : Supabase si VITE_SUPABASE_URL est défini.

import type {
  Campaign,
  CampaignData,
  CampaignSummary,
  CampaignTemplate,
  Character,
  Item,
  Note,
  Roll,
  Shop,
  ShopItem,
  User,
} from '../lib/types';
import type { Coin } from '../lib/dnd/data';
import type { CampaignSecrets } from '../lib/dnd/combat';
import type { ActPayload, ActResult } from '../lib/dnd/resolve';
import type { DndSheet } from '../lib/dnd/sheet';

export type CharacterPatch = Partial<Pick<Character, 'name' | 'avatar' | 'subtitle' | 'stats' | 'resources' | 'notes'>>;
export type ItemPatch = Partial<Pick<Item, 'name' | 'qty' | 'description' | 'equipped' | 'attuned' | 'heal'>>;
export type CampaignPatch = Partial<Pick<Campaign, 'name' | 'template' | 'settings' | 'combat'>>;

/** Création (sans id) ou modification (avec id) d'un marchand/coffre. */
export type ShopInput = Partial<Pick<Shop, 'id' | 'name' | 'avatar' | 'kind' | 'visible' | 'description' | 'buys'>> & { campaign_id: string };
/** Création (sans id) ou modification (avec id) d'un objet de marchand/coffre. */
export type ShopItemInput = Partial<Pick<ShopItem, 'id' | 'name' | 'qty' | 'price_cp' | 'description' | 'heal'>> & { shop_id: string; campaign_id: string };

export interface NewRoll {
  campaign_id: string;
  author_name: string;
  label: string;
  formula: string;
  detail: string;
  total: number;
  secret: boolean;
  kind?: 'roll' | 'event';
}

export interface Store {
  readonly mode: 'local' | 'supabase';

  // Compte
  currentUser(): Promise<User | null>;
  onAuthChange(cb: (u: User | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, name: string): Promise<void>;
  signInLocal(name: string): Promise<void>;
  listLocalProfiles(): User[];
  signOut(): Promise<void>;
  /** En ligne : envoie un email pour choisir un nouveau mot de passe. */
  resetPassword(email: string): Promise<void>;
  /** En ligne : envoie un lien de connexion sans mot de passe (compte existant). */
  sendLoginLink(email: string): Promise<void>;
  /** En ligne : change le mot de passe (aussi après le lien « mot de passe oublié »). */
  updatePassword(password: string): Promise<void>;
  /** Change mon pseudo (compte et nom affiché dans mes campagnes). */
  updateName(name: string): Promise<void>;
  /** Prévient quand l'utilisateur arrive par le lien « mot de passe oublié » (il doit choisir un nouveau mot de passe). */
  onPasswordRecovery(cb: () => void): () => void;

  // Campagnes
  listCampaigns(): Promise<CampaignSummary[]>;
  createCampaign(name: string, template: CampaignTemplate, displayName: string): Promise<Campaign>;
  joinCampaign(code: string, displayName: string): Promise<Campaign>;
  updateCampaign(id: string, patch: CampaignPatch): Promise<void>;
  deleteCampaign(id: string): Promise<void>;
  leaveCampaign(id: string): Promise<void>;
  removeMember(campaignId: string, userId: string): Promise<void>;

  // Données d'une campagne + temps réel
  loadCampaign(id: string): Promise<CampaignData>;
  subscribe(campaignId: string, onChange: () => void): () => void;
  /** Tout relire au prochain chargement (retour de veille, reconnexion) ; en ligne seulement. */
  invalidate?(campaignId: string): void;

  // Combat
  /** Fixe l'initiative d'un combattant : le MJ pour tous, le joueur pour son propre perso. */
  setInitiative(campaignId: string, combatantId: string, value: number): Promise<void>;
  /** Enregistre les données secrètes du MJ (PV des monstres). */
  saveSecrets(campaignId: string, secrets: CampaignSecrets): Promise<void>;
  /** Action de combat : vérifie tour + économie, résout contre CA/sauvegardes, applique dégâts/soins. */
  combatAct(campaignId: string, actorId: string, payload: ActPayload): Promise<ActResult[]>;
  /** Déplace un combattant sur la carte (joueur : son perso, pendant son tour, dans la limite de sa vitesse). Renvoie le récit d'un piège déclenché (sinon null). */
  combatMove(campaignId: string, combatantId: string, x: number, y: number): Promise<string | null>;
  /** Finit le tour du combattant actif (joueur : seulement le sien). */
  endTurn(campaignId: string): Promise<void>;
  /** Ouvre ou ferme une porte de la carte (MJ ; joueur avec un perso au contact, pendant son tour en combat). */
  toggleDoor(campaignId: string, x: number, y: number): Promise<void>;
  /** Fait venir sur la carte un compagnon de la fiche (joueur : son perso). */
  summonCompanion(campaignId: string, characterId: string, companionId: string): Promise<void>;
  /** Renvoie un compagnon de la carte (joueur : le sien). */
  dismissCompanion(campaignId: string, tokenId: string): Promise<void>;
  /** Ignore une attaque d'opportunité proposée (MJ, ou joueur qui contrôle l'attaquant). */
  combatDismiss(campaignId: string, reactionId: string): Promise<void>;
  /** MJ : image de fond (data URL compressée, null = retirer) de la carte affichée (`key` = 'current') ou d'un plan enregistré. Renvoie la nouvelle version. */
  saveMapImage(campaignId: string, dataUrl: string | null, key?: string): Promise<string | null>;
  /** Image de fond (null si aucune). */
  loadMapImage(campaignId: string, key?: string): Promise<string | null>;
  /** Utilise un objet de soin (−1) et rend les PV au perso qui le porte (ou à `targetCharacterId`). */
  useItem(itemId: string, heal: number, targetCharacterId?: string): Promise<void>;

  // Marchands et coffres (MJ : préparer, montrer/cacher ; joueur : acheter ou prendre)
  saveShop(s: ShopInput): Promise<Shop>;
  deleteShop(id: string): Promise<void>;
  saveShopItem(i: ShopItemInput): Promise<ShopItem>;
  deleteShopItem(id: string): Promise<void>;
  /** Achète (marchand) ou prend (coffre) `qty` exemplaires pour un perso : paie avec sa bourse, l'objet passe dans son sac. */
  buyItem(shopItemId: string, characterId: string, qty: number): Promise<void>;
  /** Vend `qty` exemplaires d'un objet du sac à un marchand visible : moitié de sa valeur, l'objet rejoint son stock. */
  sellItem(itemId: string, shopId: string, qty: number): Promise<void>;
  /** Dépose `qty` exemplaires d'un objet du sac dans un coffre (joueur : coffre visible ; MJ : tout coffre). */
  depositItem(itemId: string, shopId: string, qty: number): Promise<void>;

  // Personnages
  createCharacter(c: Omit<Character, 'id' | 'updated_at'>): Promise<Character>;
  updateCharacter(id: string, patch: CharacterPatch): Promise<void>;
  /** Ajuste une jauge de façon atomique (évite d'écraser une modif simultanée). */
  adjustResource(id: string, key: string, delta: number): Promise<void>;
  /** Dégâts (delta < 0, PV temporaires d'abord) ou soins (delta > 0), atomique. */
  applyHp(id: string, delta: number): Promise<void>;
  /** Fixe les PV temporaires (ils ne se cumulent pas). */
  setTempHp(id: string, value: number): Promise<void>;
  /** Applique un jet contre la mort (d20 naturel) : réussite/échec, et 1 PV sur un 20. Autorisé au joueur. */
  deathSave(id: string, natural: number): Promise<void>;
  /** Monte le perso d'un niveau (joueur jusqu'au niveau accordé par le MJ, ou MJ) : fiche (lib/dnd/levelup.ts) + PV max augmentés de `hpGain`. */
  levelUp(id: string, patch: Partial<DndSheet>, hpGain: number): Promise<void>;
  /** MJ : −1 niveau (retire un niveau accordé non pris, ou annule la dernière montée et ses PV). */
  levelDown(id: string): Promise<void>;
  /** Ajoute/retire des pièces d'un type (pc, pa, pe, po, pp), atomique. */
  adjustCoins(id: string, coin: Coin, delta: number): Promise<void>;
  /** Fusionne des champs dans la fiche D&D (clés de premier niveau). Joueur : champs autorisés seulement. */
  patchSheet(id: string, patch: Partial<DndSheet>): Promise<void>;
  /** Le joueur utilise une capacité (compteur +1). */
  useFeature(id: string, featureId: string): Promise<void>;
  /** Le joueur dépense un emplacement de sort. */
  spendSlot(id: string, level: number): Promise<void>;
  /** Le joueur prépare / retire un sort. */
  setPrepared(id: string, spellId: string, prepared: boolean): Promise<void>;
  deleteCharacter(id: string): Promise<void>;

  // Inventaire
  addItem(i: Omit<Item, 'id' | 'created_at'>): Promise<void>;
  updateItem(id: string, patch: ItemPatch): Promise<void>;
  deleteItem(id: string): Promise<void>;
  transferItem(itemId: string, toCharacterId: string, qty: number): Promise<void>;

  // Dés
  addRoll(r: NewRoll): Promise<Roll>;
  clearRolls(campaignId: string): Promise<void>;

  // Notes
  saveNote(n: Partial<Note> & { campaign_id: string; title: string; content: string; visibility: Note['visibility'] }): Promise<void>;
  deleteNote(id: string): Promise<void>;

  /** Horodatage de la dernière écriture faite depuis cet appareil (pour ne pas se notifier soi-même). */
  lastLocalWrite: number;
}

let store: Store | null = null;

export async function getStore(): Promise<Store> {
  if (store) return store;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (url && key) {
    const { SupabaseStore } = await import('./supabaseStore');
    store = new SupabaseStore(url, key);
  } else {
    const { LocalStore } = await import('./localStore');
    store = new LocalStore();
  }
  return store;
}
