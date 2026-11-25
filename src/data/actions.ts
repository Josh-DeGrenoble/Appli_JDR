// Actions composées D&D réutilisées par plusieurs écrans (fiche, vue MJ, distribution).
import { concentrationDc } from '../lib/dnd/effects';
import { longRestSheetPatch } from '../lib/dnd/actions';
import { longRest } from '../lib/dnd/rules';
import { normalizeSheet } from '../lib/dnd/sheet';
import { hpOf } from '../lib/templates';
import type { Character } from '../lib/types';
import type { Store } from './store';

/** Repos long : PV au max, PV temporaires perdus, dés de vie, capacités et emplacements récupérés, épuisement −1. */
export async function longRestChar(store: Store, c: Character) {
  const hp = hpOf(c);
  const sheet = normalizeSheet(c.sheet);
  const r = longRest(sheet, hp);
  if (hp.max > hp.current) await store.applyHp(c.id, hp.max - hp.current);
  if (hp.temp) await store.setTempHp(c.id, 0);
  await store.patchSheet(c.id, { ...r.sheet, ...longRestSheetPatch(sheet) });
}

/** Ajoute ou retire un état (Empoisonné, À terre…). */
export function toggleCondition(store: Store, c: Character, key: string, on?: boolean) {
  const cur = normalizeSheet(c.sheet).conditions;
  const has = cur.includes(key);
  const want = on ?? !has;
  if (want === has) return Promise.resolve();
  return store.patchSheet(c.id, { conditions: want ? [...cur, key] : cur.filter((k) => k !== key) });
}

/** Fixe les PV max (et ramène les PV actuels sous le nouveau max). */
export function setMaxHp(store: Store, c: Character, max: number) {
  const hp = hpOf(c);
  const m = Math.max(1, max);
  return store.updateCharacter(c.id, {
    resources: { ...c.resources, pv: { max: m, current: Math.min(hp.current, m) } },
  });
}

/** Ajoute une entrée à l'historique de la campagne (tiroir 🕘), visible par tous sauf si `secret` (MJ + auteur). */
export function logEvent(store: Store, campaignId: string, text: string, author = 'MJ', secret = false) {
  return store
    .addRoll({ campaign_id: campaignId, author_name: author, label: text, formula: '', detail: '', total: 0, secret, kind: 'event' })
    .catch(() => undefined);
}

/** Rappel quand un perso concentré prend des dégâts hors action de combat (PV du MJ) : sauvegarde de CON à faire. */
export function concentrationReminder(c: Character, damage: number): string | null {
  const conc = normalizeSheet(c.sheet).concentration;
  return conc && damage > 0 ? `🧠 ${c.name} se concentre sur ${conc} : sauvegarde de CON DD ${concentrationDc(damage)}` : null;
}
