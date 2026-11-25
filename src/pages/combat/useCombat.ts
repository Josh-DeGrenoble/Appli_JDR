// Hook du combat : état public + secrets du MJ, et toutes les actions (ajouter, initiative, tours, PV des monstres).
import { useSession } from '../../data/session';
import type { CampaignView } from '../../data/useCampaign';
import { useRoller } from '../../data/useRoller';
import { useToast } from '../../components/Toast';
import {
  clearBoard, currentCombatant, endCombat, monsterStatus, nextTurn, normalizeCombat, numberedNames, previousTurn, removeCombatant,
  sortedCombatants, startCombat, upsertCombatant, type CampaignSecrets, type CellKind, type Combatant, type CombatState, type MonsterSecret, type TrapSecret,
} from '../../lib/dnd/combat';
import { rollDice } from '../../lib/dice';
import { d20Formula, initiative } from '../../lib/dnd/rules';
import { normalizeSheet } from '../../lib/dnd/sheet';
import { uid } from '../../lib/ids';
import { freeCell, mapOf } from '../../lib/dnd/grid';
import { logEvent } from '../../data/actions';

export interface NewMonster {
  name: string;
  count: number;
  hp: number;
  ac: number;
  initBonus: number;
  avatar: string;
  /** Bonus de sauvegarde (FOR, DEX, CON, INT, SAG, CHA) pour les sorts à sauvegarde des joueurs. */
  saves?: MonsterSecret['saves'];
  attacks?: MonsterSecret['attacks'];
  multiattack?: number;
  speed?: number;
  /** Cachés aux joueurs (embuscade) jusqu'à ce que le MJ les révèle. */
  hidden?: boolean;
  /** Résistances, immunités, vulnérabilités. */
  defenses?: MonsterSecret['defenses'];
}

