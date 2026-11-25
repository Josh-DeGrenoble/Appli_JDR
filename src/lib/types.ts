// Modèle de données partagé par le mode local et le mode Supabase.
import type { CheckRequest } from './dnd/requests';
import type { PastMap } from './dnd/pastMaps';
import type { DndSheet } from './dnd/sheet';
import type { CampaignSecrets, CombatState } from './dnd/combat';

// Toute modification ici doit être répercutée dans supabase/migrations (nouveau fichier).

export type Role = 'gm' | 'player';

export interface User {
  id: string;
  name: string;
  email?: string;
}

/** Une caractéristique de la fiche (définie par le MJ dans le modèle de campagne). */
export interface StatDef {
  key: string;
  label: string;
  type: 'number' | 'text';
  default?: number | string;
  /** Formule de jet optionnelle. {v} = valeur, {mod} = floor((v-10)/2). Ex : "1d20+{mod}", "1d100" */
  roll?: string;
}

/** Une jauge (PV, Mana, Santé mentale...). */
export interface ResourceDef {
  key: string;
  label: string;
  max: number;
  color?: string;
}

export interface CampaignTemplate {
  stats: StatDef[];
  resources: ResourceDef[];
  currency: string;
}

export interface CampaignSettings {
  /** Les joueurs peuvent modifier leur inventaire et leur bourse eux-mêmes. */
  playersEditInventory: boolean;
  /** Les joueurs peuvent modifier leurs caractéristiques. */
  playersEditStats: boolean;
  /** Les joueurs voient les fiches des autres joueurs (lecture seule). */
  shareSheets: boolean;
  /** Les joueurs gèrent eux-mêmes leurs PV (dégâts, soins, repos). Par défaut : non, c'est le MJ. */
  playersEditHp: boolean;
  /** Vrais dés : les jets des joueurs depuis leur fiche ne sont pas lancés par l'appli (ni écrits dans l'historique). */
  realDice?: boolean;
  /** Cartes déjà montrées aux joueurs (archive consultable). Voir lib/dnd/pastMaps.ts. */
  maps?: PastMap[];
  /** Test demandé par le MJ à des persos (en attente des jets). Voir lib/dnd/requests.ts. */
  request?: CheckRequest | null;
  /** Lieu où se trouve le groupe (choisi par le MJ parmi ses lieux préparés), affiché en haut de l'écran. */
  place?: { id: string; name: string; icon: string } | null;
}

export interface Campaign {
  id: string;
  name: string;
  gm_id: string;
  join_code: string;
  template: CampaignTemplate;
  settings: CampaignSettings;
  /** Combat en cours (visible par tous). Lire via normalizeCombat. */
  combat?: Partial<CombatState>;
  created_at: string;
}

export interface Member {
  campaign_id: string;
  user_id: string;
  role: Role;
  display_name: string;
}

export interface ResourceValue {
  current: number;
  max: number;
}

export interface Character {
  id: string;
  campaign_id: string;
  owner_id: string;
  name: string;
  avatar: string;
  subtitle: string;
  stats: Record<string, number | string>;
  resources: Record<string, ResourceValue>;
  /** Ancienne monnaie générique (v0.1), remplacée par sheet.coins. */
  currency: number;
  notes: string;
  /** Fiche D&D 2024 (partielle : toujours lire via normalizeSheet). */
  sheet: Partial<DndSheet>;
  updated_at: string;
}

export interface Item {
  id: string;
  campaign_id: string;
  character_id: string;
  name: string;
  qty: number;
  description: string;
  /** Objet porté / en main. */
  equipped?: boolean;
  /** Objet magique harmonisé (3 maximum). */
  attuned?: boolean;
  /** Objet de soin (potion) : formule de PV rendus en l'utilisant, ex. "2d4+2". */
  heal?: string;
  created_at: string;
}

export interface Roll {
  id: string;
  campaign_id: string;
  user_id: string;
  author_name: string;
  label: string;
  formula: string;
  detail: string;
  total: number;
  secret: boolean;
  /** 'roll' = jet de dés ; 'event' = entrée d'historique (dégâts du MJ, objet donné, tour suivant…). */
  kind?: 'roll' | 'event';
  created_at: string;
}

/** Marchand (on achète) ou coffre (on prend gratuitement), préparé par le MJ et montré aux joueurs quand il veut. */
export interface Shop {
  id: string;
  campaign_id: string;
  name: string;
  avatar: string;
  kind: 'merchant' | 'chest';
  /** Visible par les joueurs. */
  visible: boolean;
  /** Le marchand rachète les objets des joueurs (moitié prix). Par défaut : oui. */
  buys?: boolean;
  description: string;
  created_at: string;
}

/** Objet en vente (ou dans un coffre). Prix en pièces de cuivre. */
export interface ShopItem {
  id: string;
  shop_id: string;
  campaign_id: string;
  name: string;
  qty: number;
  price_cp: number;
  description: string;
  heal?: string;
  created_at: string;
}

export type NoteVisibility = 'all' | 'gm' | 'private';

export interface Note {
  id: string;
  campaign_id: string;
  author_id: string;
  author_name: string;
  title: string;
  content: string;
  visibility: NoteVisibility;
  /** Joueurs à qui l'auteur a révélé la note (en plus de sa visibilité). */
  reader_ids?: string[];
  updated_at: string;
}

export interface CampaignSummary extends Campaign {
  role: Role;
}

export interface CampaignData {
  campaign: Campaign;
  members: Member[];
  characters: Character[];
  items: Item[];
  rolls: Roll[];
  notes: Note[];
  /** Marchands et coffres (joueurs : seulement les visibles). */
  shops: Shop[];
  shopItems: ShopItem[];
  /** Données secrètes du MJ (PV des monstres). Absent pour les joueurs. */
  secrets?: CampaignSecrets | null;
}

export const DEFAULT_SETTINGS: CampaignSettings = {
  playersEditInventory: true,
  playersEditStats: true,
  shareSheets: false,
  playersEditHp: false,
};
