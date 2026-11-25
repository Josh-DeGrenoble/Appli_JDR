// Combat D&D : ordre d'initiative, tours et rounds, état des monstres (fonctions pures, tests/combat.test.ts).
// L'état public (visible par tous) est dans campaign.combat ; les PV des monstres sont secrets (campaign_secrets).
import type { Place } from './places';
import type { Effect } from './effects';
import type { CompanionStats } from './companions';
import type { Defenses } from './damage';
import type { BestiaryMonster } from './srd/monsters';

export interface Combatant {
  id: string;
  name: string;
  kind: 'pc' | 'monster';
  /** Personnage lié (pour les persos et PNJ de la campagne). */
  characterId?: string;
  avatar: string;
  initiative: number | null;
  /** Bonus d'initiative (départage les égalités et sert au jet automatique). */
  initBonus: number;
  /** Monstres : état visible par les joueurs (calculé à partir des PV secrets). */
  status?: MonsterStatus;
  conditions: string[];
  /** Ancienne position par zone (v0.5) : convertie en colonne si x/y absents. */
  zone?: number;
  /** Position sur la carte (cases de 1,5 m). */
  x?: number;
  y?: number;
  /** Caché par le MJ (embuscade) : invisible pour les joueurs. */
  hidden?: boolean;
  /** Aidé par un allié (action Aider) : avantage à sa prochaine attaque. */
  helped?: boolean;
  /** Ressources dépensées pendant son tour (remises à zéro au début de son tour). */
  used?: Economy;
  /** Effets temporaires (Bénédiction, Bouclier, Rage…). Voir effects.ts. */
  effects?: Effect[];
  /** Compagnon ou invocation d'un perso (characterId = son maître) : ses propres PV, CA, attaques. Voir companions.ts. */
  companion?: CompanionStats;
  companionOf?: string; // id du compagnon sur la fiche du maître
}

/** Économie d'actions du tour : action, action bonus, réaction, attaques déjà faites. */
export interface Economy {
  action: number;
  bonus: number;
  reaction: number;
  attacks: number;
  /** Mètres déjà parcourus ce tour. */
  moved?: number;
  /** Foncer : déplacement doublé ce tour. */
  dash?: number;
  /** Se désengager : pas d'attaque d'opportunité ce tour. */
  disengage?: number;
  /** Esquiver : désavantage aux attaques contre lui jusqu'à son prochain tour. */
  dodge?: number;
}

export const FRESH_ECONOMY: Economy = { action: 0, bonus: 0, reaction: 0, attacks: 0, moved: 0, dash: 0, disengage: 0 };

export type MonsterStatus = 'indemne' | 'blessé' | 'en sang' | 'vaincu';

export interface CombatState {
  active: boolean;
  round: number;
  /** Index dans l'ordre trié (sortedCombatants). */
  turn: number;
  combatants: Combatant[];
  /** Carte : taille en cases (1 case = 1,5 m), décor peint par le MJ, image de fond (version). */
  map?: MapSettings;
  /** Préparation lancée par le MJ : les joueurs lancent leur initiative. */
  prep?: boolean;
  /** Attaques d'opportunité en attente de réponse (un combattant a quitté le contact d'un ennemi). */
  reactions?: Opportunity[];
}

/**
 * Type de case peinte par le MJ. Murs (pierre = 'wall', brique, bois) : bloquent déplacement et vue.
 * Buisson : bloque la vue, se traverse en terrain difficile. Table : bloque le déplacement, pas la vue.
 * Terrain difficile : déplacement ×2. Porte fermée : comme un mur ; ouverte : passage libre. Règles dans terrain.ts.
 */
export type CellKind =
  | 'wall' | 'brick' | 'wood' | 'ice' | 'grate'
  | 'bush' | 'difficult' | 'water' | 'rubble'
  | 'door' | 'door-open' | 'door-locked'
  | 'table' | 'chest' | 'treasure' | 'barrel' | 'pillar' | 'statue' | 'stairs' | 'torch' | 'torch-off' | 'trap' | 'trap-sprung';

