// Données de combat des sorts de la bibliothèque : effet, portée (m), sauvegarde, options.
// Format : "effet,portée,options…" — effet : a = attaque de sort, s = sauvegarde, h = soin, m = touche toujours,
// u = utilitaire. Options : str/dex/con/int/wis/cha (sauvegarde), half (moitié si réussite), zone (plusieurs cibles),
// bonus (action bonus), reac (réaction). Portée 0 = soi-même, 1.5 = contact. Sorts absents : utilitaire à 18 m.
import type { ActionCost, Spell, SpellEffect } from '../sheet';
import type { Ability } from '../data';
import type { AreaShape } from '../combat';

export const SPELL_META: Record<string, string> = {
  // mineurs
  'Aspersion acide': 's,18,dex', 'Bouffée de poison': 'a,9', 'Contact glacial': 'a,1.5', 'Décharge occulte': 'a,36',
  'Flamme sacrée': 's,18,dex', 'Flammes': 'a,18', 'Moquerie cruelle': 's,18,wis', 'Poigne électrique': 'a,1.5',
  'Rayon de givre': 'a,18', 'Trait de feu': 'a,36', 'Assistance': 'u,1.5', 'Résistance': 'u,1.5', 'Gourdin magique': 'u,0,bonus',
  'Coup au but': 'u,1.5', 'Épargner les mourants': 'u,4.5', 'Lumière': 'u,1.5', 'Main de mage': 'u,9', 'Message': 'u,36',
  // niveau 1
  'Blessure': 's,1.5,con,half', 'Châtiment divin': 'm,1.5', 'Éclair de sorcière': 'a,9', 'Mains brûlantes': 's,0,dex,half,zone',
  'Marque du chasseur': 'u,27,bonus', 'Mot de guérison': 'h,18,bonus', 'Orbe chromatique': 'a,27', 'Projectile magique': 'm,36',
  'Rayon empoisonné': 'a,18', 'Soins': 'h,1.5', 'Vague tonnante': 's,0,con,half,zone', 'Bouclier': 'u,0,reac',
  'Bouclier de la foi': 'u,18,bonus', 'Faveur divine': 'u,0,bonus', 'Sanctuaire': 'u,9,bonus', 'Repli expéditif': 'u,0,bonus',
  'Feuille morte': 'u,18,reac', 'Bénédiction': 'u,9,zone', 'Imprécation': 'u,9,zone', 'Sommeil': 'u,18,zone',
  'Charme-personne': 'u,9', 'Fou rire': 'u,9', 'Armure de mage': 'u,1.5', 'Héroïsme': 'u,1.5', 'Graisse': 'u,18,zone',
  // niveau 2
  'Arme spirituelle': 'a,18,bonus', 'Flèche acide': 'a,27', 'Fracassement': 's,18,con,half,zone', 'Lame de feu': 'a,1.5,bonus',
  'Rayon ardent': 'a,36', 'Sphère de feu': 's,18,dex,half', 'Prière de soins': 'h,9,zone', 'Pas brumeux': 'u,0,bonus',
  'Immobilisation de personne': 'u,18', 'Invisibilité': 'u,1.5', 'Image miroir': 'u,0', 'Aide': 'u,9,zone',
  'Restauration partielle': 'u,1.5', 'Toile d’araignée': 'u,18,zone', 'Ténèbres': 'u,18', 'Suggestion': 'u,9',
  'Cécité/Surdité': 'u,36', 'Silence': 'u,36', 'Lévitation': 'u,18', 'Agrandissement/Rapetissement': 'u,9',
  // niveau 3
  'Appel de la foudre': 's,36,dex,half', 'Boule de feu': 's,45,dex,half,zone', 'Éclair': 's,0,dex,half,zone',
  'Esprits gardiens': 's,0,wis,half,zone', 'Mot de guérison de groupe': 'h,18,bonus,zone', 'Toucher du vampire': 'a,1.5',
  'Glyphe de protection': 's,1.5,dex,half,zone', 'Contresort': 'u,18,reac', 'Dissipation de la magie': 'u,36',
  'Hâte': 'u,9', 'Lenteur': 'u,36,zone', 'Peur': 'u,0,zone', 'Motif hypnotique': 'u,36,zone', 'Revigorer': 'u,1.5',
  'Vol': 'u,1.5', 'Malédiction': 'u,1.5', 'Clignotement': 'u,0', 'Protection contre l’énergie': 'u,1.5',
  // niveau 4
  'Flétrissement': 's,9,con,half', 'Mur de feu': 's,36,dex,half,zone', 'Tempête de grêle': 's,90,dex,half,zone',
  'Bannissement': 'u,18', 'Confusion': 'u,27,zone', 'Invisibilité supérieure': 'u,1.5', 'Porte dimensionnelle': 'u,0',
  'Polymorphie': 'u,18', 'Peau de pierre': 'u,1.5',
  // niveau 5 et plus
  'Cône de froid': 's,0,con,half,zone', 'Colonne de flamme': 's,18,dex,half,zone', 'Nuage mortel': 's,36,con,half,zone',
  'Soins de groupe': 'h,18,zone', 'Immobilisation de monstre': 'u,27', 'Domination de personne': 'u,18',
  'Chaîne d’éclairs': 's,45,dex,half,zone', 'Désintégration': 's,18,dex', 'Guérison': 'h,18', 'Doigt de mort': 's,18,con,half',
  'Nuée de météores': 's,1500,dex,half,zone', 'Mot de guérison suprême': 'h,1.5', 'Mot de pouvoir mortel': 'u,18',
  'Mot de pouvoir étourdissant': 'u,18',
};

