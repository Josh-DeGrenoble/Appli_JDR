// Parcours e2e de l'onglet Carte (appelé par e2e-demo.mjs) : plan, mur, exploration, combat, déplacements,
// attaque d'opportunité, sort de zone, historique. `gm` et `pl` sont les pages MJ et joueur déjà dans la campagne.
import { onglet } from './e2e-outils.mjs';

/** Joue le scénario Carte ; `step`, `shot`, `expect` viennent du script principal. */
export async function carteScenario({ gm, pl, step, shot, expect }) {
  // --- v0.7 Carte : MJ ajoute persos + 2 gobelins, peint un mur ; exploration ; préparation et initiatives
  await onglet(gm, 'Carte');
  await gm.click('text=+ Ajouter');
  await gm.click('button:has-text("Ajouter 1 perso")');
  await gm.click('text=+ Ajouter');
  await gm.click('.segmented >> text=👹 Monstres');
  await gm.fill('#mon-name', 'Gobelin');
  await gm.fill('#mon-count', '2');
  await gm.fill('#mon-atk-name', 'Cimeterre');
  await gm.click('button:has-text("Ajouter 2 monstres")');
  await gm.click('.map-tools >> text=🖌️ Décor');
  await gm.locator('.battle-map > div').nth(8 * 12 + 5).click();
  await gm.waitForSelector('.cell.wall');
  await gm.click('.map-tools >> text=✋ Pions');
  await gm.locator('.battle-map > div').nth(8 * 12 + 5).click(); // pierre → brique
  await gm.waitForSelector('.cell.brick');
  await gm.locator('.battle-map > div').nth(8 * 12 + 5).click(); // brique → bois
  await gm.waitForSelector('.cell.wood');
  for (const next of ['ice', 'grate', 'wall']) {
    await gm.locator('.battle-map > div').nth(8 * 12 + 5).click(); // → glace → grille → pierre
    await gm.waitForSelector(`.cell.${next}`);
  }
  await gm.click('.map-tools >> text=✋ Pions');
  await gm.click('text=Plans enregistrés, taille, vider');
  await gm.setInputFiles('.map-tools input[type=file]', { name: 'plan.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVQI12P4z8DAwMDAxMDAwMDAAAANBAEB8hR6WwAAAABJRU5ErkJggg==', 'base64') });
  await gm.waitForSelector('.battle-map.has-bg');
  await onglet(pl, 'Carte');
  await pl.waitForSelector('.cell.wall');
  await pl.waitForSelector('.battle-map.has-bg');
  await pl.click('[aria-label="Thalia Brisevent (2,3)"]');
  await pl.click('[aria-label="Aller en 2,6"]');
  await pl.waitForSelector('[aria-label="Thalia Brisevent (2,6)"]');
  step('carte hors combat : plan et mur posés par le MJ, le joueur se déplace librement');

  await gm.click('text=⚔️ Préparer un combat');
  await gm.click('text=🎲 Initiative des monstres');
  await pl.click('text=🎲 Initiative de Thalia Brisevent');
  await gm.waitForFunction(() => !document.body.innerText.includes('Pour tous ('));
  await gm.click('text=⚔️ Démarrer le combat');
  await pl.waitForSelector('text=Round 1');
  expect((await pl.locator('.init-row').count()) === 3, '3 combattants');
  expect(!(await pl.locator('text=/\\d+\\/7 PV/').count()), 'le joueur ne voit pas les PV des gobelins');
  for (let i = 0; i < 3; i++) {
    if ((await gm.locator('.init-row.active:has-text("Gobelin 1")').count()) > 0) break;
    await gm.click('text=Tour suivant ▶');
    await gm.waitForTimeout(300);
  }
  await gm.click('.init-row:has-text("Gobelin 1") .init-main');
  await gm.fill('#mon-amount', '7');
  await gm.click('.modal >> text=💥 Dégâts');
  await gm.click('[aria-label="Fermer"]');
  await pl.waitForSelector('.init-row:has-text("Gobelin 1") .st-vaincu');
  await shot(pl, '7-joueur-combat');
  await shot(gm, '8-mj-combat');
  step('combat : initiative, tours, gobelin vaincu (état visible, PV secrets)');

  const thaliaTurn = async () => {
    for (let i = 0; i < 4; i++) {
      if ((await gm.locator('.init-row.active:has-text("Thalia")').count()) > 0) break;
      await gm.click('text=Tour suivant ▶');
      await gm.waitForTimeout(400);
    }
    await pl.waitForSelector('text=À toi, Thalia Brisevent !');
  };
  await thaliaTurn();
  await pl.click('.action-row:has-text("Épée longue")');
  await pl.waitForSelector('.init-row.t-no:has-text("Gobelin 2")');
  await pl.click('.action-row:has-text("Épée longue")'); // désélectionne
  step('Gobelin 2 hors de portée au contact');
  // MJ : place Thalia en (9,3), juste à gauche de Gobelin 2 (10,3) ; carte 12 colonnes
  await gm.click('[aria-label="Thalia Brisevent (2,6)"]');
  await gm.locator('.battle-map > div').nth(3 * 12 + 9).click();
  await pl.waitForSelector('.init-row:has-text("Gobelin 2") .dist:has-text("contact")');
  step('MJ déplace le pion : distance « contact » recalculée');
  // Joueur : recule d'une case (quitte le contact) → attaque d'opportunité proposée au MJ
  await pl.click('[aria-label="Thalia Brisevent (10,4)"]');
  await pl.click('[aria-label="Aller en 9,4"]');
  await gm.waitForSelector('.opportunity:has-text("Thalia Brisevent s’éloigne de Gobelin 2")');
  await shot(gm, '11-mj-opportunite');
  await gm.click('.opportunity >> text=⚔️ Cimeterre');
  await gm.waitForSelector('.opportunity', { state: 'detached' });
  await pl.waitForSelector('.drawer-backdrop, body'); // laisse arriver le résultat
  step('attaque d’opportunité du gobelin jouée par le MJ (réaction)');
  await pl.click('[aria-label="Thalia Brisevent (9,4)"]');
  await pl.click('[aria-label="Aller en 10,4"]');
  await pl.waitForSelector('[aria-label="Thalia Brisevent (10,4)"]');
  await pl.waitForSelector('.economy span:has-text("Déplacement 6 m")');
  step('joueur : allers-retours, mouvement décompté (3 m)');
  await pl.click('.init-row:has-text("Gobelin 2") .init-main'); // cible d'abord
  await pl.click('.action-row:has-text("Épée longue")');
  await pl.click('button:has-text("⚔️ Lancer Épée longue")');
  await pl.waitForSelector('.economy span:has-text("Action 0")');
  await shot(pl, '9-joueur-action');
  step('attaque lancée sur Gobelin 2 : action dépensée, résultat appliqué');

  // --- Sort de zone (cône depuis Thalia) au tour suivant de Thalia
  await gm.click('text=Tour suivant ▶');
  await gm.waitForTimeout(400);
  await thaliaTurn();
  await pl.click('.action-row:has-text("Mains brûlantes")');
  await pl.click('[aria-label="Viser 12,4"]');
  expect((await pl.locator('.cell.in-area').count()) >= 3, 'cône affiché sur la carte (coupé par le bord)');
  await shot(pl, '12-joueur-zone');
  await pl.click('button:has-text("⚔️ Lancer Mains brûlantes")');
  await pl.waitForSelector('.economy span:has-text("Action 0")');
  step('sort de zone : cône visé sur la carte, lancé');

  // --- v0.6 : historique (tiroir à droite)
  await pl.click('[aria-label="Historique"]');
  await pl.waitForSelector('.drawer');
  await pl.waitForSelector('.drawer >> text=/Round/');
  await pl.waitForSelector('.drawer >> text=/Épée longue/');
  await pl.waitForSelector('.drawer >> text=/Mains brûlantes/');
  expect(!(await pl.locator('.drawer >> text=/subit 7 dégâts/').count()), 'dégâts du MJ sur un monstre : secrets');
  await pl.waitForTimeout(400);
  await shot(pl, '10-historique');
  await pl.click('[aria-label="Fermer : Historique"]');
  step('historique : tours et attaques ; dégâts des monstres cachés aux joueurs');
}
