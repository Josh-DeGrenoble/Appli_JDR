// Règle du projet : aucun fichier de code ne dépasse 300 lignes (plus facile à relire et reprendre).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MAX = 300;
const DIRS = ['src', 'supabase', 'scripts', 'tests'];
const EXT = /\.(ts|tsx|css|sql|mjs|js)$/;
/** Fichiers générés (assemblage), pas écrits à la main. */
const GENERATED = ['installation_complete.sql'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : EXT.test(f) && !GENERATED.includes(f) ? [p] : [];
  });
}

test(`aucun fichier de code ne dépasse ${MAX} lignes`, () => {
  const trop = DIRS.flatMap(walk)
    .map((f) => ({ f, n: readFileSync(f, 'utf8').split('\n').length }))
    .filter((x) => x.n > MAX)
    .map((x) => `${x.f} (${x.n} lignes)`);
  assert.deepEqual(trop, [], 'Fichiers à découper :\n' + trop.join('\n'));
});
