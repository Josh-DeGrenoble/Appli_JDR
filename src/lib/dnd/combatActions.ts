// Liste des actions possibles d'un perso en combat (attaques, sorts préparés, capacités, objets de soin),
// avec coût, portée, utilisations restantes, et calcul des jets à envoyer pour la résolution.
import { presetOf, type EffectInput } from './effects';
import { damageTypeOf } from './damage';
import type { AreaShape, Economy, MonsterSecret } from './combat';
import { SPELL_SHAPES, parseShape } from './srd/spellMeta';
import { attackBonus, damageFormula } from './actions';
import { fmtBonus, modOf } from './rules';
import type { ActionCost, DndSheet, SpellEffect } from './sheet';
import { spellAbility, spellAttack, spellDC } from './spells';
import type { Item } from '../types';
import type { Ability } from './data';

export type Targeting = 'enemy' | 'ally' | 'self' | 'none';

export interface CombatAction {
  id: string;
  source: 'attack' | 'spell' | 'feature' | 'item' | 'standard' | 'monster';
  sourceId: string;
  name: string;
  cost: ActionCost;
  /** Portée en mètres (0 = soi-même). */
  range: number;
  effect: SpellEffect | 'extra-action' | 'buff';
  targeting: Targeting;
  /** Plusieurs cibles possibles (zone, Soins de groupe…). */
  multi: boolean;
  /** Utilisations restantes / max (capacités, objets, emplacements du niveau du sort). */
  uses: { left: number; max: number } | null;
  /** Niveau du sort (0 = mineur) pour dépenser un emplacement. */
  spellLevel?: number;
  /** Niveaux d'emplacement disponibles (sort à niveau supérieur). */
  slotLevels?: number[];
  /** Dés en plus par niveau au-dessus du niveau du sort. */
  upcast?: string;
  /** Action standard « Foncer » : double le déplacement. */
  dash?: boolean;
  /** Action standard « Se désengager ». */
  disengage?: boolean;
  /** Action standard « Esquiver ». */
  dodge?: boolean;
  /** Action standard « Aider » (avantage à l'allié ciblé). */
  help?: boolean;
  /** Zone d'effet posée sur la carte (les cibles sont celles prises dedans). */
  shape?: AreaShape;
  /** Texte court : « +5 · 1d8+3 », « DD 13 DEX · 8d6 », « soigne 2d4+3 ». */
  summary: string;
  /** Formules et valeurs utilisées au lancement. */
  attackBonus?: number;
  damage?: string;
  critDamage?: string;
  dc?: number;
  save?: Ability;
  half?: boolean;
  heal?: string;
  /** Type de dégâts (résistances des cibles). */
  damageType?: string;
  /** Effet posé (sorts et capacités comme Bénédiction, Bouclier, Rage). */
  buff?: EffectInput;
}

const COST_LABEL: Record<ActionCost, string> = { action: 'Action', bonus: 'Action bonus', reaction: 'Réaction', free: 'Gratuit' };
export const costLabel = (c: ActionCost) => COST_LABEL[c];

/** Dés des sorts mineurs qui augmentent aux niveaux 5, 11 et 17 : "1d10" -> "2d10" au niveau 5. */
export function cantripDice(dice: string, level: number) {
  const mult = level >= 17 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1;
  return dice.replace(/^(\d*)d(\d+)/, (_, n: string, f: string) => `${(parseInt(n || '1', 10) || 1) * mult}d${f}`);
}

const withMod = (formula: string, mod: number) => (mod ? `${formula}${fmtBonus(mod)}` : formula);

