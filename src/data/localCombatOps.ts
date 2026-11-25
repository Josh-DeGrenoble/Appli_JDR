// Mode démo : combat (initiative fixée par le joueur pour son perso, secrets du MJ).
import { currentCombatant, nextTurn, normalizeCombat } from '../lib/dnd/combat';
import type { CampaignSecrets } from '../lib/dnd/combat';
import { resolveAction, type ActPayload } from '../lib/dnd/resolve';
import { applyMove, dropReaction, toggleDoor as toggleDoorPure } from '../lib/dnd/movement';
import { effectiveSpeed } from '../lib/dnd/rules';
import { normalizeSheet } from '../lib/dnd/sheet';
import { applyHpDelta } from '../lib/dnd/rules';
import { hpOf } from '../lib/templates';
import { springTrap, trapsArmed } from '../lib/dnd/traps';
import { dismissCompanion, summonCompanion } from '../lib/dnd/companions';
import type { LocalDb } from './localDb';

/** Initiative d'un combattant : le MJ pour tous, un joueur seulement pour son propre personnage. */
export function setInitiative(db: LocalDb, campaignId: string, combatantId: string, value: number) {
  const d = db.read();
  const camp = d.campaigns.find((c) => c.id === campaignId);
  if (!camp) throw new Error('Campagne introuvable');
  const combat = normalizeCombat(camp.combat);
  const target = combat.combatants.find((x) => x.id === combatantId);
  if (!target) throw new Error('Combattant introuvable');
  if (db.role(campaignId) !== 'gm') {
    const ch = d.characters.find((c) => c.id === target.characterId);
    if (!ch || ch.owner_id !== db.me().id) throw new Error('Ce n’est pas ton personnage');
  }
  db.write((w) => {
    const c = w.campaigns.find((x) => x.id === campaignId)!;
    const cur = normalizeCombat(c.combat);
    c.combat = { ...cur, combatants: cur.combatants.map((x) => (x.id === combatantId ? { ...x, initiative: value } : x)) };
  });
}

/** Enregistre les secrets du MJ (PV des monstres). */
export function saveSecrets(db: LocalDb, campaignId: string, secrets: CampaignSecrets) {
  db.requireGM(campaignId);
  db.write((d) => {
    d.secrets = (d.secrets ?? []).filter((x) => x.campaign_id !== campaignId);
    d.secrets.push({ campaign_id: campaignId, data: secrets });
  });
}

/** Secrets d'une campagne (MJ uniquement, sinon null). */
export function loadSecrets(db: LocalDb, campaignId: string): CampaignSecrets | null {
  if (db.role(campaignId) !== 'gm') return null;
  return db.read().secrets?.find((x) => x.campaign_id === campaignId)?.data ?? { monsters: {} };
}

/** Action de combat (même calcul que la fonction SQL combat_act). */
export function combatAct(db: LocalDb, campaignId: string, actorId: string, payload: ActPayload) {
  const d = db.read();
  const camp = d.campaigns.find((c) => c.id === campaignId);
  if (!camp) throw new Error('Campagne introuvable');
  const isGM = db.role(campaignId) === 'gm';
  const combat = normalizeCombat(camp.combat);
  const actor = combat.combatants.find((x) => x.id === actorId);
  const owner = d.characters.find((c) => c.id === actor?.characterId)?.owner_id;
  if (!isGM && owner !== db.me().id) throw new Error('Ce n’est pas ton personnage');
  const secrets = d.secrets?.find((x) => x.campaign_id === campaignId)?.data ?? { monsters: {} };
  const res = resolveAction({ combat, secrets, characters: d.characters.filter((c) => c.campaign_id === campaignId) }, actorId, payload, isGM, (n) => Math.floor(Math.random() * n) + 1);
  db.write((w) => {
    w.campaigns.find((c) => c.id === campaignId)!.combat = res.combat;
    w.secrets = (w.secrets ?? []).filter((x) => x.campaign_id !== campaignId);
    w.secrets.push({ campaign_id: campaignId, data: res.secrets });
    for (const [id, hp] of res.hp) {
      const ch = w.characters.find((c) => c.id === id)!;
      ch.resources = { ...ch.resources, pv: { current: hp.current, max: hp.max }, pvtemp: { current: hp.temp, max: 0 } };
    }
    for (const [id, patch] of res.sheets) {
      const ch = w.characters.find((c) => c.id === id)!;
      ch.sheet = { ...ch.sheet, ...patch };
    }
  });
  return res.results;
}

