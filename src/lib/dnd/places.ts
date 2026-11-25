// Lieux préparés par le MJ (taverne, crypte, forêt…) : nom, icône, notes du MJ et favoris (plans, monstres, notes)
// mis en avant quand le groupe s'y trouve. Le lieu actuel (nom + icône) est public : campaign.settings.place.
import { uid } from '../ids';

export interface Place {
  id: string;
  name: string;
  icon: string;
  /** Notes du MJ sur le lieu (secrètes). */
  description: string;
  /** Favoris : ids des plans enregistrés, noms des monstres (« m:Nom » = bestiaire du MJ, sinon SRD), ids des notes. */
  scenes: string[];
  monsters: string[];
  notes: string[];
}

/** Icônes proposées pour un lieu. */
export const PLACE_ICONS = ['🏰', '🍺', '🏘️', '🌲', '⛰️', '🕳️', '⚰️', '🏛️', '⛪', '🏚️', '🌊', '🏜️', '❄️', '🌋', '⚓', '🗼', '🛤️', '🏕️'];

/** Nouveau lieu vide. */
export const newPlace = (name = 'Nouveau lieu', icon = '🏰'): Place => ({ id: uid(), name, icon, description: '', scenes: [], monsters: [], notes: [] });

/** Ajoute ou retire un favori d'une liste. */
export const toggleFav = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

/** Met les favoris du lieu en premier (ordre d'origine conservé) et dit lesquels le sont. */
export function favoritesFirst<T>(items: T[], key: (x: T) => string, favs: string[] | undefined): { item: T; fav: boolean }[] {
  const set = new Set(favs ?? []);
  const all = items.map((item) => ({ item, fav: set.has(key(item)) }));
  return [...all.filter((x) => x.fav), ...all.filter((x) => !x.fav)];
}
