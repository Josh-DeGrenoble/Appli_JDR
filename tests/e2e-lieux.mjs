// Parcours e2e v0.15 (appelé par e2e-demo.mjs, après l'assistant) : objet magique donné par le MJ puis équipé
// (CA recalculée), lieu préparé par le MJ et affiché en haut de l'écran du joueur.
import { onglet } from './e2e-outils.mjs';

/** Joue le scénario ; `step`, `shot`, `expect` viennent du script principal. */
export async function lieuxScenario({ gm, pl, step, shot, expect }) {
  // Le MJ donne une cape de protection à Brom (liste préfaite), le joueur l'équipe : CA 16 → 17
  await gm.click('.segmented >> text=🎁 Objet');
  await gm.click('.distribute .chip:has-text("Tous")'); // désélectionne tout
  await gm.click('.distribute .chip:has-text("Brom")');
  await gm.fill('#give-name', 'Cape de protection');
  await gm.waitForSelector('text=/Une fois équipé : \\+1 CA · \\+1 à tous les jets de sauvegarde/');
  await gm.click('button:has-text("Donner à Brom")');
  await pl.click('.sheet-tabs >> text=Sac');
  await pl.click('.inv-main:has-text("Cape de protection")');
  await pl.waitForSelector('.gear-effects');
  await pl.click('.modal button:has-text("Équiper")');
  await pl.click('[aria-label="Fermer"]');
  await pl.click('.sheet-tabs >> text=Combat');
  await pl.waitForSelector('.vital:has-text("CA") >> text=17');
  await shot(pl, '25-joueur-cape');
  step('objet préfait donné par le MJ, équipé par le joueur : CA 16 → 17');

  // Lieu préparé puis affiché en haut de l'écran
  await onglet(gm, 'MJ');
  await gm.click('.gm-tabs >> text=📍 Lieux');
  await gm.click('text=+ Nouveau lieu');
  await gm.fill('#place-name', 'Taverne du Poney');
  await gm.click('.place-icons .chip:has-text("🍺")');
  await gm.click('.modal button:has-text("Enregistrer")');
  await gm.click('.place-card:has-text("Taverne du Poney") >> text=📍 Y aller');
  await pl.waitForSelector('.place-title:has-text("Taverne du Poney")');
  await gm.waitForSelector('.place-card.here');
  await shot(pl, '26-joueur-lieu');
  await shot(gm, '27-mj-lieux');
  expect((await pl.locator('.place-btn').count()) === 0, 'le joueur ne change pas de lieu');
  step('lieu préparé par le MJ (« Taverne du Poney ») affiché en haut chez le joueur');
}
