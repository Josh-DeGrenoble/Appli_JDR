// Types de dégâts (règles 2024) et défenses : résistance (moitié), immunité (aucun dégât), vulnérabilité (double).
// Le type est déduit du texte de l'attaque ou du sort (« dégâts de feu », « tranchant »…). = SQL combat_act (09_combat.sql).

export const DAMAGE_TYPES = ['acide', 'contondant', 'feu', 'force', 'foudre', 'froid', 'nécrotique', 'perforant', 'poison', 'psychique', 'radiant', 'tonnerre', 'tranchant'] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

/** Défenses d'une créature (types de dégâts). */
export interface Defenses {
  resist?: string[];
  immune?: string[];
  vuln?: string[];
}

const KEYWORDS: [DamageType, RegExp][] = [
  ['acide', /acide/],
  ['contondant', /contondant/],
  ['feu', /\bfeu\b|flamme|brûl/],
  ['force', /\bforce\b/],
  ['foudre', /foudre|électri|éclair/],
  ['froid', /froid|glac|gel/],
  ['nécrotique', /nécrot/],
  ['perforant', /perforant|perçant/],
  ['poison', /poison/],
  ['psychique', /psychique/],
  ['radiant', /radiant/],
  ['tonnerre', /tonnerre/],
  ['tranchant', /tranchant/],
];

/** Type de dégâts trouvé dans un texte (le premier cité), ou undefined. */
export function damageTypeOf(text?: string): DamageType | undefined {
  const t = (text ?? '').toLowerCase();
  let best: { type: DamageType; at: number } | null = null;
  for (const [type, re] of KEYWORDS) {
    const m = re.exec(t);
    if (m && (!best || m.index < best.at)) best = { type, at: m.index };
  }
  return best?.type;
}

/** Fusionne plusieurs défenses (fiche + effets). */
export const mergeDefenses = (...list: (Defenses | undefined)[]): Defenses => ({
  resist: list.flatMap((d) => d?.resist ?? []),
  immune: list.flatMap((d) => d?.immune ?? []),
  vuln: list.flatMap((d) => d?.vuln ?? []),
});

/** Dégâts après défenses : immunité 0, résistance moitié (arrondie en dessous), vulnérabilité ×2 (les deux s'annulent). */
export function adjustDamage(amount: number, type: string | undefined, d: Defenses | undefined): { amount: number; note?: 'immunisé' | 'résistant' | 'vulnérable' } {
  if (!type || !d || amount <= 0) return { amount };
  if (d.immune?.includes(type)) return { amount: 0, note: 'immunisé' };
  const r = !!d.resist?.includes(type);
  const v = !!d.vuln?.includes(type);
  if (r && !v) return { amount: Math.floor(amount / 2), note: 'résistant' };
  if (v && !r) return { amount: amount * 2, note: 'vulnérable' };
  return { amount };
}

/** Prochaine défense quand le MJ touche un type : aucune → résistance → immunité → vulnérabilité → aucune. */
export function cycleDefense(d: Defenses | undefined, type: string): Defenses {
  const cur = d?.resist?.includes(type) ? 'resist' : d?.immune?.includes(type) ? 'immune' : d?.vuln?.includes(type) ? 'vuln' : null;
  const next = cur === null ? 'resist' : cur === 'resist' ? 'immune' : cur === 'immune' ? 'vuln' : null;
  const strip = (l?: string[]) => (l ?? []).filter((x) => x !== type);
  const out: Defenses = { resist: strip(d?.resist), immune: strip(d?.immune), vuln: strip(d?.vuln) };
  if (next) out[next] = [...out[next]!, type];
  return out;
}
