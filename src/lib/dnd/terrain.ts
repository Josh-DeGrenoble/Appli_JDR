// Effet des cases peintes sur la carte : murs (pierre, brique, bois, glace, grille), terrain (difficile, buisson, eau,
// éboulis), portes (ouverte, fermée, verrouillée) et objets (table, coffre, trésor, tonneau, pilier, statue, escalier,
// torche, piège caché aux joueurs, piège déclenché visible). Mêmes règles côté serveur : 07_carte.sql (_move_cost, combat_move, toggle_door).
import type { CellKind } from './combat';

/** Les cases qu'on ne peut pas traverser ni occuper. */
const NO_MOVE = new Set<string>(['wall', 'brick', 'wood', 'ice', 'grate', 'table', 'door', 'door-locked', 'pillar', 'statue', 'chest', 'barrel']);
/** Les cases qui cachent ce qu'il y a derrière. */
const NO_SIGHT = new Set<string>(['wall', 'brick', 'wood', 'ice', 'bush', 'door', 'door-locked', 'pillar', 'statue']);
/** Les cases qui ferment une pièce (les joueurs ne voient pas l'intérieur d'une pièce fermée). */
const CLOSES = new Set<string>(['wall', 'brick', 'wood', 'ice', 'door', 'door-locked']);
/** Les cases qui coûtent double. */
const SLOW = new Set<string>(['difficult', 'bush', 'water', 'rubble']);

/** Bloque le déplacement (murs, tables, portes fermées, gros objets). */
export const blocksMove = (k?: string) => !!k && NO_MOVE.has(k);
/** Bloque la vue (murs, buissons, portes fermées, piliers, statues). */
export const blocksSight = (k?: string) => !!k && NO_SIGHT.has(k);
/** Terrain difficile (déplacement ×2). */
export const isSlow = (k?: string) => !!k && SLOW.has(k);
/** Ferme une pièce (mur plein ou porte fermée). */
export const closesRoom = (k?: string) => !!k && CLOSES.has(k);
/** Porte (ouverte, fermée ou verrouillée). */
export const isDoor = (k?: string) => k === 'door' || k === 'door-open' || k === 'door-locked';
/** Torche (allumée ou éteinte) : se rallume ou s'éteint comme une porte s'ouvre. */
export const isTorch = (k?: string) => k === 'torch' || k === 'torch-off';
/** Case invisible pour les joueurs (piège). */
export const hiddenFromPlayers = (k?: string) => k === 'trap';
/** Ce que voit un joueur d'une case (le piège n'apparaît pas). */
export const playerKind = (k?: CellKind): CellKind | undefined => (hiddenFromPlayers(k) ? undefined : k);

const CYCLE: CellKind[] = ['wall', 'brick', 'wood', 'ice', 'grate'];
/** Matériau suivant quand le MJ touche un mur : pierre → brique → bois → glace → grille → pierre (les objets ne changent pas). */
export const nextMaterial = (k: CellKind): CellKind | null => (CYCLE.includes(k) ? CYCLE[(CYCLE.indexOf(k) + 1) % CYCLE.length] : null);

export interface Material {
  kind: CellKind;
  label: string;
  icon: string;
  hint: string;
  group: 'Murs' | 'Terrain' | 'Portes' | 'Objets';
}

/** Palette du MJ, par groupe : matériau, nom, icône, effet résumé. */
export const MATERIALS: Material[] = [
  { group: 'Murs', kind: 'wall', label: 'Pierre', icon: '🪨', hint: 'mur' },
  { group: 'Murs', kind: 'brick', label: 'Brique', icon: '🧱', hint: 'mur' },
  { group: 'Murs', kind: 'wood', label: 'Bois', icon: '🪵', hint: 'mur' },
  { group: 'Murs', kind: 'ice', label: 'Glace', icon: '🧊', hint: 'mur' },
  { group: 'Murs', kind: 'grate', label: 'Grille', icon: '⛓️', hint: 'bloque le passage, pas la vue' },
  { group: 'Terrain', kind: 'difficult', label: 'Difficile', icon: '🌿', hint: 'déplacement ×2' },
  { group: 'Terrain', kind: 'bush', label: 'Buisson', icon: '🌳', hint: 'cache la vue, terrain difficile' },
  { group: 'Terrain', kind: 'water', label: 'Eau', icon: '🌊', hint: 'terrain difficile' },
  { group: 'Terrain', kind: 'rubble', label: 'Éboulis', icon: '⛰️', hint: 'terrain difficile' },
  { group: 'Portes', kind: 'door', label: 'Porte', icon: '🚪', hint: 'fermée : bloque et cache ; touche-la pour l’ouvrir' },
  { group: 'Portes', kind: 'door-locked', label: 'Verrouillée', icon: '🔒', hint: 'seul le MJ l’ouvre (touche-la pour déverrouiller)' },
  { group: 'Objets', kind: 'table', label: 'Table', icon: '🍽️', hint: 'bloque le passage, pas la vue' },
  { group: 'Objets', kind: 'chest', label: 'Coffre', icon: '🧰', hint: 'bloque le passage' },
  { group: 'Objets', kind: 'treasure', label: 'Trésor', icon: '💰', hint: 'décor, on peut marcher dessus' },
  { group: 'Objets', kind: 'barrel', label: 'Tonneau', icon: '🛢️', hint: 'bloque le passage' },
  { group: 'Objets', kind: 'pillar', label: 'Pilier', icon: '🏛️', hint: 'bloque passage et vue' },
  { group: 'Objets', kind: 'statue', label: 'Statue', icon: '🗿', hint: 'bloque passage et vue' },
  { group: 'Objets', kind: 'stairs', label: 'Escalier', icon: '🪜', hint: 'décor' },
  { group: 'Objets', kind: 'torch', label: 'Torche', icon: '🔥', hint: 'éclaire 6 m dans l’obscurité ; touche-la pour l’éteindre' },
  { group: 'Objets', kind: 'torch-off', label: 'Torche éteinte', icon: '🪵', hint: 'à allumer en la touchant (au contact)' },
  { group: 'Objets', kind: 'trap', label: 'Piège', icon: '🪤', hint: 'invisible pour les joueurs, se déclenche quand on marche dessus (touche-le avec ✋ pour le régler)' },
  { group: 'Objets', kind: 'trap-sprung', label: 'Piège visible', icon: '💥', hint: 'piège déjà déclenché, visible de tous' },
];
