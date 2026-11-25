// Outils e2e : table de départ commune aux scénarios indépendants (campagne créée par le MJ, joueuse Aria qui la
// rejoint, Thalia Brisevent, rôdeuse elfe niveau 3 créée rapidement). Le MJ finit sur l'onglet Persos, Aria sur sa fiche.

/** Prépare la table de départ dans deux onglets neufs. */
export async function nouvelleTable({ gm, pl, url, step }) {
  await gm.goto(url);
  await gm.fill('#login-name', 'Maître Ombre');
  await gm.click('text=Entrer');
  await gm.click('text=Créer (MJ)');
  await gm.fill('#camp-name', 'Table de test');
  await gm.click('text=Créer la campagne');
  await gm.waitForSelector('.code.huge');
  const code = (await gm.textContent('.code.huge')).trim();
  await pl.goto(url); // même navigateur : on change de profil, comme deux onglets d'un même téléphone
  await pl.click('[aria-label="Mon compte"]');
  await pl.click('text=Changer de profil');
  await pl.fill('#login-name', 'Aria');
  await pl.click('text=Entrer');
  await pl.click('text=Rejoindre une partie');
  await pl.fill('#join-code', code);
  await pl.click('button:has-text("Rejoindre"):not(:has-text("partie"))');
  await pl.click('text=Créer un personnage');
  await pl.click('text=Création rapide (sans assistant)');
  await pl.fill('#char-name', 'Thalia Brisevent');
  await pl.selectOption('#char-class', 'Rôdeur');
  await pl.fill('#char-level', '3');
  await pl.fill('#char-species', 'Elfe');
  await pl.click('form >> text=Créer');
  await pl.waitForSelector('.hp-value');
  await onglet(gm, 'Persos');
  await gm.waitForSelector('.char-row:has-text("Thalia")');
  step('table de départ : campagne, Aria, Thalia');
}

/**
 * Ouvre un onglet du bas et vérifie qu'il est bien actif (un appui peut se perdre pendant qu'une notification
 * apparaît ou que l'écran se redessine) : on réappuie jusqu'à 3 fois.
 */
export async function onglet(page, label) {
  const actif = page.locator(`.tabbar button[aria-current="page"]:has-text("${label}")`);
  for (let i = 0; i < 3; i++) {
    await page.click(`.tabbar >> text=${label}`);
    try {
      await actif.waitFor({ timeout: 4000 });
      return;
    } catch {
      /* réessayer */
    }
  }
  await actif.waitFor({ timeout: 10000 });
}
