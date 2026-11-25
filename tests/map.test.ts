// Tests de la carte v0.7 : chemins (murs, terrain difficile, ennemis), attaques d'opportunité, zones d'effet,
// fin de combat (src/lib/dnd/movement.ts, area.ts, combat.ts). Les mêmes cas sont vérifiés côté SQL (tests/sql).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FRESH_ECONOMY, endCombat, normalizeCombat, startCombat, type Combatant, type CombatState } from '../src/lib/dnd/combat';
import { applyMove, moveCosts, opportunities, toggleDoor } from '../src/lib/dnd/movement';
import { areaCells, canAim, inArea, needsAim } from '../src/lib/dnd/area';
import { monsterActions, opportunityAttacks } from '../src/lib/dnd/combatActions';
import { resolveAction } from '../src/lib/dnd/resolve';
import { canSee, playerView, visibleTokens } from '../src/lib/dnd/sight';
import { actionArea } from '../src/lib/dnd/area';

const cb = (id: string, extra: Partial<Combatant>): Combatant => ({ id, name: id, kind: 'pc', avatar: '', initiative: 10, initBonus: 0, conditions: [], ...extra });
const board = (cells: Record<string, 'wall' | 'difficult'> = {}): CombatState =>
  startCombat(normalizeCombat({ map: { cols: 12, rows: 16, cells }, combatants: [cb('me', { initiative: 20, x: 2, y: 2 }), cb('g', { kind: 'monster', x: 3, y: 2, status: 'indemne' })] }));

test('chemins : mur infranchissable, terrain difficile ×2, ennemis bloquants', () => {
  const c = board({ '2,5': 'difficult', '4,4': 'wall' });
  const me = c.combatants[0];
  const costs = moveCosts(c, me, 10);
  assert.equal(costs.get('2,4'), 2);
  assert.equal(costs.get('2,5'), 4, 'entrer en terrain difficile coûte 2');
  assert.equal(costs.has('4,4'), false, 'mur');
  assert.equal(costs.has('3,2'), false, 'case de l’ennemi');
  assert.equal(costs.get('4,2'), 2, 'on contourne l’ennemi');
  assert.throws(() => applyMove(c, 'me', 4, 4, false, 9), /infranchissable/);
  // Mur en travers : il faut faire le tour
  const wall = board(Object.fromEntries(Array.from({ length: 15 }, (_, y) => [`5,${y}`, 'wall'])) as Record<string, 'wall'>);
  assert.equal(moveCosts(wall, wall.combatants[0], 40).get('6,2'), 26, 'par l’ouverture en bas');
});

test('attaques d’opportunité : quitter le contact, se désengager, réaction déjà prise', () => {
  const c = board();
  const moved = applyMove(c, 'me', 2, 0, false, 9);
  assert.equal(moved.reactions?.length, 1);
  assert.deepEqual({ by: moved.reactions![0].by, target: moved.reactions![0].target }, { by: 'g', target: 'me' });
  assert.equal(moved.combatants[0].used!.moved, 3);
  const dis = { ...c, combatants: c.combatants.map((x) => (x.id === 'me' ? { ...x, used: { ...FRESH_ECONOMY, disengage: 1 } } : x)) };
  assert.equal(applyMove(dis, 'me', 2, 0, false, 9).reactions?.length, 0, 'désengagé');
  const used = { ...c, combatants: c.combatants.map((x) => (x.id === 'g' ? { ...x, used: { ...FRESH_ECONOMY, reaction: 1 } } : x)) };
  assert.equal(opportunities(used, used.combatants[0], { x: 2, y: 2 }, { x: 2, y: 0 }).length, 0, 'réaction déjà utilisée');
  assert.equal(applyMove(c, 'me', 2, 3, false, 9).reactions?.length, 0, 'reste au contact');
  // L'attaque d'opportunité est payée avec la réaction et retirée de la liste
  const sec = { monsters: { g: { hp: 7, maxHp: 7, ac: 10, notes: '' } } };
  const r = resolveAction({ combat: moved, secrets: sec, characters: [] }, 'g', { kind: 'attack', economy: 'reaction', targets: ['me'], label: 'x', total: 20, natural: 15, damage: 3, opportunity: moved.reactions![0].id }, true, () => 10);
  assert.equal(r.combat.reactions?.length, 0);
  assert.equal(r.combat.combatants.find((x) => x.id === 'g')!.used!.reaction, 1);
});