/** Objet de soin : −1 exemplaire et PV rendus (exception à « le joueur ne se soigne pas seul »). */
export function useItem(db: LocalDb, itemId: string, heal: number, targetCharacterId?: string) {
  const d = db.read();
  const it = d.items.find((x) => x.id === itemId);
  if (!it || it.qty < 1) throw new Error('Objet introuvable');
  const owner = d.characters.find((c) => c.id === it.character_id);
  if (!db.isGmOfCharacter(it.character_id) && owner?.owner_id !== db.me().id) throw new Error('Ce n’est pas ton objet');
  const targetId = targetCharacterId ?? it.character_id;
  db.write((w) => {
    const item = w.items.find((x) => x.id === itemId)!;
    item.qty -= 1;
    if (item.qty <= 0) w.items = w.items.filter((x) => x.id !== itemId);
    const ch = w.characters.find((c) => c.id === targetId);
    if (ch) {
      const hp = applyHpDelta(hpOf(ch), Math.max(0, heal));
      ch.resources = { ...ch.resources, pv: { current: hp.current, max: hp.max }, pvtemp: { current: hp.temp, max: 0 } };
    }
  });
}

/** Ignore une attaque d'opportunité : MJ, ou propriétaire du perso qui pouvait attaquer. */
export function combatDismiss(db: LocalDb, campaignId: string, reactionId: string) {
  const d = db.read();
  const camp = d.campaigns.find((c) => c.id === campaignId);
  if (!camp) throw new Error('Campagne introuvable');
  const combat = normalizeCombat(camp.combat);
  const r = (combat.reactions ?? []).find((x) => x.id === reactionId);
  if (!r) return;
  const by = combat.combatants.find((x) => x.id === r.by);
  const ch = d.characters.find((c) => c.id === by?.characterId);
  if (db.role(campaignId) !== 'gm' && ch?.owner_id !== db.me().id) throw new Error('Ce n’est pas ta réaction');
  db.write((w) => {
    w.campaigns.find((c) => c.id === campaignId)!.combat = dropReaction(combat, reactionId);
  });
}

// Image de fond : clé séparée du localStorage (évite de réécrire l'image à chaque modification de la base).
const mapKey = (campaignId: string, key: string) => (key === 'current' ? `grimoire-map-${campaignId}` : `grimoire-map-${campaignId}-${key}`);
const memMaps = new Map<string, string>();

export function saveMapImage(db: LocalDb, campaignId: string, dataUrl: string | null, key = 'current'): string | null {
  db.requireGM(campaignId);
  const k = mapKey(campaignId, key);
  memMaps.delete(k);
  try {
    if (dataUrl) localStorage.setItem(k, dataUrl);
    else localStorage.removeItem(k);
  } catch {
    if (dataUrl) memMaps.set(k, dataUrl); // stockage plein ou indisponible : gardé pour cette session
  }
  return dataUrl ? Date.now().toString(36) : null;
}

export function loadMapImage(campaignId: string, key = 'current'): string | null {
  const k = mapKey(campaignId, key);
  try {
    return localStorage.getItem(k) ?? memMaps.get(k) ?? null;
  } catch {
    return memMaps.get(k) ?? null;
  }
}

/** Porte : ouvrir/fermer (même règle que SQL toggle_door). */
export function toggleDoor(db: LocalDb, campaignId: string, x: number, y: number) {
  const d = db.read();
  const camp = d.campaigns.find((c) => c.id === campaignId);
  if (!camp) throw new Error('Campagne introuvable');
  const combat = normalizeCombat(camp.combat);
  const myChars = new Set(d.characters.filter((c) => c.owner_id === db.me().id).map((c) => c.id));
  const mine = combat.combatants.filter((p) => p.characterId && myChars.has(p.characterId));
  const next = toggleDoorPure(combat, x, y, db.role(campaignId) === 'gm', mine);
  db.write((w) => {
    w.campaigns.find((c) => c.id === campaignId)!.combat = next;
  });
}

