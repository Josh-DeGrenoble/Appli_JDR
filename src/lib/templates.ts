// Modèle de campagne D&D, avatars, et valeurs initiales d'un nouveau personnage.
import type { CampaignTemplate, Character, ResourceValue } from './types';
import { DEFAULT_SHEET, type DndSheet } from './dnd/sheet';

/** Modèle unique depuis la v0.2 : les PV sont une jauge, tout le reste est dans la fiche D&D. */
export const DND_TEMPLATE: CampaignTemplate = {
  stats: [],
  resources: [{ key: 'pv', label: 'PV', max: 10, color: 'hp' }],
  currency: 'po',
};

/** Valeurs initiales d'un nouveau personnage. */
export function blankCharacterValues(sheet: Partial<DndSheet> = {}, maxHp = 10) {
  return {
    stats: {},
    resources: { pv: { current: maxHp, max: maxHp }, pvtemp: { current: 0, max: 0 } } as Record<string, ResourceValue>,
    sheet: { ...structuredClone(DEFAULT_SHEET), ...sheet },
    currency: 0,
  };
}

/** PV d'un perso (avec valeurs par défaut). */
export function hpOf(c: Character) {
  return {
    current: c.resources?.pv?.current ?? 0,
    max: c.resources?.pv?.max ?? 0,
    temp: c.resources?.pvtemp?.current ?? 0,
  };
}

export const AVATARS = ['🧙', '🧝', '🧛', '🧟', '🥷', '🤺', '🏹', '🛡️', '🗡️', '🔮', '🐉', '🦊', '🐺', '🦉', '💀', '👑', '🌙', '🔥', '🍄', '⚙️'];
