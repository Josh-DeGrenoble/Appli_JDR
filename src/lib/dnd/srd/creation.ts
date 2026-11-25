// Données de l'assistant de création (règles 2024) : classes (compétences, armure, armes, équipement, or),
// historiques (caractéristiques, compétences, don d'origine), espèces (taille, vitesse, traits). Textes courts.
import type { Ability } from '../data';

export interface ClassInfo {
  name: string;
  pitch: string;
  primary: Ability[];
  skillCount: number;
  skills: string[];
  /** CA de départ : armure de base + Dex (plafond) + bouclier, ou défense sans armure (Dex + autre carac). */
  armor: { base: number; dexMax?: number; shield?: boolean; plus?: Ability; label: string };
  attacks: { name: string; ability: Ability; damage: string; type: string; range: number }[];
  kit: string;
  gold: number;
}

const ALL = ['acrobatics', 'animal', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight', 'stealth', 'survival'];

export const CLASS_INFO: ClassInfo[] = [
  { name: 'Barbare', pitch: 'Guerrier furieux, encaisse énormément grâce à sa Rage.', primary: ['str', 'con'], skillCount: 2, skills: ['animal', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
    armor: { base: 10, plus: 'con', label: 'Défense sans armure (10 + DEX + CON)' }, attacks: [{ name: 'Hache à deux mains', ability: 'str', damage: '1d12', type: 'tranchant', range: 1.5 }, { name: 'Hachette', ability: 'str', damage: '1d6', type: 'tranchant', range: 6 }],
    kit: 'Hache à deux mains, 4 hachettes, sac d’explorateur, 15 po', gold: 75 },
  { name: 'Barde', pitch: 'Artiste magicien : soutient ses alliés, charme et improvise.', primary: ['cha'], skillCount: 3, skills: ALL,
    armor: { base: 11, label: 'Armure de cuir (11 + DEX)' }, attacks: [{ name: 'Dague', ability: 'dex', damage: '1d4', type: 'perforant', range: 1.5 }],
    kit: 'Armure de cuir, 2 dagues, instrument de musique, sac d’artiste, 19 po', gold: 90 },
  { name: 'Clerc', pitch: 'Prêtre en armure : soigne, protège et frappe avec la magie divine.', primary: ['wis'], skillCount: 2, skills: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
    armor: { base: 13, dexMax: 2, shield: true, label: 'Chemise de mailles + bouclier (13 + DEX max 2 + 2)' }, attacks: [{ name: 'Masse d’armes', ability: 'str', damage: '1d6', type: 'contondant', range: 1.5 }],
    kit: 'Chemise de mailles, bouclier, masse d’armes, symbole sacré, sac d’ecclésiastique, 7 po', gold: 110 },
  { name: 'Druide', pitch: 'Gardien de la nature : sorts élémentaires et forme animale.', primary: ['wis'], skillCount: 2, skills: ['animal', 'arcana', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
    armor: { base: 11, shield: true, label: 'Armure de cuir + bouclier (11 + DEX + 2)' }, attacks: [{ name: 'Bâton', ability: 'str', damage: '1d6', type: 'contondant', range: 1.5 }],
    kit: 'Armure de cuir, bouclier, faucille, focaliseur druidique, sac d’explorateur, 9 po', gold: 50 },
  { name: 'Ensorceleur', pitch: 'Magie innée et puissante, sorts modulables.', primary: ['cha'], skillCount: 2, skills: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
    armor: { base: 10, label: 'Sans armure (10 + DEX)' }, attacks: [{ name: 'Dague', ability: 'dex', damage: '1d4', type: 'perforant', range: 1.5 }],
    kit: 'Lance, 2 dagues, focaliseur arcanique, sac d’explorateur, 28 po', gold: 50 },
  { name: 'Guerrier', pitch: 'Maître des armes et des armures, simple et solide.', primary: ['str', 'dex'], skillCount: 2, skills: ['acrobatics', 'animal', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'persuasion', 'survival'],
    armor: { base: 16, dexMax: 0, label: 'Cotte de mailles (16)' }, attacks: [{ name: 'Épée longue', ability: 'str', damage: '1d8', type: 'tranchant', range: 1.5 }, { name: 'Arc long', ability: 'dex', damage: '1d8', type: 'perforant', range: 45 }],
    kit: 'Cotte de mailles, épée à deux mains, fléau, 8 javelines, sac d’explorateur, 4 po', gold: 155 },
  { name: 'Magicien', pitch: 'Érudit de la magie : le plus grand choix de sorts.', primary: ['int'], skillCount: 2, skills: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'],
    armor: { base: 10, label: 'Sans armure (10 + DEX)' }, attacks: [{ name: 'Bâton', ability: 'str', damage: '1d6', type: 'contondant', range: 1.5 }],
    kit: '2 dagues, focaliseur arcanique, robe, grimoire, sac d’érudit, 5 po', gold: 55 },
  { name: 'Moine', pitch: 'Arts martiaux et vitesse : frappe vite et souvent.', primary: ['dex', 'wis'], skillCount: 2, skills: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
    armor: { base: 10, plus: 'wis', label: 'Défense sans armure (10 + DEX + SAG)' }, attacks: [{ name: 'Mains nues', ability: 'dex', damage: '1d6', type: 'contondant', range: 1.5 }, { name: 'Lance', ability: 'dex', damage: '1d6', type: 'perforant', range: 1.5 }],
    kit: 'Lance, 5 dagues, outils d’artisan, sac d’explorateur, 11 po', gold: 50 },
  { name: 'Occultiste', pitch: 'Pacte avec une entité : peu de sorts mais puissants, récupérés au repos court.', primary: ['cha'], skillCount: 2, skills: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
    armor: { base: 11, label: 'Armure de cuir (11 + DEX)' }, attacks: [{ name: 'Dague', ability: 'dex', damage: '1d4', type: 'perforant', range: 1.5 }],
    kit: 'Armure de cuir, faucille, 2 dagues, focaliseur arcanique, livre, sac d’érudit, 15 po', gold: 100 },
  { name: 'Paladin', pitch: 'Chevalier sacré : armure lourde, soins et châtiments divins.', primary: ['str', 'cha'], skillCount: 2, skills: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
    armor: { base: 16, dexMax: 0, shield: true, label: 'Cotte de mailles + bouclier (18)' }, attacks: [{ name: 'Épée longue', ability: 'str', damage: '1d8', type: 'tranchant', range: 1.5 }, { name: 'Javeline', ability: 'str', damage: '1d6', type: 'perforant', range: 9 }],
    kit: 'Cotte de mailles, bouclier, épée longue, 6 javelines, symbole sacré, sac d’ecclésiastique, 9 po', gold: 150 },
  { name: 'Rôdeur', pitch: 'Chasseur et pisteur : à l’aise à l’arc comme en forêt.', primary: ['dex', 'wis'], skillCount: 3, skills: ['animal', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
    armor: { base: 12, label: 'Armure de cuir clouté (12 + DEX)' }, attacks: [{ name: 'Arc long', ability: 'dex', damage: '1d8', type: 'perforant', range: 45 }, { name: 'Épée courte', ability: 'dex', damage: '1d6', type: 'perforant', range: 1.5 }],
    kit: 'Armure de cuir clouté, cimeterre, épée courte, arc long, 20 flèches, focaliseur druidique, sac d’explorateur, 7 po', gold: 150 },
  { name: 'Roublard', pitch: 'Discret et habile : attaque sournoise, crochetage, esquive.', primary: ['dex'], skillCount: 4, skills: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleight', 'stealth'],
    armor: { base: 11, label: 'Armure de cuir (11 + DEX)' }, attacks: [{ name: 'Rapière', ability: 'dex', damage: '1d8', type: 'perforant', range: 1.5 }, { name: 'Arc court', ability: 'dex', damage: '1d6', type: 'perforant', range: 24 }],
    kit: 'Armure de cuir, 2 dagues, épée courte, arc court, 20 flèches, outils de voleur, sac de cambrioleur, 8 po', gold: 100 },
];

export interface BackgroundInfo {
  name: string;
  abilities: [Ability, Ability, Ability];
  skills: [string, string];
  feat: string;
  tool: string;
}

const bg = (name: string, a: string, skills: string, feat: string, tool: string): BackgroundInfo => ({
  name, abilities: a.split(',') as [Ability, Ability, Ability], skills: skills.split(',') as [string, string], feat, tool,
});

export const BACKGROUND_INFO: BackgroundInfo[] = [
  bg('Acolyte', 'int,wis,cha', 'insight,religion', 'Initié à la magie (clerc)', 'Matériel de calligraphe'),
  bg('Artisan', 'str,dex,int', 'investigation,persuasion', 'Artisan', 'Outils d’artisan'),
  bg('Artiste', 'str,dex,cha', 'acrobatics,performance', 'Musicien', 'Instrument de musique'),
  bg('Charlatan', 'dex,con,cha', 'deception,sleight', 'Doué', 'Kit de contrefaçon'),
  bg('Criminel', 'dex,con,int', 'sleight,stealth', 'Vigilant', 'Outils de voleur'),
  bg('Ermite', 'con,wis,cha', 'medicine,religion', 'Guérisseur', 'Kit d’herboriste'),
  bg('Fermier', 'str,con,wis', 'animal,nature', 'Robuste', 'Outils de charpentier'),
  bg('Garde', 'str,int,wis', 'athletics,perception', 'Vigilant', 'Jeu'),
  bg('Guide', 'dex,con,wis', 'stealth,survival', 'Initié à la magie (druide)', 'Outils de cartographe'),
  bg('Marchand', 'con,int,cha', 'animal,persuasion', 'Chanceux', 'Instruments de navigateur'),
  bg('Marin', 'str,dex,wis', 'acrobatics,perception', 'Bagarreur de taverne', 'Instruments de navigateur'),
  bg('Noble', 'str,int,cha', 'history,persuasion', 'Doué', 'Jeu'),
  bg('Sage', 'con,int,wis', 'arcana,history', 'Initié à la magie (magicien)', 'Matériel de calligraphe'),
  bg('Scribe', 'dex,int,wis', 'investigation,perception', 'Doué', 'Matériel de calligraphe'),
  bg('Soldat', 'str,dex,con', 'athletics,intimidation', 'Attaquant sauvage', 'Jeu'),
  bg('Voyageur', 'dex,wis,cha', 'insight,stealth', 'Chanceux', 'Outils de voleur'),
];

export interface SpeciesInfo {
  name: string;
  size: string;
  speed: number;
  traits: string;
}

export const SPECIES_INFO: SpeciesInfo[] = [
  { name: 'Aasimar', size: 'Moyenne', speed: 9, traits: 'Vision dans le noir, résistance nécrotique et radiante, mains guérisseuses, révélation céleste.' },
  { name: 'Drakéide', size: 'Moyenne', speed: 9, traits: 'Souffle draconique, résistance à un type de dégâts, vision dans le noir.' },
  { name: 'Elfe', size: 'Moyenne', speed: 9, traits: 'Vision dans le noir, sens aiguisés, ascendance féerique, transe (repos long en 4 h).' },
  { name: 'Gnome', size: 'Petite', speed: 9, traits: 'Vision dans le noir, ruse gnome (avantage aux sauvegardes INT, SAG, CHA).' },
  { name: 'Goliath', size: 'Moyenne', speed: 10.5, traits: 'Ascendance de géant, grande forme, puissante carrure.' },
  { name: 'Halfelin', size: 'Petite', speed: 9, traits: 'Brave, agilité halfeline, chanceux (relance les 1), discret naturellement.' },
  { name: 'Humain', size: 'Moyenne', speed: 9, traits: 'Ingénieux (inspiration héroïque), doué (une compétence en plus), un don d’origine.' },
  { name: 'Nain', size: 'Moyenne', speed: 9, traits: 'Vision dans le noir, résistance au poison, robustesse naine (+1 PV par niveau), connaissance de la pierre.' },
  { name: 'Orc', size: 'Moyenne', speed: 9, traits: 'Poussée d’adrénaline, vision dans le noir, endurance implacable (reste à 1 PV une fois).' },
  { name: 'Tieffelin', size: 'Moyenne', speed: 9, traits: 'Héritage fiélon (sorts et résistance), vision dans le noir, présence d’outre-monde.' },
];

/** Héritages à choisir (type de dégâts auquel l'espèce résiste). */
export const SPECIES_LEGACY: Record<string, { label: string; options: [string, string][] }> = {
  Drakéide: { label: 'Ascendance draconique', options: [['acide', 'Noir / cuivre (acide)'], ['feu', 'Rouge / or / airain (feu)'], ['foudre', 'Bleu / bronze (foudre)'], ['froid', 'Blanc / argent (froid)'], ['poison', 'Vert (poison)']] },
  Tieffelin: { label: 'Héritage fiélon', options: [['feu', 'Infernal (feu)'], ['poison', 'Abyssal (poison)'], ['nécrotique', 'Chthonien (nécrotique)']] },
};

/** Résistances données par l'espèce (2024) ; `legacy` = type choisi pour le drakéide ou le tieffelin. */
export function speciesDefenses(species: string, legacy?: string): { resist: string[] } | undefined {
  if (species === 'Nain') return { resist: ['poison'] };
  if (species === 'Aasimar') return { resist: ['nécrotique', 'radiant'] };
  if (species === 'Tieffelin') return { resist: [legacy || 'feu'] };
  if (species === 'Drakéide' && legacy) return { resist: [legacy] };
  return undefined;
}

/** Vision dans le noir de l'espèce en mètres (2024). */
export function speciesDarkvision(species: string): number {
  return ({ Nain: 36, Orc: 36, Elfe: 18, Gnome: 18, Drakéide: 18, Aasimar: 18, Tieffelin: 18 } as Record<string, number>)[species] ?? 0;
}
