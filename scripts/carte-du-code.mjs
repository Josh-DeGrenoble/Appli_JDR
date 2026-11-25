// Génère docs/CARTE_DU_CODE.md : pour chaque fichier, son rôle et ses fonctions
// (avec numéro de ligne et commentaire). Lancer après chaque modification :
//   node scripts/carte-du-code.mjs
// Le test tests/carte-du-code.test.ts échoue si la carte n'est pas à jour.

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const OUTPUT = join(root, 'docs/CARTE_DU_CODE.md');
const DIRS = ['src', 'supabase', 'scripts'];
const EXT = /\.(ts|tsx|css|sql|mjs)$/;

function walk(dir) {
  return readdirSync(dir)
    .sort()
    .flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : EXT.test(f) ? [p] : [];
    });
}

/** Commentaire d'en-tête du fichier (premières lignes de commentaire). */
function header(lines) {
  const out = [];
  for (const l of lines) {
    const t = l.trim();
    if (/^(\/\/|--|\/\*|\*)/.test(t) && !/^-- [=-]{5,}/.test(t) && !/^--\s*-{5,}/.test(t)) {
      const txt = t.replace(/^(\/\/+|--+|\/\*+|\*\/|\*)\s?/, '').replace(/\*\/$/, '').trim();
      if (txt && !/^=+$/.test(txt)) out.push(txt);
    } else if (t === '' && out.length === 0) continue;
    else break;
  }
  return out.join(' ');
}

/** Commentaire juste au-dessus de la ligne i (// ou /** *\/ sur une ou plusieurs lignes). */
function docAbove(lines, i) {
  const out = [];
  for (let j = i - 1; j >= 0; j--) {
    const t = lines[j].trim();
    if (/^(\/\/|\*|\/\*\*|--)/.test(t) && !/^\/\/ -{3,}/.test(t)) {
      const txt = t.replace(/^(\/\/+|\/\*\*|\*\/|\*|--)\s?/, '').replace(/\*\/$/, '').trim();
      if (txt) out.unshift(txt);
    } else break;
  }
  return out.join(' ');
}

const TS_RULES = [
  [/^export (?:default )?(?:async )?function (\w+)/, (n) => (/^[A-Z]/.test(n) ? 'composant' : 'fonction')],
  [/^export class (\w+)/, () => 'classe'],
  [/^export (?:const|let) (\w+)/, () => 'constante'],
  [/^export (?:interface|type) (\w+)/, () => 'type'],
  [/^(?:async )?function (\w+)/, (n) => (/^[A-Z]/.test(n) ? 'composant interne' : 'fonction interne')],
  [/^ {2}(?:async |private |readonly |static |get )*(\w+)\s*(?:<[^>]*>)?\(/, () => 'méthode'],
];
const SQL_RULES = [
  [/^create table if not exists public\.(\w+)/i, () => 'table'],
  [/^create or replace function public\.(\w+)/i, () => 'fonction SQL'],
  [/^create policy (\w+)/i, () => 'règle d’accès'],
];
const SKIP_METHODS = new Set(['if', 'for', 'while', 'switch', 'return', 'catch', 'constructor']);

function symbols(file, lines) {
  const rules = file.endsWith('.sql') ? SQL_RULES : file.endsWith('.css') ? [] : TS_RULES;
  const out = [];
  let inClass = false;
  lines.forEach((l, i) => {
    if (/^export class /.test(l)) inClass = true;
    else if (/^}/.test(l)) inClass = false;
    for (const [re, kind] of rules) {
      const m = l.match(re);
      if (!m || SKIP_METHODS.has(m[1])) continue;
      if (kind(m[1]) === 'méthode' && !inClass) continue;
      out.push({ name: m[1], kind: kind(m[1]), line: i + 1, doc: docAbove(lines, i) });
      break;
    }
  });
  if (file.endsWith('.css')) {
    lines.forEach((l, i) => {
      const m = l.match(/^\/\* (.+?) \*\/$/);
      if (m && i > 0) out.push({ name: m[1], kind: 'section', line: i + 1, doc: '' });
    });
  }
  return out;
}

export function generate() {
  const files = DIRS.flatMap((d) => walk(join(root, d)));
  const parts = [
    '# Carte du code',
    '',
    '> Fichier généré par `node scripts/carte-du-code.mjs`. Ne pas modifier à la main.',
    '> Pour chaque fichier : son rôle, puis ses éléments avec le numéro de ligne.',
    '',
  ];
  let folder = '';
  for (const f of files) {
    const rel = relative(root, f).replaceAll('\\', '/');
    const dir = rel.split('/').slice(0, -1).join('/');
    if (dir !== folder) {
      parts.push(`## ${dir}/`, '');
      folder = dir;
    }
    const lines = readFileSync(f, 'utf8').split('\n');
    parts.push(`### \`${rel}\` (${lines.length} lignes)`, '');
    const h = header(lines);
    if (h) parts.push(h, '');
    const syms = symbols(rel, lines);
    if (syms.length) {
      parts.push('| Élément | Type | Ligne | Description |', '| --- | --- | --- | --- |');
      for (const s of syms) parts.push(`| \`${s.name}\` | ${s.kind} | ${s.line} | ${s.doc.replaceAll('|', '\\|')} |`);
      parts.push('');
    }
  }
  return parts.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(OUTPUT, generate());
  console.log('OK -> docs/CARTE_DU_CODE.md');
}
