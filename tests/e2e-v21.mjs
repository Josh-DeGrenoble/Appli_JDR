// Parcours e2e v0.21 (appelé par e2e-demo.mjs, après v16) : compagnon ajouté sur la fiche puis appelé sur la carte,
// obscurité (le joueur ne voit que sa vision dans le noir et la lumière). Le message secret : e2e-messages.mjs.
import { onglet } from './e2e-outils.mjs';

/** Joue le scénario ; `step`, `shot`, `expect` viennent du script principal. */
export async function v21Scenario({ gm, pl, step, shot, expect }) {
  // Compagnon : le joueur ajoute un loup sur sa fiche, puis le fait venir sur la carte
  await onglet(pl, 'Persos');
  await pl.waitForSelector('.sheet-tabs');
  await pl.click('.sheet-tabs >> text=Combat');
  await pl.selectOption('#companion-template', 'Loup');
  await pl.click('.companion-row ~ .row button:has-text("Ajouter"), section:has(#companion-template) button:has-text("Ajouter")');
  await pl.waitForSelector('.companion-row:has-text("Loup")');
  await shot(pl, '36-joueur-compagnon-fiche');
  await onglet(pl, 'Carte');
  await pl.click('[aria-label="Appeler Loup"]');
  await pl.waitForSelector('.companions-panel button:has-text("Renvoyer")');
  await onglet(gm, 'Carte');
  await gm.waitForSelector('.init-row:has-text("Loup")', { timeout: 5000 }).catch(() => {});
  await shot(pl, '37-joueur-compagnon-carte');
  step('compagnon : loup ajouté sur la fiche puis appelé à côté de son maître');

  // Obscurité : le MJ l'active, le joueur ne voit plus toute la carte
  const before = await pl.locator('.cell.fog').count();
  await gm.click('text=🌑 Obscurité désactivée');
  await pl.waitForFunction((n) => document.querySelectorAll('.cell.fog').length > n, before);
  await shot(pl, '38-joueur-obscurite');
  await shot(gm, '39-mj-obscurite');
  await gm.click('text=🌑 Obscurité activée');
  await pl.waitForFunction((n) => document.querySelectorAll('.cell.fog').length <= n, before);
  await pl.click('.companions-panel button:has-text("Renvoyer")');
  await pl.waitForSelector('[aria-label="Appeler Loup"]');
  step('obscurité : le joueur ne voit que la lumière et sa vision dans le noir ; loup renvoyé');
}
