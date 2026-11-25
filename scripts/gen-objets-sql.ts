// Génère les données d’objets recopiées en SQL (effets et prix de la bibliothèque) pour une migration.
// Usage : node --import tsx scripts/gen-objets-sql.ts
import { ITEM_LIBRARY } from '../src/lib/dnd/srd/items';
const fx = Object.fromEntries(ITEM_LIBRARY.filter((x) => x.effects).map((x) => [x.name, x.effects]));
const q = (s: string) => s.replace(/'/g, "''");
console.log('FX=' + q(JSON.stringify(fx)));
console.log('PRICES=' + ITEM_LIBRARY.map((x) => `    ('${q(x.name)}', ${Math.round(x.price * 100)})`).join(',\n'));
