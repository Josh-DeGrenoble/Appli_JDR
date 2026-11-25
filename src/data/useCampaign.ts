// Hook central d'une campagne : chargement, temps réel, droits (can), notifications de changements.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CampaignData, Character, Role } from '../lib/types';
import { useSession } from './session';
import { useToast } from '../components/Toast';
import { COINS, conditionOf } from '../lib/dnd/data';
import { normalizeSheet } from '../lib/dnd/sheet';
import { currentCombatant, normalizeCombat } from '../lib/dnd/combat';
import { hpOf } from '../lib/templates';

export interface CampaignView {
  data: CampaignData | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  role: Role | null;
  isGM: boolean;
  myCharacters: Character[];
  /** Le joueur courant peut-il modifier ce champ de ce perso ? */
  can: (c: Character, what: 'resources' | 'stats' | 'inventory' | 'identity' | 'delete') => boolean;
  memberName: (userId: string) => string;
}

/**
 * Charge une campagne et la garde synchronisée en temps réel.
 * Affiche aussi une notification quand le MJ (ou un autre joueur) modifie
 * l'inventaire, la bourse ou les jauges d'un de mes persos.
 */
export function useCampaign(campaignId: string): CampaignView {
  const { store, user } = useSession();
  const toast = useToast();
  const [data, setData] = useState<CampaignData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const prev = useRef<CampaignData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await store.loadCampaign(campaignId);
      const fromElsewhere = Date.now() - store.lastLocalWrite > 1000;
      if (prev.current && user) notifyMessages(prev.current, d, user.id, toast);
      if (prev.current && fromElsewhere && user) notifyChanges(prev.current, d, user.id, toast);
      prev.current = d;
      setData(d);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [store, campaignId, user, toast]);

  const reload = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(load, 120);
  }, [load]);

  useEffect(() => {
    prev.current = null;
    setLoading(true);
    load();
    const unsub = store.subscribe(campaignId, reload);
    // Téléphone en veille / onglet en arrière-plan : on resynchronise au retour.
    const full = () => (store.invalidate?.(campaignId), reload());
    const onVis = () => document.visibilityState === 'visible' && full();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('online', full);
    return () => {
      unsub();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('online', full);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [store, campaignId, load, reload]);

  const role = useMemo(() => data?.members.find((m) => m.user_id === user?.id)?.role ?? null, [data, user]);
  const isGM = role === 'gm';
  const myCharacters = useMemo(() => data?.characters.filter((c) => c.owner_id === user?.id) ?? [], [data, user]);

  const can: CampaignView['can'] = (c, what) => {
    if (isGM) return true;
    if (!data || c.owner_id !== user?.id) return false;
    const s = data.campaign.settings;
    if (what === 'stats') return s.playersEditStats;
    if (what === 'inventory') return s.playersEditInventory;
    if (what === 'resources') return !!s.playersEditHp;
    return true;
  };

  const memberName = (userId: string) => data?.members.find((m) => m.user_id === userId)?.display_name || '—';

  return { data, error, loading, reload, role, isGM, myCharacters, can, memberName };
}

function notifyChanges(
  before: CampaignData,
  after: CampaignData,
  meId: string,
  toast: ReturnType<typeof useToast>
) {
  const mine = new Map(after.characters.filter((c) => c.owner_id === meId).map((c) => [c.id, c]));
  if (mine.size === 0) return;
  let buzz = false;

  // Objets reçus ou retirés
  const qty = (d: CampaignData) => {
    const m = new Map<string, { name: string; qty: number; char: string }>();
    for (const i of d.items) if (mine.has(i.character_id)) {
      const k = `${i.character_id}|${i.name.toLowerCase()}`;
      const cur = m.get(k);
      m.set(k, { name: i.name, char: i.character_id, qty: (cur?.qty ?? 0) + i.qty });
    }
    return m;
  };
  const a = qty(before);
  const b = qty(after);
  for (const [k, v] of b) {
    const diff = v.qty - (a.get(k)?.qty ?? 0);
    if (diff > 0) {
      toast(`🎁 ${mine.get(v.char)?.name} reçoit ${diff > 1 ? diff + ' × ' : ''}${v.name}`, 'gift');
      buzz = true;
    } else if (diff < 0) toast(`📦 ${mine.get(v.char)?.name} perd ${-diff > 1 ? -diff + ' × ' : ''}${v.name}`);
  }
  for (const [k, v] of a) if (!b.has(k)) toast(`📦 ${mine.get(v.char)?.name ?? 'Ton perso'} perd ${v.name}`);

  // Combat : début du combat et « c'est ton tour »
  const ca = normalizeCombat(before.campaign.combat);
  const cb = normalizeCombat(after.campaign.combat);
  if (cb.active && !ca.active) toast('⚔️ Le combat commence !', 'hurt');
  if (cb.prep && !ca.prep && !cb.active) {
    toast('⚔️ Le MJ prépare un combat : lance ton initiative (onglet Carte)', 'hurt');
    buzz = true;
  }
  // Test demandé par le MJ à l'un de mes persos
  const rq = after.campaign.settings.request;
  if (rq && rq.id !== before.campaign.settings.request?.id && rq.targets.some((id) => mine.has(id))) {
    toast('🎯 Le MJ demande un test : lance-le en haut de l’écran', 'gift');
    buzz = true;
  }
  // Le groupe change de lieu
  const pa = before.campaign.settings.place;
  const pb = after.campaign.settings.place;
  if (pb && pb.id !== pa?.id) {
    toast(`📍 Vous arrivez : ${pb.icon} ${pb.name}`, 'gift');
    buzz = true;
  }
  // Marchand ou coffre rendu visible
  for (const s of after.shops ?? []) {
    if (s.visible && !(before.shops ?? []).some((x) => x.id === s.id && x.visible)) {
      toast(`${s.avatar} ${s.name} est disponible (🏪 en haut)`, 'gift');
      buzz = true;
    }
  }
  // Attaque d'opportunité proposée à l'un de mes persos
  for (const r of cb.reactions ?? []) {
    if ((ca.reactions ?? []).some((x) => x.id === r.id)) continue;
    const by = cb.combatants.find((x) => x.id === r.by);
    const target = cb.combatants.find((x) => x.id === r.target);
    if (by?.characterId && mine.has(by.characterId)) {
      toast(`⚡ ${target?.name ?? 'Un ennemi'} s’éloigne : attaque d’opportunité possible !`, 'hurt');
      buzz = true;
    }
  }
  const turnA = currentCombatant(ca);
  const turnB = currentCombatant(cb);
  if (turnB && (turnB.id !== turnA?.id || cb.round !== ca.round) && turnB.characterId && mine.has(turnB.characterId)) {
    toast(`🗡️ C’est ton tour, ${turnB.name} !`, 'gift');
    buzz = true;
  }

  // Pièces, PV, états
  for (const c of mine.values()) {
    const old = before.characters.find((x) => x.id === c.id);
    if (!old) continue;
    const sa = normalizeSheet(old.sheet);
    const sb = normalizeSheet(c.sheet);
    for (const co of COINS) {
      const d = sb.coins[co.key] - sa.coins[co.key];
      if (d) {
        toast(`💰 ${c.name} : ${d > 0 ? '+' : ''}${d} ${co.label}`, d > 0 ? 'gift' : undefined);
        buzz = true;
      }
    }
    const ha = hpOf(old);
    const hb = hpOf(c);
    const dh = hb.current + hb.temp - (ha.current + ha.temp);
    if (dh) {
      toast(`${dh < 0 ? '💥' : '✨'} ${c.name} : ${dh > 0 ? '+' : ''}${dh} PV`, dh < 0 ? 'hurt' : undefined);
      buzz = true;
    }
    if ((sb.allowedLevel ?? sb.level) > (sa.allowedLevel ?? sa.level) && sb.level < (sb.allowedLevel ?? 0)) {
      toast(`⬆️ ${c.name} peut passer niveau ${sb.level + 1} : ouvre sa fiche`, 'gift');
      buzz = true;
    }
    if (sb.xp > sa.xp) toast(`⭐ ${c.name} : +${sb.xp - sa.xp} XP`, 'gift');
    if (sb.exhaustion !== sa.exhaustion) toast(`😮‍💨 ${c.name} : épuisement ${sb.exhaustion}`, sb.exhaustion > sa.exhaustion ? 'hurt' : undefined);
    for (const k of sb.conditions.filter((x) => !sa.conditions.includes(x))) {
      toast(`${conditionOf(k)?.icon ?? '🌀'} ${c.name} : ${conditionOf(k)?.label ?? k}`, 'hurt');
      buzz = true;
    }
  }
  if (buzz) {
    try {
      navigator.vibrate?.(80);
    } catch {
      /* ignore */
    }
  }
}

/** Note révélée ou envoyée (même juste après une action de ma part : seul l'auteur n'est pas prévenu). */
function notifyMessages(before: CampaignData, after: CampaignData, meId: string, toast: ReturnType<typeof useToast>) {
  const oldNotes = new Set(before.notes.map((n) => n.id));
  for (const n of after.notes) {
    if (!oldNotes.has(n.id) && n.author_id !== meId) toast(`📜 Nouvelle note de ${n.author_name} : ${n.title || 'sans titre'}`, 'gift');
  }
}
