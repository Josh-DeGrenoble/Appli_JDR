// Déplacements sur la carte : coût du chemin (murs infranchissables, terrain difficile ×2, ennemis bloquants),
// règles du tour, et attaques d'opportunité déclenchées en quittant le contact d'un ennemi.
// Même calcul côté serveur : supabase/migrations/07_carte.sql (_move_cost, combat_move).
import { FRESH_ECONOMY, currentCombatant, type Combatant, type CombatState, type Opportunity } from './combat';
import { CELL, cellsBetween, mapOf, movementLeft, posOf } from './grid';
import { uid } from '../ids';
import { blocksMove, isSlow } from './terrain';

type Cell = { x: number; y: number };
const key = (x: number, y: number) => `${x},${y}`;
const hostile = (a: Combatant, b: Combatant) => a.kind !== b.kind && b.status !== 'vaincu';

/**
 * Coût (en cases) pour atteindre chaque case depuis la position de `mover`, sans dépasser `maxCost`.
 * Diagonales autorisées ; mur = infranchissable ; terrain difficile = 2 ; on traverse les alliés, pas les ennemis.
 */
export function moveCosts(c: CombatState, mover: Combatant, maxCost: number): Map<string, number> {
  const { cols, rows, cells = {} } = mapOf(c);
  const start = posOf(mover);
  const blocked = new Set(c.combatants.filter((o) => o.id !== mover.id && hostile(mover, o)).map((o) => key(posOf(o).x, posOf(o).y)));
  const dist = new Map<string, number>([[key(start.x, start.y), 0]]);
  // File par niveau de coût (les coûts sont de petits entiers).
  const buckets: Cell[][] = [[start]];
  for (let cost = 0; cost < buckets.length && cost <= maxCost; cost++) {
    for (const p of buckets[cost] ?? []) {
      if (dist.get(key(p.x, p.y)) !== cost) continue;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const x = p.x + dx;
          const y = p.y + dy;
          if ((!dx && !dy) || x < 0 || y < 0 || x >= cols || y >= rows) continue;
          const k = key(x, y);
          if (blocksMove(cells[k]) || blocked.has(k)) continue;
          const nc = cost + (isSlow(cells[k]) ? 2 : 1);
          if (nc > maxCost || (dist.get(k) ?? Infinity) <= nc) continue;
          dist.set(k, nc);
          (buckets[nc] ??= []).push({ x, y });
        }
    }
  }
  return dist;
}

/** Combattants ennemis qui peuvent faire une attaque d'opportunité quand `mover` va de `from` à `to`. */
export function opportunities(c: CombatState, mover: Combatant, from: Cell, to: Cell): Opportunity[] {
  if (mover.used?.disengage) return [];
  const pending = c.reactions ?? [];
  return c.combatants
    .filter((h) => h.id !== mover.id && hostile(mover, h) && (h.used?.reaction ?? 0) < 1)
    .filter((h) => cellsBetween(from, posOf(h)) <= 1 && cellsBetween(to, posOf(h)) > 1)
    .filter((h) => !pending.some((r) => r.by === h.id && r.target === mover.id))
    .map((h) => ({ id: uid(), by: h.id, target: mover.id }));
}

/**
 * Déplace un combattant. MJ : libre. Joueur (son perso, vérifié par l'appelant) : libre hors combat ;
 * en combat seulement pendant son tour, par un chemin dont le coût ne dépasse pas son déplacement restant.
 * En combat, quitter le contact d'un ennemi pendant son tour crée une attaque d'opportunité en attente.
 */
export function applyMove(combat: CombatState, id: string, x: number, y: number, isGM: boolean, speed: number): CombatState {
  const c = structuredClone(combat);
  const t = c.combatants.find((k) => k.id === id);
  if (!t) throw new Error('Combattant introuvable');
  const { cols, rows, cells = {} } = mapOf(c);
  if (x < 0 || y < 0 || x >= cols || y >= rows) throw new Error('Hors de la carte');
  if (blocksMove(cells[key(x, y)])) throw new Error('Case infranchissable');
  if (c.combatants.some((k) => k.id !== id && posOf(k).x === x && posOf(k).y === y)) throw new Error('Case occupée');
  const from = posOf(t);
  const myTurn = c.active && currentCombatant(c)?.id === id;
  if (!isGM && c.active) {
    if (!myTurn) throw new Error('Ce n’est pas ton tour');
    const left = movementLeft(speed, t.used);
    const cost = moveCosts(c, t, Math.floor(left / CELL + 1e-9)).get(key(x, y));
    if (cost === undefined) throw new Error('Trop loin pour ton déplacement restant');
    t.used = { ...FRESH_ECONOMY, ...(t.used ?? {}), moved: (t.used?.moved ?? 0) + cost * CELL };
  }
  if (myTurn) c.reactions = [...(c.reactions ?? []), ...opportunities(c, t, from, { x, y })];
  t.x = x;
  t.y = y;
  return c;
}

/** Retire une attaque d'opportunité en attente (jouée ou ignorée). */
export const dropReaction = (c: CombatState, reactionId: string): CombatState => ({
  ...c,
  reactions: (c.reactions ?? []).filter((r) => r.id !== reactionId),
});

/**
 * Ouvre ou ferme une porte. MJ : toujours. Joueur : avec un perso au contact de la porte (en combat, seulement
 * pendant son tour). Impossible de fermer une porte sur un pion. = SQL toggle_door.
 */
export function toggleDoor(combat: CombatState, x: number, y: number, isGM: boolean, mine: Combatant[]): CombatState {
  const m = mapOf(combat);
  const k = key(x, y);
  const cur = m.cells?.[k];
  const torch = cur === 'torch' || cur === 'torch-off';
  if (cur !== 'door' && cur !== 'door-open' && cur !== 'door-locked' && !torch) throw new Error('Pas de porte ici');
  if (cur === 'door-locked' && !isGM) throw new Error('🔒 Verrouillée : seul le MJ peut l’ouvrir');
  if (!isGM) {
    const near = mine.filter((p) => cellsBetween(posOf(p), { x, y }) <= 1);
    if (!near.length) throw new Error(torch ? 'Approche-toi de la torche' : 'Approche-toi de la porte');
    if (combat.active && !near.some((p) => currentCombatant(combat)?.id === p.id)) throw new Error('Ce n’est pas ton tour');
  }
  if (torch) return { ...combat, map: { ...m, cells: { ...m.cells, [k]: cur === 'torch' ? 'torch-off' : 'torch' } } };
  if (cur === 'door-open' && combat.combatants.some((p) => posOf(p).x === x && posOf(p).y === y)) throw new Error('Quelqu’un bloque la porte');
  return { ...combat, map: { ...m, cells: { ...m.cells, [k]: cur === 'door-open' ? 'door' : cur === 'door-locked' ? 'door' : 'door-open' } } };
}
