// Résolution d'une action de combat : vérifie le tour et l'économie d'actions, compare aux CA/sauvegardes
// (secrètes pour les monstres), applique dégâts ou soins. Utilisée telle quelle par le mode démo ;
// le mode en ligne fait le même calcul côté serveur (supabase/migrations/09_combat.sql, combat_act) :
// effets temporaires (CA, dés de sauvegarde, résistances), types de dégâts, sauvegarde de concentration.
import { companionHp } from './companions';
import { concentrationAdvantage } from './feats';
import { FRESH_ECONOMY, currentCombatant, monsterStatus, type CampaignSecrets, type Combatant, type CombatState, type Economy } from './combat';
import { addEffect, checkEffect, concentrationDc, dropConcentration, effectsAc, effectsDice, effectsResist, type EffectInput } from './effects';
import { adjustDamage, mergeDefenses } from './damage';
import { rollDice } from '../dice';
import type { Ability } from './data';
import { applyHpDelta, saveBonus } from './rules';
import { normalizeSheet, type DndSheet } from './sheet';
import type { Character } from '../types';
import { hpOf } from '../templates';

export type EconomyCost = 'attack' | 'action' | 'bonus' | 'reaction' | 'free';

export interface ActPayload {
  kind: 'attack' | 'save' | 'auto' | 'heal' | 'buff' | 'none';
  /** Type de dégâts (feu, tranchant…) pour les résistances. */
  damageType?: string;
  /** Effet posé sur les cibles (kind 'buff' : Bénédiction, Bouclier, Rage…). */
  effect?: EffectInput;
  economy: EconomyCost;
  attacksPerAction?: number;
  targets: string[];
  label: string;
  total?: number;
  natural?: number;
  damage?: number;
  dc?: number;
  ability?: Ability;
  half?: boolean;
  heal?: number;
  /** Fougue (Action Surge) : récupère l'action du tour. */
  extraAction?: boolean;
  /** Foncer : double le déplacement du tour. */
  dash?: boolean;
  /** Se désengager : pas d'attaque d'opportunité ce tour. */
  disengage?: boolean;
  /** Esquiver : désavantage aux attaques contre soi jusqu'à son prochain tour. */
  dodge?: boolean;
  /** Aider : les cibles (alliés) ont l'avantage à leur prochaine attaque. */
  help?: boolean;
  /** Attaque d'opportunité jouée (id de la réaction en attente, retirée après coup). */
  opportunity?: string;
}

export interface ActResult {
  target: string;
  name: string;
  hit?: boolean;
  saved?: boolean;
  /** Jet de sauvegarde de la cible (d20 + bonus). */
  roll?: number;
  amount: number;
  kind: 'damage' | 'heal' | 'buff' | 'none';
  /** Résistance, immunité ou vulnérabilité appliquée. */
  note?: string;
  /** Sauvegarde de concentration de la cible (perso concentré qui prend des dégâts). */
  conc?: { dc: number; roll?: number; kept: boolean };
  /** Effet posé (kind 'buff'). */
  effect?: string;
}

export interface CombatWorld {
  combat: CombatState;
  secrets: CampaignSecrets;
  characters: Character[];
}

/** Applique le coût sur l'économie du tour (erreur si plus disponible). */
export function payEconomy(used: Economy, cost: EconomyCost, attacksPerAction = 1): Economy {
  if (cost === 'free') return used;
  if (cost === 'attack') {
    if (used.attacks > 0) {
      if (used.attacks >= attacksPerAction) throw new Error('Plus d’attaque disponible ce tour');
      return { ...used, attacks: used.attacks + 1 };
    }
    if (used.action >= 1) throw new Error('Action déjà utilisée ce tour');
    return { ...used, action: 1, attacks: 1 };
  }
  if (used[cost] >= 1) throw new Error(cost === 'bonus' ? 'Action bonus déjà utilisée' : cost === 'reaction' ? 'Réaction déjà utilisée' : 'Action déjà utilisée ce tour');
  return { ...used, [cost]: used[cost] + 1 };
}

