// Fiche D&D 2024 : structure des données stockées (colonne `sheet`) et valeurs par défaut.
// Les PV sont dans character.resources.pv / pvtemp (ajustés de façon atomique).

import type { CompanionDef } from './companions';
import type { Ability, Coin } from './data';
import type { AreaShape } from './combat';

export type ProfLevel = 0 | 1 | 2; // 0 = rien, 1 = maîtrise, 2 = expertise

/** Coût d'une action en combat. */
export type ActionCost = 'action' | 'bonus' | 'reaction' | 'free';
/** Effet d'un sort en combat : attaque de sort, sauvegarde, soin, dégâts automatiques, ou utilitaire. */
export type SpellEffect = 'attack' | 'save' | 'heal' | 'auto' | 'utility';

/** Attaque (arme ou sort) : bonus = mod + maîtrise + divers ; dégâts = dés + mod (option) + divers. */
export interface Attack {
  id: string;
  name: string;
  ability: Ability | 'spell';
  proficient: boolean;
  bonus: number;
  damage: string; // ex. "1d8", "2d6"
  addMod: boolean;
  damageBonus: number;
  damageType: string;
  notes: string;
  /** Portée en mètres (1,5 = contact). */
  range?: number;
}

/** Sort connu ou préparé. Niveau 0 = sort mineur. */
export interface Spell {
  id: string;
  name: string;
  level: number;
  prepared: boolean;
  ritual: boolean;
  concentration: boolean;
  damage: string; // formule optionnelle, ex. "8d6"
  notes: string;
  /** Portée en mètres : 0 = soi-même, 1,5 = contact. */
  range?: number;
  effect?: SpellEffect;
  /** Caractéristique de sauvegarde (effet « save »). */
  save?: Ability;
  /** Moitié des dégâts en cas de sauvegarde réussie. */
  half?: boolean;
  /** Peut viser plusieurs créatures (zone, plusieurs cibles). */
  area?: boolean;
  /** Temps d'incantation : action, action bonus ou réaction. */
  cast?: ActionCost;
  /** Dés ajoutés par niveau d'emplacement au-dessus du niveau du sort (ex. "1d6"). */
  upcast?: string;
  /** Zone d'effet posée sur la carte (Boule de feu : sphère de 6 m). */
  shape?: AreaShape;
}

/** Capacité à utilisations limitées (Second souffle, Rage, Inspiration bardique…). */
export interface Feature {
  id: string;
  name: string;
  max: number; // 0 = illimité / passif
  used: number;
  recharge: 'short' | 'long' | 'none';
  notes: string;
  /** Coût en combat (par défaut : action bonus). */
  cost?: ActionCost;
  /** Effet automatique : soin (formule `heal`, {niveau} = niveau) ou action supplémentaire (Fougue). */
  effect?: 'none' | 'heal' | 'extra-action';
  heal?: string;
}

export interface Spellcasting {
  ability: Ability | '';
  /** Emplacements par niveau de sort (index 1 à 9). */
  slots: Record<string, { max: number; used: number }>;
  /** Magie de pacte (Occultiste) : emplacements récupérés au repos court. */
  pact: boolean;
  /** Nombre maximum de sorts préparés (hors mineurs), fixé par le MJ. 0 = sans limite. */
  preparedMax: number;
}

