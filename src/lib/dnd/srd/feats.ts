// Dons des règles 2024 : dons d'origine (donnés par l'historique, ou par l'humain) et dons généraux (au niveau 4, 8…
// à la place de l'amélioration de caractéristiques). Effets appliqués par lib/dnd/feats.ts ; noms et règles recopiés
// côté serveur : 04_niveaux_dons.sql (_feat_info, level_up). Résumés rédigés pour l'appli.
import type { Ability } from '../data';

export interface Feat {
  name: string;
  kind: 'origine' | 'général';
  text: string;
  /** +1 à une caractéristique au choix parmi celles-ci (dons généraux). */
  plus?: Ability[];
  /** Maîtrise des sauvegardes de la caractéristique augmentée (Résilient). */
  saveOfPlus?: boolean;
  /** Vitesse en plus (m). */
  speed?: number;
  /** PV max en plus par niveau (Robuste). */
  hpPerLevel?: number;
  /** Bonus de maîtrise ajouté à l'initiative (Vigilant). */
  initProf?: boolean;
  /** Utilisations = bonus de maîtrise, rechargées au repos long (Chanceux). */
  usesProf?: boolean;
  /** Nombre de compétences maîtrisées à choisir (Doué). */
  skills?: number;
  /** Avantage aux sauvegardes de concentration (Mage de guerre). */
  concAdv?: boolean;
  /** Attaque à mains nues 1d4 + FOR (Bagarreur de taverne). */
  unarmed?: boolean;
  /** Sorts à choisir : 2 sorts mineurs + 1 sort de niveau 1 de cette classe (Initié à la magie). */
  spellsOf?: boolean;
}

const ALL: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const FEATS: Feat[] = [
  // Dons d'origine
  { name: 'Vigilant', kind: 'origine', text: 'Ajoute ton bonus de maîtrise à l’initiative ; tu peux échanger ton initiative avec un allié.', initProf: true },
  { name: 'Artisan', kind: 'origine', text: 'Maîtrise de 3 outils d’artisan ; 20 % de réduction sur l’équipement non magique ; fabrication rapide.' },
  { name: 'Bagarreur de taverne', kind: 'origine', text: 'Coup à mains nues 1d4 + FOR, relance les 1 aux dégâts, maîtrise des armes improvisées, bousculade.', unarmed: true },
  { name: 'Chanceux', kind: 'origine', text: 'Points de chance (= bonus de maîtrise) : avantage à un d20, ou désavantage à une attaque contre toi. Repos long.', usesProf: true },
  { name: 'Doué', kind: 'origine', text: 'Maîtrise de 3 compétences ou outils au choix.', skills: 3 },
  { name: 'Guérisseur', kind: 'origine', text: 'Trousse de soins : stabilise et soigne (1 dé de vie). Relance les 1 sur les soins.' },
  { name: 'Initié à la magie', kind: 'origine', text: '2 sorts mineurs et 1 sort de niveau 1 (lancé une fois par repos long sans emplacement) d’une classe.', spellsOf: true },
  { name: 'Musicien', kind: 'origine', text: 'Maîtrise de 3 instruments ; après un repos, donne l’inspiration héroïque à des alliés.' },
  { name: 'Robuste', kind: 'origine', text: 'PV max + 2 par niveau (et +2 à chaque nouveau niveau).', hpPerLevel: 2 },
  { name: 'Attaquant sauvage', kind: 'origine', text: 'Une fois par tour, lance deux fois les dégâts d’une arme et garde le meilleur.' },
  // Dons généraux (niveau 4 et plus, à la place de l'amélioration)
  { name: 'Résilient', kind: 'général', text: '+1 à une caractéristique et maîtrise de ses jets de sauvegarde.', plus: ALL, saveOfPlus: true },
  { name: 'Mage de guerre', kind: 'général', text: '+1 INT, SAG ou CHA ; avantage aux sauvegardes de concentration ; sort en réaction à la place d’une attaque d’opportunité.', plus: ['int', 'wis', 'cha'], concAdv: true },
  { name: 'Mobile', kind: 'général', text: '+1 DEX ou CON ; +3 m de vitesse ; Foncer en terrain difficile ; pas d’attaque d’opportunité de ceux que tu as attaqués.', plus: ['dex', 'con'], speed: 3 },
  { name: 'Sentinelle', kind: 'général', text: '+1 FOR ou DEX ; ton attaque d’opportunité stoppe la cible ; tu réagis quand un ennemi frappe un allié.', plus: ['str', 'dex'] },
  { name: 'Tireur d’élite', kind: 'général', text: '+1 DEX ; ignore les abris partiels, pas de désavantage à longue portée ni au contact.', plus: ['dex'] },
  { name: 'Maître des armes lourdes', kind: 'général', text: '+1 FOR ; dégâts en plus = bonus de maîtrise avec une arme lourde ; attaque bonus après un critique ou un ennemi à 0 PV.', plus: ['str'] },
  { name: 'Maître des boucliers', kind: 'général', text: '+1 FOR ; coup de bouclier (pousser ou renverser) ; pas de dégâts sur une sauvegarde de DEX réussie.', plus: ['str'] },
  { name: 'Combattant à deux armes', kind: 'général', text: '+1 FOR ou DEX ; attaque de l’arme secondaire avec le modificateur ; armes non légères possibles.', plus: ['str', 'dex'] },
  { name: 'Athlète', kind: 'général', text: '+1 FOR ou DEX ; escalade à vitesse normale, se relever ne coûte que 1,5 m, saut amélioré.', plus: ['str', 'dex'] },
  { name: 'Observateur', kind: 'général', text: '+1 INT ou SAG ; maîtrise (ou expertise) de Perception ou Investigation ; Fouiller en action bonus.', plus: ['int', 'wis'] },
];

/** Don par son nom (« Initié à la magie (clerc) » → Initié à la magie). */
export const featOf = (name: string): Feat | undefined => {
  const base = name.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase();
  return FEATS.find((f) => f.name.toLowerCase() === base);
};

/** Classe précisée dans le nom (« Initié à la magie (clerc) » → Clerc). */
export const featClass = (name: string) => {
  const m = /\(([^)]+)\)/.exec(name);
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : '';
};

/** Dons proposés à une montée de niveau (à la place de l'amélioration) : tous ceux qui ne demandent pas de choisir des sorts. */
export const LEVELUP_FEATS = FEATS.filter((f) => !f.spellsOf);

/** Dons d'origine sans choix à faire (proposés à l'humain en plus de celui de son historique). */
export const SIMPLE_ORIGIN_FEATS = FEATS.filter((f) => f.kind === 'origine' && !f.skills && !f.spellsOf);
