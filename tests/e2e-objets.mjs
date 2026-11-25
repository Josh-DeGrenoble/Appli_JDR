// Scénario e2e indépendant : équipement. Le MJ donne une cotte de mailles +1 et deux paires de bottes ; la joueuse
// équipe : CA mise à jour et expliquée, la deuxième paire de bottes remplace la première (un seul emplacement Pieds).

/** Joue le scénario (table de départ prête). */
export async function objetsScenario({ gm, pl, step, shot, expect }) {
  await gm.click('.char-row-main:has-text("Thalia")');
  await gm.click('.sheet-tabs >> text=Sac');
  for (const name of ['Cotte de mailles +1', 'Bottes de vitesse', 'Bottes elfiques', 'Épée à deux mains', 'Bouclier']) {
    await gm.fill('input[list="item-library"]', name);
    await gm.click('.inv-add button:has-text("Ajouter")');
    await gm.waitForSelector(`.inv-row:has-text("${name}")`);
  }
  await pl.click('.sheet-tabs >> text=Sac');
  await pl.waitForSelector('.inv-row:has-text("Bottes elfiques")');
  expect((await pl.textContent('.inv-row:has-text("Cotte de mailles +1")')).includes('armure 16 + 1 magique'), 'le +1 est expliqué');
  const equip = async (name) => {
    await pl.click(`.inv-row:has-text("${name}") .inv-main`);
    await pl.click('.modal button:has-text("⚔️ Équiper")');
    await pl.waitForSelector('.modal button:has-text("⚔️ Équipé")');
    await pl.click('[aria-label="Fermer"]');
  };
  await equip('Cotte de mailles +1');
  await pl.waitForSelector('.worn-panel:has-text("→ 17")');
  await equip('Bottes de vitesse');
  await pl.waitForSelector('.worn-panel:has-text("vitesse +3 m")');
  await equip('Bottes elfiques');
  await pl.waitForSelector('.toast:has-text("à la place de Bottes de vitesse")');
  await pl.waitForSelector('.worn-panel .slot.on:has-text("Bottes elfiques")');
  expect((await pl.locator('.worn-panel:has-text("vitesse +3 m")').count()) === 0, 'bottes de vitesse retirées');
  expect((await pl.locator('.worn-panel:has-text("Sans effet calculé")').count()) === 1, 'bottes elfiques : sans effet calculé');
  await equip('Épée à deux mains');
  await equip('Bouclier');
  await pl.waitForSelector('.toast:has-text("à la place de Épée à deux mains")');
  expect((await pl.locator('.worn-panel:has-text("Épée à deux mains")').count()) === 0, 'épée à deux mains retirée par le bouclier');
  await shot(pl, '41-joueur-equipement');
  step('équipement : CA 17 expliquée, une seule paire de bottes, bouclier ou arme à deux mains');
}
