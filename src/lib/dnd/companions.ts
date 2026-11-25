// Compagnons et invocations (bête du rôdeur, familier, monture, créature invoquée) : modèles sur la fiche du perso
// (sheet.companions), pion sur la carte contrôlé par son joueur (Combatant.companion, PV publics). Le pion est rattaché
// au perso (characterId) mais ses PV, sa CA et ses attaques sont les siens. = SQL summon_companion (08_tours_compagnons.sql).
import type { Character } from '../types';
import type { Combatant, CombatState, MonsterAttack } from './combat';
import type { Defenses } from './damage';
import { mapOf, posOf } from './grid';
import { blocksMove } from './terrain';
import { uid } from '../ids';

/** Statistiques d'un compagnon (modèle sur la fiche, copié sur le pion). */
export interface CompanionStats {
  hp: number;
  maxHp: number;
  ac: number;
  /** Vitesse en mètres. */
  speed: number;
  attacks: MonsterAttack[];
  saves?: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>;
  /** Vision dans le noir (m). */
  darkvision?: number;
  defenses?: Defenses;
}

/** Compagnon enregistré sur la fiche. */
export interface CompanionDef extends CompanionStats {
  id: string;
  name: string;
  avatar: string;
}

const a = (name: string, bonus: number, damage: string, type: string, range = 1.5): MonsterAttack => ({ id: name.toLowerCase().replace(/\W+/g, '-'), name, bonus, damage, range, type });
const t = (name: string, avatar: string, hp: number, ac: number, speed: number, attacks: MonsterAttack[], darkvision = 0): Omit<CompanionDef, 'id'> => ({ name, avatar, hp, maxHp: hp, ac, speed, attacks, darkvision });

/** Modèles proposés (bêtes du SRD) : familiers, compagnons, montures. Le MJ peut ajuster PV, CA et attaques. */
export const COMPANION_TEMPLATES: Omit<CompanionDef, 'id'>[] = [
  t('Chat', '🐈', 2, 12, 12, [a('Griffes', 4, '1', 'tranchant')], 18),
  t('Hibou', '🦉', 1, 11, 18, [a('Serres', 3, '1', 'tranchant')], 36),
  t('Corbeau', '🐦‍⬛', 2, 12, 15, [a('Bec', 4, '1', 'perçant')]),
  t('Faucon', '🦅', 1, 13, 18, [a('Serres', 5, '1', 'tranchant')]),
  t('Araignée', '🕷️', 1, 12, 6, [a('Morsure', 4, '1', 'perçant')], 9),
  t('Loup', '🐺', 11, 12, 12, [a('Morsure', 4, '1d6+2', 'perçant')]),
  t('Panthère', '🐆', 13, 13, 15, [a('Griffes', 5, '1d6+3', 'tranchant')], 18),
  t('Sanglier', '🐗', 13, 11, 12, [a('Défense', 3, '1d6+1', 'perçant')]),
  t('Ours brun', '🐻', 22, 11, 12, [a('Morsure', 5, '1d8+3', 'perçant'), a('Griffes', 5, '1d6+3', 'tranchant')]),
  t('Cheval de selle', '🐎', 13, 11, 18, [a('Sabots', 4, '1d8+2', 'contondant')]),
  t('Esprit invoqué', '👻', 30, 13, 9, [a('Frappe spectrale', 5, '1d8+3', 'force')], 18),
];

/** Nouveau compagnon pour la fiche à partir d'un modèle. */
export const companionFrom = (tpl: Omit<CompanionDef, 'id'>): CompanionDef => ({ ...structuredClone(tpl), id: uid() });

/** Pion du compagnon déjà sur la carte (s'il y est). */
export const companionToken = (c: CombatState, characterId: string, companionId: string) =>
  c.combatants.find((x) => x.characterId === characterId && x.companion && x.companionOf === companionId);

/** Case libre la plus proche de (x0, y0) (ni mur ni pion), en tournant autour. */
export function nearestFree(c: CombatState, x0: number, y0: number): { x: number; y: number } {
  const { cols, rows, cells = {} } = mapOf(c);
  const taken = new Set(c.combatants.map((x) => `${posOf(x).x},${posOf(x).y}`));
  for (let r = 1; r < Math.max(cols, rows); r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const x = x0 + dx;
        const y = y0 + dy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || x < 0 || y < 0 || x >= cols || y >= rows) continue;
        if (!taken.has(`${x},${y}`) && !blocksMove(cells[`${x},${y}`])) return { x, y };
      }
  return { x: x0, y: y0 };
}

/** Fait venir un compagnon de la fiche sur la carte, à côté de son maître (juste après lui dans l'ordre d'initiative). */
export function summonCompanion(c: CombatState, ch: Character, def: CompanionDef): CombatState {
  if (companionToken(c, ch.id, def.id)) throw new Error(`${def.name} est déjà sur la carte`);
  const owner = c.combatants.find((x) => x.characterId === ch.id && !x.companion);
  const near = owner ? posOf(owner) : { x: 1, y: 1 };
  const pos = nearestFree(c, near.x, near.y);
  const { id: _i, name, avatar, ...stats } = def;
  const token: Combatant = {
    id: uid(), name, avatar, kind: 'pc', characterId: ch.id, companionOf: def.id, initiative: owner?.initiative ?? null, initBonus: (owner?.initBonus ?? 0) - 1,
    conditions: [], ...pos, companion: { ...stats, hp: stats.maxHp },
  };
  return { ...c, combatants: [...c.combatants, token] };
}

/** Renvoie un compagnon (le pion quitte la carte). */
export const dismissCompanion = (c: CombatState, tokenId: string): CombatState => ({ ...c, combatants: c.combatants.filter((x) => !(x.id === tokenId && x.companion)) });

/** PV d'un pion de compagnon après dégâts (négatif) ou soins (positif). */
export const companionHp = (x: Combatant, delta: number) => Math.max(0, Math.min(x.companion!.maxHp, x.companion!.hp + delta));