/** Joueur : finit le tour de son perso (même règle que SQL end_turn). Le MJ peut finir n'importe quel tour. */
export function endTurn(db: LocalDb, campaignId: string) {
  const d = db.read();
  const camp = d.campaigns.find((c) => c.id === campaignId);
  if (!camp) throw new Error('Campagne introuvable');
  const combat = normalizeCombat(camp.combat);
  const cur = currentCombatant(combat);
  if (!cur) throw new Error('Le combat n’a pas commencé');
  const ch = d.characters.find((c) => c.id === cur.characterId);
  if (db.role(campaignId) !== 'gm' && ch?.owner_id !== db.me().id) throw new Error('Ce n’est pas ton tour');
  db.write((w) => {
    w.campaigns.find((c) => c.id === campaignId)!.combat = nextTurn(combat);
  });
}

/** Déplacement sur la carte (même règle que SQL combat_move), puis piège éventuel ; renvoie le récit du piège. */
export function combatMove(db: LocalDb, campaignId: string, combatantId: string, x: number, y: number) {
  const d = db.read();
  const camp = d.campaigns.find((c) => c.id === campaignId);
  if (!camp) throw new Error('Campagne introuvable');
  const isGM = db.role(campaignId) === 'gm';
  const combat = normalizeCombat(camp.combat);
  const t = combat.combatants.find((k) => k.id === combatantId);
  const ch = d.characters.find((c) => c.id === t?.characterId);
  if (!isGM && ch?.owner_id !== db.me().id) throw new Error('Ce n’est pas ton personnage');
  if (!isGM && combat.active && ch && !t?.companion && hpOf(ch).max > 0 && hpOf(ch).current <= 0) throw new Error('À terre (0 PV) : impossible de bouger');
  if (!isGM && combat.active && t?.companion && t.companion.hp <= 0) throw new Error('À terre (0 PV) : impossible de bouger');
  const speed = t?.companion ? t.companion.speed : ch ? effectiveSpeed(normalizeSheet(ch.sheet)) : 9;
  const next = applyMove(combat, combatantId, x, y, isGM, speed);
  const secrets = d.secrets?.find((k) => k.campaign_id === campaignId)?.data ?? { monsters: {} };
  const trap = trapsArmed(combat, isGM) ? springTrap(next, secrets, d.characters, combatantId, (n) => Math.floor(Math.random() * n) + 1) : null;
  db.write((w) => {
    w.campaigns.find((c) => c.id === campaignId)!.combat = trap?.combat ?? next;
    if (!trap) return;
    w.secrets = (w.secrets ?? []).filter((k) => k.campaign_id !== campaignId);
    w.secrets.push({ campaign_id: campaignId, data: trap.secrets });
    if (trap.hp) {
      const hp = trap.hp.hp;
      const t = w.characters.find((c) => c.id === trap.hp!.characterId)!;
      t.resources = { ...t.resources, pv: { current: hp.current, max: hp.max }, pvtemp: { current: hp.temp, max: 0 } };
    }
  });
  return trap?.text ?? null;
}

/** Fait venir un compagnon de la fiche sur la carte (joueur : son perso ; MJ : tous). = SQL summon_companion. */
export function summonCompanionOp(db: LocalDb, campaignId: string, characterId: string, companionId: string) {
  const d = db.read();
  const camp = d.campaigns.find((c) => c.id === campaignId);
  const ch = d.characters.find((c) => c.id === characterId);
  if (!camp || !ch) throw new Error('Personnage introuvable');
  if (db.role(campaignId) !== 'gm' && ch.owner_id !== db.me().id) throw new Error('Ce n’est pas ton personnage');
  const def = (normalizeSheet(ch.sheet).companions ?? []).find((x) => x.id === companionId);
  if (!def) throw new Error('Compagnon introuvable');
  const next = summonCompanion(normalizeCombat(camp.combat), ch, def);
  db.write((w) => {
    w.campaigns.find((c) => c.id === campaignId)!.combat = next;
  });
}

/** Renvoie un compagnon (joueur : le sien ; MJ : tous). = SQL dismiss_companion. */
export function dismissCompanionOp(db: LocalDb, campaignId: string, tokenId: string) {
  const d = db.read();
  const camp = d.campaigns.find((c) => c.id === campaignId);
  const combat = normalizeCombat(camp?.combat);
  const t = combat.combatants.find((x) => x.id === tokenId && x.companion);
  if (!camp || !t) throw new Error('Compagnon introuvable');
  const owner = d.characters.find((c) => c.id === t.characterId)?.owner_id;
  if (db.role(campaignId) !== 'gm' && owner !== db.me().id) throw new Error('Ce n’est pas ton compagnon');
  db.write((w) => {
    w.campaigns.find((c) => c.id === campaignId)!.combat = dismissCompanion(combat, tokenId);
  });
}