export interface MapSettings {
  cols: number;
  rows: number;
  /** Cases peintes, clé « x,y ». */
  cells?: Record<string, CellKind>;
  /** Identifiant de version de l'image de fond (l'image est stockée à part : store.loadMapImage). */
  bg?: string;
  /** Brouillard de guerre : les joueurs ne voient que ce que voient leurs persos. */
  fog?: boolean;
  /** Distance de vue dans le brouillard (m), 0 = illimitée. */
  sight?: number;
  /** Obscurité : les joueurs ne voient que les cases éclairées (torches, lumière portée) ou dans leur vision dans le noir. */
  dark?: boolean;
  /** Nom du plan affiché (plans enregistrés du MJ). */
  name?: string;
  /** Plan enregistré d'où vient la carte (pour le réenregistrer). */
  sceneId?: string;
}

/** Plan enregistré par le MJ (secret) : décor, réglages et monstres placés. Image stockée sous la clé `scene.id`. */
export interface Scene {
  id: string;
  name: string;
  map: MapSettings;
  /** Monstres et PNJ du MJ placés sur ce plan (les persos des joueurs suivent le groupe). */
  combatants: Combatant[];
  monsters: Record<string, MonsterSecret>;
  /** Réglages des pièges du plan (clé « x,y »). */
  traps?: Record<string, TrapSecret>;
}

/** `by` peut attaquer `target` avec sa réaction. */
export interface Opportunity {
  id: string;
  by: string;
  target: string;
}

export interface MonsterSecret {
  hp: number;
  maxHp: number;
  ac: number;
  notes: string;
  /** Bonus de sauvegarde par caractéristique (str, dex, con, int, wis, cha). */
  saves?: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>;
  /** Attaques du monstre, jouées par le MJ. */
  attacks?: MonsterAttack[];
  /** Nombre d'attaques par action (Attaques multiples). */
  multiattack?: number;
  /** Vitesse en mètres. */
  speed?: number;
  /** Résistances, immunités et vulnérabilités aux types de dégâts. */
  defenses?: Defenses;
}

export interface MonsterAttack {
  id: string;
  name: string;
  bonus: number;
  damage: string;
  range: number;
  type: string;
  /** 'save' : souffle, sort… la cible fait un jet de sauvegarde (DD) au lieu d'un jet d'attaque. */
  kind?: 'attack' | 'save';
  dc?: number;
  ability?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  half?: boolean;
  /** Zone d'effet (cône du souffle…). */
  shape?: AreaShape;
}

/** Zone d'effet : sphère (rayon), cube (côté), cône (longueur), ligne (longueur, 1,5 m de large). En mètres. */
export interface AreaShape {
  kind: 'sphere' | 'cube' | 'cone' | 'line';
  size: number;
}

export interface CampaignSecrets {
  monsters: Record<string, MonsterSecret>;
  /** Plans enregistrés (MJ seul). */
  scenes?: Scene[];
  /** Monstres préparés par le MJ (modèles réutilisables, en plus du bestiaire du SRD). */
  bestiary?: BestiaryMonster[];
  /** Lieux préparés par le MJ (voir places.ts). */
  places?: Place[];
  /** Réglages des pièges de la carte affichée, clé « x,y » (sans réglage : DD 13 DEX, 2d10, moitié si réussi). */
  traps?: Record<string, TrapSecret>;
}

/** Piège : sauvegarde demandée, DD et dégâts (formule de dés). */
export interface TrapSecret {
  name: string;
  dc: number;
  ability: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  damage: string;
  /** Moitié des dégâts si la sauvegarde réussit. */
  half: boolean;
}

export const EMPTY_COMBAT: CombatState = { active: false, round: 0, turn: 0, combatants: [] };

/** Complète un état de combat partiel ou absent. */
export function normalizeCombat(c: Partial<CombatState> | null | undefined): CombatState {
  return { ...EMPTY_COMBAT, ...(c ?? {}), combatants: Array.isArray(c?.combatants) ? c!.combatants : [] };
}

/** Ordre d'initiative : plus haut d'abord, égalité → meilleur bonus, puis persos avant monstres. Sans initiative à la fin. */
export function sortedCombatants(c: CombatState): Combatant[] {
  return [...c.combatants].sort((a, b) => {
    if (a.initiative === null && b.initiative === null) return a.name.localeCompare(b.name);
    if (a.initiative === null) return 1;
    if (b.initiative === null) return -1;
    return b.initiative - a.initiative || b.initBonus - a.initBonus || (a.kind === b.kind ? 0 : a.kind === 'pc' ? -1 : 1) || a.name.localeCompare(b.name);
  });
}

