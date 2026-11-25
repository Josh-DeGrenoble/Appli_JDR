// Plans enregistrés du MJ (salles, donjon, ville…) : enregistrer la carte affichée (décor, image, monstres placés),
// en ouvrir une autre (les persos des joueurs suivent le groupe), supprimer. Stockés dans les secrets du MJ, avec les
// réglages de leurs pièges. Un plan ouvert est aussi gardé dans l'archive des joueurs (pastMaps.ts).
import { useSession } from '../../data/session';
import { useToast } from '../../components/Toast';
import { EMPTY_COMBAT, type Scene } from '../../lib/dnd/combat';
import { freeCell, mapOf, posOf } from '../../lib/dnd/grid';
import { uid } from '../../lib/ids';
import { blocksMove } from '../../lib/dnd/terrain';
import type { CombatCtx } from './useCombat';
import { forgetMap, recordMap, setShared, type PastMap } from '../../lib/dnd/pastMaps';

/** Actions sur les plans enregistrés. */
export function useScenes(cx: CombatCtx, campaignId: string) {
  const { store } = useSession();
  const toast = useToast();
  const scenes = cx.secrets.scenes ?? [];
  const fail = (e: Error) => toast(e.message, 'error');

  /** Met à jour l'archive des cartes montrées aux joueurs (campaign.settings.maps), relue en base. */
  const archive = async (fn: (list: PastMap[] | undefined) => PastMap[]) => {
    const d = await store.loadCampaign(campaignId);
    await store.updateCampaign(campaignId, { settings: { ...d.campaign.settings, maps: fn(d.campaign.settings.maps) } });
  };

  /** Enregistre la carte affichée sous `name` (remplace le plan d'origine s'il porte ce nom). */
  const save = async (name: string) => {
    try {
      const current = cx.combat.map?.sceneId ? scenes.find((s) => s.id === cx.combat.map?.sceneId) : undefined;
      const id = current && current.name === name ? current.id : uid();
      const bg = cx.combat.map?.bg ? await store.loadMapImage(campaignId) : null;
      await store.saveMapImage(campaignId, bg, id);
      await cx.mutate((c, sec) => {
        const keep = c.combatants.filter((x) => x.kind === 'monster').map(({ used: _u, ...x }) => ({ ...x, initiative: null }));
        const monsters = Object.fromEntries(keep.map((x) => [x.id, sec.monsters[x.id]]).filter(([, v]) => v));
        const scene: Scene = { id, name, map: { ...mapOf(c), name, sceneId: id }, combatants: keep, monsters, traps: { ...(sec.traps ?? {}) } };
        return {
          secrets: { ...sec, scenes: [...(sec.scenes ?? []).filter((s) => s.id !== id), scene] },
          combat: { ...c, map: { ...mapOf(c), name, sceneId: id } },
        };
      });
      await archive((l) => recordMap(l, id, name, { ...mapOf(cx.combat), bg: cx.combat.map?.bg ? cx.combat.map.bg : undefined }));
      toast(`💾 Plan « ${name} » enregistré`);
    } catch (e) {
      fail(e as Error);
    }
  };

  /** Ouvre un plan : décor et monstres du plan ; les persos présents restent (replacés s'ils tombent sur un mur ou un pion). */
  const open = async (scene: Scene) => {
    try {
      const bg = scene.map.bg ? await store.loadMapImage(campaignId, scene.id) : null;
      const version = await store.saveMapImage(campaignId, bg);
      await cx.mutate((c, sec) => {
        let next = { ...EMPTY_COMBAT, map: { ...scene.map, bg: version ?? undefined }, combatants: scene.combatants.map((x) => ({ ...x })) };
        const walls = scene.map.cells ?? {};
        for (const pc of c.combatants.filter((x) => x.kind === 'pc')) {
          const p = posOf(pc);
          const { cols, rows } = mapOf(next);
          const blocked = blocksMove(walls[`${p.x},${p.y}`]) || p.x >= cols || p.y >= rows || next.combatants.some((o) => posOf(o).x === p.x && posOf(o).y === p.y);
          const pos = blocked ? freeCell(next, 1, 2, 1) : p;
          next = { ...next, combatants: [...next.combatants, { ...pc, ...pos, initiative: null, used: undefined }] };
        }
        return { combat: next, secrets: { ...sec, monsters: { ...scene.monsters }, traps: { ...(scene.traps ?? {}) } } };
      });
      await archive((l) => recordMap(l, scene.id, scene.name, scene.map));
      toast(`🗺️ Plan « ${scene.name} » ouvert`);
    } catch (e) {
      fail(e as Error);
    }
  };

  /** Supprime un plan enregistré (et son image). */
  const remove = async (scene: Scene) => {
    await store.saveMapImage(campaignId, null, scene.id).catch(() => null);
    await cx.mutate((_c, sec) => ({ secrets: { ...sec, scenes: (sec.scenes ?? []).filter((s) => s.id !== scene.id) } }));
    await archive((l) => forgetMap(l, scene.id)).catch(fail);
  };

  /** Nouveau plan vide (garde les persos). */
  const blank = async () => {
    await store.saveMapImage(campaignId, null).catch(() => null);
    await cx.mutate((c, sec) => ({
      combat: { ...EMPTY_COMBAT, map: { cols: 12, rows: 16 }, combatants: c.combatants.filter((x) => x.kind === 'pc').map((x) => ({ ...x, initiative: null, used: undefined })) },
      secrets: { ...sec, traps: {} },
    }));
  };

  /** Les joueurs peuvent (ou non) réafficher ce plan déjà montré. */
  const share = (id: string, shared: boolean) => archive((l) => setShared(l, id, shared)).then(cx.reload).catch(fail);

  return { scenes, save, open, remove, blank, share };
}
