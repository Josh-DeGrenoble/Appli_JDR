// Montée de niveau en autonomie (règles 2024) : ce que le niveau suivant apporte (PV, aptitudes, emplacements,
// sorts préparés et mineurs, amélioration de caractéristiques, expertise, attaques) et la modification de la fiche.
// `checkLevelUp` est la vérification faite par le mode démo ; SQL level_up (04_niveaux_dons.sql) fait la même côté serveur.
import { checkFeatLevelUp, featHpPerLevel, featPatch, type FeatChoice } from './feats';
import { ABILITIES, abilityMod, findClass, type Ability } from './data';
import { modOf } from './rules';
import type { DndSheet, Feature, Spell } from './sheet';
import { suggestedSlots } from './spells';
import { attacksAt, cantripsAt, expertiseAt, featureUses, featuresAt, isAsiLevel, preparedAt } from './srd/progression';
import { uid } from '../ids';
import { SUBCLASS_LEVEL, subclassesOf } from './srd/subclasses';
import { allowedLevelOf } from './levels';

export interface LevelUpPlan {
  from: number;
  to: number;
  hitDie: number;
  /** PV gagnés en prenant la moyenne (dé/2 + 1 + CON, +1 nain). */
  average: number;
  /** Bonus fixe ajouté à un jet de dé de vie (CON, +1 nain). */
  flat: number;
  features: string[];
  asi: boolean;
  expertise: number;
  attacksPerAction: number;
  slots: DndSheet['spellcasting']['slots'] | null;
  prepared: [number, number];
  cantrips: [number, number];
  /** Nombre de nouveaux sorts à choisir (sorts mineurs compris). */
  newSpells: number;
  newCantrips: number;
  /** Niveau de sort maximal accessible (0 = aucun). */
  maxSpellLevel: number;
  /** Le perso doit choisir sa sous-classe (niveau 3 atteint sans sous-classe). */
  chooseSubclass: boolean;
}

const maxSlotLevel = (slots: DndSheet['spellcasting']['slots'] | null) =>
  Object.entries(slots ?? {}).filter(([, v]) => v.max > 0).reduce((m, [l]) => Math.max(m, +l), 0);

/** Ce qu'apporte le niveau suivant (`subclass` : sous-classe choisie à cette montée, sinon celle de la fiche). */
export function levelUpPlan(s: DndSheet, subclass?: string): LevelUpPlan {
  const cls = findClass(s.className)?.name ?? s.className;
  const to = Math.min(20, s.level + 1);
  const die = findClass(cls)?.hitDie ?? s.hitDie;
  const flat = modOf(s, 'con') + (s.species === 'Nain' ? 1 : 0);
  const slots = suggestedSlots(cls, to);
  const prepared: [number, number] = [preparedAt(cls, s.level), preparedAt(cls, to)];
  const cantrips: [number, number] = [cantripsAt(cls, s.level), cantripsAt(cls, to)];
  const preparedGain = Math.max(0, prepared[1] - prepared[0]);
  const newCantrips = Math.max(0, cantrips[1] - cantrips[0]);
  return {
    from: s.level, to, hitDie: die, flat,
    average: Math.max(1, die / 2 + 1 + flat),
    features: featuresAt(cls, to, subclass || s.subclass),
    asi: isAsiLevel(cls, to),
    expertise: expertiseAt(cls, to),
    attacksPerAction: Math.max(s.attacksPerAction, attacksAt(cls, to)),
    slots, prepared, cantrips, newCantrips,
    newSpells: (cls === 'Magicien' ? Math.max(2, preparedGain) : preparedGain) + newCantrips,
    maxSpellLevel: maxSlotLevel(slots),
    chooseSubclass: to >= SUBCLASS_LEVEL && !s.subclass && subclassesOf(cls).length > 0,
  };
}

export interface LevelUpChoices {
  /** PV gagnés (moyenne, ou dé lancé + bonus fixe ; au moins 1). */
  hpGain: number;
  /** Amélioration : +2 sur une caractéristique ou +1/+1. */
  asi?: Partial<Record<Ability, number>>;
  /** Compétences maîtrisées qui passent en expertise. */
  expertise?: string[];
  /** Nouveaux sorts (bibliothèque, sorts mineurs compris). */
  spells?: Spell[];
  /** Sous-classe choisie (au niveau 3). */
  subclass?: string;
  /** Don pris à la place de l'amélioration (niveaux d'amélioration). */
  feat?: FeatChoice;
}

