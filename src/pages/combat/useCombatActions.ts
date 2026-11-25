// Exécution d'une action de combat (joueur pour son perso, MJ pour un monstre ou un PNJ) : jets, dépenses
// (emplacement, capacité, objet), résolution (store.combatAct : touché/raté, sauvegardes, PV), historique et notification.
import { useSession } from '../../data/session';
import { useToast } from '../../components/Toast';
import { rollDice, type DiceResult } from '../../lib/dice';
import type { Combatant } from '../../lib/dnd/combat';
import { atSlot, isWeaponAttack, type CombatAction } from '../../lib/dnd/combatActions';
import type { RollMode } from '../../lib/dnd/data';
import { describeResults, type ActPayload, type EconomyCost } from '../../lib/dnd/resolve';
import { d20Formula } from '../../lib/dnd/rules';
import type { DndSheet } from '../../lib/dnd/sheet';
import type { CombatCtx } from './useCombat';
import { effectsDice } from '../../lib/dnd/effects';

/** Valeur du d20 gardé (avantage/désavantage compris). */
const natural = (r: DiceResult) => {
  const g = r.groups[0];
  return g ? g.rolls.find((_, i) => g.kept[i]) ?? g.rolls[0] : 0;
};

/** Qui agit : un perso (avec sa fiche) ou un monstre (sans fiche). */
export interface ActorInfo {
  characterId?: string;
  sheet?: DndSheet;
  attacksPerAction: number;
}

export function useCombatActions(cx: CombatCtx, campaignId: string) {
  const { store } = useSession();
  const toast = useToast();

  /** `opportunity` : id de l'attaque d'opportunité jouée (payée avec la réaction). */
  const execute = async (actor: Combatant, who: ActorInfo, action: CombatAction, targets: Combatant[], mode: RollMode, slot?: number, opportunity?: string) => {
    const economy: EconomyCost = opportunity ? 'reaction' : isWeaponAttack(action) ? 'attack' : action.cost;
    const p: ActPayload = { kind: 'none', economy, attacksPerAction: who.attacksPerAction, targets: targets.map((t) => t.id), label: action.name, ...(opportunity ? { opportunity } : {}) };
    const exhaustion = who.sheet?.exhaustion ?? 0;
    let formula = '';
    let detail = '';
    let total = 0;

    if (action.effect === 'attack' && action.damage !== undefined) {
      const atk = rollDice(d20Formula(action.attackBonus ?? 0, mode, exhaustion) + effectsDice(actor, cx.combat.round, 'attack'));
      const nat = natural(atk);
      const dmg = rollDice(atSlot((nat === 20 ? action.critDamage : action.damage) || '0', action, slot));
      Object.assign(p, { kind: 'attack', total: atk.total, natural: nat, damage: Math.max(0, dmg.total) });
      formula = `${atk.formula} | ${dmg.formula}`;
      detail = `${atk.detail}${nat === 20 ? ' CRITIQUE' : nat === 1 ? ' échec critique' : ''} | dégâts ${dmg.detail}`;
      total = atk.total;
    } else if (action.effect === 'save' || action.effect === 'auto') {
      const dmg = rollDice(atSlot(action.damage || '0', action, slot));
      Object.assign(p, { kind: action.effect, damage: Math.max(0, dmg.total), dc: action.dc, ability: action.save, half: action.half });
      formula = dmg.formula;
      detail = `${action.effect === 'save' ? `DD ${action.dc} ${(action.save ?? '').toUpperCase()} · ` : ''}${dmg.detail}`;
      total = dmg.total;
    } else if (action.effect === 'heal' && action.heal) {
      const h = rollDice(atSlot(action.heal, action, slot));
      Object.assign(p, { kind: 'heal', heal: Math.max(0, h.total) });
      formula = h.formula;
      detail = h.detail;
      total = h.total;
    } else if (action.effect === 'buff' && action.buff) Object.assign(p, { kind: 'buff', effect: action.buff });
    else if (action.effect === 'extra-action') p.extraAction = true;
    if (action.damageType) p.damageType = action.damageType;
    if (action.dash) p.dash = true;
    if (action.disengage) p.disengage = true;
    if (action.dodge) p.dodge = true;
    if (action.help) p.help = true;

    // Objet : l'économie est vérifiée d'abord, puis use_item retire l'objet et soigne.
    const isItem = action.source === 'item';
    const results = await store.combatAct(campaignId, actor.id, isItem ? { ...p, kind: 'none', targets: [] } : p);
    if (isItem) {
      await store.useItem(action.sourceId, p.heal ?? 0, targets[0]?.characterId ?? who.characterId);
      results.push({ target: targets[0]?.id ?? actor.id, name: targets[0]?.name ?? actor.name, amount: p.heal ?? 0, kind: 'heal' });
    }

    // Dépenses liées à l'action (persos seulement)
    if (who.characterId && who.sheet) {
      if (action.source === 'spell' && (action.spellLevel ?? 0) > 0 && slot) await store.spendSlot(who.characterId, slot);
      if (action.source === 'spell') {
        const sp = who.sheet.spells.find((x) => x.id === action.sourceId);
        if (sp?.concentration) await store.patchSheet(who.characterId, { concentration: sp.name });
      }
      if (action.source === 'feature') await store.useFeature(who.characterId, action.sourceId);
    }

    // Historique + notification
    const lvl = slot && action.spellLevel && slot > action.spellLevel ? ` (niv. ${slot})` : '';
    const summary = results.length
      ? describeResults(results)
      : action.dash ? 'déplacement doublé' : action.disengage ? 'désengagé' : action.dodge ? 'esquive (désavantage contre lui)' : action.help ? `aide ${targets.map((t) => t.name).join(', ')} (avantage)` : action.effect === 'extra-action' ? 'action supplémentaire' : 'effectué';
    const name = opportunity ? `⚡ Attaque d’opportunité (${action.name})` : action.name;
    await store.addRoll({
      campaign_id: campaignId,
      author_name: actor.name,
      label: `${name}${lvl} → ${summary}`,
      formula: formula || '—',
      detail: detail || '—',
      total,
      secret: false,
      kind: 'roll',
    });
    toast(`⚔️ ${name} : ${summary}`, results.some((r) => r.kind === 'heal') ? 'gift' : undefined);
    cx.reload();
  };

  /** Ignore une attaque d'opportunité proposée. */
  const dismiss = (reactionId: string) => store.combatDismiss(campaignId, reactionId).then(cx.reload).catch((e: Error) => toast(e.message, 'error'));

  return { execute, dismiss };
}
