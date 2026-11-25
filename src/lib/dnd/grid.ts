// Carte de combat en grille : 1 case = 1,5 m. Distance D&D simplifiée : chaque case, même en diagonale, compte 1,5 m.
// Remplace les zones de la v0.5 (un combattant sans x/y est placé selon son ancienne zone).
import type { Combatant, CombatState } from './combat';

export const CELL = 1.5;
export const MELEE = 1.5;
export const DEFAULT_MAP = { cols: 12, rows: 16 };

/** Taille de la carte d'un combat. */
export const mapOf = (c: Pick<CombatState, 'map'>) => ({ ...DEFAULT_MAP, ...(c.map ?? {}) });

/** Position (case) d'un combattant ; ancienne zone 1-5 → colonnes 0, 3, 6, 9, 11. */
export function posOf(x: Pick<Combatant, 'x' | 'y' | 'zone'>): { x: number; y: number } {
  if (typeof x.x === 'number' && typeof x.y === 'number') return { x: x.x, y: x.y };
  const z = x.zone ?? 1;
  return { x: Math.min(11, (z - 1) * 3), y: 0 };
}

/** Nombre de cases entre deux positions (diagonale = 1 case). */
export const cellsBetween = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** Distance en mètres entre deux combattants (au moins « contact »). */
export function distance(a: Pick<Combatant, 'x' | 'y' | 'zone'>, b: Pick<Combatant, 'x' | 'y' | 'zone'>): number {
  return Math.max(MELEE, cellsBetween(posOf(a), posOf(b)) * CELL);
}

/** Affichage d'une distance : « contact », « 9 m », « 13,5 m ». */
export function fmtDistance(m: number): string {
  if (m <= MELEE) return 'contact';
  return `${String(m).replace('.', ',')} m`;
}

/** Affichage d'une portée d'action : « soi-même », « contact », « 36 m ». */
export function fmtRange(m: number): string {
  if (m <= 0) return 'soi-même';
  return m <= MELEE ? 'contact' : `${String(m).replace('.', ',')} m`;
}

/** La cible est-elle à portée ? (portée 0 = soi-même uniquement). */
export function inRange(actor: Combatant, target: Combatant, range: number): boolean {
  if (range <= 0) return actor.id === target.id;
  return actor.id === target.id || distance(actor, target) <= range;
}

/** Déplacement restant ce tour (mètres) : vitesse (doublée si Foncer) moins le chemin parcouru. */
export function movementLeft(speed: number, used?: { moved?: number; dash?: number }) {
  return Math.max(0, speed * (1 + (used?.dash ?? 0)) - (used?.moved ?? 0));
}

/** Première case libre en partant de (x0, y0), en balayant les colonnes dans le sens `dir`. */
export function freeCell(c: CombatState, x0: number, y0: number, dir: 1 | -1) {
  const { cols, rows } = mapOf(c);
  const taken = new Set(c.combatants.map((x) => { const p = posOf(x); return `${p.x},${p.y}`; }));
  for (let i = 0; i < cols; i++) {
    const x = x0 + dir * i;
    if (x < 0 || x >= cols) break;
    for (let y = y0; y < rows; y++) if (!taken.has(`${x},${y}`)) return { x, y };
  }
  return { x: x0, y: y0 };
}
