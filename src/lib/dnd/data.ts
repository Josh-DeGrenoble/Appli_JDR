// Données de référence D&D 5e (règles 2024) : caractéristiques, compétences, classes, états, pièces.
// Noms et résumés reformulés en français ; aucune reproduction de texte des livres.

export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export type Coin = 'pc' | 'pa' | 'pe' | 'po' | 'pp';
export type RollMode = 'normal' | 'adv' | 'dis';

/** Modificateur d'une valeur de caractéristique (10 → +0, 16 → +3, 7 → −2). */
export const abilityMod = (score: number) => Math.floor((score - 10) / 2);

export const ABILITIES: { key: Ability; short: string; label: string }[] = [
  { key: 'str', short: 'FOR', label: 'Force' },
  { key: 'dex', short: 'DEX', label: 'Dextérité' },
  { key: 'con', short: 'CON', label: 'Constitution' },
  { key: 'int', short: 'INT', label: 'Intelligence' },
  { key: 'wis', short: 'SAG', label: 'Sagesse' },
  { key: 'cha', short: 'CHA', label: 'Charisme' },
];

export const abilityShort = (a: Ability) => ABILITIES.find((x) => x.key === a)!.short;

/** Les 18 compétences et leur caractéristique. */
export const SKILLS: { key: string; label: string; ability: Ability }[] = [
  { key: 'acrobatics', label: 'Acrobaties', ability: 'dex' },
  { key: 'arcana', label: 'Arcanes', ability: 'int' },
  { key: 'athletics', label: 'Athlétisme', ability: 'str' },
  { key: 'stealth', label: 'Discrétion', ability: 'dex' },
  { key: 'animal', label: 'Dressage', ability: 'wis' },
  { key: 'sleight', label: 'Escamotage', ability: 'dex' },
  { key: 'history', label: 'Histoire', ability: 'int' },
  { key: 'intimidation', label: 'Intimidation', ability: 'cha' },
  { key: 'investigation', label: 'Investigation', ability: 'int' },
  { key: 'medicine', label: 'Médecine', ability: 'wis' },
  { key: 'nature', label: 'Nature', ability: 'int' },
  { key: 'perception', label: 'Perception', ability: 'wis' },
  { key: 'insight', label: 'Perspicacité', ability: 'wis' },
  { key: 'persuasion', label: 'Persuasion', ability: 'cha' },
  { key: 'religion', label: 'Religion', ability: 'int' },
  { key: 'performance', label: 'Représentation', ability: 'cha' },
  { key: 'survival', label: 'Survie', ability: 'wis' },
  { key: 'deception', label: 'Tromperie', ability: 'cha' },
];

/** Les 12 classes : dé de vie et sauvegardes maîtrisées. */
export const CLASSES: { name: string; hitDie: number; saves: Ability[]; caster?: Ability }[] = [
  { name: 'Barbare', hitDie: 12, saves: ['str', 'con'] },
  { name: 'Barde', hitDie: 8, saves: ['dex', 'cha'], caster: 'cha' },
  { name: 'Clerc', hitDie: 8, saves: ['wis', 'cha'], caster: 'wis' },
  { name: 'Druide', hitDie: 8, saves: ['int', 'wis'], caster: 'wis' },
  { name: 'Ensorceleur', hitDie: 6, saves: ['con', 'cha'], caster: 'cha' },
  { name: 'Guerrier', hitDie: 10, saves: ['str', 'con'] },
  { name: 'Magicien', hitDie: 6, saves: ['int', 'wis'], caster: 'int' },
  { name: 'Moine', hitDie: 8, saves: ['str', 'dex'] },
  { name: 'Occultiste', hitDie: 8, saves: ['wis', 'cha'], caster: 'cha' },
  { name: 'Paladin', hitDie: 10, saves: ['wis', 'cha'], caster: 'cha' },
  { name: 'Rôdeur', hitDie: 10, saves: ['str', 'dex'], caster: 'wis' },
  { name: 'Roublard', hitDie: 8, saves: ['dex', 'int'] },
];

