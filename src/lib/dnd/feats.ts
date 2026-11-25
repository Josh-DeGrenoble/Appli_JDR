// Application d'un don à la fiche (création ou montée de niveau) : +1 caractéristique, sauvegarde, vitesse,
// compétences, aptitude affichée (avec utilisations pour Chanceux), attaque à mains nues, sorts, PV de Robuste.
// Effets permanents : Vigilant (initiative, rules.ts) et Mage de guerre (concentration, resolve.ts). = SQL 04_niveaux_dons.sql et 09_combat.sql.
import type { Ability } from './data';
import { profBonus } from './rules';
import type { DndSheet, Feature, Spell } from './sheet';
import { featOf } from './srd/feats';
import { uid } from '../ids';

export interface FeatChoice {
  /** Nom du don (« Initié à la magie (clerc) » accepté). */
  name: string;
  /** Caractéristique augmentée de 1 (dons généraux). */
  ability?: Ability;
  /** Compétences maîtrisées choisies (Doué). */
  skills?: string[];
  /** Sorts choisis (Initié à la magie). */
  spells?: Spell[];
}

/** Le perso a-t-il ce don ? */
export const hasFeat = (s: Pick<DndSheet, 'feats'>, name: string) => (s.feats ?? []).some((f) => featOf(f)?.name === name);

/** PV en plus par niveau donnés par les dons (Robuste : 2). */
export const featHpPerLevel = (s: Pick<DndSheet, 'feats'>) => (s.feats ?? []).reduce((n, f) => n + (featOf(f)?.hpPerLevel ?? 0), 0);

/** Bonus d'initiative des dons (Vigilant : bonus de maîtrise). */
export const featInitiative = (s: Pick<DndSheet, 'feats' | 'level'>) => ((s.feats ?? []).some((f) => featOf(f)?.initProf) ? profBonus(s.level) : 0);

/** Avantage aux sauvegardes de concentration (Mage de guerre). */
export const concentrationAdvantage = (s: Pick<DndSheet, 'feats'>) => (s.feats ?? []).some((f) => featOf(f)?.concAdv);

/**
 * Modifications de la fiche quand le perso prend ce don au niveau `level`, et PV max en plus (Robuste : 2 × niveau).
 */
export function featPatch(s: DndSheet, c: FeatChoice, level: number): { patch: Partial<DndSheet>; hpBonus: number } {
  const f = featOf(c.name);
  if (!f) throw new Error('Don inconnu');
  if (hasFeat(s, f.name)) throw new Error('Don déjà pris');
  const patch: Partial<DndSheet> = { feats: [...(s.feats ?? []), c.name] };
  if (f.plus) {
    if (!c.ability || !f.plus.includes(c.ability)) throw new Error('Choisis la caractéristique du don');
    patch.abilities = { ...s.abilities, [c.ability]: Math.min(20, s.abilities[c.ability] + 1) };
    if (f.saveOfPlus && !s.saveProf.includes(c.ability)) patch.saveProf = [...s.saveProf, c.ability];
  }
  if (f.speed) patch.speed = s.speed + f.speed;
  if (f.skills) {
    const picked = (c.skills ?? []).filter((k) => !s.skills[k]).slice(0, f.skills);
    if (picked.length) patch.skills = { ...s.skills, ...Object.fromEntries(picked.map((k) => [k, 1 as const])) };
  }
  const feature: Feature = { id: uid(), name: f.name, max: f.usesProf ? profBonus(level) : 0, used: 0, recharge: f.usesProf ? 'long' : 'none', notes: `Don : ${f.text}` };
  patch.features = [...s.features, feature];
  if (f.unarmed)
    patch.attacks = [...s.attacks, { id: uid(), name: 'Mains nues (bagarreur)', ability: 'str', proficient: true, bonus: 0, damage: '1d4', addMod: true, damageBonus: 0, damageType: 'contondant', notes: '', range: 1.5 }];
  if (f.spellsOf && c.spells?.length) patch.spells = [...s.spells, ...c.spells.map((x) => ({ ...x, prepared: true }))];
  return { patch, hpBonus: (f.hpPerLevel ?? 0) * level };
}

/**
 * Vérifie le don d'une montée de niveau (mode démo ; = SQL level_up). Renvoie le don pris (ou null), les PV de dons
 * attendus en plus du dé de vie (Robuste), et les compétences que le don peut ajouter (Doué).
 */
export function checkFeatLevelUp(s: DndSheet, patch: Partial<DndSheet>, to: number, asi: boolean) {
  const added = (patch.feats ?? s.feats ?? []).filter((f) => !(s.feats ?? []).includes(f));
  if (patch.feats && (s.feats ?? []).some((f) => !patch.feats!.includes(f))) throw new Error('Dons invalides');
  if (added.length > 1 || (added.length && !asi)) throw new Error('Pas de don à ce niveau');
  const feat = added.length ? featOf(added[0]) : undefined;
  if (added.length && (!feat || feat.spellsOf || hasFeat(s, feat.name))) throw new Error('Don invalide');
  if (patch.speed !== undefined && patch.speed !== s.speed + (feat?.speed ?? 0)) throw new Error('Vitesse invalide');
  if (patch.saveProf) {
    const extra = patch.saveProf.filter((a) => !s.saveProf.includes(a));
    if (s.saveProf.some((a) => !patch.saveProf!.includes(a)) || extra.length > (feat?.saveOfPlus ? 1 : 0)) throw new Error('Sauvegardes invalides');
    if (extra.length && (patch.abilities?.[extra[0]] ?? 0) <= s.abilities[extra[0]]) throw new Error('Sauvegardes invalides');
  }
  return { feat: feat ?? null, hpBonus: featHpPerLevel(s) + (feat?.hpPerLevel ?? 0) * to, newSkills: feat?.skills ?? 0 };
}