test('hors combat : déplacement libre, fin de combat garde la carte', () => {
  const c = { ...board(), active: false };
  assert.doesNotThrow(() => applyMove(c, 'me', 11, 15, false, 9));
  const ended = endCombat({ ...board(), combatants: [...board().combatants, cb('dead', { kind: 'monster', status: 'vaincu', x: 0, y: 0 })] });
  assert.equal(ended.active, false);
  assert.equal(ended.combatants.length, 2, 'monstre vaincu retiré');
  assert.equal(ended.combatants[0].initiative, null);
  assert.equal(ended.map?.cells !== undefined, true, 'décor gardé');
});

test('zones d’effet : sphère, cube collé au lanceur, cône, ligne', () => {
  const size = { cols: 12, rows: 16 };
  const fireball = areaCells({ kind: 'sphere', size: 6 }, 45, { x: 0, y: 0 }, { x: 6, y: 6 }, size);
  assert.equal(fireball.size, 81, 'rayon 4 cases = 9×9');
  const aura = areaCells({ kind: 'sphere', size: 4.5 }, 0, { x: 5, y: 5 }, null, size);
  assert.equal(aura.size, 48, 'aura 7×7 sans le lanceur');
  assert.equal(needsAim({ kind: 'sphere', size: 4.5 }, 0), false);
  const thunder = areaCells({ kind: 'cube', size: 4.5 }, 0, { x: 5, y: 5 }, { x: 6, y: 5 }, size);
  assert.deepEqual([...thunder].sort(), ['6,4', '6,5', '6,6', '7,4', '7,5', '7,6', '8,4', '8,5', '8,6']);
  const cone = areaCells({ kind: 'cone', size: 4.5 }, 0, { x: 5, y: 5 }, { x: 8, y: 5 }, size);
  assert.ok(cone.has('6,5') && cone.has('8,5') && cone.has('8,6') && !cone.has('5,5') && !cone.has('4,5') && !cone.has('6,7'));
  const line = areaCells({ kind: 'line', size: 30 }, 0, { x: 0, y: 0 }, { x: 11, y: 0 }, size);
  assert.equal(line.size, 11, 'ligne jusqu’au bord');
  assert.equal(canAim({ x: 0, y: 0 }, { x: 6, y: 6 }, 9), true);
  assert.equal(canAim({ x: 0, y: 0 }, { x: 7, y: 0 }, 9), false);
  const c = board();
  assert.deepEqual(inArea(c, areaCells({ kind: 'sphere', size: 1.5 }, 18, { x: 0, y: 0 }, { x: 3, y: 3 }, size)).map((x) => x.id).sort(), ['g', 'me']);
});

test('monstres : souffle à sauvegarde avec zone, attaques au contact pour l’opportunité', () => {
  const acts = monsterActions({
    hp: 10, maxHp: 10, ac: 12, notes: '',
    attacks: [
      { id: 'b', name: 'Souffle', bonus: 0, damage: '7d6', range: 0, type: 'feu', kind: 'save', dc: 13, ability: 'dex', half: true, shape: { kind: 'cone', size: 4.5 } },
      { id: 'a', name: 'Morsure', bonus: 4, damage: '1d10+2', range: 1.5, type: '' },
      { id: 'c', name: 'Arc', bonus: 4, damage: '1d6', range: 24, type: '' },
    ],
  });
  assert.equal(acts[0].effect, 'save');
  assert.equal(acts[0].dc, 13);
  assert.equal(acts[0].multi, true);
  assert.deepEqual(opportunityAttacks(acts).map((a) => a.name), ['Morsure']);
});

