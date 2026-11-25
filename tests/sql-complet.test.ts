// Vérifie que supabase/installation_complete.sql contient bien toutes les migrations actuelles.
// Si ce test échoue : lancer `node scripts/sql-complet.mjs`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// @ts-expect-error module JS sans types
import { generate, OUTPUT } from '../scripts/sql-complet.mjs';

test('le fichier SQL d’installation complète est à jour', () => {
  assert.ok(readFileSync(OUTPUT as string, 'utf8') === (generate as () => string)(), 'Fichier périmé : lance `node scripts/sql-complet.mjs`');
});