/** Toutes les actions de combat d'un perso. */
export function combatActions(s: DndSheet, items: Item[]): CombatAction[] {
  const out: CombatAction[] = [];
  for (const a of s.attacks) {
    out.push({
      id: `a:${a.id}`, source: 'attack', sourceId: a.id, name: a.name, cost: 'action', range: a.range ?? 1.5,
      effect: 'attack', targeting: 'enemy', multi: false, uses: null,
      summary: `${fmtBonus(attackBonus(s, a))} · ${damageFormula(s, a)}${a.damageType ? ' ' + a.damageType : ''}`,
      attackBonus: attackBonus(s, a), damage: damageFormula(s, a), critDamage: damageFormula(s, a, true), damageType: damageTypeOf(a.damageType),
    });
  }
  const ab = spellAbility(s);
  const castMod = ab ? modOf(s, ab) : 0;
  for (const sp of s.spells.filter((x) => x.level === 0 || x.prepared)) {
    const effect = sp.effect ?? (sp.damage ? 'attack' : 'utility');
    const dice = sp.level === 0 && sp.damage ? cantripDice(sp.damage, s.level) : sp.damage;
    const slots = Object.entries(s.spellcasting.slots).filter(([l, v]) => +l >= sp.level && v.max > 0);
    const left = slots.reduce((n, [, v]) => n + v.max - v.used, 0);
    const max = slots.reduce((n, [, v]) => n + v.max, 0);
    const base: CombatAction = {
      id: `s:${sp.id}`, source: 'spell', sourceId: sp.id, name: sp.name, cost: sp.cast ?? 'action', range: sp.range ?? 18,
      effect, targeting: effect === 'heal' ? 'ally' : effect === 'utility' ? (sp.range === 0 ? 'self' : 'none') : 'enemy',
      multi: !!sp.area, uses: sp.level > 0 ? { left, max } : null, spellLevel: sp.level, summary: '',
      slotLevels: slots.filter(([, v]) => v.max - v.used > 0).map(([l]) => +l).sort((a, b) => a - b),
      upcast: sp.upcast,
      shape: sp.shape ?? (sp.area ? parseShape(SPELL_SHAPES[sp.name]) : undefined),
    };
    base.damageType = damageTypeOf(`${sp.notes} ${sp.name}`);
    const buff = presetOf(sp.name);
    if (buff) {
      const hostile = (buff.ac ?? 0) < 0 || (buff.attack ?? '').startsWith('-');
      Object.assign(base, { effect: 'buff', buff, targeting: base.range === 0 ? 'self' : hostile ? 'enemy' : 'ally', multi: base.range > 0, summary: `${buff.icon} ${buff.name} (${buff.rounds} rounds)` });
      out.push(base);
      continue;
    }
    // Sorts « depuis soi » (cône, ligne, cube) d'avant la v0.7 : la portée enregistrée était la taille de la zone.
    if (base.shape && !sp.shape && base.shape.kind !== 'sphere' && (sp.range ?? 0) === base.shape.size) base.range = 0;
    if (base.shape) base.multi = true;
    if (effect === 'attack') Object.assign(base, { attackBonus: spellAttack(s) ?? 0, damage: dice, critDamage: dice.replace(/(\d*)d(\d+)/g, (_m, n: string, f: string) => `${(parseInt(n || '1', 10) || 1) * 2}d${f}`), summary: `${fmtBonus(spellAttack(s) ?? 0)} · ${dice}` });
    else if (effect === 'save') Object.assign(base, { dc: spellDC(s) ?? 10, save: sp.save ?? 'dex', half: sp.half ?? true, damage: dice, summary: `DD ${spellDC(s) ?? 10} ${(sp.save ?? 'dex').toUpperCase()} · ${dice}` });
    else if (effect === 'heal') Object.assign(base, { heal: withMod(dice || '0', castMod), summary: `soigne ${withMod(dice || '0', castMod)}` });
    else if (effect === 'auto') Object.assign(base, { damage: dice, summary: `touche toujours · ${dice}` });
    else base.summary = sp.concentration ? 'concentration' : 'effet';
    out.push(base);
  }
  for (const f of s.features.filter((x) => x.effect === 'heal' || x.effect === 'extra-action')) {
    const heal = f.heal ? f.heal.replace(/\{niveau\}/g, String(s.level)) : '';
    out.push({
      id: `f:${f.id}`, source: 'feature', sourceId: f.id, name: f.name, cost: f.cost ?? 'bonus', range: 0,
      effect: f.effect === 'heal' ? 'heal' : 'extra-action', targeting: 'self', multi: false,
      uses: f.max > 0 ? { left: f.max - f.used, max: f.max } : null,
      summary: f.effect === 'heal' ? `soigne ${heal}` : '+1 action', heal,
    });
  }
  for (const f of s.features) {
    const buff = presetOf(f.name);
    if (!buff) continue;
    out.push({
      id: `f:${f.id}`, source: 'feature', sourceId: f.id, name: f.name, cost: f.cost ?? 'bonus', range: 0, effect: 'buff', targeting: 'self', multi: false,
      uses: f.max > 0 ? { left: f.max - f.used, max: f.max } : null, summary: `${buff.icon} ${buff.name} (${buff.rounds} rounds)`, buff,
    });
  }
  out.push(...STANDARD_ACTIONS);
  for (const it of items.filter((x) => x.heal)) {
    out.push({
      id: `i:${it.id}`, source: 'item', sourceId: it.id, name: it.name, cost: 'bonus', range: 1.5,
      effect: 'heal', targeting: 'ally', multi: false, uses: { left: it.qty, max: it.qty },
      summary: `soigne ${it.heal}`, heal: it.heal,
    });
  }
  return out;
}