/** Combattant dont c'est le tour (null si combat inactif). */
export function currentCombatant(c: CombatState): Combatant | null {
  if (!c.active) return null;
  return sortedCombatants(c)[c.turn] ?? null;
}

const isOut = (x: Combatant) => x.kind === 'monster' && x.status === 'vaincu';

/** Passe au tour suivant (saute les monstres vaincus) ; nouveau round après le dernier. */
export function nextTurn(c: CombatState): CombatState {
  const order = sortedCombatants(c);
  if (!order.length) return c;
  let turn = c.turn;
  let round = c.round;
  for (let i = 0; i < order.length; i++) {
    turn += 1;
    if (turn >= order.length) {
      turn = 0;
      round += 1;
    }
    if (!isOut(order[turn])) break;
  }
  // Le nouveau combattant actif récupère son action, son action bonus et sa réaction.
  const nextId = order[turn]?.id;
  const combatants = c.combatants.map((x) => (x.id === nextId ? { ...x, used: { ...FRESH_ECONOMY } } : x));
  return { ...c, turn, round, combatants, reactions: [] };
}

/** Revient au tour précédent (correction d'erreur). */
export function previousTurn(c: CombatState): CombatState {
  const n = sortedCombatants(c).length;
  if (!n || (c.turn === 0 && c.round <= 1)) return c;
  return c.turn === 0 ? { ...c, turn: n - 1, round: c.round - 1 } : { ...c, turn: c.turn - 1 };
}

/** Démarre le combat au round 1, sur le premier de l'ordre. */
export const startCombat = (c: CombatState): CombatState => ({
  ...c,
  active: true,
  prep: false,
  round: 1,
  turn: 0,
  combatants: c.combatants.map((x) => ({ ...x, used: { ...FRESH_ECONOMY } })),
  reactions: [],
});

/** Fin du combat : la carte et les pions restent (exploration), les monstres vaincus et l'initiative disparaissent. */
export const endCombat = (c: CombatState): CombatState => ({
  ...c,
  active: false,
  prep: false,
  round: 0,
  turn: 0,
  reactions: [],
  combatants: c.combatants.filter((x) => !isOut(x)).map(({ used: _u, ...x }) => ({ ...x, initiative: null })),
});

/** Vide la carte (pions) en gardant sa taille, son décor et son image. */
export const clearBoard = (c: CombatState): CombatState => ({ ...EMPTY_COMBAT, map: c.map });

/** État visible d'un monstre selon ses PV. */
export function monsterStatus(hp: number, maxHp: number): MonsterStatus {
  if (hp <= 0) return 'vaincu';
  if (maxHp > 0 && hp <= maxHp / 2) return 'en sang';
  if (hp < maxHp) return 'blessé';
  return 'indemne';
}

/** Ajoute ou modifie un combattant en gardant le combattant actif à sa place. */
export function upsertCombatant(c: CombatState, x: Combatant): CombatState {
  const current = currentCombatant(c);
  const combatants = c.combatants.some((y) => y.id === x.id) ? c.combatants.map((y) => (y.id === x.id ? x : y)) : [...c.combatants, x];
  return keepTurn({ ...c, combatants }, current?.id);
}

/** Retire un combattant en gardant le combattant actif à sa place. */
export function removeCombatant(c: CombatState, id: string): CombatState {
  const current = currentCombatant(c);
  return keepTurn({ ...c, combatants: c.combatants.filter((y) => y.id !== id) }, current?.id === id ? undefined : current?.id);
}

function keepTurn(c: CombatState, currentId?: string): CombatState {
  if (!c.active) return c;
  const idx = currentId ? sortedCombatants(c).findIndex((y) => y.id === currentId) : -1;
  const n = c.combatants.length;
  return { ...c, turn: idx >= 0 ? idx : Math.min(c.turn, Math.max(0, n - 1)) };
}

/** Numérote les monstres du même nom : « Gobelin 1 », « Gobelin 2 »… */
export function numberedNames(base: string, count: number, existing: string[]) {
  if (count === 1 && !existing.includes(base)) return [base];
  const names: string[] = [];
  let i = 1;
  while (names.length < count) {
    const n = `${base} ${i++}`;
    if (!existing.includes(n)) names.push(n);
  }
  return names;
}
