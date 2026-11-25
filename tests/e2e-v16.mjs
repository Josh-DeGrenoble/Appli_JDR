// Parcours e2e v0.16 (appelé par e2e-demo.mjs, après les lieux) : état que le joueur ne peut pas retirer, mode
// « vrais dés » (aucun jet depuis la fiche), cartes passées que le joueur peut revoir (et que le MJ peut cacher).
import { onglet } from './e2e-outils.mjs';

/** Joue le scénario ; `step`, `shot`, `expect` viennent du script principal. */
export async function v16Scenario({ gm, pl, step, shot, expect }) {
  // État : le joueur se met « À terre » mais ne peut pas se le retirer
  await pl.click('.chip.add:has-text("+ État")');
  await pl.click('.modal .option:has-text("À terre")');
  await pl.click('[aria-label="Fermer"]');
  await pl.click('.chip.cond:has-text("À terre")');
  await pl.waitForSelector('text=Seul le MJ peut retirer un état.');
  expect((await pl.locator('text=Retirer cet état').count()) === 0, 'pas de retrait pour le joueur');
  await pl.click('[aria-label="Fermer"]');
  step('état : le joueur s’en met un, seul le MJ peut le retirer');

  // Vrais dés : un jet depuis la fiche ne lance rien et n'écrit rien dans l'historique
  await gm.click('.gm-tabs >> text=👑 Partie');
  await gm.click('label.toggle:has-text("Vrais dés")');
  await pl.waitForTimeout(600);
  await pl.click('.vital:has-text("Initiative")');
  await pl.waitForSelector('.toast:has-text("lance 1d20")');
  await shot(pl, '28-joueur-vrais-des');
  await gm.click('label.toggle:has-text("Vrais dés")');
  step('vrais dés : la fiche du joueur rappelle quoi lancer, rien dans l’historique');

  // Écran MJ : combat, table et distribution sur une page ; zoom de la carte
  await onglet(gm, 'Persos');
  await gm.waitForSelector('.gm-combat .init-row');
  await gm.waitForSelector('.distribute');
  await shot(gm, '31-ecran-mj');
  // Test demandé au groupe : Perception pour tous, le joueur lance pour ses deux persos
  await gm.click('.group-check button:has-text("Demander à")');
  await pl.waitForSelector('.request-banner');
  await shot(pl, '34-joueur-test-demande');
  while ((await pl.locator('.request-banner button:has-text("Lancer")').count()) > 0) {
    await pl.locator('.request-banner button:has-text("Lancer")').first().click();
    await pl.waitForTimeout(500);
  }
  await gm.waitForFunction(() => !document.querySelector('.group-check')?.textContent?.includes('en attente'));
  await shot(gm, '35-mj-test-resultats');
  await gm.click('.group-check button:has-text("Terminer le test")');
  step('test demandé par le MJ : bandeau chez le joueur, résultats réussi/raté chez le MJ');

  // Effets et défenses : le MJ pose Bénédiction sur Thalia, rend un monstre résistant au feu
  await gm.click('.gm-combat .init-row:has-text("Thalia") .init-main');
  await gm.click('.modal .chip:has-text("Bénédiction")');
  await gm.waitForSelector('.modal .effect-row:has-text("Bénédiction")');
  await gm.click('[aria-label="Fermer"]');
  await gm.waitForSelector('.gm-combat .init-row:has-text("Thalia") .effect-badge');
  await gm.click('.gm-combat .init-row.monster .init-main >> nth=0');
  await gm.click('[aria-label="Défense feu"]');
  await gm.waitForSelector('.modal .chip.def-resist:has-text("feu")');
  await shot(gm, '33-mj-effets-defenses');
  await gm.click('[aria-label="Fermer"]');
  step('effets : Bénédiction posée (rounds restants), monstre résistant au feu');
  await gm.click('.gm-combat button:has-text("Tour suivant")');
  await onglet(gm, 'Carte');
  await gm.click('[aria-label="Zoomer"]');
  await gm.click('[aria-label="Zoomer"]');
  await gm.waitForFunction(() => document.querySelector('.battle-map')?.style.width === '200%');
  await shot(gm, '32-carte-zoom');
  await gm.click('[aria-label="Dézoomer"]');
  await gm.click('[aria-label="Dézoomer"]');
  step('écran MJ (combat + table + distribution) ; zoom de la carte ×2');

  // Cartes passées : le MJ termine le combat et ouvre un autre plan ; le joueur peut revoir la Crypte
  await onglet(gm, 'Carte');
  await gm.click('button:has-text("Terminer le combat")');
  await gm.click('button.armed:has-text("Terminer le combat ?")');
  if (!(await gm.locator('#scene-name').count())) await gm.click('text=Plans enregistrés, taille, vider');
  await gm.click('[aria-label="Ouvrir Antre du dragon"]');
  await gm.waitForSelector('.combat-head:has-text("Antre du dragon")');
  await onglet(pl, 'Carte');
  await pl.click('.past-maps .chip:has-text("Crypte")');
  await pl.waitForSelector('text=/carte déjà visitée/');
  await shot(pl, '29-joueur-carte-passee');
  await pl.click('.past-maps .chip:has-text("Carte actuelle")');
  await gm.click('[aria-label="Cacher aux joueurs Crypte"]');
  await pl.waitForSelector('.past-maps', { state: 'detached' });
  step('cartes passées : le joueur revoit la Crypte, puis le MJ la lui cache');
}
