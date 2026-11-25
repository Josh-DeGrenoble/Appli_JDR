// Vérifie que docs/CARTE_DU_CODE.md correspond au code actuel.
// Si ce test échoue : lancer `node scripts/carte-du-code.mjs`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// @ts-expect-error module JS sans types
import { generate, OUTPUT } from '../scripts/carte-du-code.mjs';

test('la carte du code est à jour', () => {
  const current = readFileSync(OUTPUT as string, 'utf8');
  assert.ok(current === (generate as () => string)(), 'Carte périmée : lance `node scripts/carte-du-code.mjs`');
});
