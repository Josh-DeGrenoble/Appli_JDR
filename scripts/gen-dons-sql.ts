// Génère la liste des dons recopiée en SQL (04_niveaux_dons.sql, _feat_info) depuis src/lib/dnd/srd/feats.ts.
// Usage : node --import tsx scripts/gen-dons-sql.ts
import { FEATS } from '../src/lib/dnd/srd/feats';
const out = Object.fromEntries(FEATS.map(({ name, text: _t, kind: _k, ...rest }) => [name, rest]));
console.log(JSON.stringify(out).replace(/'/g, "''"));
