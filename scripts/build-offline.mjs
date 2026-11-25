// Build de secours SANS Vite ni npm install (utile quand le registre npm est
// inaccessible, ex. bac à sable de Claude). Utilise esbuild + react préinstallés.
//
//   node scripts/build-offline.mjs            -> dist-offline/ (mode démo local)
//   node scripts/build-offline.mjs --single   -> dist-offline/demo.html (un seul fichier,
//                                                sans <html>/<head>, pour l'aperçu Artifact)
//
// Variables : MODULES_DIR (dossier node_modules contenant esbuild/react/react-dom),
// par défaut /opt/npm-tools/node_modules. Supabase est remplacé par un module vide :
// ce build ne fonctionne qu'en mode démo local. Le vrai build reste `npm run build`.

import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modulesDir = process.env.MODULES_DIR || '/opt/npm-tools/node_modules';
const require = createRequire(join(modulesDir, 'noop.js'));
const esbuild = require('esbuild');
const single = process.argv.includes('--single');
const out = join(root, 'dist-offline');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const shim = join(out, '.supabase-shim.js');
writeFileSync(shim, "export function createClient(){throw new Error('Supabase indisponible dans le build hors-ligne');}\n");

const result = await esbuild.build({
  entryPoints: [join(root, 'src/main.tsx')],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  outdir: out,
  jsx: 'automatic',
  target: ['es2020'],
  nodePaths: [modulesDir],
  alias: { '@supabase/supabase-js': shim },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': '""',
    'import.meta.env.VITE_SUPABASE_ANON_KEY': '""',
    'import.meta.env.PROD': single ? 'false' : 'true',
    'process.env.NODE_ENV': '"production"',
  },
  loader: { '.svg': 'dataurl', '.png': 'dataurl' },
  logLevel: 'warning',
});

let js = '';
let css = '';
for (const f of result.outputFiles) {
  if (f.path.endsWith('.js')) js = f.text;
  if (f.path.endsWith('.css')) css = f.text;
}
rmSync(shim, { force: true });

const fonts =
  'https://fonts.googleapis.com/css2?family=Alegreya+SC:wght@500;700&family=Alegreya+Sans:wght@400;500;700&display=swap';

if (single) {
  const svg = readFileSync(join(root, 'public/icon.svg'));
  const dataUri = 'data:image/svg+xml;base64,' + svg.toString('base64');
  js = js.replaceAll('./icon.svg', dataUri);
  const safeJs = js.replaceAll('</script', '<\\/script');
  const html = `<title>Grimoire JDR</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="${fonts}">
<style>${css}</style>
<div id="root"></div>
<script>${safeJs}</script>
`;
  writeFileSync(join(out, 'demo.html'), html);
  console.log(`OK -> dist-offline/demo.html (${(html.length / 1024).toFixed(0)} Ko)`);
} else {
  writeFileSync(join(out, 'app.js'), js);
  writeFileSync(join(out, 'app.css'), css);
  let html = readFileSync(join(root, 'index.html'), 'utf8');
  html = html.replace(
    '<script type="module" src="/src/main.tsx"></script>',
    '<script defer src="./app.js"></script>'
  );
  html = html.replace('</head>', '    <link rel="stylesheet" href="./app.css" />\n  </head>');
  writeFileSync(join(out, 'index.html'), html);
  if (existsSync(join(root, 'public'))) cpSync(join(root, 'public'), out, { recursive: true });
  console.log('OK -> dist-offline/');
}