export function useCombat(view: CampaignView) {
  const { store, user } = useSession();
  const toast = useToast();
  const roller = useRoller(view);
  const data = view.data!;
  const campaignId = data.campaign.id;
  const combat = normalizeCombat(data.campaign.combat);
  const secrets: CampaignSecrets = { monsters: {}, ...(data.secrets ?? {}) };
  const order = sortedCombatants(combat);
  const current = currentCombatant(combat);
  const fail = (e: Error) => toast(e.message, 'error');

  /**
   * Applique une modification à partir de l'état le plus récent (relu en base) : évite d'écraser
   * une modification précédente quand le MJ enchaîne les actions rapidement.
   */
  const mutate = async (fn: (c: CombatState, s: CampaignSecrets) => { combat?: CombatState; secrets?: CampaignSecrets }) => {
    try {
      const d = await store.loadCampaign(campaignId);
      const r = fn(normalizeCombat(d.campaign.combat), { monsters: {}, ...(d.secrets ?? {}) });
      if (r.secrets) await store.saveSecrets(campaignId, r.secrets);
      if (r.combat) await store.updateCampaign(campaignId, { combat: r.combat });
      view.reload();
      return r.combat;
    } catch (e) {
      fail(e as Error);
      return undefined;
    }
  };
  /** Nom du combattant actif pour l'historique (« un adversaire » s'il est caché). */
  const who = (c: CombatState) => { const x = currentCombatant(c); return !x ? '?' : x.hidden ? 'un adversaire' : x.name; };
  const log = (text: string, secret = false) => logEvent(store, campaignId, text, 'MJ', secret);

  /** Ajoute des persos de la campagne (bonus d'initiative tiré de leur fiche). */
  const addCharacters = (ids: string[]) =>
    mutate((c) => {
      for (const id of ids) {
        const ch = data.characters.find((x) => x.id === id);
        if (!ch || c.combatants.some((x) => x.characterId === id)) continue;
        const sh = normalizeSheet(ch.sheet);
        const pos = freeCell(c, 1, 2, 1); // persos à gauche de la carte
        c = upsertCombatant(c, { id: uid(), name: ch.name, kind: 'pc', characterId: ch.id, avatar: ch.avatar, initiative: null, initBonus: initiative(sh), conditions: [], ...pos });
      }
      return { combat: c };
    });

  /** Ajoute un ou plusieurs monstres identiques (numérotés), avec leurs PV secrets. */
  const addMonsters = (m: NewMonster) =>
    mutate((c, sec) => {
      const names = numberedNames(m.name.trim() || 'Monstre', Math.max(1, m.count), c.combatants.map((x) => x.name));
      const monsters = { ...sec.monsters };
      for (const name of names) {
        const id = uid();
        const pos = freeCell(c, mapOf(c).cols - 2, 2, -1); // monstres à droite
        c = upsertCombatant(c, { id, name, kind: 'monster', avatar: m.avatar || '👹', initiative: null, initBonus: m.initBonus, status: 'indemne', conditions: [], ...(m.hidden ? { hidden: true } : {}), ...pos });
        monsters[id] = { hp: m.hp, maxHp: m.hp, ac: m.ac, notes: '', saves: m.saves, attacks: m.attacks ?? [], multiattack: m.multiattack ?? 1, speed: m.speed ?? 9, ...(m.defenses ? { defenses: m.defenses } : {}) };
      }
      return { combat: c, secrets: { ...sec, monsters } };
    });

  /** MJ : lance l'initiative de ceux qui n'en ont pas (monstres seuls, ou tous), sans encombrer le fil des dés. */
  const rollMissing = (onlyMonsters = false) =>
    mutate((c) => ({
      combat: {
        ...c,
        combatants: c.combatants.map((x) =>
          x.initiative === null && (!onlyMonsters || x.kind === 'monster') ? { ...x, initiative: rollDice(d20Formula(x.initBonus)).total } : x
        ),
      },
    }));

  /** Joueur : lance l'initiative de son perso (publiée dans le fil des dés). */
  const rollMine = async (x: Combatant) => {
    const ch = data.characters.find((c) => c.id === x.characterId);
    const bonus = ch ? initiative(normalizeSheet(ch.sheet)) : x.initBonus;
    const r = await roller(d20Formula(bonus), { label: 'Initiative', author: x.name });
    if (r) await store.setInitiative(campaignId, x.id, r.total).then(view.reload).catch(fail);
  };

  const setInit = (x: Combatant, value: number) => store.setInitiative(campaignId, x.id, value).then(view.reload).catch(fail);

  /** PV d'un monstre (secret) et son état visible. */
  const adjustMonster = (x: Combatant, delta: number) =>
    mutate((c, sec) => {
      const m: MonsterSecret = sec.monsters[x.id] ?? { hp: 0, maxHp: 0, ac: 10, notes: '' };
      const hp = Math.max(0, Math.min(m.maxHp || Infinity, m.hp + delta));
      const cur = c.combatants.find((y) => y.id === x.id);
      const status = monsterStatus(hp, m.maxHp);
      return {
        secrets: { ...sec, monsters: { ...sec.monsters, [x.id]: { ...m, hp } } },
        combat: cur && cur.status !== status ? upsertCombatant(c, { ...cur, status }) : undefined,
      };
    }).then(() => log(delta < 0 ? `💥 ${x.name} subit ${-delta} dégâts (MJ)` : `✨ ${x.name} récupère ${delta} PV (MJ)`, true));

  const updateMonster = (id: string, patch: Partial<MonsterSecret>) =>
    mutate((_c, sec) => ({
      secrets: { ...sec, monsters: { ...sec.monsters, [id]: { ...(sec.monsters[id] ?? { hp: 0, maxHp: 0, ac: 10, notes: '' }), ...patch } } },
    }));

  const toggleCondition = (x: Combatant, key: string) =>
    mutate((c) => {
      const cur = c.combatants.find((y) => y.id === x.id);
      if (!cur) return {};
      const conditions = cur.conditions.includes(key) ? cur.conditions.filter((k) => k !== key) : [...cur.conditions, key];
      return { combat: upsertCombatant(c, { ...cur, conditions }) };
    });

  return {
    combat,
    order,
    current,
    secrets,
    isGM: view.isGM,
    myIds: new Set(data.characters.filter((c) => c.owner_id === user?.id).map((c) => c.id)),
    addCharacters,
    addMonsters,
    rollMissing,
    rollMine,
    setInit,
    adjustMonster,
    updateMonster,
    toggleCondition,
    start: () =>
      mutate((c) => ({ combat: startCombat(c) })).then((c) => c && log(`⚔️ Début du combat · tour de ${who(c)}`)),
    next: () =>
      mutate((c) => ({ combat: nextTurn(c) })).then((c) => c && log(`▶ Round ${c.round} · tour de ${who(c)}`)),
    previous: () => mutate((c) => ({ combat: previousTurn(c) })),
    /** Joueur : finit le tour de son perso (le suivant reçoit « C'est ton tour »). */
    endTurn: () =>
      store
        .endTurn(campaignId)
        .then(() => store.loadCampaign(campaignId))
        .then((d) => {
          const c = normalizeCombat(d.campaign.combat);
          view.reload();
          return log(`▶ Round ${c.round} · tour de ${who(c)}`);
        })
        .catch(fail),
    /** MJ : prépare un combat (les joueurs lancent leur initiative). */
    prepare: () => mutate((c) => ({ combat: { ...c, prep: true } })).then((c) => c && log('⚔️ Le MJ prépare un combat : lancez l’initiative')),
    /** Fin du combat : la carte et les pions restent pour l'exploration. */
    end: () => mutate((c) => ({ combat: endCombat(c) })).then(() => log('🏁 Fin du combat')),
    /** Retire tous les pions (garde la taille, le décor et l'image de la carte). */
    clearBoard: () => mutate((c) => ({ combat: clearBoard(c) })),
    remove: (x: Combatant) => mutate((c) => ({ combat: removeCombatant(c, x.id) })),
    /** Déplace un combattant (MJ : libre ; joueur : son perso, pendant son tour, selon sa vitesse). */
    move: (id: string, x: number, y: number) =>
      store
        .combatMove(campaignId, id, x, y)
        .then((trap) => {
          view.reload();
          if (trap) (toast(trap, 'hurt'), log(trap));
        })
        .catch(fail),
    /** MJ : règle un piège de la carte affichée (null = réglage par défaut). */
    setTrap: (key: string, t: TrapSecret | null) =>
      mutate((_c, s) => {
        const traps = { ...(s.traps ?? {}) };
        if (t) traps[key] = t;
        else delete traps[key];
        return { secrets: { ...s, traps } };
      }),
    traps: secrets.traps ?? {},
    /** MJ : taille de la carte en cases. */
    setMapSize: (cols: number, rows: number) => mutate((c) => ({ combat: { ...c, map: { ...mapOf(c), cols, rows } } })),
    /** MJ : peint (ou efface avec null) des cases : mur, terrain difficile. */
    paint: (keys: string[], kind: CellKind | null) =>
      mutate((c) => {
        const cells = { ...(mapOf(c).cells ?? {}) };
        for (const k of keys) {
          if (kind) cells[k] = kind;
          else delete cells[k];
        }
        return { combat: { ...c, map: { ...mapOf(c), cells } } };
      }),
    /** Ouvre ou ferme une porte (MJ ; joueur avec un perso au contact). */
    toggleDoor: (x: number, y: number) => store.toggleDoor(campaignId, x, y).then(view.reload).catch(fail),
    /** MJ : brouillard de guerre (et distance de vue en mètres). */
    setFog: (fog: boolean, sight?: number) => mutate((c) => ({ combat: { ...c, map: { ...mapOf(c), fog, ...(sight !== undefined ? { sight } : {}) } } })),
    /** MJ : obscurité (les joueurs voient la lumière et leur vision dans le noir). */
    setDark: (dark: boolean) => mutate((c) => ({ combat: { ...c, map: { ...mapOf(c), dark } } })),
    /** MJ : cache ou montre un pion aux joueurs. */
    setHidden: (x: Combatant, hidden: boolean) =>
      mutate((c) => {
        const cur = c.combatants.find((y) => y.id === x.id);
        return cur ? { combat: upsertCombatant(c, { ...cur, hidden }) } : {};
      }),
    /** MJ : image de fond (data URL compressée) ou null pour la retirer. */
    setBackground: async (dataUrl: string | null) => {
      try {
        const bg = await store.saveMapImage(campaignId, dataUrl);
        await mutate((c) => ({ combat: { ...c, map: { ...mapOf(c), bg: bg ?? undefined } } }));
      } catch (e) {
        fail(e as Error);
      }
    },
    reload: view.reload,
    /** Modification brute (relue en base) : pour les plans enregistrés (useScenes). */
    mutate,
  };
}

export type CombatCtx = ReturnType<typeof useCombat>;

/** Ce dont la carte a besoin : la carte affichée (useCombat) ou un plan en préparation (useSceneDraft). */
export type MapCtx = Pick<CombatCtx, 'combat' | 'current' | 'isGM' | 'move' | 'paint' | 'toggleDoor' | 'clearBoard' | 'setBackground' | 'setFog' | 'setDark' | 'setMapSize'> & {
  /** Clé de l'image de fond ('current' = carte affichée, sinon id du plan). */
  imageKey?: string;
  /** Plan en préparation (invisible des joueurs). */
  draft?: boolean;
  /** Réglages des pièges (carte affichée seulement). */
  traps?: Record<string, TrapSecret>;
  setTrap?: CombatCtx['setTrap'];
};
