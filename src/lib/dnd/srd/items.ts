// Bibliothèque d'objets (d'après le SRD 5.2.1, CC-BY-4.0) : armes, armures, potions, équipement, objets magiques,
// avec prix en po. Sert à remplir l'inventaire (MJ), les marchands et les coffres en un tap. Les potions ont une formule de
// soin ; armes, armures et objets magiques ont des effets appliqués quand on les équipe (lib/dnd/gear.ts).
// Effets et prix recopiés côté serveur : supabase/migrations/06_equipement.sql (_item_effects, _library_price)
// — générée par scripts/gen-objets-sql.ts, test de parité dans tests/gear.test.ts.
import type { ItemEffects } from '../gear';
import { searchKey as norm } from '../../text';

export type ItemCategory = 'arme' | 'armure' | 'potion' | 'équipement' | 'magique';

export interface LibraryItem {
  name: string;
  cat: ItemCategory;
  /** Prix en po (0,1 = 1 pa). */
  price: number;
  description: string;
  /** Formule de PV rendus (potions). */
  heal?: string;
  /** Effets une fois équipé. */
  effects?: ItemEffects;
}

const i = (cat: ItemCategory, name: string, price: number, description: string, heal?: string, effects?: ItemEffects): LibraryItem => ({
  cat, name, price, description, ...(heal ? { heal } : {}), ...(effects ? { effects } : {}),
});
/** Arme : dégâts, type, caractéristique (finesse = la meilleure de FOR/DEX), portée en m, bonus magique. */
const w = (cat: ItemCategory, name: string, price: number, description: string, damage: string, type: string, ability: 'str' | 'dex' | 'finesse', range = 1.5, bonus = 0) =>
  i(cat, name, price, description, undefined, { weapon: { damage, type, ability, range, ...(bonus ? { bonus } : {}) } });
/** Armure : CA de base, DEX maximale (null = sans limite, 0 = pas de DEX), bonus magique. */
const a = (cat: ItemCategory, name: string, price: number, description: string, base: number, dexMax: number | null, plus = 0) =>
  i(cat, name, price, description, undefined, { armor: { base, dexMax }, ...(plus ? { ac: plus } : {}) });
const m = (name: string, price: number, description: string, effects: ItemEffects) => i('magique', name, price, description, undefined, effects);

