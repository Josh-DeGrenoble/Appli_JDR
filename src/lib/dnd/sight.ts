// Ligne de vue sur la carte : un mur entre deux cases bloque la vue (attaques à distance, sorts, zones) et le
// brouillard de guerre (les joueurs ne voient que ce que leurs persos voient). Fonctions pures, tests/map.test.ts.
import type { Combatant, CombatState } from './combat';
import { mapOf, posOf } from './grid';
import { blocksSight, closesRoom } from './terrain';
import { effectsLight } from './effects';

type Cell = { x: number; y: number };
type Walls = Record<string, string>;

/**
 * Cases traversées par le segment entre les centres de `a` et `b` (extrémités exclues).
 * Un segment qui passe exactement par un coin n'est bloqué que si les deux cases de côté sont des murs
 * (on ne se faufile pas entre deux murs qui se touchent par l'angle).
 */
export function lineBlocked(walls: Walls, a: Cell, b: Cell): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 4;
  if (steps === 0) return false;
  const wall = (x: number, y: number) => blocksSight(walls[`${x},${y}`]);
  let last = `${a.x},${a.y}`;
  for (let i = 1; i < steps; i++) {
    const fx = a.x + 0.5 + (dx * i) / steps;
    const fy = a.y + 0.5 + (dy * i) / steps;
    const onCornerX = Math.abs(fx - Math.round(fx)) < 1e-9;
    const onCornerY = Math.abs(fy - Math.round(fy)) < 1e-9;
    if (onCornerX && onCornerY) {
      // Passage exact par un coin : bloqué seulement si les deux cases de côté sont des murs.
      const cx = Math.round(fx);
      const cy = Math.round(fy);
      const sx = Math.sign(dx);
      const sy = Math.sign(dy);
      if (wall(sx > 0 ? cx : cx - 1, sy > 0 ? cy - 1 : cy) && wall(sx > 0 ? cx - 1 : cx, sy > 0 ? cy : cy - 1)) return true;
      continue;
    }
    const x = Math.floor(fx);
    const y = Math.floor(fy);
    const k = `${x},${y}`;
    if (k === last) continue;
    last = k;
    if ((x === a.x && y === a.y) || (x === b.x && y === b.y)) continue;
    if (wall(x, y)) return true;
  }
  return false;
}

/** `a` voit-il `b` ? (même case ou voisines : toujours). */
export function canSee(c: Pick<CombatState, 'map'>, a: Cell, b: Cell): boolean {
  if (Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 1) return true;
  return !lineBlocked(mapOf(c).cells ?? {}, a, b);
}

/** Les deux combattants se voient-ils ? */
export const seeEachOther = (c: Pick<CombatState, 'map'>, a: Combatant, b: Combatant) => canSee(c, posOf(a), posOf(b));

/** Cases visibles depuis un ensemble de points de vue (brouillard de guerre). `radius` en cases (0 = illimité). */
export function visibleCells(c: Pick<CombatState, 'map'>, eyes: Cell[], radius = 0): Set<string> {
  const { cols, rows } = mapOf(c);
  const out = new Set<string>();
  for (const e of eyes)
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const k = `${x},${y}`;
        if (out.has(k)) continue;
        if (radius && Math.max(Math.abs(x - e.x), Math.abs(y - e.y)) > radius) continue;
        if (canSee(c, e, { x, y })) out.add(k);
      }
  return out;
}

/**
 * Pièces accessibles aux persos : remplissage depuis leurs cases sans traverser murs pleins ni portes fermées
 * (côtés seulement), plus les murs et portes qui les bordent. Ce qui est derrière une porte fermée reste caché.
 */
export function openArea(c: Pick<CombatState, 'map'>, eyes: Cell[]): Set<string> {
  const { cols, rows, cells = {} } = mapOf(c);
  const seen = new Set<string>();
  const out = new Set<string>();
  const queue = eyes.filter((e) => e.x >= 0 && e.y >= 0 && e.x < cols && e.y < rows);
  for (const e of queue) seen.add(`${e.x},${e.y}`);
  while (queue.length) {
    const p = queue.pop()!;
    const k = `${p.x},${p.y}`;
    out.add(k);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const x = p.x + dx;
      const y = p.y + dy;
      const n = `${x},${y}`;
      if (x < 0 || y < 0 || x >= cols || y >= rows || seen.has(n)) continue;
      if (closesRoom(cells[n])) {
        out.add(n); // le mur ou la porte se voit
        continue;
      }
      if (dx && dy) continue; // on ne se faufile pas en diagonale
      seen.add(n);
      queue.push({ x, y });
    }
  }
  return out;
}