test('ligne de vue, brouillard, monstres cachés, zones arrêtées par les murs', () => {
  const walls = Object.fromEntries(Array.from({ length: 16 }, (_, y) => [`5,${y}`, 'wall'])) as Record<string, 'wall'>;
  const c = { ...board(walls), combatants: [cb('me', { x: 2, y: 2 }), cb('g', { kind: 'monster', x: 8, y: 2, status: 'indemne' }), cb('h', { kind: 'monster', x: 3, y: 3, hidden: true })] };
  assert.equal(canSee(c, { x: 2, y: 2 }, { x: 8, y: 2 }), false, 'mur entre les deux');
  assert.equal(canSee(c, { x: 2, y: 2 }, { x: 4, y: 9 }), true);
  assert.equal(canSee(c, { x: 4, y: 2 }, { x: 6, y: 2 }), false);
  assert.equal(playerView(c), null, 'sans brouillard : tout est visible');
  const fog = { ...c, map: { ...c.map!, fog: true } };
  const view = playerView(fog)!;
  assert.equal(view.has('8,2'), false);
  assert.equal(view.has('4,15'), true);
  assert.deepEqual(visibleTokens(fog, view).map((x) => x.id), ['me'], 'gobelin derrière le mur, h caché');
  const blast = actionArea(c, { kind: 'sphere', size: 6 }, 45, c.combatants[0], { x: 4, y: 2 });
  assert.equal([...blast].some((k) => +k.split(',')[0] >= 5), false, 'la boule de feu ne traverse pas le mur');
  // Coins : on ne voit pas entre deux murs qui se touchent par l'angle ; un seul mur d'angle ne bloque pas
  assert.equal(canSee({ map: { cols: 5, rows: 5, cells: { '1,0': 'wall', '0,1': 'wall' } } }, { x: 0, y: 0 }, { x: 2, y: 2 }), false);
  assert.equal(canSee({ map: { cols: 5, rows: 5, cells: { '1,0': 'wall' } } }, { x: 0, y: 0 }, { x: 2, y: 2 }), true);
});

test('matériaux : table bloque le passage pas la vue, buisson cache et ralentit', () => {
  const c = board({ '3,3': 'table', '2,4': 'bush', '4,4': 'brick' });
  const costs = moveCosts(c, c.combatants[0], 10);
  assert.equal(costs.has('3,3'), false, 'table');
  assert.equal(costs.get('2,4'), 3, 'buisson : 2 cases + 1 pour y entrer en terrain difficile');
  assert.equal(costs.has('4,4'), false, 'brique');
  assert.equal(canSee(c, { x: 2, y: 2 }, { x: 4, y: 4 }), true, 'on voit par-dessus la table');
  assert.equal(canSee(c, { x: 2, y: 2 }, { x: 2, y: 6 }), false, 'le buisson cache');
});

test('portes : bloquent passage et vue, cachent la pièce fermée, s’ouvrent au contact', () => {
  // Pièce fermée en x 6..10, y 0..4 : murs en x=5 et y=5, porte en (5,2)
  const cells: Record<string, 'wall' | 'door'> = {};
  for (let y = 0; y <= 5; y++) cells[`5,${y}`] = 'wall';
  for (let x = 5; x <= 11; x++) cells[`${x},5`] = 'wall';
  cells['5,2'] = 'door';
  const c = normalizeCombat({ map: { cols: 12, rows: 16, cells }, combatants: [cb('me', { x: 4, y: 2 }), cb('g', { kind: 'monster', x: 8, y: 2, status: 'indemne' })] });
  const view = playerView(c)!;
  assert.ok(view, 'pièces fermées cachées même sans brouillard');
  assert.equal(view.has('8,2'), false, 'intérieur caché');
  assert.equal(view.has('5,2'), true, 'la porte se voit');
  assert.equal(view.has('2,10'), true, 'le couloir se voit');
  assert.deepEqual(visibleTokens(c, view).map((x) => x.id), ['me']);
  assert.equal(moveCosts(c, c.combatants[0], 10).has('6,2'), false, 'porte fermée');
  assert.throws(() => toggleDoor(c, 5, 2, false, [cb('far', { x: 0, y: 10 })]), /Approche-toi/);
  const opened = toggleDoor(c, 5, 2, false, [c.combatants[0]]);
  assert.equal(opened.map?.cells?.['5,2'], 'door-open');
  assert.equal(playerView(opened), null, 'plus de porte fermée : on voit tout');
  assert.equal(moveCosts(opened, opened.combatants[0], 10).get('6,2'), 2);
  assert.equal(playerView(normalizeCombat({ map: { cols: 12, rows: 16, cells: { '5,2': 'door-open' } }, combatants: [] })), null, 'sans porte fermée : tout visible');
});
