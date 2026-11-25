// Zones d'effet sur la carte (sphère, cube, cône, ligne) : cases touchées et combattants pris dedans.
// Portée 0 = la zone part du lanceur (cône, ligne, cube collé à lui, ou aura centrée sur lui).
import type { AreaShape, Combatant, CombatState } from './combat';
import { CELL, cellsBetween, mapOf, posOf } from './grid';
import { canSee } from './sight';
import { blocksSight } from './terrain';

export type Cell = { x: number; y: number };
export const cellKey = (p: Cell) => `${p.x},${p.y}`;

const cellsOf = (m: number) => Math.max(1, Math.round(m / CELL));
const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);

/** La zone a-t-elle besoin qu'on vise une case ? (Aura centrée sur le lanceur : non.) */
export const needsAim = (shape: AreaShape, range: number) => !(range <= 0 && shape.kind === 'sphere');

/** Case visée valable : dans la portée du sort (ou n'importe où autour du lanceur si portée 0). */
export function canAim(caster: Cell, aim: Cell, range: number, c?: Pick<CombatState, 'map'>) {
  if (range <= 0) return aim.x !== caster.x || aim.y !== caster.y;
  return cellsBetween(caster, aim) * CELL <= range && (!c || canSee(c, caster, aim));
}

/**
 * Cases touchées par la zone. `caster` = case du lanceur, `aim` = case visée (centre pour une sphère/cube à distance,
 * direction pour un cône, une ligne ou un cube partant du lanceur).
 */
export function areaCells(shape: AreaShape, range: number, caster: Cell, aim: Cell | null, size: { cols: number; rows: number }): Set<string> {
  const out = new Set<string>();
  const n = cellsOf(shape.size);
  const add = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < size.cols && y < size.rows) out.add(`${x},${y}`);
  };
  const fromSelf = range <= 0;
  if (!aim && needsAim(shape, range)) return out;
  const target = aim ?? caster;

  if (shape.kind === 'sphere') {
    const c = fromSelf ? caster : target;
    for (let y = c.y - n; y <= c.y + n; y++) for (let x = c.x - n; x <= c.x + n; x++) add(x, y);
    if (fromSelf) out.delete(cellKey(caster)); // aura : le lanceur n'est pas touché
    return out;
  }
  if (shape.kind === 'cube') {
    const start = (c: number, t: number) => {
      if (!fromSelf) return t - Math.floor((n - 1) / 2);
      const d = sign(t - c);
      return d > 0 ? c + 1 : d < 0 ? c - n : c - Math.floor((n - 1) / 2);
    };
    const x0 = start(caster.x, target.x);
    const y0 = start(caster.y, target.y);
    for (let y = y0; y < y0 + n; y++) for (let x = x0; x < x0 + n; x++) add(x, y);
    out.delete(cellKey(caster));
    return out;
  }
  // Cône et ligne : depuis le centre de la case du lanceur, vers la case visée.
  const dx = target.x - caster.x;
  const dy = target.y - caster.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  for (let y = caster.y - n - 1; y <= caster.y + n + 1; y++)
    for (let x = caster.x - n - 1; x <= caster.x + n + 1; x++) {
      const vx = x - caster.x;
      const vy = y - caster.y;
      const along = vx * ux + vy * uy;
      if (along <= 0.01 || along > n + 0.5) continue;
      const across = Math.abs(vx * uy - vy * ux);
      // Cône : largeur égale à la distance parcourue (demi-largeur = along / 2) ; ligne : 1 case de large.
      if (shape.kind === 'cone' ? across <= along / 2 + 0.35 : across <= 0.5) add(x, y);
    }
  return out;
}

/** Combattants dans les cases (hors vaincus). */
export function inArea(c: CombatState, cells: Set<string>): Combatant[] {
  return c.combatants.filter((x) => x.status !== 'vaincu' && cells.has(cellKey(posOf(x))));
}

/** Zone d'une action pour un lanceur et une case visée : les murs arrêtent l'effet (vue depuis son origine). */
export function actionArea(c: CombatState, shape: AreaShape, range: number, caster: Combatant, aim: Cell | null) {
  const me = posOf(caster);
  const cells = areaCells(shape, range, me, aim, mapOf(c));
  const walls = mapOf(c).cells ?? {};
  const origin = shape.kind === 'sphere' && range > 0 && aim ? aim : shape.kind === 'cube' && range > 0 && aim ? aim : me;
  for (const k of [...cells]) {
    const [x, y] = k.split(',').map(Number);
    if (blocksSight(walls[k]) || !canSee(c, origin, { x, y })) cells.delete(k);
  }
  return cells;
}

/** Libellé : « sphère 6 m », « cône 4,5 m ». */
export function fmtShape(s: AreaShape) {
  const name = { sphere: 'sphère', cube: 'cube', cone: 'cône', line: 'ligne' }[s.kind];
  return `${name} ${String(s.size).replace('.', ',')} m`;
}