export const ITEM_LIBRARY: LibraryItem[] = [
  // Potions (boire : action bonus en combat)
  i('potion', 'Potion de soins', 50, 'Rend 2d4+2 PV.', '2d4+2'),
  i('potion', 'Potion de soins supérieurs', 250, 'Rend 4d4+4 PV.', '4d4+4'),
  i('potion', 'Potion de soins excellents', 2500, 'Rend 8d4+8 PV.', '8d4+8'),
  i('potion', 'Potion de soins suprêmes', 25000, 'Rend 10d4+20 PV.', '10d4+20'),
  i('potion', 'Antidote', 50, 'Avantage aux sauvegardes contre le poison pendant 1 heure.'),
  i('potion', 'Potion d’escalade', 75, 'Vitesse d’escalade égale à la vitesse pendant 1 heure.'),
  i('potion', 'Potion de respiration aquatique', 100, 'Respirer sous l’eau pendant 24 heures.'),
  // Armes (équipée : l'attaque s'ajoute à la fiche)
  w('arme', 'Dague', 2, '1d4 perforant · finesse, légère, lancer (6/18 m).', '1d4', 'perforant', 'finesse'),
  w('arme', 'Bâton', 0.2, '1d6 contondant · polyvalente (1d8).', '1d6', 'contondant', 'str'),
  w('arme', 'Masse d’armes', 5, '1d6 contondant.', '1d6', 'contondant', 'str'),
  w('arme', 'Lance', 1, '1d6 perforant · lancer (6/18 m), polyvalente (1d8).', '1d6', 'perforant', 'str'),
  w('arme', 'Hachette', 5, '1d6 tranchant · légère, lancer (6/18 m).', '1d6', 'tranchant', 'str'),
  w('arme', 'Épée courte', 10, '1d6 perforant · finesse, légère.', '1d6', 'perforant', 'finesse'),
  w('arme', 'Cimeterre', 25, '1d6 tranchant · finesse, légère.', '1d6', 'tranchant', 'finesse'),
  w('arme', 'Rapière', 25, '1d8 perforant · finesse.', '1d8', 'perforant', 'finesse'),
  w('arme', 'Épée longue', 15, '1d8 tranchant · polyvalente (1d10).', '1d8', 'tranchant', 'str'),
  w('arme', 'Hache d’armes', 10, '1d8 tranchant · polyvalente (1d10).', '1d8', 'tranchant', 'str'),
  w('arme', 'Marteau de guerre', 15, '1d8 contondant · polyvalente (1d10).', '1d8', 'contondant', 'str'),
  w('arme', 'Morgenstern', 15, '1d8 perforant.', '1d8', 'perforant', 'str'),
  w('arme', 'Coutille', 20, '1d10 tranchant · lourde, allonge, à deux mains.', '1d10', 'tranchant', 'str', 3),
  w('arme', 'Épée à deux mains', 50, '2d6 tranchant · lourde, à deux mains.', '2d6', 'tranchant', 'str'),
  w('arme', 'Hache à deux mains', 30, '1d12 tranchant · lourde, à deux mains.', '1d12', 'tranchant', 'str'),
  w('arme', 'Arc court', 25, '1d6 perforant · munitions (24/96 m), à deux mains.', '1d6', 'perforant', 'dex', 24),
  w('arme', 'Arc long', 50, '1d8 perforant · munitions (45/180 m), lourde, à deux mains.', '1d8', 'perforant', 'dex', 45),
  w('arme', 'Arbalète légère', 25, '1d8 perforant · munitions (24/96 m), chargement.', '1d8', 'perforant', 'dex', 24),
  w('arme', 'Arbalète lourde', 50, '1d10 perforant · munitions (30/120 m), lourde, chargement.', '1d10', 'perforant', 'dex', 30),
  i('arme', 'Flèches (20)', 1, 'Munitions pour arc.'),
  i('arme', 'Carreaux (20)', 1, 'Munitions pour arbalète.'),
  // Armures (équipée : la CA est recalculée)
  a('armure', 'Armure matelassée', 5, 'CA 11 + Dex · désavantage en Discrétion.', 11, null),
  a('armure', 'Armure de cuir', 10, 'CA 11 + Dex.', 11, null),
  a('armure', 'Armure de cuir clouté', 45, 'CA 12 + Dex.', 12, null),
  a('armure', 'Armure de peau', 10, 'CA 12 + Dex (max 2).', 12, 2),
  a('armure', 'Chemise de mailles', 50, 'CA 13 + Dex (max 2).', 13, 2),
  a('armure', 'Cuirasse', 400, 'CA 14 + Dex (max 2).', 14, 2),
  a('armure', 'Demi-plate', 750, 'CA 15 + Dex (max 2) · désavantage en Discrétion.', 15, 2),
  a('armure', 'Cotte de mailles', 75, 'CA 16 · For 13 · désavantage en Discrétion.', 16, 0),
  a('armure', 'Harnois', 1500, 'CA 18 · For 15 · désavantage en Discrétion.', 18, 0),
  i('armure', 'Bouclier', 10, '+2 CA.', undefined, { shield: 2 }),
  // Équipement
  i('équipement', 'Sac à dos', 2, 'Contient 30 objets environ.'),
  i('équipement', 'Corde de chanvre (15 m)', 1, 'Solide, 15 mètres.'),
  i('équipement', 'Torche', 0.01, 'Lumière vive sur 6 m pendant 1 heure.'),
  i('équipement', 'Lanterne à capote', 5, 'Lumière vive sur 9 m pendant 6 heures (huile).'),
  i('équipement', 'Flasque d’huile', 0.1, 'Carburant de lanterne, ou projectile enflammé.'),
  i('équipement', 'Rations (1 jour)', 0.5, 'Nourriture sèche pour une journée.'),
  i('équipement', 'Outre', 0.2, 'Contient 2 litres d’eau.'),
  i('équipement', 'Sac de couchage', 1, 'Pour dormir à la belle étoile.'),
  i('équipement', 'Outils de voleur', 25, 'Crochets et limes pour les serrures.'),
  i('équipement', 'Trousse de soins', 5, '10 utilisations : stabiliser une créature à 0 PV.'),
  i('équipement', 'Pied-de-biche', 2, 'Avantage pour forcer.'),
  i('équipement', 'Grappin', 2, 'Pour escalader avec une corde.'),
  i('équipement', 'Focaliseur arcanique', 10, 'Cristal, orbe ou baguette pour lancer les sorts.'),
  i('équipement', 'Symbole sacré', 5, 'Focaliseur divin.'),
  // Objets magiques (à glisser dans un coffre ou à donner au bon moment)
  w('magique', 'Dague +1', 1000, '+1 au toucher et aux dégâts · finesse, légère.', '1d4', 'perforant', 'finesse', 1.5, 1),
  w('magique', 'Épée longue +1', 1000, '+1 au toucher et aux dégâts.', '1d8', 'tranchant', 'str', 1.5, 1),
  w('magique', 'Rapière +1', 1000, '+1 au toucher et aux dégâts · finesse.', '1d8', 'perforant', 'finesse', 1.5, 1),
  w('magique', 'Hache d’armes +1', 1000, '+1 au toucher et aux dégâts.', '1d8', 'tranchant', 'str', 1.5, 1),
  w('magique', 'Masse d’armes +1', 1000, '+1 au toucher et aux dégâts.', '1d6', 'contondant', 'str', 1.5, 1),
  w('magique', 'Arc long +1', 1000, '+1 au toucher et aux dégâts · 45/180 m.', '1d8', 'perforant', 'dex', 45, 1),
  w('magique', 'Épée longue +2', 4000, '+2 au toucher et aux dégâts.', '1d8', 'tranchant', 'str', 1.5, 2),
  w('magique', 'Épée à deux mains +2', 4000, '+2 au toucher et aux dégâts · lourde.', '2d6', 'tranchant', 'str', 1.5, 2),
  a('magique', 'Armure de cuir +1', 1500, 'CA 12 + Dex (armure 11 + 1 magique).', 11, null, 1),
  a('magique', 'Chemise de mailles +1', 1500, 'CA 14 + Dex max 2 (armure 13 + 1 magique).', 13, 2, 1),
  a('magique', 'Cotte de mailles +1', 1500, 'CA 17 (armure 16 + 1 magique) · For 13 · désavantage en Discrétion.', 16, 0, 1),
  m('Bouclier +1', 1500, '+3 CA (bouclier 2 + 1 magique).', { shield: 2, ac: 1 }),
  m('Bouclier +2', 6000, '+4 CA (bouclier 2 + 2 magique).', { shield: 2, ac: 2 }),
  m('Bouclier +3', 24000, '+5 CA (bouclier 2 + 3 magique).', { shield: 2, ac: 3 }),
  a('magique', 'Armure de cuir clouté +2', 6000, 'CA 14 + Dex (armure 12 + 2 magique).', 12, null, 2),
  a('magique', 'Demi-plate +1', 2000, 'CA 16 + Dex max 2 (armure 15 + 1 magique).', 15, 2, 1),
  a('magique', 'Harnois +1', 6500, 'CA 19 (armure 18 + 1 magique) · For 15.', 18, 0, 1),
  w('magique', 'Arc long +2', 4000, '+2 au toucher et aux dégâts · 45/180 m.', '1d8', 'perforant', 'dex', 45, 2),
  w('magique', 'Épée longue +3', 24000, '+3 au toucher et aux dégâts.', '1d8', 'tranchant', 'str', 1.5, 3),
  m('Pierre de Ioun (protection)', 4000, '+1 CA (harmonisation).', { ac: 1 }),
  m('Ceinturon de force de géant des collines', 6000, 'Force 21 (harmonisation).', { setAbility: { str: 21 } }),
  m('Ceinturon de force de géant du givre', 40000, 'Force 23 (harmonisation).', { setAbility: { str: 23 } }),
  m('Ceinturon de force de géant du feu', 40000, 'Force 25 (harmonisation).', { setAbility: { str: 25 } }),
  m('Ceinturon de force de géant des nuages', 200000, 'Force 27 (harmonisation).', { setAbility: { str: 27 } }),
  m('Ceinturon de force de géant des tempêtes', 200000, 'Force 29 (harmonisation).', { setAbility: { str: 29 } }),
  m('Cape de protection', 3500, '+1 CA et +1 aux sauvegardes (harmonisation).', { ac: 1, saves: 1 }),
  m('Anneau de protection', 3500, '+1 CA et +1 aux sauvegardes (harmonisation).', { ac: 1, saves: 1 }),
  m('Pierre porte-bonheur', 4200, '+1 aux sauvegardes (harmonisation).', { saves: 1 }),
  m('Bracelets de défense', 6000, '+2 CA sans armure ni bouclier (harmonisation).', { acUnarmored: 2 }),
  m('Gantelets de puissance d’ogre', 8000, 'Force 19 (harmonisation).', { setAbility: { str: 19 } }),
  m('Bandeau d’intellect', 8000, 'Intelligence 19 (harmonisation).', { setAbility: { int: 19 } }),
  m('Amulette de santé', 8000, 'Constitution 19 (harmonisation).', { setAbility: { con: 19 } }),
  m('Bottes de vitesse', 4000, '+3 m de vitesse (harmonisation).', { speed: 3 }),
  i('magique', 'Baguette de projectiles magiques', 500, '7 charges : Projectile magique.'),
  i('magique', 'Sac sans fond', 500, 'Contient jusqu’à 250 kg.'),
  i('magique', 'Bottes elfiques', 2500, 'Avantage aux tests de Discrétion (déplacement silencieux).'),
];

/** Recherche (nom, sans accents) et filtre par catégorie. */
export function searchItems(q: string, cat?: ItemCategory | ''): LibraryItem[] {
  const n = norm(q.trim());
  return ITEM_LIBRARY.filter((x) => (!cat || x.cat === cat) && (!n || norm(x.name).includes(n)));
}

/** Prix de la bibliothèque en pièces de cuivre (null si l'objet n'y est pas). */
export const libraryCp = (name: string) => {
  const it = libraryItem(name);
  return it ? Math.round(it.price * 100) : null;
};

/** Objet de la bibliothèque portant ce nom (exact, sans tenir compte des majuscules). */
export const libraryItem = (name: string) => ITEM_LIBRARY.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