/** Vision d'un pion du groupe dans l'obscurité, en cases : vision dans le noir, et lumière qu'il porte (torche…). */
export interface Vision {
  dark: number;
  light: number;
}

/** Rayon de lumière d'une torche posée sur la carte (6 m = 4 cases). */
export const TORCH_RADIUS = 4;

/** Cases éclairées par des sources de lumière (rayon en cases, la lumière ne traverse pas les murs). */
export function litCells(c: Pick<CombatState, 'map'>, lights: (Cell & { r: number })[]): Set<string> {
  const { cols, rows } = mapOf(c);
  const out = new Set<string>();
  for (const l of lights)
    for (let y = Math.max(0, l.y - l.r); y <= Math.min(rows - 1, l.y + l.r); y++)
      for (let x = Math.max(0, l.x - l.r); x <= Math.min(cols - 1, l.x + l.r); x++) {
        const k = `${x},${y}`;
        if (!out.has(k) && canSee(c, l, { x, y })) out.add(k);
      }
  return out;
}

/**
 * Obscurité : chaque pion voit les cases éclairées (torches allumées, lumière portée, sorts de lumière) en ligne de vue,
 * et, sans lumière, jusqu'à sa vision dans le noir. `vision` : par id de pion (sans entrée : ni vision ni lumière).
 */
export function darkView(c: CombatState, eyes: Combatant[], vision: Map<string, Vision>, radius = 0): Set<string> {
  const m = mapOf(c);
  const torches = Object.entries(m.cells ?? {}).filter(([, k]) => k === 'torch').map(([key]) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y, r: TORCH_RADIUS };
  });
  const carried = eyes.filter((e) => (vision.get(e.id)?.light ?? 0) > 0).map((e) => ({ ...posOf(e), r: vision.get(e.id)!.light }));
  // Sorts de lumière (Lumière, Lueurs féeriques…) sur n'importe quel pion, allié ou ennemi
  const spells = c.combatants.map((x) => ({ ...posOf(x), r: Math.round(effectsLight(x, Math.max(1, c.round)) / 1.5) })).filter((l) => l.r > 0);
  const lit = litCells(c, [...torches, ...carried, ...spells]);
  const out = new Set<string>();
  for (const e of eyes) {
    const p = posOf(e);
    const dark = vision.get(e.id)?.dark ?? 0;
    out.add(`${p.x},${p.y}`);
    for (const k of visibleCells(c, [p], radius)) {
      const [x, y] = k.split(',').map(Number);
      if (lit.has(k) || Math.max(Math.abs(x - p.x), Math.abs(y - p.y)) <= dark) out.add(k);
    }
  }
  return out;
}

/**
 * Ce qu'un joueur voit. Obscurité (carte « sombre ») : lumière et vision dans le noir (darkView). Brouillard : ce que
 * voient les persos du groupe (murs et portes fermées bloquent la vue). Sinon : tout, sauf l'intérieur des pièces
 * fermées par une porte (si la carte a des portes fermées).
 */
export function playerView(c: CombatState, vision: Map<string, Vision> = new Map()): Set<string> | null {
  const m = mapOf(c);
  const party = c.combatants.filter((x) => x.kind === 'pc' && !x.hidden);
  const eyes = party.map(posOf);
  const radius = m.sight ? Math.round(m.sight / 1.5) : 0;
  if (m.dark) return darkView(c, party, vision, radius);
  if (m.fog) return visibleCells(c, eyes, radius);
  if (!Object.values(m.cells ?? {}).includes('door')) return null;
  return openArea(c, eyes);
}

/** Pions qu'un joueur voit (monstres cachés par le MJ ou dans le brouillard : invisibles). */
export function visibleTokens(c: CombatState, view: Set<string> | null): Combatant[] {
  return c.combatants.filter((x) => {
    if (x.kind === 'pc') return true;
    if (x.hidden) return false;
    const p = posOf(x);
    return !view || view.has(`${p.x},${p.y}`);
  });
}
