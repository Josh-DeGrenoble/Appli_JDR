// Parcours e2e « partie complète » (scénario principal, les étapes s'enchaînent) : création, fiche, MJ, carte, combat,
// marché, préparation, assistant, lieux, v0.16 et v0.21. Lancé par e2e-demo.mjs (nom : partie).
import { onglet } from './e2e-outils.mjs';
import { carteScenario } from './e2e-carte.mjs';
import { marcheScenario } from './e2e-marche.mjs';
import { prepScenario } from './e2e-prep.mjs';
import { wizardScenario } from './e2e-wizard.mjs';
import { lieuxScenario } from './e2e-lieux.mjs';
import { v16Scenario } from './e2e-v16.mjs';
import { v21Scenario } from './e2e-v21.mjs';

/** Joue toute la partie ; `gm` et `pl` sont deux onglets neufs. */
export async function partieScenario({ gm, pl, step, shot, expect, url }) {
const text = async (p, sel) => (await p.textContent(sel))?.trim();
// --- MJ : création de campagne
await gm.goto(url);
await gm.fill('#login-name', 'Maître Ombre');
await gm.click('text=Entrer');
await gm.click('text=Créer (MJ)');
await gm.fill('#camp-name', 'Les Brumes d’Ysmir');
await gm.click('text=Créer la campagne');
await gm.waitForSelector('.code.huge');
const code = await text(gm, '.code.huge');
step(`campagne créée, code ${code}`);

// --- Joueur : rejoindre + créer un Rôdeur niveau 3
await pl.goto(url);
await pl.click('[aria-label="Mon compte"]');
await pl.waitForSelector('text=Mode démo');
await shot(pl, '30-mon-compte');
await pl.click('text=Changer de profil');
await pl.fill('#login-name', 'Aria');
await pl.click('text=Entrer');
await pl.click('text=📖 Les règles expliquées simplement');
await pl.click('.rules-head:has-text("Le combat")');
await pl.waitForSelector('text=/modificateur de DEX au début du combat/');
await pl.fill('[aria-label="Chercher dans les règles"]', 'concentration');
await pl.waitForSelector('.rules-part >> text=/Un seul sort de concentration/');
await shot(pl, '0-regles');
await pl.click('[aria-label="Fermer"]');
step('accueil : règles expliquées simplement');
await pl.click('text=Rejoindre une partie');
await pl.fill('#join-code', code);
await pl.click('button:has-text("Rejoindre"):not(:has-text("partie"))');
await pl.click('text=Créer un personnage');
await pl.click('text=Création rapide (sans assistant)');
await pl.fill('#char-name', 'Thalia Brisevent');
await pl.selectOption('#char-class', 'Rôdeur');
await pl.fill('#char-level', '3');
await pl.fill('#char-species', 'Elfe');
await pl.click('[aria-label="Avatar 🏹"]');
await pl.click('form >> text=Créer');
await pl.waitForSelector('.hp-value');
expect((await text(pl, '.hp-value strong')) === '22', 'PV max conseillés attendus : 22');
step('perso créé (22 PV)');

// --- Caracs : DEX 16, expertise en Discrétion, jet avec avantage
await pl.click('.sheet-tabs >> text=Caracs');
await pl.click('text=✏️ Modifier');
await pl.fill('[aria-label="Valeur de Dextérité"]', '16');
await pl.click('.section-title:has-text("Compétences")'); // sortie du champ
await pl.click('[aria-label^="Discrétion : non maîtrisée"]');
await pl.click('[aria-label^="Discrétion : maîtrisée"]');
await pl.click('text=✓ Terminé');
await pl.waitForSelector('[aria-label="Jet de Discrétion +7"]');
expect((await pl.locator('.roll-mode').count()) === 0, 'le joueur ne choisit plus son avantage');
await onglet(gm, 'Persos');
await gm.click('[aria-label^="Avantage de Thalia Brisevent"]'); // le MJ donne l'avantage
await pl.waitForSelector('.grant-badge.adv');
await pl.click('[aria-label="Jet de Discrétion +7"]');
await pl.waitForTimeout(400);
await shot(pl, '1-joueur-caracs');
step('caracs, expertise, avantage donné par le MJ appliqué au jet');
await gm.click('[aria-label^="Avantage de Thalia Brisevent"]'); // → désavantage
await gm.waitForSelector('.grant-btn.dis');
await gm.click('[aria-label^="Avantage de Thalia Brisevent"]'); // → normal
await pl.waitForSelector('.grant-badge:not(.adv):not(.dis)');
await pl.waitForTimeout(1200);

// --- MJ : dégâts, pièces, état, objet
await onglet(gm, 'Persos');
await gm.click('.distribute .chip:has-text("Thalia")');
await gm.fill('#give-hp', '5');
await gm.click('text=💥 Dégâts');
await gm.click('.segmented >> text=💰 Pièces');
await gm.fill('#give-amount', '20');
await gm.click('text=+ Donner');
await gm.click('.segmented >> text=🌀 État');
await gm.selectOption('#give-cond', 'poisoned');
await gm.click('button:has-text("Appliquer")');
await gm.click('.segmented >> text=🎁 Objet');
await gm.fill('#give-name', 'Potion de soins');
await gm.click('button:has-text("Donner à Thalia")');
step('MJ : 5 dégâts, 20 po, empoisonné, potion');

// --- Joueur : notifications et fiche à jour
await pl.waitForSelector('.toast.gift', { timeout: 5000 });
console.log('  notifs :', (await pl.locator('.toast').allTextContents()).join(' | '));
await pl.click('.sheet-tabs >> text=Combat');
await pl.waitForSelector('.chip.cond:has-text("Empoisonné")');
expect((await text(pl, '.hp-value strong')) === '17', 'PV attendus : 17');
await shot(pl, '2-joueur-combat');
await pl.click('.sheet-tabs >> text=Sac');
expect((await text(pl, '.coin-po strong')) === '20', '20 po attendues');
await pl.waitForSelector('.inv-name:has-text("Potion de soins")');
await shot(pl, '3-joueur-sac');

// --- Le joueur ne gère pas ses PV
await pl.click('.sheet-tabs >> text=Combat');
expect(await pl.isDisabled('[aria-label="Modifier les PV"]'), 'le joueur ne doit pas pouvoir modifier ses PV');
expect((await pl.locator('text=🌙 Repos long').count()) === 0, 'pas de repos pour le joueur');
step('PV verrouillés côté joueur');

// --- v0.3 : attaque
await pl.click('text=+ Attaque');
await pl.fill('#atk-name', 'Épée longue');
await pl.selectOption('#atk-ability', 'dex');
await pl.fill('#atk-type', 'tranchant');
await pl.click('form >> text=Enregistrer');
await pl.waitForSelector('[aria-label="Attaque Épée longue"]');
expect((await text(pl, '[aria-label="Attaque Épée longue"]')) === '🎯 +5', 'attaque attendue : +5 (DEX +3, maîtrise +2)');
await pl.click('[aria-label="Attaque Épée longue"]');
await pl.click('[aria-label="Dégâts Épée longue"]');
step('attaque et dégâts');

// --- Sorts (dans l'onglet Combat de la fiche) : le MJ ajoute, le joueur prépare puis lance
await pl.click('.sheet-tabs >> text=Combat');
await pl.click('text=📖 Mes sorts');
expect((await pl.locator('text=📚 Bibliothèque').count()) === 0, 'le joueur ne peut pas ajouter de sort');
await pl.click('[aria-label="Fermer"]');

await onglet(gm, 'Persos');
await gm.click('.char-row-main:has-text("Thalia")');
await gm.click('text=✏️ Modifier');
await gm.click('text=Remplir (Rôdeur 3)');
await gm.click('text=✓ Terminé');
await gm.click('text=📖 Grimoire');
await gm.click('text=📚 Bibliothèque');
await gm.fill('#lib-search', 'marque');
await gm.click('[aria-label="Ajouter Marque du chasseur"]');
await gm.selectOption('#lib-class', '');
await gm.fill('#lib-search', 'mains br');
await gm.click('[aria-label="Ajouter Mains brûlantes"]');
await gm.locator('[aria-label="Fermer"]').last().click();
await gm.locator('[aria-label="Fermer"]').last().click();
step('MJ : emplacements + sort ajouté au grimoire');

await pl.waitForFunction(() => document.querySelectorAll('.slot-row .pip.on').length === 3);
await pl.click('text=📖 Mes sorts');
await pl.click('[aria-label="Préparer Marque du chasseur"]');
await pl.click('[aria-label="Préparer Mains brûlantes"]');
await pl.click('[aria-label="Fermer"]');
await pl.click('.spell-row:has-text("Marque du chasseur")');
await pl.click('text=✨ Lancer niv. 1');
await pl.waitForSelector('.concentration:has-text("Marque du chasseur")');
await pl.waitForFunction(() => document.querySelectorAll('.slot-row .pip.on').length === 2);
expect(await pl.isDisabled('.slot-row .pip:not(.on)'), 'le joueur ne récupère pas seul un emplacement');
await shot(pl, '4-joueur-sorts');
step('joueur : sort préparé puis lancé depuis l’onglet Combat');

// --- Le joueur ne peut pas s'ajouter d'objet ni de pièces
await pl.click('.sheet-tabs >> text=Sac');
expect((await pl.locator('.inv-add').count()) === 0, 'pas de formulaire d’ajout pour le joueur');
expect(await pl.isDisabled('.inv-row [aria-label^="Ajouter 1"]'), 'pas de + sur les objets');
step('inventaire : ajout impossible côté joueur');

await onglet(gm, 'Persos');

// --- Repos long par le MJ
await gm.click('.distribute .chip:has-text("Thalia")');
await gm.click('.segmented >> text=❤️ PV');
await gm.click('text=🌙 Repos long');
await pl.click('.sheet-tabs >> text=Combat');
await pl.waitForFunction(() => document.querySelector('.hp-value strong')?.textContent === '22');
step('repos long (MJ) : PV au max');

await carteScenario({ gm, pl, step, shot, expect });
await marcheScenario({ gm, pl, step, shot, expect });
await prepScenario({ gm, pl, step, shot, expect });
await wizardScenario({ gm, pl, step, shot, expect });
await lieuxScenario({ gm, pl, step, shot, expect });
await v16Scenario({ gm, pl, step, shot, expect });
await v21Scenario({ gm, pl, step, shot, expect });

// --- Dés : jet caché vu par le MJ
await pl.click('[aria-label="Dés"]');
await pl.click('.die:has-text("d20")');
await pl.click('#dice-secret');
await pl.click('button.btn.big:has-text("Lancer")');
await gm.click('[aria-label="Dés"]');
await gm.waitForSelector('.feed-row.secret');
await gm.waitForSelector('text=/Épée longue → Gobelin 2/');
await gm.waitForSelector('text=/Discrétion \\(avantage : donné par le MJ/');
step('fil des dés : jet caché + jet avec avantage (MJ) visibles par le MJ');

// --- Table MJ
await onglet(gm, 'Persos');
await gm.waitForSelector('.char-row');
await gm.waitForTimeout(3200); // laisse partir les notifications
await gm.waitForSelector('.row-conds');
await shot(gm, '5-mj-table');
await onglet(gm, 'Persos');
await shot(gm, '6-mj-distribuer');

}
