// Hook de lancer de dés : calcule, publie dans le fil de la campagne, notifie.
import { cleanLabel } from '../lib/dnd/requests';
import { useCallback } from 'react';
import { DiceError, rollDice } from '../lib/dice';
import type { Roll } from '../lib/types';
import { useToast } from '../components/Toast';
import { useSession } from './session';
import type { CampaignView } from './useCampaign';

/** Lance des dés, publie le résultat dans le fil de la campagne et l'affiche en notification. */
export function useRoller(view: CampaignView) {
  const { store, user } = useSession();
  const toast = useToast();
  return useCallback(
    async (formula: string, opts: { label?: string; author?: string; secret?: boolean } = {}): Promise<Roll | null> => {
      if (!view.data || !user) return null;
      try {
        const r = rollDice(formula);
        const me = view.data.members.find((m) => m.user_id === user.id);
        const roll = await store.addRoll({
          campaign_id: view.data.campaign.id,
          author_name: opts.author || me?.display_name || user.name,
          label: opts.label ?? '',
          formula: r.formula,
          detail: r.detail,
          total: r.total,
          secret: !!opts.secret,
        });
        toast(`🎲 ${opts.label ? cleanLabel(opts.label) + ' : ' : ''}${r.total}  (${r.formula})`);
        view.reload();
        return roll;
      } catch (e) {
        toast(e instanceof DiceError ? e.message : (e as Error).message, 'error');
        return null;
      }
    },
    [store, user, view, toast]
  );
}
