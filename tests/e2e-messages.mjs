// Scénario e2e indépendant : message secret = note du MJ envoyée directement à une joueuse.
import { onglet } from './e2e-outils.mjs';

/** Joue le scénario (table de départ prête). */
export async function messagesScenario({ gm, pl, step, shot, expect }) {
  await onglet(gm, 'Notes');
  await gm.click('text=+ Note (cachée)');
  await gm.fill('#note-title', 'Pour Aria seulement');
  await gm.fill('#note-content', 'Tu entends une voix dans ta tête.');
  await gm.click('.modal .chip:has-text("Aria")');
  await gm.click('.modal button:has-text("✉️ Envoyer")');
  await onglet(pl, 'Notes');
  await pl.waitForSelector('.note-card:has-text("Pour Aria seulement")');
  await shot(pl, '40-joueur-message-secret');
  expect((await gm.locator('.note-card:has-text("Pour Aria seulement")').count()) === 1, 'note visible du MJ');
  step('message secret : note envoyée à Aria seulement, directement depuis les notes');
}
