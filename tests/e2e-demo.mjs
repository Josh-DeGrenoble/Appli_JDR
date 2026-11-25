// Tests de bout en bout du mode démo (2 onglets : MJ + joueur), avec captures d'écran. Chaque scénario part d'un
// navigateur neuf (données vides) : on peut en relancer un seul.
// Prérequis : `node scripts/build-offline.mjs` puis un serveur statique sur dist-offline :
//   python3 -m http.server 4173 -d dist-offline &
//   node tests/e2e-demo.mjs [http://localhost:4173] [dossier-captures] [scénario]
// Scénarios : partie (la partie complète, étapes enchaînées), objets (emplacements, effets), messages (note secrète).
import { createRequire } from 'node:module';
import { partieScenario } from './e2e-partie.mjs';
import { objetsScenario } from './e2e-objets.mjs';
import { messagesScenario } from './e2e-messages.mjs';
import { nouvelleTable } from './e2e-outils.mjs';
const require = createRequire(import.meta.url);
let pw;
try {
  pw = require('playwright');
} catch {
  pw = require('/opt/npm-tools/node_modules/playwright');
}
const { chromium, devices } = pw;

const url = process.argv[2] || 'http://localhost:4173';
const shots = process.argv[3] || 'e2e-shots';
const only = process.argv[4];
const errors = [];
const expect = (cond, msg) => cond || errors.push(msg);
const shot = (p, name) => p.screenshot({ path: `${shots}/${name}.png` });
const step = (m) => console.log('•', m);

/** Scénarios : `table` = la table de départ est préparée (campagne, joueur Aria, Thalia) ; sinon deux onglets vides. */
const SCENARIOS = [
  { name: 'objets', table: true, run: objetsScenario },
  { name: 'messages', table: true, run: messagesScenario },
  { name: 'partie', table: false, run: partieScenario },
];

const browser = await chromium.launch();
for (const sc of SCENARIOS.filter((x) => !only || x.name === only)) {
  console.log(`\n=== ${sc.name}`);
  const ctx = await browser.newContext({ ...devices['Pixel 7'], colorScheme: 'dark' });
  const gm = await ctx.newPage();
  const pl = await ctx.newPage();
  for (const p of [gm, pl]) p.on('pageerror', (e) => errors.push(`[${sc.name}] JS : ${e.message}`));
  const args = { gm, pl, step, shot, expect, url };
  try {
    if (sc.table) await nouvelleTable(args);
    await sc.run(args);
  } catch (e) {
    errors.push(`[${sc.name}] ${e.message.split('\n').slice(0, 3).join(' | ')}`);
    await shot(pl, `ERREUR-${sc.name}-joueur`).catch(() => {});
    await shot(gm, `ERREUR-${sc.name}-mj`).catch(() => {});
  }
  await ctx.close();
}
await browser.close();
if (errors.length) {
  console.error('ÉCHEC :\n' + errors.join('\n'));
  process.exit(1);
}
console.log('E2E OK');
