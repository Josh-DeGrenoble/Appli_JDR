// Moteur de dés. Syntaxe supportée (insensible à la casse, espaces ignorés) :
//   2d6+3, d20, 1d100, d%, 4d6kh3 (garde les 3 meilleurs), 2d20kl1 (garde le pire),
//   3dF (dés Fudge -1/0/+1), combinaisons : 1d8+1d6-2
// Limites : 100 dés par groupe, 1000 faces max.
import { abilityMod } from './dnd/data';

export interface DiceGroupResult {
  sign: 1 | -1;
  count: number;
  sides: number | 'F';
  rolls: number[];
  kept: boolean[];
  subtotal: number;
}

export interface DiceResult {
  formula: string;
  total: number;
  groups: DiceGroupResult[];
  modifier: number;
  detail: string;
}

export type Rng = (sides: number) => number;

export const cryptoRng: Rng = (sides) => {
  const c = globalThis.crypto;
  if (c?.getRandomValues) {
    // Rejet pour éviter le biais modulo.
    const max = Math.floor(0x100000000 / sides) * sides;
    const buf = new Uint32Array(1);
    do c.getRandomValues(buf);
    while (buf[0] >= max);
    return (buf[0] % sides) + 1;
  }
  return Math.floor(Math.random() * sides) + 1;
};

export class DiceError extends Error {}

const TERM = /^(\d*)d(\d+|%|f)(?:(kh|kl)(\d+))?$/i;

export function normalizeFormula(input: string): string {
  let f = input.toLowerCase().replace(/\s+/g, '');
  // Résout les doubles signes produits par la substitution ({mod} négatif)
  for (let i = 0; i < 3; i++) f = f.replace(/\+-/g, '-').replace(/-\+/g, '-').replace(/--/g, '+').replace(/\+\+/g, '+');
  return f;
}

export function rollDice(input: string, rng: Rng = cryptoRng): DiceResult {
  const formula = normalizeFormula(input);
  if (!formula) throw new DiceError('Formule vide');
  const tokens = formula.match(/[+-]?[^+-]+/g);
  if (!tokens || tokens.join('') !== formula) throw new DiceError(`Formule invalide : ${input}`);

  const groups: DiceGroupResult[] = [];
  let modifier = 0;

  for (const tok of tokens) {
    const sign: 1 | -1 = tok.startsWith('-') ? -1 : 1;
    const body = tok.replace(/^[+-]/, '');
    if (/^\d+$/.test(body)) {
      modifier += sign * parseInt(body, 10);
      continue;
    }
    const m = body.match(TERM);
    if (!m) throw new DiceError(`Terme invalide : ${body}`);
    const count = m[1] ? parseInt(m[1], 10) : 1;
    const sidesRaw = m[2];
    const sides: number | 'F' = sidesRaw === '%' ? 100 : sidesRaw === 'f' ? 'F' : parseInt(sidesRaw, 10);
    if (count < 1 || count > 100) throw new DiceError('Entre 1 et 100 dés par groupe');
    if (sides !== 'F' && (sides < 2 || sides > 1000)) throw new DiceError('Entre 2 et 1000 faces');

    const rolls: number[] = [];
    for (let i = 0; i < count; i++) rolls.push(sides === 'F' ? rng(3) - 2 : rng(sides));

    let kept = rolls.map(() => true);
    if (m[3]) {
      const k = Math.min(parseInt(m[4], 10), count);
      const order = rolls.map((v, i) => ({ v, i })).sort((a, b) => (m[3] === 'kh' ? b.v - a.v : a.v - b.v));
      const keep = new Set(order.slice(0, k).map((o) => o.i));
      kept = rolls.map((_, i) => keep.has(i));
    }
    const subtotal = rolls.reduce((s, v, i) => s + (kept[i] ? v : 0), 0);
    groups.push({ sign, count, sides, rolls, kept, subtotal });
  }

  const total = groups.reduce((s, g) => s + g.sign * g.subtotal, 0) + modifier;
  return { formula, total, groups, modifier, detail: describe(groups, modifier) };
}

function describe(groups: DiceGroupResult[], modifier: number): string {
  const parts = groups.map((g, idx) => {
    const vals = g.rolls.map((v, i) => (g.kept[i] ? fmt(v, g.sides) : `~${fmt(v, g.sides)}~`)).join(', ');
    const sign = g.sign < 0 ? '- ' : idx > 0 ? '+ ' : '';
    return `${sign}[${vals}]`;
  });
  if (modifier) parts.push(modifier > 0 ? `+ ${modifier}` : `- ${-modifier}`);
  return parts.join(' ');
}

function fmt(v: number, sides: number | 'F') {
  if (sides === 'F') return v > 0 ? '+' : v < 0 ? '−' : '0';
  return String(v);
}

/** Remplace {v} et {mod} dans une formule de jet de caractéristique. */
export function statFormula(template: string, value: number | string): string {
  const v = typeof value === 'number' ? value : parseInt(String(value), 10) || 0;
  const mod = abilityMod(v);
  return template.replace(/\{v\}/g, String(v)).replace(/\{mod\}/g, String(mod));
}

/** Ajoute un dé à une formule : d6 + "2d6" -> "3d6", sinon concatène. */
export function appendDie(formula: string, sides: number): string {
  const f = normalizeFormula(formula);
  if (!f) return `1d${sides}`;
  const re = new RegExp(`(^|[+-])(\\d*)d${sides}$`);
  const m = f.match(re);
  if (m) {
    const n = (m[2] ? parseInt(m[2], 10) : 1) + 1;
    return f.slice(0, f.length - m[0].length) + `${m[1]}${n}d${sides}`;
  }
  return `${f}+1d${sides}`;
}

/** Ajuste le modificateur final : "1d20+2" + 1 -> "1d20+3". */
export function bumpModifier(formula: string, delta: number): string {
  const f = normalizeFormula(formula);
  const m = f.match(/([+-]\d+)$/);
  if (m && /d/.test(f.slice(0, -m[1].length))) {
    const n = parseInt(m[1], 10) + delta;
    const base = f.slice(0, -m[1].length);
    return n === 0 ? base : `${base}${n > 0 ? '+' : ''}${n}`;
  }
  if (!f) return delta > 0 ? `+${delta}` : `${delta}`;
  return `${f}${delta > 0 ? '+' : ''}${delta}`;
}
