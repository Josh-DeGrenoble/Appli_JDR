// Parcours e2e v0.10 (appelé par e2e-demo.mjs) : portes sur la carte affichée, plan préparé en secret,
// note préparée puis révélée. Le MJ est déjà sur l'onglet Carte avec les outils ouverts (fin de e2e-marche).
import { onglet } from './e2e-outils.mjs';

/** Joue le scénario ; `step`, `shot`, `expect` viennent du script principal. */
export async function prepScenario({ gm, pl, step, shot, expect }) {
  // Porte : le MJ en pose une, l'ouvre ; le joueur la voit s'ouvrir
  await gm.click('.map-tools >> text=🖌️ Décor');
  await gm.click('.materials .mat-door');
  await gm.locator('.battle-map > div').nth(12 * 12 + 1).click();
  await gm.click('.map-tools >> text=✋ Pions');
  await pl.waitForSelector('.cell.door');
  await gm.click('[aria-label="Porte fermée 2,13"]');
  await pl.waitForSelector('.cell.door-open');
  step('porte posée puis ouverte par le MJ, vue par le joueur');
  // Porte verrouillée, coffre, trésor, piège (caché au joueur)
  await gm.click('.map-tools >> text=🖌️ Décor');
  await gm.click('.materials .mat-door-locked');
  await gm.locator('.battle-map > div').nth(13 * 12 + 1).click();
  await gm.click('.materials .mat-chest');
  await gm.locator('.battle-map > div').nth(14 * 12 + 3).click();
  await gm.click('.materials .mat-treasure');
  await gm.locator('.battle-map > div').nth(14 * 12 + 4).click();
  await gm.click('.materials .mat-trap');
  await gm.locator('.battle-map > div').nth(14 * 12 + 5).click();
  await gm.click('.map-tools >> text=✋ Pions');
  await pl.waitForSelector('.cell.door-locked');
  await pl.waitForSelector('.cell.chest');
  await pl.waitForSelector('.cell.treasure');
  await gm.waitForSelector('.cell.trap');
  expect((await pl.locator('.cell.trap').count()) === 0, 'piège invisible pour le joueur');
  await shot(gm, '20-mj-objets');
  step('carte : porte verrouillée, coffre, trésor ; piège visible du MJ seulement');

  // Piège réglé par le MJ (DD 30, 1 dégât) puis déclenché quand un pion s'arrête dessus en combat
  await gm.click('[aria-label="Piège 6,15"]');
  await gm.click('.modal .chip:has-text("Fosse")');
  await gm.fill('#trap-dc', '30');
  await gm.fill('#trap-damage', '1');
  await shot(gm, '22-mj-piege');
  await gm.click('.modal button:has-text("Enregistrer")');
  await gm.waitForSelector('.modal', { state: 'detached' });
  await gm.waitForTimeout(300);
  await gm.locator('.token[aria-label^="Thalia"]').click();
  await gm.click('[data-cell="5,14"]');
  await pl.waitForSelector('.cell.trap-sprung');
  await gm.waitForSelector('.toast:has-text("Fosse ! Thalia")');
  await pl.waitForSelector('.toast:has-text("-1 PV")');
  await shot(pl, '23-joueur-piege');
  step('piège réglé (Fosse DD 30) puis déclenché : sauvegarde ratée, 1 dégât, piège visible');

  // Plan préparé en secret : le joueur ne voit rien changer
  const before = await pl.locator('.battle-map .token').count();
  await gm.click('text=🛠️ Préparer un nouveau plan');
  await gm.waitForSelector('.modal:has-text("Préparer : Nouveau plan")');
  await gm.fill('#prep-name', 'Antre du dragon');
  await gm.press('#prep-name', 'Tab');
  await gm.click('.modal >> text=+ Monstres');
  await gm.selectOption('#mon-preset', 'Jeune dragon rouge');
  await gm.click('button:has-text("Ajouter le monstre")');
  await gm.waitForSelector('.modal .battle-map .token');
  await shot(gm, '16-mj-plan-prepare');
  await gm.click('.modal >> text=✓ Terminé');
  await gm.waitForSelector('.scene-row:has-text("Antre du dragon")');
  await pl.waitForTimeout(500);
  expect((await pl.locator('.battle-map .token').count()) === before, 'plan préparé invisible des joueurs');
  step('plan « Antre du dragon » préparé en secret (dragon placé)');

  // Note préparée puis révélée
  await onglet(gm, 'Notes');
  await gm.click('text=+ Note (cachée)');
  await gm.fill('#note-title', 'Indice de la crypte');
  await gm.fill('#note-content', 'La clé est sous l’autel.');
  await gm.click('.modal button:has-text("Enregistrer")');
  await gm.waitForSelector('.note-card:has-text("Indice de la crypte") >> text=Préparée');
  await onglet(pl, 'Notes');
  await pl.waitForTimeout(500);
  expect((await pl.locator('.note-card:has-text("Indice de la crypte")').count()) === 0, 'note préparée cachée au joueur');
  await gm.click('.note-card:has-text("Indice de la crypte")');
  await gm.click('.reveal >> text=À toute la table');
  await pl.waitForSelector('.note-card:has-text("Indice de la crypte")');
  step('note préparée cachée, puis révélée à toute la table');

  // 0 PV : plus d'action, jet contre la mort, finir son tour
  await onglet(gm, 'Persos');
  await gm.click('[aria-label="PV de Thalia Brisevent"]');
  await gm.fill('#hp-amount', '99');
  await gm.click('.modal >> text=💥 Dégâts');
  await onglet(gm, 'Carte');
  for (let i = 0; i < 6; i++) {
    if ((await gm.locator('.init-row.active:has-text("Thalia")').count()) > 0) break;
    await gm.click('text=Tour suivant ▶');
    await gm.waitForTimeout(400);
  }
  await onglet(pl, 'Carte');
  await pl.waitForSelector('.down-panel');
  expect((await pl.locator('.action-row').count()) === 0, 'aucune action à 0 PV');
  await pl.waitForSelector('.toast:has-text("Jet contre la mort")'); // lancé tout seul
  await shot(pl, '17-joueur-a-terre');
  await gm.waitForSelector('.init-row.active:not(:has-text("Thalia"))'); // puis le tour passe tout seul
  step('0 PV : plus d’action ; jet contre la mort automatique, le tour passe tout seul');
}