/** Actions ouvertes à tous les persos (règles 2024). */
export const STANDARD_ACTIONS: CombatAction[] = [
  { id: 'std:dash', source: 'standard', sourceId: 'dash', name: 'Foncer', cost: 'action', range: 0, effect: 'utility', targeting: 'self', multi: false, uses: null, summary: 'déplacement doublé ce tour', dash: true },
  { id: 'std:dodge', source: 'standard', sourceId: 'dodge', name: 'Esquiver', cost: 'action', range: 0, effect: 'utility', targeting: 'self', multi: false, uses: null, summary: 'désavantage aux attaques contre toi', dodge: true },
  { id: 'std:disengage', source: 'standard', sourceId: 'disengage', name: 'Se désengager', cost: 'action', range: 0, effect: 'utility', targeting: 'self', multi: false, uses: null, summary: 'pas d’attaque d’opportunité', disengage: true },
  { id: 'std:help', source: 'standard', sourceId: 'help', name: 'Aider', cost: 'action', range: 1.5, effect: 'utility', targeting: 'ally', multi: false, uses: null, summary: 'avantage à la prochaine attaque d’un allié', help: true },
  { id: 'std:hide', source: 'standard', sourceId: 'hide', name: 'Se cacher', cost: 'action', range: 0, effect: 'utility', targeting: 'self', multi: false, uses: null, summary: 'test de Discrétion' },
];

/** Multiplie une formule : "1d4+1" × 2 -> "2d4+2". */
export function scaleFormula(f: string, n: number) {
  return f.replace(/\s+/g, '').replace(/(\d*)d(\d+)|(\d+)/g, (m, dn: string, df: string, k: string) =>
    df ? `${(parseInt(dn || '1', 10) || 1) * n}d${df}` : String(parseInt(k, 10) * n)
  );
}

/** Formule de dégâts/soins lancée avec un emplacement de niveau `slot` (dés en plus au-dessus du niveau du sort). */
export function atSlot(formula: string, a: Pick<CombatAction, 'spellLevel' | 'upcast'>, slot?: number) {
  const extra = slot && a.upcast && a.spellLevel ? slot - a.spellLevel : 0;
  return extra > 0 && formula ? `${formula}+${scaleFormula(a.upcast!, extra)}` : formula;
}

/** Actions d'un monstre (attaques et souffles saisis par le MJ). */
export function monsterActions(sec: MonsterSecret | undefined): CombatAction[] {
  return (sec?.attacks ?? []).map((a): CombatAction => {
    const base = { id: `m:${a.id}`, source: 'monster' as const, sourceId: a.id, name: a.name, range: a.range, uses: null, shape: a.shape, multi: !!a.shape, damageType: damageTypeOf(`${a.type ?? ''} ${a.name}`) };
    if (a.kind === 'save')
      return {
        ...base, cost: 'action', effect: 'save', targeting: 'enemy', damage: a.damage, dc: a.dc ?? 12, save: a.ability ?? 'dex', half: a.half ?? true,
        summary: `DD ${a.dc ?? 12} ${(a.ability ?? 'dex').toUpperCase()} · ${a.damage}${a.type ? ' ' + a.type : ''}`,
      };
    return {
      ...base, cost: 'action', effect: 'attack', targeting: 'enemy',
      summary: `${fmtBonus(a.bonus)} · ${a.damage}${a.type ? ' ' + a.type : ''}`,
      attackBonus: a.bonus, damage: a.damage, critDamage: a.damage.replace(/(\d*)d(\d+)/g, (_m, n: string, f: string) => `${(parseInt(n || '1', 10) || 1) * 2}d${f}`),
    };
  });
}

/** Une action d'arme/attaque (paie sur l'action Attaquer, partage les attaques multiples). Souffles : action normale. */
export const isWeaponAttack = (a: CombatAction) => (a.source === 'attack' || a.source === 'monster') && a.effect === 'attack';

/** Attaques utilisables pour une attaque d'opportunité (au contact). */
export const opportunityAttacks = (actions: CombatAction[]) => actions.filter((a) => isWeaponAttack(a) && a.range <= 1.5);

/** Peut-on encore payer ce coût ce tour-ci ? Les attaques suivent l'action Attaquer (Attaque supplémentaire). */
export function canAfford(a: CombatAction, used: Economy, attacksPerAction: number): boolean {
  if (a.uses && a.uses.left <= 0) return false;
  if (isWeaponAttack(a)) return used.attacks > 0 ? used.attacks < attacksPerAction : used.action < 1;
  if (a.cost === 'free') return true;
  return used[a.cost] < 1;
}

/** Économie après avoir payé l'action. */
export function spend(a: CombatAction, used: Economy): Economy {
  if (isWeaponAttack(a)) return used.attacks > 0 ? { ...used, attacks: used.attacks + 1 } : { ...used, action: 1, attacks: 1 };
  if (a.cost === 'free') return used;
  return { ...used, [a.cost]: used[a.cost] + 1 };
}

/** Ce qu'il reste ce tour : « Action 1 · Bonus 0 · Réaction 1 · Attaques 1/2 ». */
export function remaining(used: Economy, attacksPerAction: number) {
  return {
    action: Math.max(0, 1 - used.action),
    bonus: Math.max(0, 1 - used.bonus),
    reaction: Math.max(0, 1 - used.reaction),
    attacks: used.attacks > 0 ? attacksPerAction - used.attacks : used.action < 1 ? attacksPerAction : 0,
  };
}
