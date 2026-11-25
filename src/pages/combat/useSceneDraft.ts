// Plan en préparation (MJ) : mêmes outils que la carte affichée (décor, portes, image, taille, brouillard, monstres),
// mais tout est écrit dans le plan enregistré (secrets du MJ) : les joueurs ne voient rien avant « Ouvrir ».
import { useSession } from '../../data/session';
import { useToast } from '../../components/Toast';
import { normalizeCombat, numberedNames, type CampaignSecrets, type CellKind, type Scene, type TrapSecret } from '../../lib/dnd/combat';
import { freeCell, mapOf, posOf } from '../../lib/dnd/grid';
import { blocksMove } from '../../lib/dnd/terrain';
import { uid } from '../../lib/ids';
import type { CombatCtx, MapCtx, NewMonster } from './useCombat';

/** Nouveau plan vide, prêt à préparer. */
export const blankScene = (name = 'Nouveau plan'): Scene => {
  const id = uid();
  return { id, name, map: { cols: 12, rows: 16, name, sceneId: id }, combatants: [], monsters: {} };
};

/** Contexte de carte pour un plan en préparation, plus l'ajout/retrait de monstres et le renommage. */
export function useSceneDraft(cx: CombatCtx, campaignId: string, sceneId: string) {
  const { store } = useSession();
  const toast = useToast();
  const scene = (cx.secrets.scenes ?? []).find((s) => s.id === sceneId);
  const combat = normalizeCombat({ map: scene?.map, combatants: scene?.combatants ?? [] });

  /** Modifie le plan à partir de la dernière version enregistrée. */
  const edit = (fn: (s: Scene) => Scene) =>
    cx.mutate((_c, sec: CampaignSecrets) => {
      const cur = (sec.scenes ?? []).find((s) => s.id === sceneId);
      if (!cur) throw new Error('Plan introuvable');
      return { secrets: { ...sec, scenes: (sec.scenes ?? []).map((s) => (s.id === sceneId ? fn(s) : s)) } };
    });
  const setMap = (patch: Partial<Scene['map']>) => edit((s) => ({ ...s, map: { ...mapOf(s), ...s.map, ...patch } }));

  const map: MapCtx = {
    combat,
    current: null,
    isGM: true,
    draft: true,
    imageKey: sceneId,
    move: (id: string, x: number, y: number) =>
      edit((s) => {
        const { cols, rows, cells = {} } = mapOf(s);
        if (x < 0 || y < 0 || x >= cols || y >= rows || blocksMove(cells[`${x},${y}`])) throw new Error('Case impossible');
        if (s.combatants.some((o) => o.id !== id && posOf(o).x === x && posOf(o).y === y)) throw new Error('Case occupée');
        return { ...s, combatants: s.combatants.map((o) => (o.id === id ? { ...o, x, y } : o)) };
      }),
    paint: (keys: string[], kind: CellKind | null) =>
      edit((s) => {
        const cells = { ...(s.map.cells ?? {}) };
        for (const k of keys) {
          if (kind) cells[k] = kind;
          else delete cells[k];
        }
        return { ...s, map: { ...s.map, cells } };
      }),
    toggleDoor: (x: number, y: number) =>
      edit((s) => {
        const k = `${x},${y}`;
        const cur = s.map.cells?.[k];
        return { ...s, map: { ...s.map, cells: { ...s.map.cells, [k]: cur === 'door-open' ? 'door' : cur === 'door-locked' ? 'door' : 'door-open' } } };
      }),
    clearBoard: () => edit((s) => ({ ...s, combatants: [], monsters: {} })),
    setBackground: async (dataUrl: string | null) => {
      try {
        const bg = await store.saveMapImage(campaignId, dataUrl, sceneId);
        await setMap({ bg: bg ?? undefined });
      } catch (e) {
        toast((e as Error).message, 'error');
      }
    },
    setFog: (fog: boolean, sight?: number) => setMap({ fog, ...(sight !== undefined ? { sight } : {}) }),
    setMapSize: (cols: number, rows: number) => setMap({ cols, rows }),
    setDark: (dark: boolean) => setMap({ dark }),
    traps: scene?.traps ?? {},
    setTrap: (key: string, t: TrapSecret | null) =>
      edit((s) => {
        const traps = { ...(s.traps ?? {}) };
        if (t) traps[key] = t;
        else delete traps[key];
        return { ...s, traps };
      }),
  };

  /** Place des monstres sur le plan (PV et attaques gardés dans le plan). */
  const addMonsters = (m: NewMonster) =>
    edit((s) => {
      let c = normalizeCombat({ map: s.map, combatants: s.combatants });
      const monsters = { ...s.monsters };
      for (const name of numberedNames(m.name.trim() || 'Monstre', Math.max(1, m.count), c.combatants.map((x) => x.name))) {
        const id = uid();
        const pos = freeCell(c, mapOf(c).cols - 2, 2, -1);
        c = { ...c, combatants: [...c.combatants, { id, name, kind: 'monster', avatar: m.avatar || '👹', initiative: null, initBonus: m.initBonus, status: 'indemne', conditions: [], ...(m.hidden ? { hidden: true } : {}), ...pos }] };
        monsters[id] = { hp: m.hp, maxHp: m.hp, ac: m.ac, notes: '', saves: m.saves, attacks: m.attacks ?? [], multiattack: m.multiattack ?? 1, speed: m.speed ?? 9, ...(m.defenses ? { defenses: m.defenses } : {}) };
      }
      return { ...s, combatants: c.combatants, monsters };
    });

  const removeToken = (id: string) =>
    edit((s) => {
      const monsters = { ...s.monsters };
      delete monsters[id];
      return { ...s, combatants: s.combatants.filter((x) => x.id !== id), monsters };
    });

  const rename = (name: string) => edit((s) => ({ ...s, name, map: { ...s.map, name } }));

  return { scene, map, addMonsters, removeToken, rename };
}