/**
 * Résout une action. `rng(20)` sert aux sauvegardes des cibles.
 * Renvoie le nouvel état (combat, secrets, PV des persos) et le détail par cible.
 */
export function resolveAction(world: CombatWorld, actorId: string, p: ActPayload, isGM: boolean, rng: (n: number) => number) {
  let combat = structuredClone(world.combat);
  const secrets = structuredClone(world.secrets);
  const hp = new Map<string, ReturnType<typeof hpOf>>();
  const sheets = new Map<string, Partial<DndSheet>>();
  const round = Math.max(1, world.combat.round);
  const extra = (x: Combatant) => {
    const d = effectsDice(x, round, 'saves');
    return d ? rollDice(`0${d}`, rng).total : 0;
  };
  const actor = combat.combatants.find((x) => x.id === actorId);
  if (!actor) throw new Error('Combattant introuvable');
  if (!combat.active) throw new Error('Le combat n’a pas commencé');
  const isTurn = currentCombatant(combat)?.id === actorId;
  if (!isGM && !isTurn && p.economy !== 'reaction' && p.economy !== 'free') throw new Error('Ce n’est pas ton tour');

  const actorCh = actor.characterId ? world.characters.find((c) => c.id === actor.characterId) : undefined;
  if (actor.companion ? actor.companion.hp <= 0 : actorCh && hpOf(actorCh).max > 0 && hpOf(actorCh).current <= 0) throw new Error('À terre (0 PV) : plus d’action possible');
  let used = payEconomy(actor.used ?? { ...FRESH_ECONOMY }, p.economy, p.attacksPerAction);
  if (p.extraAction) used = { ...used, action: 0, attacks: 0 };
  if (p.dash) used = { ...used, dash: 1 };
  if (p.disengage) used = { ...used, disengage: 1 };
  if (p.dodge) used = { ...used, dodge: 1 };
  actor.used = used;
  if (p.kind === 'attack' && actor.helped) delete actor.helped; // l'aide est consommée par l'attaque
  if (p.help) for (const t of combat.combatants) if (p.targets.includes(t.id) && t.id !== actor.id) t.helped = true;
  if (p.opportunity) combat.reactions = (combat.reactions ?? []).filter((r) => r.id !== p.opportunity);

  /** PV d'un compagnon (sur son pion) ; à 0, il est « vaincu ». */
  const setCompanionHp = (id: string, delta: number) => {
    combat = { ...combat, combatants: combat.combatants.map((x) => (x.id === id && x.companion ? { ...x, companion: { ...x.companion, hp: companionHp(x, delta) }, status: companionHp(x, delta) <= 0 ? 'vaincu' : undefined } : x)) };
  };
  const results: ActResult[] = [];
  if (p.kind === 'buff') {
    if (!p.effect) throw new Error('Effet manquant');
    checkEffect(p.effect);
    combat = addEffect(combat, p.targets, p.effect, actor.id);
    for (const t of combat.combatants.filter((x) => p.targets.includes(x.id)))
      results.push({ target: t.id, name: t.name, amount: 0, kind: 'buff', effect: `${p.effect.icon} ${p.effect.name}` });
    return { combat, secrets, hp, results, sheets };
  }
  for (const tid of p.targets) {
    const t = combat.combatants.find((x) => x.id === tid);
    if (!t) continue;
    // Compagnon : ses propres statistiques (le perso rattaché n'est pas touché)
    const comp = t.companion;
    const ch = t.characterId && !comp ? world.characters.find((c) => c.id === t.characterId) : undefined;
    const sec = t.kind === 'monster' ? secrets.monsters[t.id] : undefined;
    const sheet = ch ? normalizeSheet(ch.sheet) : null;
    let amount = 0;
    const r: ActResult = { target: t.id, name: t.name, amount: 0, kind: 'none' };

    if (p.kind === 'attack') {
      const ac = (sec ? sec.ac : comp ? comp.ac : sheet ? sheet.ac : 10) + effectsAc(t, round);
      r.hit = p.natural === 20 || (p.natural !== 1 && (p.total ?? 0) >= ac);
      amount = r.hit ? p.damage ?? 0 : 0;
    } else if (p.kind === 'save') {
      const ab = p.ability ?? 'dex';
      const bonus = sec ? sec.saves?.[ab] ?? 0 : comp ? comp.saves?.[ab] ?? 0 : sheet ? saveBonus(sheet, ab) : 0;
      r.roll = rng(20) + bonus + extra(t);
      r.saved = r.roll >= (p.dc ?? 10);
      amount = r.saved ? (p.half ? Math.floor((p.damage ?? 0) / 2) : 0) : p.damage ?? 0;
    } else if (p.kind === 'auto') amount = p.damage ?? 0;

    if (p.kind === 'heal') {
      r.kind = 'heal';
      r.amount = p.heal ?? 0;
      if (sec) sec.hp = Math.min(sec.maxHp || Infinity, sec.hp + r.amount);
      else if (comp) setCompanionHp(t.id, r.amount);
      else if (ch) hp.set(ch.id, applyHpDelta(hp.get(ch.id) ?? hpOf(ch), r.amount));
    } else if (amount > 0) {
      const adj = adjustDamage(amount, p.damageType, mergeDefenses(sec?.defenses ?? comp?.defenses ?? sheet?.defenses, { resist: effectsResist(t, round) }));
      amount = adj.amount;
      if (adj.note) r.note = adj.note;
    }
    if (p.kind !== 'heal' && amount > 0) {
      r.kind = 'damage';
      r.amount = amount;
      if (sec) sec.hp = Math.max(0, sec.hp - amount);
      else if (comp) setCompanionHp(t.id, -amount);
      else if (ch && sheet) {
        const after = applyHpDelta(hp.get(ch.id) ?? hpOf(ch), -amount);
        hp.set(ch.id, after);
        // Concentration : à 0 PV elle s'arrête ; sinon sauvegarde de CON (DD 10 ou moitié des dégâts)
        if (sheet.concentration) {
          const dc = concentrationDc(amount);
          const d20 = concentrationAdvantage(sheet) ? Math.max(rng(20), rng(20)) : rng(20); // Mage de guerre : avantage
          const roll = after.current > 0 ? d20 + saveBonus(sheet, 'con') + extra(t) : undefined;
          const kept = roll !== undefined && roll >= dc;
          r.conc = { dc, ...(roll !== undefined ? { roll } : {}), kept };
          if (!kept) {
            sheets.set(ch.id, { concentration: '' });
            combat = dropConcentration(combat, t.id);
          }
        }
      }
    }
    if (sec) {
      const live = combat.combatants.find((x) => x.id === t.id)!;
      live.status = monsterStatus(sec.hp, sec.maxHp);
    }
    results.push(r);
  }
  return { combat, secrets, hp, results, sheets };
}

/** Phrase de résumé pour le fil des dés : « Gobelin 1 : touché, 8 dégâts ; Gobelin 2 : raté ». */
export function describeResults(results: ActResult[]): string {
  return results
    .map((r) => {
      if (r.kind === 'heal') return `${r.name} : +${r.amount} PV`;
      if (r.kind === 'buff') return `${r.name} : ${r.effect}`;
      const note = r.note ? ` (${r.note})` : '';
      const conc = r.conc ? (r.conc.kept ? ` · garde sa concentration (${r.conc.roll} / DD ${r.conc.dc})` : ` · perd sa concentration${r.conc.roll !== undefined ? ` (${r.conc.roll} / DD ${r.conc.dc})` : ''}`) : '';
      if (r.hit === false) return `${r.name} : raté`;
      const roll = r.roll !== undefined ? ` (${r.roll})` : '';
      const save = r.saved === undefined ? '' : r.saved ? `sauvegarde réussie${roll}, ` : `sauvegarde ratée${roll}, `;
      return `${r.name} : ${r.hit ? 'touché, ' : ''}${save}${r.amount} dégâts${note}${conc}`;
    })
    .join(' ; ');
}

export { applyMove } from './movement';
