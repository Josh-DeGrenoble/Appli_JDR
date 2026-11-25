// Parcours e2e de l'assistant de création (appelé par e2e-demo.mjs) : Guerrier nain soldat, tableau standard,
// bonus d'historique, compétences, équipement ; PV et CA calculés. Puis niveau accordé par le MJ, annulation, épuisement de groupe.
import { onglet } from './e2e-outils.mjs';

/** Joue le scénario ; `step`, `shot`, `expect` viennent du script principal. */
export async function wizardScenario({ gm, pl, step, shot, expect }) {
  await onglet(pl, 'Persos'); // le joueur arrive sur sa fiche
  await pl.waitForSelector('.sheet');
  await pl.click('text=👥 Voir tous les persos');
  await pl.click('text=+ Nouveau');
  await pl.click('.choice:has(strong:text-is("Guerrier"))');
  await pl.click('text=Suivant →');
  await pl.click('.choice:has(strong:text-is("Soldat"))');
  await pl.click('text=Suivant →');
  await pl.click('.choice:has(strong:text-is("Nain"))');
  await pl.click('text=Suivant →');
  await pl.waitForSelector('.wiz-abilities');
  await shot(pl, '18-assistant-caracs');
  await pl.click('text=Suivant →'); // tableau standard proposé + bonus +2 FOR / +1 DEX
  await pl.click('.chip:has-text("Perception")');
  await pl.click('.chip:has-text("Survie")');
  await pl.click('text=Suivant →');
  await pl.fill('#wiz-name', 'Brom Poing-de-Fer');
  await pl.click('text=✓ Créer Brom Poing-de-Fer');
  await pl.waitForSelector('.hp-value');
  // Guerrier d10 + CON 13 (+1) + robustesse naine (+1) = 12 PV ; cotte de mailles 16
  expect((await pl.textContent('.hp-value strong')) === '12', 'PV du guerrier nain : 12');
  expect((await pl.locator('.vital:has-text("CA") >> text=16').count()) > 0, 'CA 16 (cotte de mailles)');
  await shot(pl, '19-assistant-fiche');
  await pl.waitForSelector('text=/Résiste : poison/'); // nain : résistance au poison
  step('assistant : Guerrier nain soldat créé (12 PV, compétences, équipement en notes)');
  // Niveau accordé par le MJ, puis choisi par le joueur : 1 → 2 (moyenne d10 = 6 + CON 1 + nain 1 = 8 PV)
  expect((await pl.locator('[aria-label="Passer niveau 2"]').count()) === 0, 'pas de montée sans accord du MJ');
  await onglet(gm, 'Persos');
  await gm.click('.char-row-main:has-text("Brom")');
  await gm.click('[aria-label="Accorder un niveau"]');
  await pl.waitForSelector('[aria-label="Passer niveau 2"]');
  await pl.click('[aria-label="Passer niveau 2"]');
  await pl.waitForSelector('.modal:has-text("Fougue")');
  await shot(pl, '21-niveau-2');
  await pl.click('text=⬆️ Passer niveau 2');
  await pl.waitForFunction(() => document.querySelector('.hp-value strong')?.textContent === '20');
  step('niveau accordé par le MJ, choisi par le joueur : niveau 2, +8 PV, Fougue ajoutée');
  // Fausse manip : le MJ annule (−1, double appui) → niveau 1, 12 PV
  await gm.click('.level-bar button:has-text("−1")');
  await gm.click('.level-bar button.armed');
  await pl.waitForFunction(() => document.querySelector('.hp-value strong')?.textContent === '12');
  await pl.waitForSelector('.level-bar:has-text("Niveau 1")');
  step('MJ : −1 niveau, montée annulée (12 PV)');
  // Épuisement donné au groupe depuis l'écran MJ (onglet Persos)
  await onglet(gm, 'Persos');
  await gm.click('.distribute .chip:has-text("Tous")');
  await gm.click('.segmented >> text=🌀 État');
  await gm.click('[aria-label="Épuisement +1 pour la sélection"]');
  await pl.waitForSelector('text=/Épuisement 1\/6/');
  expect((await pl.locator('[aria-label="Épuisement +1"]').count()) === 0, 'le joueur ne gère pas son épuisement');
  await gm.click('.segmented >> text=⭐ Niveau');
  await shot(gm, '24-mj-niveaux');
  step('épuisement +1 donné au groupe par le MJ');
}
