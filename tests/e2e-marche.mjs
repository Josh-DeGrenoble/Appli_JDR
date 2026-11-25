// Parcours e2e Marché (appelé par e2e-demo.mjs) : le MJ prépare un marchand caché, le montre ; le joueur achète
// (bourse débitée, objet dans le sac) puis boit la potion achetée. Plans enregistrés et bestiaire côté MJ.
import { onglet } from './e2e-outils.mjs';

/** Joue le scénario ; `step`, `shot`, `expect` viennent du script principal. */
export async function marcheScenario({ gm, pl, step, shot, expect }) {
  await onglet(gm, 'MJ');
  await gm.click('.gm-tabs >> text=Marché');
  await gm.click('text=+ Marchand');
  await gm.fill('#shop-name', 'Bartolo');
  await gm.fill('#shop-search', 'flasque');
  await gm.click('[aria-label="Mettre en vente Flasque d’huile"]');
  await gm.fill('[aria-label="Nom de l’objet maison"]', 'Élixir');
  await gm.fill('[aria-label="Prix (po)"]', '2');
  await gm.fill('[aria-label="Formule de soin"]', '2');
  await gm.click('.modal button:has-text("Ajouter"):not(:has-text("+"))');
  await gm.waitForSelector('.shop-edit-row:has-text("Élixir")');
  await gm.locator('[aria-label="Fermer"]').last().click();
  await gm.waitForSelector('.shop:has-text("Bartolo") .shop-row:has-text("Élixir")');
  await pl.waitForTimeout(500);
  expect((await pl.locator('[aria-label="Marché"]').count()) === 0, 'marchand caché : pas d’icône Marché pour le joueur');
  step('MJ : marchand préparé en secret (bibliothèque + objet maison)');

  await gm.click('[aria-label="Visibilité de Bartolo"]');
  await pl.waitForSelector('[aria-label="Marché"]');
  await pl.click('[aria-label="Marché"]');
  const before = await pl.textContent('.purse span:last-child');
  await pl.click('[aria-label="Acheter Élixir"]');
  await pl.waitForSelector('.shop-row:has-text("Élixir")', { state: 'detached' });
  const after = await pl.textContent('.purse span:last-child');
  expect(before !== after, `bourse débitée (${before} → ${after})`);
  await gm.waitForSelector('.shop:has-text("Bartolo") .shop-row:has-text("Élixir")', { state: 'detached' });
  step(`joueur : achat (${before} → ${after}), l’objet quitte le marchand`);
  await pl.click('[aria-label="Acheter Flasque d’huile"]');
  await pl.waitForSelector('.shop-row:has-text("Flasque")', { state: 'detached' });
  await pl.click('text=Vendre à Bartolo');
  await pl.click('[aria-label="Vendre Flasque d’huile"]');
  await pl.waitForSelector('.shop .inv:first-of-type .shop-row:has-text("Flasque")');
  await gm.waitForSelector('.shop:has-text("Bartolo") .shop-row:has-text("Flasque")');
  await shot(pl, '13-joueur-marche');
  step('joueur : flasque achetée puis revendue (moitié prix), de retour chez le marchand');

  expect((await pl.locator('[aria-label="Messages secrets"]').count()) === 0, 'plus de ✉️ en haut');

  await onglet(pl, 'Persos'); // fiche du joueur directement
  await pl.waitForSelector('.sheet-tabs');
  expect((await pl.inputValue('#sheet-name')).startsWith('Thalia'), 'Persos ouvre la fiche du joueur');
  await pl.click('.sheet-tabs >> text=Sac');
  await pl.click('[aria-label="Boire Élixir"]');
  await pl.waitForSelector('.inv-row:has-text("Élixir")', { state: 'detached' });
  step('joueur : potion achetée bue depuis le sac');

  // MJ : bestiaire et plans enregistrés
  await onglet(gm, 'Carte');
  await gm.click('text=+ Ajouter');
  await gm.click('.segmented >> text=👹 Monstres');
  await gm.selectOption('#mon-preset', 'Loup');
  expect((await gm.inputValue('#mon-hp')) === '11', 'PV du loup pré-remplis');
  await gm.click('button:has-text("Ajouter le monstre")');
  await gm.waitForSelector('.init-row:has-text("Loup")');
  step('bestiaire : loup ajouté avec ses stats et sa morsure');

  await gm.click('text=🌫️ Brouillard désactivé');
  await onglet(pl, 'Carte');
  await pl.waitForSelector('.cell.fog');
  await shot(pl, '14-joueur-brouillard');
  await gm.click('text=🌫️ Brouillard activé');
  await pl.waitForSelector('.cell.fog', { state: 'detached' });
  step('brouillard : le joueur ne voit pas derrière le mur');

  if (!(await gm.locator('#scene-name').count())) await gm.click('text=Plans enregistrés, taille, vider');
  await gm.fill('#scene-name', 'Crypte');
  await gm.click('button:has-text("💾 Enregistrer")');
  await gm.waitForSelector('.scene-row:has-text("Crypte")');
  step('plan « Crypte » enregistré');
}
