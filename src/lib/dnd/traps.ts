// Pièges de la carte : quand un pion finit son déplacement sur une case piégée (déplacement d'un joueur, ou tout
// déplacement pendant un combat), il fait un jet de sauvegarde contre le DD du piège et subit les dégâts (moitié si
// réussi selon le piège). Le piège devient visible (« déclenché »). = SQL combat_move (07_carte.sql).
import { companionHp } from './companions';
import type { Character } from '../types';
import { rollDice, type Rng } from '../dice';
import { hpOf } from '../templates';
import { ABILITIES } from './data';
import { monsterStatus, type CampaignSecrets, type CombatState, type TrapSecret } from './combat';
import { applyHpDelta, saveBonus, type Hp } from './rules';
import { normalizeSheet } from './sheet';
import { mapOf } from './grid';

/** Piège sans réglage du MJ. */
export const DEFAULT_TRAP: TrapSecret = { name: 'Piège', dc: 13, ability: 'dex', damage: '2d10', half: true };

/** Réglages d'un piège (ceux du MJ, sinon le piège par défaut). */
export const trapAt = (secrets: CampaignSecrets, key: string): TrapSecret => ({ ...DEFAULT_TRAP, ...(secrets.traps?.[key] ?? {}) });

/** Le déplacement déclenche-t-il les pièges ? Oui pour un joueur, et pour tous pendant un combat (pas quand le MJ place hors combat). */
export const trapsArmed = (combat: CombatState, isGM: boolean) => combat.active || !isGM;

export interface TrapOutcome {
  combat: CombatState;
  secrets: CampaignSecrets;
  /** PV du perso touché (absent pour un monstre). */
  hp?: { characterId: string; hp: Hp };
  /** Récit pour l'historique. */
  text: string;
}

/**
 * Déclenche le piège sous le combattant `id` s'il y en a un (sinon null). `rng(n)` donne un entier de 1 à n.
 */
export function springTrap(combat: CombatState, secrets: CampaignSecrets, characters: Character[], id: string, rng: Rng): TrapOutcome | null {
  const t = combat.combatants.find((x) => x.id === id);
  if (!t || t.x === undefined || t.y === undefined) return null;
  const key = `${t.x},${t.y}`;
  const m = mapOf(combat);
  if (m.cells?.[key] !== 'trap') return null;
  const trap = trapAt(secrets, key);
  const comp = t.companion;
  const ch = t.characterId && !comp ? characters.find((c) => c.id === t.characterId) : undefined;
  const sec = t.kind === 'monster' ? secrets.monsters[t.id] : undefined;
  const bonus = sec ? sec.saves?.[trap.ability] ?? 0 : comp ? comp.saves?.[trap.ability] ?? 0 : ch ? saveBonus(normalizeSheet(ch.sheet), trap.ability) : 0;
  const roll = rng(20) + bonus;
  const saved = roll >= trap.dc;
  const dmg = rollDice(trap.damage, rng).total;
  const amount = saved ? (trap.half ? Math.floor(dmg / 2) : 0) : dmg;
  const c: CombatState = { ...combat, map: { ...m, cells: { ...m.cells, [key]: 'trap-sprung' } } };
  const s = structuredClone(secrets);
  let hp: TrapOutcome['hp'];
  if (sec && amount > 0) {
    const ms = s.monsters[t.id];
    ms.hp = Math.max(0, ms.hp - amount);
    c.combatants = c.combatants.map((x) => (x.id === t.id ? { ...x, status: monsterStatus(ms.hp, ms.maxHp) } : x));
  } else if (comp && amount > 0) {
    c.combatants = c.combatants.map((x) => (x.id === t.id && x.companion ? { ...x, companion: { ...x.companion, hp: companionHp(x, -amount) } } : x));
  } else if (ch && amount > 0) hp = { characterId: ch.id, hp: applyHpDelta(hpOf(ch), -amount) };
  const ab = ABILITIES.find((a) => a.key === trap.ability)?.short ?? trap.ability.toUpperCase();
  const text = `🪤 ${trap.name} ! ${t.name} : sauvegarde ${ab} ${roll} contre DD ${trap.dc}, ${saved ? 'réussie' : 'ratée'} · ${amount} dégât${amount > 1 ? 's' : ''}`;
  return { combat: c, secrets: s, hp, text };
}
