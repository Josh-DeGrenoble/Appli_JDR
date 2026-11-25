// Cartes déjà montrées aux joueurs : quand le MJ ouvre un plan enregistré, une copie publique (décor sans les pièges
// cachés, taille, image) est gardée dans campaign.settings.maps. Les joueurs peuvent la réafficher plus tard, sauf si
// le MJ la décoche (« partagée »). La carte active reste celle que le MJ a ouverte (campaign.combat.map).
import type { CellKind, MapSettings } from './combat';
import { hiddenFromPlayers } from './terrain';

export interface PastMap {
  /** Id du plan enregistré (clé de son image). */
  id: string;
  name: string;
  /** Les joueurs peuvent la réafficher. */
  shared: boolean;
  map: Pick<MapSettings, 'cols' | 'rows' | 'cells' | 'bg'>;
}

/** Décor visible par les joueurs (pièges cachés retirés). */
export const publicCells = (cells: Record<string, CellKind> = {}): Record<string, CellKind> =>
  Object.fromEntries(Object.entries(cells).filter(([, k]) => !hiddenFromPlayers(k)));

/** Ajoute ou met à jour une carte montrée (partagée par défaut ; le choix du MJ est gardé). */
export function recordMap(list: PastMap[] | undefined, id: string, name: string, map: MapSettings): PastMap[] {
  const prev = (list ?? []).find((m) => m.id === id);
  const entry: PastMap = { id, name, shared: prev?.shared ?? true, map: { cols: map.cols, rows: map.rows, cells: publicCells(map.cells), bg: map.bg } };
  return [...(list ?? []).filter((m) => m.id !== id), entry];
}

/** Partage ou retire une carte de l'archive des joueurs. */
export const setShared = (list: PastMap[] | undefined, id: string, shared: boolean): PastMap[] => (list ?? []).map((m) => (m.id === id ? { ...m, shared } : m));

/** Retire une carte de l'archive (plan supprimé). */
export const forgetMap = (list: PastMap[] | undefined, id: string): PastMap[] => (list ?? []).filter((m) => m.id !== id);

/** Cartes que les joueurs peuvent réafficher (hors carte active). */
export const viewableMaps = (list: PastMap[] | undefined, activeId?: string) => (list ?? []).filter((m) => m.shared && m.id !== activeId);