export const findClass = (name: string) => CLASSES.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());

export const SPECIES = ['Aasimar', 'Drakéide', 'Elfe', 'Gnome', 'Goliath', 'Halfelin', 'Humain', 'Nain', 'Orc', 'Tieffelin'];

export const BACKGROUNDS = [
  'Acolyte', 'Artisan', 'Artiste', 'Charlatan', 'Criminel', 'Ermite', 'Fermier', 'Garde',
  'Guide', 'Marchand', 'Marin', 'Noble', 'Sage', 'Scribe', 'Soldat', 'Voyageur',
];

export const ALIGNMENTS = ['LB', 'NB', 'CB', 'LN', 'N', 'CN', 'LM', 'NM', 'CM'];

export const SIZES = ['Très petite', 'Petite', 'Moyenne', 'Grande'];

/** Les états (conditions). Résumés courts pour rappel en jeu. */
export const CONDITIONS: { key: string; label: string; icon: string; hint: string }[] = [
  { key: 'blinded', label: 'Aveuglé', icon: '🙈', hint: 'Rate les tests liés à la vue ; désavantage en attaque, avantage pour l’attaquer.' },
  { key: 'charmed', label: 'Charmé', icon: '💗', hint: 'Ne peut pas attaquer le charmeur ; celui-ci a l’avantage en interaction sociale.' },
  { key: 'deafened', label: 'Assourdi', icon: '🔇', hint: 'N’entend rien, rate les tests liés à l’ouïe.' },
  { key: 'frightened', label: 'Effrayé', icon: '😱', hint: 'Désavantage tant que la source est visible ; ne peut pas s’en approcher.' },
  { key: 'grappled', label: 'Agrippé', icon: '🤼', hint: 'Vitesse 0 ; désavantage aux attaques sauf contre l’agrippeur.' },
  { key: 'incapacitated', label: 'Neutralisé', icon: '💫', hint: 'Aucune action, action bonus ni réaction ; perd la concentration.' },
  { key: 'invisible', label: 'Invisible', icon: '👻', hint: 'Avantage à l’initiative et en attaque ; désavantage pour l’attaquer.' },
  { key: 'paralyzed', label: 'Paralysé', icon: '🧊', hint: 'Neutralisé, vitesse 0, rate FOR/DEX ; coup critique au contact.' },
  { key: 'petrified', label: 'Pétrifié', icon: '🗿', hint: 'Changé en pierre : neutralisé, résistance à tous les dégâts.' },
  { key: 'poisoned', label: 'Empoisonné', icon: '🤢', hint: 'Désavantage aux jets d’attaque et de caractéristique.' },
  { key: 'prone', label: 'À terre', icon: '🛌', hint: 'Désavantage en attaque ; avantage pour l’attaquer au contact.' },
  { key: 'restrained', label: 'Entravé', icon: '⛓️', hint: 'Vitesse 0, désavantage en attaque et sauvegarde DEX.' },
  { key: 'stunned', label: 'Étourdi', icon: '😵', hint: 'Neutralisé, rate FOR/DEX ; avantage pour l’attaquer.' },
  { key: 'unconscious', label: 'Inconscient', icon: '💤', hint: 'Neutralisé, à terre, rate FOR/DEX ; critique au contact.' },
];

export const conditionOf = (key: string) => CONDITIONS.find((c) => c.key === key);

export const COINS: { key: Coin; label: string; name: string }[] = [
  { key: 'pp', label: 'pp', name: 'Platine' },
  { key: 'po', label: 'po', name: 'Or' },
  { key: 'pe', label: 'pe', name: 'Électrum' },
  { key: 'pa', label: 'pa', name: 'Argent' },
  { key: 'pc', label: 'pc', name: 'Cuivre' },
];

/** Valeur de chaque pièce en pièces de cuivre. */
export const COIN_VALUE: Record<Coin, number> = { pc: 1, pa: 10, pe: 50, po: 100, pp: 1000 };

export const EXHAUSTION_MAX = 6;
