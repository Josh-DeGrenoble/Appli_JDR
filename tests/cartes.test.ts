// Tests v0.16 : archive des cartes passées (pastMaps.ts) et états que seul le MJ retire (permissions.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forgetMap, recordMap, setShared, viewableMaps } from '../src/lib/dnd/pastMaps';
import { checkPlayerSheetPatch } from '../src/lib/dnd/permissions';

test('cartes passées : pièges cachés retirés, choix du MJ gardé, carte active exclue', () => {
  let l = recordMap(undefined, 'a', 'Crypte', { cols: 10, rows: 10, cells: { '1,1': 'wall', '2,2': 'trap', '3,3': 'trap-sprung' }, bg: 'v1' });
  assert.deepEqual(l[0].map.cells, { '1,1': 'wall', '3,3': 'trap-sprung' });
  assert.equal(l[0].shared, true);
  l = setShared(l, 'a', false);
  l = recordMap(l, 'a', 'Crypte', { cols: 12, rows: 10 });
  assert.equal(l[0].shared, false, 'décoché par le MJ : reste décoché');
  l = recordMap(setShared(l, 'a', true), 'b', 'Forêt', { cols: 8, rows: 8 });
  assert.deepEqual(viewableMaps(l, 'b').map((m) => m.id), ['a']);
  assert.deepEqual(forgetMap(l, 'a').map((m) => m.id), ['b']);
});

test('états : le joueur peut s’en mettre, pas s’en retirer', () => {
  checkPlayerSheetPatch({ conditions: ['poisoned', 'prone'] }, { conditions: ['poisoned'] });
  assert.throws(() => checkPlayerSheetPatch({ conditions: [] }, { conditions: ['poisoned'] }), /Seul le MJ retire/);
});
