// Assemble toutes les migrations (supabase/migrations/NN_*.sql, dans l’ordre) en un seul fichier à exécuter en une
// fois dans Supabase pour une installation neuve : supabase/installation_complete.sql.
// Usage : node scripts/sql-complet.mjs (le test tests/sql-complet.test.ts vérifie qu'il est à jour).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIR = join(ROOT, 'supabase', 'migrations');
export const OUTPUT = join(ROOT, 'supabase', 'installation_complete.sql');

/** Contenu du fichier unique. */
export function generate() {
  const files = readdirSync(DIR).filter((f) => /^\d{2,3}_.*\.sql$/.test(f)).sort();
  const head = [
    '-- Grimoire JDR : installation complète de la base (toutes les migrations, dans l’ordre).',
    '-- Fichier généré par scripts/sql-complet.mjs : ne pas modifier à la main.',
    '-- Base NEUVE : copie tout ce fichier dans Supabase → SQL Editor → New query → Run (une seule fois).',
    '-- Base déjà installée : exécute seulement les nouveaux fichiers de supabase/migrations/.',
    `-- Contient : ${files[0]} → ${files[files.length - 1]} (${files.length} fichiers).`,
    '',
  ];
  return head.join('\n') + files.map((f) => `\n-- ================================ ${f} ================================\n${readFileSync(join(DIR, f), 'utf8').trimEnd()}\n`).join('');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(OUTPUT, generate());
  console.log('OK -> supabase/installation_complete.sql');
}