/** Modifications de la fiche pour monter d'un niveau. */
export function applyLevelUp(s: DndSheet, c: LevelUpChoices): { patch: Partial<DndSheet>; hpGain: number } {
  const sub = levelUpPlan(s).chooseSubclass ? c.subclass ?? '' : '';
  const plan = levelUpPlan(s, sub);
  const cls = findClass(s.className)?.name ?? s.className;
  const abilities = { ...s.abilities };
  for (const a of ABILITIES) abilities[a.key] = Math.min(20, abilities[a.key] + (plan.asi && !c.feat ? c.asi?.[a.key] ?? 0 : 0));
  const skills = { ...s.skills };
  for (const k of (c.expertise ?? []).slice(0, plan.expertise)) if (skills[k] === 1) skills[k] = 2;
  const cha = abilityMod(abilities.cha);
  // Utilisations des aptitudes existantes mises à jour, puis nouvelles aptitudes.
  const features: Feature[] = s.features.map((f) => {
    const u = featureUses(f.name, plan.to, cha);
    return u ? { ...f, max: u.max, recharge: u.recharge } : f;
  });
  for (const name of plan.features) {
    const base = name.replace(/ \(\d\)$/, '');
    if (features.some((f) => f.name === base) && base !== name) continue; // « Fougue (2) » : déjà comptée dans les utilisations
    const u = featureUses(base, plan.to, cha);
    features.push({ id: uid(), name: base, max: u?.max ?? 0, used: 0, recharge: u?.recharge ?? 'none', notes: `${cls} niveau ${plan.to}` });
  }
  const slots = plan.slots
    ? Object.fromEntries(Object.entries(plan.slots).map(([l, v]) => [l, { max: v.max, used: Math.min(v.max, s.spellcasting.slots[l]?.used ?? 0) }]))
    : s.spellcasting.slots;
  const patch: Partial<DndSheet> = {
    level: plan.to,
    abilities,
    skills,
    features,
    attacksPerAction: plan.attacksPerAction,
    spellcasting: { ...s.spellcasting, slots, preparedMax: plan.prepared[1] || s.spellcasting.preparedMax },
    spells: [...s.spells, ...(c.spells ?? []).slice(0, plan.newSpells)],
    ...(sub ? { subclass: sub } : {}),
  };
  // Robuste déjà pris : +2 PV ; nouveau don : ses effets (et 2 × niveau PV pour Robuste)
  let hpGain = Math.max(1, Math.round(c.hpGain)) + featHpPerLevel(s);
  if (plan.asi && c.feat) {
    const fp = featPatch({ ...s, ...patch } as DndSheet, c.feat, plan.to);
    Object.assign(patch, fp.patch);
    hpGain += fp.hpBonus;
  }
  return { patch, hpGain };
}

/** Vérifie une montée de niveau (mode démo ; mêmes règles que SQL level_up). Joueur : seulement jusqu'au niveau accordé par le MJ. */
export function checkLevelUp(s: DndSheet, patch: Partial<DndSheet>, hpGain: number, isGM = true) {
  const plan = levelUpPlan(s);
  const allowed = ['level', 'abilities', 'skills', 'features', 'attacksPerAction', 'spellcasting', 'spells', 'subclass', 'feats', 'speed', 'saveProf', 'attacks'];
  if (Object.keys(patch).some((k) => !allowed.includes(k))) throw new Error('Montée de niveau invalide');
  if (s.level >= 20 || patch.level !== s.level + 1) throw new Error('On monte d’un seul niveau à la fois (20 au plus)');
  if (!isGM && (patch.level ?? 0) > allowedLevelOf(s)) throw new Error('Le MJ ne t’a pas encore accordé ce niveau');
  if (patch.subclass !== undefined && (!plan.chooseSubclass || !subclassesOf(findClass(s.className)?.name ?? s.className).some((x) => x.name === patch.subclass)))
    throw new Error('Sous-classe invalide');
  const fc = checkFeatLevelUp(s, patch, plan.to, plan.asi);
  if (patch.attacks && !fc.feat?.unarmed) throw new Error('Montée de niveau invalide');
  const dieHp = hpGain - fc.hpBonus;
  if (dieHp < 1 || dieHp > plan.hitDie + Math.max(0, plan.flat)) throw new Error('PV gagnés impossibles');
  if (patch.abilities) {
    const diffs = ABILITIES.map((a) => (patch.abilities![a.key] ?? 0) - s.abilities[a.key]);
    if (diffs.some((d) => d < 0) || ABILITIES.some((a) => patch.abilities![a.key] > 20)) throw new Error('Caractéristiques invalides');
    const sum = diffs.reduce((n, d) => n + d, 0);
    if (sum > (plan.asi ? (fc.feat ? 1 : 2) : 0)) throw new Error('Pas d’amélioration de caractéristiques à ce niveau');
  }
  if (patch.skills) {
    const changed = Object.keys(patch.skills).filter((k) => patch.skills![k] !== (s.skills[k] ?? 0));
    const learned = changed.filter((k) => !s.skills[k] && patch.skills![k] === 1);
    const expert = changed.filter((k) => !learned.includes(k));
    if (expert.some((k) => s.skills[k] !== 1 || patch.skills![k] !== 2) || expert.length > plan.expertise || learned.length > fc.newSkills) throw new Error('Expertise invalide');
  }
  if (patch.spells) {
    const ids = new Set(patch.spells.map((x) => x.id));
    if (s.spells.some((x) => !ids.has(x.id))) throw new Error('Sorts invalides');
    const added = patch.spells.filter((x) => !s.spells.some((o) => o.id === x.id));
    if (added.length > plan.newSpells || added.some((x) => x.level > plan.maxSpellLevel)) throw new Error('Trop de sorts ou niveau trop élevé');
  }
}
