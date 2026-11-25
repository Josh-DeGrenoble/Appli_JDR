// Tests v1.0 : chargement par morceaux de la version en ligne (src/data/supabaseCache.ts) avec un faux client Supabase
// qui compte les requêtes par table.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CampaignCache } from '../src/data/supabaseCache';

function fakeSb() {
  const calls: string[] = [];
  const rows: Record<string, unknown> = {
    campaigns: { id: 'c1', name: 'Test', settings: {} }, members: [], characters: [{ id: 'ch1' }], items: [{ id: 'i1' }],
    rolls: [{ id: 'r1', campaign_id: 'c1' }], notes: [], campaign_secrets: null, shops: [], shop_items: [],
  };
  const sb = {
    from(t: string) {
      calls.push(t);
      const b = {
        select: () => b, eq: () => b, order: () => b, limit: () => b,
        maybeSingle: () => Promise.resolve({ data: rows[t], error: null }),
        then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: rows[t], error: null }).then(ok),
      };
      return b;
    },
  };
  return { sb, calls };
}

test('cache : tout au début, puis seulement ce qui change ; jets ajoutés sans requête ; suppressions d’ailleurs ignorées', async () => {
  const { sb, calls } = fakeSb();
  const cache = new CampaignCache(sb as never);
  const d = await cache.load('c1');
  assert.equal(d.campaign.name, 'Test');
  assert.equal(calls.length, 9, 'chargement complet');
  calls.length = 0;
  assert.equal(await cache.load('c1'), d, 'rien de changé : aucune requête');
  assert.equal(calls.length, 0);

  assert.equal(cache.apply('c1', { table: 'rolls', eventType: 'INSERT', new: { id: 'r2', campaign_id: 'c1' } }), true);
  const d2 = await cache.load('c1');
  assert.deepEqual(d2.rolls.map((r) => r.id), ['r2', 'r1'], 'jet ajouté en tête');
  assert.equal(calls.length, 0, 'sans requête');

  assert.equal(cache.apply('c1', { table: 'items', eventType: 'DELETE', old: { id: 'ailleurs' } }), false, 'suppression d’une autre campagne');
  assert.equal(cache.apply('c1', { table: 'members', eventType: 'DELETE', old: { campaign_id: 'c2', user_id: 'u' } }), false);
  assert.equal(cache.apply('c1', { table: 'items', eventType: 'DELETE', old: { id: 'i1' } }), true);
  cache.apply('c1', { table: 'characters', eventType: 'UPDATE', new: { id: 'ch1' } });
  await cache.load('c1');
  assert.deepEqual(calls.sort(), ['characters', 'items'], 'seulement les tables touchées');

  calls.length = 0;
  cache.invalidate(undefined, false);
  await cache.load('c1');
  assert.ok(!calls.includes('rolls') && calls.includes('campaigns'), 'écriture locale : tout sauf les jets');
});

test('réseau : erreur réseau reconnue, erreur du serveur non', async () => {
  const { isNetworkError } = await import('../src/data/network');
  assert.ok(isNetworkError(new Error('TypeError: Failed to fetch')));
  assert.ok(isNetworkError(new Error('Load failed')));
  assert.ok(!isNetworkError(new Error('Ce n’est pas ton tour')));
});
