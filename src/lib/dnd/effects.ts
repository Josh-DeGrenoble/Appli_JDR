// Effets temporaires sur un combattant (Bénédiction, Bouclier, Rage…) : bonus de CA, dés en plus aux attaques et aux
// sauvegardes, résistances. Un effet dure jusqu'à la fin du round `until` ; ceux d'un sort de concentration tombent
// quand le lanceur perd sa concentration. Même calcul côté serveur : combat_act (09_combat.sql).
import type { Combatant, CombatState } from './combat';
import { uid } from '../ids';

export interface Effect {
  id: string;
  name: string;
  icon: string;
  /** Dernier round où l'effet s'applique. */
  until: number;
  /** Bonus (ou malus) de CA. */
  ac?: number;
  /** Dé ajouté aux jets d'attaque (« 1d4 », « -1d4 »). */
  attack?: string;
  /** Dé ajouté aux jets de sauvegarde. */
  saves?: string;
  /** Résistances aux types de dégâts. */
  resist?: string[];
  /** Lié à la concentration du lanceur `source`. */
  conc?: boolean;
  /** Combattant à l'origine de l'effet. */
  source?: string;
  /** Lumière émise autour de la cible (m), dans l'obscurité (sort Lumière…). */
  light?: number;
}

/** Effet à poser (sans id ni round de fin) : durée en rounds. */
export type EffectInput = Omit<Effect, 'id' | 'until' | 'source'> & { rounds: number };

const PHYS = ['contondant', 'perforant', 'tranchant'];

/** Effets courants proposés au MJ (et utilisés par les sorts et capacités du même nom). */
export const EFFECT_PRESETS: EffectInput[] = [
  { name: 'Bénédiction', icon: '✨', rounds: 10, attack: '1d4', saves: '1d4', conc: true },
  { name: 'Fléau', icon: '🌀', rounds: 10, attack: '-1d4', saves: '-1d4', conc: true },
  { name: 'Bouclier', icon: '🛡️', rounds: 1, ac: 5 },
  { name: 'Bouclier de la foi', icon: '⛨', rounds: 100, ac: 2, conc: true },
  { name: 'Hâte', icon: '⚡', rounds: 10, ac: 2, conc: true },
  { name: 'Lenteur', icon: '🐌', rounds: 10, ac: -2, conc: true },
  { name: 'Rage', icon: '😤', rounds: 10, resist: PHYS },
  { name: 'Peau de pierre', icon: '🪨', rounds: 100, resist: PHYS, conc: true },
  { name: 'Lumière', icon: '💡', rounds: 100, light: 6 },
  { name: 'Lumière du jour', icon: '☀️', rounds: 100, light: 18 },
  { name: 'Lueurs féeriques', icon: '🟣', rounds: 10, light: 3, conc: true },
];

/** Lumière émise par les effets actifs (m, la plus grande). */
export const effectsLight = (x: Pick<Combatant, 'effects'>, round: number) => Math.max(0, ...activeEffects(x, round).map((e) => e.light ?? 0));

/** Effet courant portant ce nom (sort ou capacité), sinon undefined. */
export const presetOf = (name: string) => EFFECT_PRESETS.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());

/** Effets encore actifs au round `round`. */
export const activeEffects = (x: Pick<Combatant, 'effects'>, round: number) => (x.effects ?? []).filter((e) => e.until >= round);

/** Bonus de CA des effets actifs. */
export const effectsAc = (x: Pick<Combatant, 'effects'>, round: number) => activeEffects(x, round).reduce((n, e) => n + (e.ac ?? 0), 0);

/** Dés en plus (« +1d4-1d4 ») pour les attaques ou les sauvegardes, '' si aucun. */
export const effectsDice = (x: Pick<Combatant, 'effects'>, round: number, kind: 'attack' | 'saves') =>
  activeEffects(x, round)
    .map((e) => e[kind])
    .filter((d): d is string => !!d)
    .map((d) => (d.startsWith('-') ? d : `+${d}`))
    .join('');

/** Résistances données par les effets actifs. */
export const effectsResist = (x: Pick<Combatant, 'effects'>, round: number) => activeEffects(x, round).flatMap((e) => e.resist ?? []);

/** Vérifie un effet envoyé par un joueur (valeurs raisonnables). */
export function checkEffect(e: EffectInput) {
  const dice = (d?: string) => !d || /^-?\d?d(4|6|8|10|12)$/.test(d);
  if (!e.name?.trim() || e.rounds < 1 || e.rounds > 100 || Math.abs(e.ac ?? 0) > 5 || (e.light ?? 0) > 18 || (e.light ?? 0) < 0 || !dice(e.attack) || !dice(e.saves)) throw new Error('Effet invalide');
}

/** Pose un effet sur des combattants (effets expirés retirés ; un nouvel effet de concentration remplace les anciens du même lanceur). */
export function addEffect(c: CombatState, targets: string[], input: EffectInput, source?: string): CombatState {
  const round = Math.max(1, c.round);
  const { rounds, ...rest } = input;
  const cleaned = input.conc && source ? dropConcentration(c, source) : c;
  return {
    ...cleaned,
    combatants: cleaned.combatants.map((x) =>
      targets.includes(x.id) ? { ...x, effects: [...activeEffects(x, round).filter((e) => e.name !== input.name), { ...rest, id: uid(), until: round + rounds - 1, ...(source ? { source } : {}) }] } : x
    ),
  };
}

/** Retire un effet. */
export const removeEffect = (c: CombatState, targetId: string, effectId: string): CombatState => ({
  ...c,
  combatants: c.combatants.map((x) => (x.id === targetId ? { ...x, effects: (x.effects ?? []).filter((e) => e.id !== effectId) } : x)),
});

/** La concentration de `source` s'arrête : ses effets de concentration disparaissent. */
export const dropConcentration = (c: CombatState, source: string): CombatState => ({
  ...c,
  combatants: c.combatants.map((x) => (x.effects?.some((e) => e.conc && e.source === source) ? { ...x, effects: x.effects.filter((e) => !(e.conc && e.source === source)) } : x)),
});

/** DD de la sauvegarde de concentration après `damage` dégâts : 10 ou la moitié des dégâts (30 au plus). */
export const concentrationDc = (damage: number) => Math.min(30, Math.max(10, Math.floor(damage / 2)));
