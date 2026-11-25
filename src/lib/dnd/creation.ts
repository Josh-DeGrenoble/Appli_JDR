// Création guidée (règles 2024) : méthodes de caractéristiques (tableau standard, achat de points, 4d6),
// bonus d'historique, et construction de la fiche finale (CA, PV, compétences, attaques, équipement).
// Fonctions pures, tests : tests/creation.test.ts.
import { featPatch } from './feats';
import { featOf } from './srd/feats';
import { ABILITIES, abilityMod, findClass, type Ability } from './data';
import { modOf, suggestedMaxHp } from './rules';
import { normalizeSheet, type Attack, type DndSheet, type Feature, type Spell } from './sheet';
import { suggestedSlots } from './spells';
import { attacksAt, featureUses, featuresAt, preparedAt } from './srd/progression';
import { BACKGROUND_INFO, CLASS_INFO, SPECIES_INFO, speciesDefenses } from './srd/creation';
import { uid } from '../ids';

export type Scores = Record<Ability, number>;
export type Method = 'standard' | 'points' | 'dice';

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
/** Coût de chaque valeur à l'achat de points (8 à 15, 27 points). */
export const POINT_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const POINT_BUDGET = 27;
export const BASE_SCORES: Scores = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };

/** Points dépensés à l'achat de points. */
export const pointsSpent = (s: Scores) => ABILITIES.reduce((n, a) => n + (POINT_COST[s[a.key]] ?? 99), 0);

/** 4d6 en gardant les 3 meilleurs. */
export function roll4d6(rng: () => number = Math.random): number {
  const d = Array.from({ length: 4 }, () => 1 + Math.floor(rng() * 6)).sort((a, b) => b - a);
  return d[0] + d[1] + d[2];
}

/** Valeurs proposées par la classe pour le tableau standard : meilleures valeurs dans ses caractéristiques principales. */
export function suggestStandard(className: string): Scores {
  const cls = CLASS_INFO.find((c) => c.name === className);
  const order: Ability[] = [...(cls?.primary ?? []), 'con', 'dex', 'wis', 'str', 'cha', 'int'].filter((a, i, l) => l.indexOf(a) === i) as Ability[];
  const out = { ...BASE_SCORES };
  order.slice(0, 6).forEach((a, i) => (out[a] = STANDARD_ARRAY[i]));
  return out;
}

/** Bonus d'historique valable : +2/+1 ou +1/+1/+1, seulement sur les 3 caractéristiques de l'historique. */
export function bonusValid(background: string, bonus: Partial<Scores>): boolean {
  const bg = BACKGROUND_INFO.find((b) => b.name === background);
  if (!bg) return false;
  const entries = Object.entries(bonus).filter(([, v]) => v);
  if (entries.some(([k]) => !bg.abilities.includes(k as Ability))) return false;
  const vals = entries.map(([, v]) => v as number).sort();
  return (vals.length === 2 && vals[0] === 1 && vals[1] === 2) || (vals.length === 3 && vals.every((v) => v === 1));
}

/** Valeurs finales (bonus compris, 20 au maximum). */
export const finalScores = (base: Scores, bonus: Partial<Scores>): Scores =>
  Object.fromEntries(ABILITIES.map((a) => [a.key, Math.min(20, base[a.key] + (bonus[a.key] ?? 0))])) as Scores;

export interface Choices {
  className: string;
  background: string;
  species: string;
  level: number;
  /** Sous-classe (à partir du niveau 3). */
  subclass?: string;
  /** Héritage de l'espèce (drakéide, tieffelin) : type de dégâts résisté. */
  legacy?: string;
  /** Don d'origine : compétences (Doué), sorts (Initié à la magie) ; don en plus de l'humain. */
  featSkills?: string[];
  featSpells?: Spell[];
  humanFeat?: string;
  base: Scores;
  bonus: Partial<Scores>;
  /** Compétences choisies dans la liste de la classe. */
  classSkills: string[];
  /** Humain : une compétence en plus. */
  extraSkill?: string;
  equipment: 'kit' | 'gold';
  /** Sorts de départ (bibliothèque). */
  spells?: Spell[];
}

/** Aptitudes de classe des niveaux 1 à `level` (utilisations au niveau atteint ; avec celles de la sous-classe). */
export function startingFeatures(className: string, level: number, chaMod: number, subclass = ''): Feature[] {
  const out: Feature[] = [];
  for (let l = 1; l <= level; l++)
    for (const name of featuresAt(className, l, subclass)) {
      const base = name.replace(/ \(\d\)$/, '');
      if (base !== name && out.some((f) => f.name === base)) continue;
      const u = featureUses(base, level, chaMod);
      out.push({ id: uid(), name: base, max: u?.max ?? 0, used: 0, recharge: u?.recharge ?? 'none', notes: `${className} niveau ${l}` });
    }
  return out;
}

