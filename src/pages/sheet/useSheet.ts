// Hook de la fiche D&D : données normalisées, droits, enregistrement et jets (avec avantage/désavantage).
import { useCallback, useState } from 'react';
import { useSession } from '../../data/session';
import type { CampaignView } from '../../data/useCampaign';
import { useRoller } from '../../data/useRoller';
import { useToast } from '../../components/Toast';
import type { Ability } from '../../lib/dnd/data';
import { autoMode, modeTag, type D20Kind } from '../../lib/dnd/advantage';
import { d20Formula, exhaustionPenalty, fmtBonus } from '../../lib/dnd/rules';
import { normalizeSheet, type DndSheet } from '../../lib/dnd/sheet';
import { hpOf } from '../../lib/templates';
import type { Character } from '../../lib/types';

export type ListKey = 'attacks' | 'features' | 'spells';

export interface SheetCtx {
  view: CampaignView;
  c: Character;
  s: DndSheet;
  hp: ReturnType<typeof hpOf>;
  can: { id: boolean; stats: boolean; hp: boolean; inv: boolean };
  /** L'utilisateur est le MJ (lui seul donne sorts, capacités, objets, pièces, PV). */
  gm: boolean;
  /** Mode « modifier » : champs éditables au lieu de boutons de jet. */
  editing: boolean;
  setEditing: (v: boolean) => void;
  /** Enregistre des champs de la fiche. */
  patch: (p: Partial<DndSheet>) => void;
  /** Test d20 : avantage/désavantage automatiques (états, MJ) et épuisement compris. */
  rollD20: (label: string, bonus: number, kind?: D20Kind, ability?: Ability) => void;
  /** Jet libre (dégâts, dé de vie…). Renvoie le total (null en mode vrais dés, sauf `always`). */
  roll: (label: string, formula: string, always?: boolean) => Promise<number | null>;
  /** Le MJ a choisi les vrais dés : pas de jets ni de sorts dans l'historique depuis la fiche d'un joueur. */
  realDice: boolean;
  /** Ajoute ou remplace un élément (même id) dans une liste de la fiche. */
  saveIn: <K extends ListKey>(key: K, item: DndSheet[K][number]) => void;
  /** Retire un élément d'une liste de la fiche. */
  removeIn: (key: ListKey, id: string) => void;
  fail: (e: Error) => void;
}

export function useSheet(view: CampaignView, c: Character): SheetCtx {
  const { store } = useSession();
  const toast = useToast();
  const roller = useRoller(view);
  const [editing, setEditing] = useState(false);
  const s = normalizeSheet(c.sheet);
  const fail = useCallback((e: Error) => toast(e.message, 'error'), [toast]);

  const patch = (p: Partial<DndSheet>) => {
    store.patchSheet(c.id, p).then(view.reload).catch(fail);
  };

  // Vrais dés (réglage du MJ) : les jets du joueur depuis sa fiche ne sont pas lancés, on rappelle juste quoi lancer.
  const realDice = !view.isGM && !!view.data?.campaign.settings.realDice;

  const rollD20 = (label: string, bonus: number, kind: D20Kind = 'check', ability?: Ability) => {
    const a = autoMode({ kind, ability, self: s.conditions, grant: s.grant });
    const f = d20Formula(bonus, a.mode, s.exhaustion);
    if (realDice) {
      const total = bonus + exhaustionPenalty(s);
      const die = a.mode === 'adv' ? '2d20, garde le meilleur,' : a.mode === 'dis' ? '2d20, garde le pire,' : '1d20';
      return toast(`🎲 ${label} : lance ${die}${total ? ` ${fmtBonus(total)}` : ''}`);
    }
    roller(f, { label: label + modeTag(a), author: c.name });
  };

  const roll = async (label: string, formula: string, always = false) => {
    if (realDice && !always) {
      toast(`🎲 ${label} : lance ${formula}`);
      return null;
    }
    const r = await roller(formula, { label, author: c.name });
    return r ? r.total : null;
  };

  const saveIn = <K extends ListKey>(key: K, item: DndSheet[K][number]) => {
    const list = s[key] as { id: string }[];
    const next = list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
    patch({ [key]: next } as Partial<DndSheet>);
  };

  const removeIn = (key: ListKey, id: string) => {
    patch({ [key]: (s[key] as { id: string }[]).filter((x) => x.id !== id) } as Partial<DndSheet>);
  };

  return {
    view,
    c,
    s,
    hp: hpOf(c),
    can: {
      id: view.can(c, 'identity'),
      stats: view.can(c, 'stats'),
      hp: view.can(c, 'resources'),
      inv: view.can(c, 'inventory'),
    },
    gm: view.isGM,
    editing,
    setEditing,
    patch,
    rollD20,
    roll,
    realDice,
    saveIn,
    removeIn,
    fail,
  };
}
