// Marchands et coffres : prix en pièces de cuivre, affichage, paiement avec la bourse du perso (rendu de monnaie),
// revente aux marchands (moitié prix). Même calcul côté serveur : 05_objets.sql (_pay_coins, sell_item). Tests : tests/shop.test.ts.
import type { Coin } from './data';

/** Valeur de chaque pièce en pièces de cuivre. */
export const CP: Record<Coin, number> = { pp: 1000, po: 100, pe: 50, pa: 10, pc: 1 };
const ORDER: Coin[] = ['pp', 'po', 'pe', 'pa', 'pc'];
/** Pièces utilisées pour rendre la monnaie (pas de platine ni d'électrum). */
const CHANGE: Coin[] = ['po', 'pa', 'pc'];

/** Total de la bourse en pièces de cuivre. */
export const purseCp = (coins: Partial<Record<Coin, number>>) => ORDER.reduce((s, k) => s + (coins[k] ?? 0) * CP[k], 0);

/** Prix lisible : 150 → « 1 po 5 pa », 0 → « gratuit ». */
export function fmtPrice(cp: number): string {
  if (cp <= 0) return 'gratuit';
  const out: string[] = [];
  let rest = Math.round(cp);
  for (const k of ['po', 'pa', 'pc'] as Coin[]) {
    const n = Math.floor(rest / CP[k]);
    if (n) out.push(`${n} ${k}`);
    rest -= n * CP[k];
  }
  return out.join(' ');
}

/** Prix saisi en po (décimales permises : 0,5 po = 5 pa) → pièces de cuivre. */
export const poToCp = (po: number) => Math.max(0, Math.round(po * 100));

/**
 * Paie `price` (pc) avec la bourse : garde les plus grosses pièces possibles et rend la monnaie en po, pa, pc.
 * Erreur si la bourse ne suffit pas.
 */
export function payCoins(coins: Partial<Record<Coin, number>>, price: number): Record<Coin, number> {
  const total = purseCp(coins);
  if (price > total) throw new Error(`Pas assez d’argent (il manque ${fmtPrice(price - total)})`);
  let rest = total - price;
  const out = { pp: 0, po: 0, pe: 0, pa: 0, pc: 0 } as Record<Coin, number>;
  for (const k of ORDER) {
    out[k] = Math.min(coins[k] ?? 0, Math.floor(rest / CP[k]));
    rest -= out[k] * CP[k];
  }
  for (const k of CHANGE) {
    const n = Math.floor(rest / CP[k]);
    out[k] += n;
    rest -= n * CP[k];
  }
  return out;
}

/** Ajoute `cp` pièces de cuivre à la bourse, en po, pa et pc (vente d'objets). */
export function addCoins(coins: Partial<Record<Coin, number>>, cp: number): Record<Coin, number> {
  const out = { pp: 0, po: 0, pe: 0, pa: 0, pc: 0, ...coins } as Record<Coin, number>;
  let rest = Math.max(0, Math.floor(cp));
  for (const k of CHANGE) {
    const n = Math.floor(rest / CP[k]);
    out[k] += n;
    rest -= n * CP[k];
  }
  return out;
}

/** Prix de reprise d'un objet par un marchand : la moitié de sa valeur (arrondie au pc inférieur). */
export const resalePrice = (baseCp: number) => Math.floor(baseCp / 2);

/**
 * Valeur d'un objet pour un marchand : son propre prix s'il en vend un du même nom, sinon le prix de la
 * bibliothèque (`libraryCp`), sinon null (il ne l'achète pas). = SQL sell_item.
 */
export function itemValue(name: string, stock: { name: string; price_cp: number }[], libraryCp: number | null): number | null {
  const own = stock.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
  return own ? own.price_cp : libraryCp;
}