/** Fiche, PV max et notes d'équipement à partir des choix. */
export function buildCharacter(ch: Choices): { sheet: Partial<DndSheet>; maxHp: number; notes: string } {
  const cls = CLASS_INFO.find((c) => c.name === ch.className);
  const core = findClass(ch.className);
  const bg = BACKGROUND_INFO.find((b) => b.name === ch.background);
  const sp = SPECIES_INFO.find((s) => s.name === ch.species);
  const abilities = finalScores(ch.base, ch.bonus);
  const skills: Record<string, 1> = {};
  for (const k of [...ch.classSkills, ...(bg?.skills ?? []), ...(ch.species === 'Elfe' ? ['perception'] : []), ...(ch.extraSkill ? [ch.extraSkill] : [])]) skills[k] = 1;
  const probe = normalizeSheet({ abilities, className: ch.className, level: ch.level, hitDie: core?.hitDie ?? 8 });
  const a = cls?.armor;
  const ac = a ? a.base + (a.dexMax === 0 ? 0 : Math.min(modOf(probe, 'dex'), a.dexMax ?? 99)) + (a.plus ? modOf(probe, a.plus) : 0) + (a.shield ? 2 : 0) : 10 + modOf(probe, 'dex');
  const attacks: Attack[] = (cls?.attacks ?? []).map((x) => ({
    id: uid(), name: x.name, ability: x.ability, proficient: true, bonus: 0, damage: x.damage, addMod: true, damageBonus: 0, damageType: x.type, notes: '', range: x.range,
  }));
  const maxHp = suggestedMaxHp(probe) + (ch.species === 'Nain' ? ch.level : 0);
  const sheet: Partial<DndSheet> = {
    className: ch.className,
    species: ch.species,
    background: ch.background,
    level: ch.level,
    size: sp?.size ?? 'Moyenne',
    speed: sp?.speed ?? 9,
    abilities,
    saveProf: core?.saves ?? [],
    skills,
    hitDie: core?.hitDie ?? 8,
    ac,
    attacks,
    inspiration: ch.species === 'Humain',
    features: startingFeatures(ch.className, ch.level, abilityMod(abilities.cha), ch.level >= 3 ? ch.subclass : ''),
    ...(ch.level >= 3 && ch.subclass ? { subclass: ch.subclass } : {}),
    ...(speciesDefenses(ch.species, ch.legacy) ? { defenses: speciesDefenses(ch.species, ch.legacy) } : {}),
    attacksPerAction: attacksAt(ch.className, ch.level),
    spellcasting: { ability: core?.caster ?? '', slots: suggestedSlots(ch.className, ch.level) ?? {}, pact: ch.className === 'Occultiste', preparedMax: preparedAt(ch.className, ch.level) },
    spells: ch.spells ?? [],
    training: [a?.label, bg?.tool].filter(Boolean).join(' · '),
    ...(ch.equipment === 'gold' && cls ? { coins: { pp: 0, po: cls.gold, pe: 0, pa: 0, pc: 0 } } : {}),
  };
  // Dons d'origine (historique, et don en plus de l'humain) : effets appliqués à la fiche
  let withFeats = normalizeSheet(sheet);
  let featHp = 0;
  for (const name of [bg?.feat, ch.humanFeat].filter((x): x is string => !!x && !!featOf(x))) {
    const fp = featPatch(withFeats, { name, skills: ch.featSkills, spells: ch.featSpells }, ch.level);
    withFeats = { ...withFeats, ...fp.patch };
    featHp += fp.hpBonus;
  }
  Object.assign(sheet, { feats: withFeats.feats, features: withFeats.features, skills: withFeats.skills, attacks: withFeats.attacks, spells: withFeats.spells });
  const notes = [
    sp ? `Espèce (${sp.name}) : ${sp.traits}` : '',
    bg ? `Historique (${bg.name}) : don ${bg.feat}, ${bg.tool}.` : '',
    ch.equipment === 'kit' && cls ? `Équipement de départ (à donner par le MJ) : ${cls.kit}.` : cls ? `Or de départ : ${cls.gold} po (équipement à acheter).` : '',
  ].filter(Boolean).join('\n');
  return { sheet, maxHp: maxHp + featHp, notes };
}