/** Dés ajoutés par niveau d'emplacement au-dessus du niveau du sort. */
export const SPELL_UPCAST: Record<string, string> = {
  'Blessure': '1d10', 'Châtiment divin': '1d8', 'Éclair de sorcière': '1d12', 'Mains brûlantes': '1d6',
  'Mot de guérison': '2d4', 'Orbe chromatique': '1d8', 'Projectile magique': '1d4+1', 'Rayon empoisonné': '1d8',
  'Soins': '2d8', 'Vague tonnante': '1d8', 'Arme spirituelle': '1d8', 'Flèche acide': '2d4', 'Fracassement': '1d8',
  'Lame de feu': '1d6', 'Rayon ardent': '2d6', 'Sphère de feu': '1d6', 'Prière de soins': '1d8',
  'Appel de la foudre': '1d10', 'Boule de feu': '1d6', 'Éclair': '1d6', 'Esprits gardiens': '1d8',
  'Mot de guérison de groupe': '1d4', 'Toucher du vampire': '1d6', 'Glyphe de protection': '1d8',
  'Flétrissement': '1d8', 'Mur de feu': '1d8', 'Tempête de grêle': '1d6', 'Cône de froid': '1d8',
  'Colonne de flamme': '1d6', 'Nuage mortel': '1d8', 'Soins de groupe': '1d8', 'Chaîne d’éclairs': '1d8',
  'Désintégration': '3d6',
};

/** Zones d'effet (en mètres) : sphère = rayon, cube = côté, cône/ligne = longueur. Portée 0 = part du lanceur. */
export const SPELL_SHAPES: Record<string, string> = {
  'Mains brûlantes': 'cone:4.5', 'Vague tonnante': 'cube:4.5', 'Fracassement': 'sphere:3', 'Boule de feu': 'sphere:6',
  'Éclair': 'line:30', 'Esprits gardiens': 'sphere:4.5', 'Tempête de grêle': 'sphere:6', 'Cône de froid': 'cone:18',
  'Colonne de flamme': 'sphere:3', 'Nuage mortel': 'sphere:6', 'Nuée de météores': 'sphere:12', 'Sommeil': 'sphere:1.5',
  'Toile d’araignée': 'cube:6', 'Graisse': 'cube:3', 'Lenteur': 'cube:12', 'Peur': 'cone:9', 'Motif hypnotique': 'cube:9',
  'Confusion': 'sphere:3', 'Glyphe de protection': 'sphere:6',
};

/** Lit « cone:4.5 ». */
export function parseShape(s: string | undefined): AreaShape | undefined {
  if (!s) return undefined;
  const [kind, size] = s.split(':');
  return ['sphere', 'cube', 'cone', 'line'].includes(kind) ? { kind: kind as AreaShape['kind'], size: parseFloat(size) || 1.5 } : undefined;
}

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const EFFECTS: Record<string, SpellEffect> = { a: 'attack', s: 'save', h: 'heal', m: 'auto', u: 'utility' };

/** Champs de combat d'un sort de la bibliothèque. */
export function spellCombatFields(name: string): Pick<Spell, 'effect' | 'range' | 'save' | 'half' | 'area' | 'cast' | 'upcast' | 'shape'> {
  const [eff, range, ...opts] = (SPELL_META[name] ?? 'u,18').split(',');
  const save = opts.find((o) => ABILITIES.includes(o)) as Ability | undefined;
  const cast: ActionCost = opts.includes('bonus') ? 'bonus' : opts.includes('reac') ? 'reaction' : 'action';
  return {
    effect: EFFECTS[eff] ?? 'utility',
    range: parseFloat(range) || 0,
    ...(save ? { save } : {}),
    half: opts.includes('half'),
    area: opts.includes('zone'),
    cast,
    ...(SPELL_UPCAST[name] ? { upcast: SPELL_UPCAST[name] } : {}),
    ...(SPELL_SHAPES[name] ? { shape: parseShape(SPELL_SHAPES[name]) } : {}),
  };
}