export interface DndSheet {
  species: string;
  className: string;
  subclass: string;
  level: number;
  background: string;
  alignment: string;
  xp: number;
  size: string;
  abilities: Record<Ability, number>;
  saveProf: Ability[];
  skills: Record<string, ProfLevel>;
  ac: number;
  speed: number; // en mètres
  initMisc: number; // bonus divers à l'initiative (dons, objets)
  hitDie: number;
  hitDiceUsed: number;
  deathSaves: { success: number; failure: number };
  /** Avantage ou désavantage donné par le MJ (s'applique à tous les jets d20 jusqu'à ce qu'il le retire). */
  grant?: 'adv' | 'dis' | null;
  conditions: string[];
  exhaustion: number;
  inspiration: boolean;
  coins: Record<Coin, number>;
  languages: string;
  training: string; // armes, armures, outils maîtrisés
  attacks: Attack[];
  features: Feature[];
  spellcasting: Spellcasting;
  spells: Spell[];
  /** Nom du sort maintenu en concentration (vide sinon). */
  concentration: string;
  /** Nombre d'attaques par action Attaquer (Attaque supplémentaire). */
  attacksPerAction: number;
  /** Niveau accordé par le MJ (XP ou bouton +1) : le joueur peut monter jusque-là. Absent = niveau actuel. */
  allowedLevel?: number;
  /** Montées de niveau passées (pour que le MJ annule la dernière). */
  levelHistory?: LevelStep[];
  /** Vision dans le noir en mètres (absent : celle de l'espèce, voir srd/creation.ts). */
  darkvision?: number;
  /** Compagnons et invocations du perso (modèles ; voir companions.ts). */
  companions?: CompanionDef[];
  /** Dons pris (noms, voir srd/feats.ts). */
  feats?: string[];
  /** Résistances, immunités et vulnérabilités (données par le MJ : espèce, objet, malédiction…). */
  defenses?: { resist?: string[]; immune?: string[]; vuln?: string[] };
  /** Bonus des objets équipés déjà appliqués à la fiche (CA, vitesse, caractéristiques, sauvegardes). Voir gear.ts. */
  gear?: { ac: number; speed: number; saves: number; abilities: Partial<Record<Ability, number>> };
}

/** Une montée de niveau enregistrée : niveau de départ, PV gagnés et fiche avant la montée. */
export interface LevelStep {
  from: number;
  hpGain: number;
  /** Fiche d'avant (sorts : seulement leurs identifiants, `spellIds`). */
  before: Partial<DndSheet> & { spellIds?: string[] };
}

export const DEFAULT_SHEET: DndSheet = {
  species: '',
  className: '',
  subclass: '',
  level: 1,
  background: '',
  alignment: '',
  xp: 0,
  size: 'Moyenne',
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  saveProf: [],
  skills: {},
  ac: 10,
  speed: 9,
  initMisc: 0,
  hitDie: 8,
  hitDiceUsed: 0,
  deathSaves: { success: 0, failure: 0 },
  conditions: [],
  exhaustion: 0,
  inspiration: false,
  coins: { pc: 0, pa: 0, pe: 0, po: 0, pp: 0 },
  languages: 'Commun',
  training: '',
  attacks: [],
  features: [],
  spellcasting: { ability: '', slots: {}, pact: false, preparedMax: 0 },
  spells: [],
  concentration: '',
  attacksPerAction: 1,
};

const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);

/** Complète une fiche partielle (perso créé avant la v0.2, champ ajouté plus tard…). */
export function normalizeSheet(raw: Partial<DndSheet> | null | undefined): DndSheet {
  const s = raw ?? {};
  const d = DEFAULT_SHEET;
  return {
    ...d,
    ...s,
    level: Math.min(20, Math.max(1, num(s.level, d.level))),
    abilities: { ...d.abilities, ...(s.abilities ?? {}) },
    saveProf: Array.isArray(s.saveProf) ? s.saveProf : [],
    skills: { ...(s.skills ?? {}) },
    deathSaves: { ...d.deathSaves, ...(s.deathSaves ?? {}) },
    conditions: Array.isArray(s.conditions) ? s.conditions : [],
    exhaustion: Math.min(6, Math.max(0, num(s.exhaustion, 0))),
    coins: { ...d.coins, ...(s.coins ?? {}) },
    attacks: Array.isArray(s.attacks) ? s.attacks : [],
    features: Array.isArray(s.features) ? s.features : [],
    spells: Array.isArray(s.spells) ? s.spells : [],
    spellcasting: { ...d.spellcasting, ...(s.spellcasting ?? {}), slots: { ...(s.spellcasting?.slots ?? {}) } },
    concentration: typeof s.concentration === 'string' ? s.concentration : '',
    attacksPerAction: Math.max(1, num(s.attacksPerAction, 1)),
  };
}
