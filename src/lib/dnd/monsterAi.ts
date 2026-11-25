// Suggestion pour le tour d'un monstre (le MJ valide ou choisit autre chose) : l'ennemi debout le plus proche qu'une
// de ses attaques peut viser, en essayant les attaques dans l'ordre (souvent le corps à corps d'abord).
import type { Combatant, CombatState } from './combat';
import type { CombatAction } from './combatActions';
import { distance, fmtDistance } from './grid';

export interface Suggestion {
  action: CombatAction;
  target: Combatant;
  /** « contact », « 9 m »… */
  dist: string;
}

/**
 * `canTarget(action, cible)` : portée et ligne de vue (ActionsPanel.targetable) ; `alive(x)` : cible encore debout.
 */
export function suggestMonster(combat: CombatState, actor: Combatant, actions: CombatAction[], canTarget: (a: CombatAction, x: Combatant) => boolean, alive: (x: Combatant) => boolean): Suggestion | null {
  const usable = actions.filter((a) => (a.effect === 'attack' || a.effect === 'save') && !a.shape);
  const foes = combat.combatants.filter((x) => x.kind !== actor.kind && x.id !== actor.id && alive(x)).sort((a, b) => distance(actor, a) - distance(actor, b));
  for (const target of foes)
    for (const action of usable) if (canTarget(action, target)) return { action, target, dist: fmtDistance(distance(actor, target)) };
  return null;
}
