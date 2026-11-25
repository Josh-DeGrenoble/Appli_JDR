// Bestiaire : monstres courants d'après le SRD 5.2.1 (CC-BY-4.0, voir docs/LICENCES.md), pour remplir l'ajout de
// monstres en un tap. Format compact : PV, CA, bonus d'initiative, vitesse (m), sauvegardes (bonus), attaques.
import type { Defenses } from '../damage';
import type { AreaShape, MonsterAttack, MonsterSecret } from '../combat';
import type { Ability } from '../data';
import { searchKey as norm } from '../../text';

export interface BestiaryMonster {
  name: string;
  avatar: string;
  /** Facteur de puissance (FP), pour trier et afficher. */
  cr: string;
  hp: number;
  ac: number;
  init: number;
  speed: number;
  saves: MonsterSecret['saves'];
  multiattack: number;
  attacks: MonsterAttack[];
  /** Résistances, immunités et vulnérabilités aux types de dégâts. */
  defenses?: Defenses;
}

/** Attaque : "Nom|bonus|dégâts|portée|type". Sauvegarde : "Nom|DD|dégâts|portée|type|carac|forme:taille". */
const atk = (s: string): MonsterAttack => {
  const [name, bonus, damage, range, type] = s.split('|');
  return { id: name.toLowerCase().replace(/\W+/g, '-'), name, bonus: +bonus, damage, range: +range, type };
};
const save = (s: string): MonsterAttack => {
  const [name, dc, damage, range, type, ability, shape] = s.split('|');
  const [kind, size] = (shape ?? '').split(':');
  return {
    id: name.toLowerCase().replace(/\W+/g, '-'), name, bonus: 0, damage, range: +range, type, kind: 'save', dc: +dc, ability: ability as Ability, half: true,
    ...(kind ? { shape: { kind: kind as AreaShape['kind'], size: +size } } : {}),
  };
};
/** Sauvegardes "for,dex,con,int,sag,cha". */
const sv = (s: string): MonsterSecret['saves'] => {
  const [str, dex, con, int, wis, cha] = s.split(',').map(Number);
  return { str, dex, con, int, wis, cha };
};
const m = (name: string, avatar: string, cr: string, hp: number, ac: number, init: number, speed: number, saves: string, multiattack: number, attacks: MonsterAttack[]): BestiaryMonster => ({
  name, avatar, cr, hp, ac, init, speed, saves: sv(saves), multiattack, attacks,
});

export const BESTIARY: BestiaryMonster[] = [
  m('Rat géant', '🐀', '1/8', 7, 13, 3, 9, '-2,3,0,-4,0,-3', 1, [atk('Morsure|5|1d4+3|1.5|perçant')]),
  m('Kobold', '🦎', '1/8', 7, 14, 2, 9, '-2,2,-1,-1,-2,-1', 1, [atk('Dague|4|1d4+2|1.5|perçant'), atk('Fronde|4|1d4+2|9|contondant')]),
  m('Cultiste', '🧎', '1/8', 9, 12, 1, 9, '0,1,0,0,2,0', 1, [atk('Faucille rituelle|3|1d4+1|1.5|tranchant')]),
  m('Bandit', '🗡️', '1/8', 11, 12, 1, 9, '0,1,1,0,0,0', 1, [atk('Cimeterre|3|1d6+1|1.5|tranchant'), atk('Arbalète légère|3|1d8+1|24|perçant')]),
  m('Garde', '💂', '1/8', 11, 16, 1, 9, '1,1,1,0,0,0', 1, [atk('Lance|3|1d6+1|1.5|perçant')]),
  m('Gobelin', '👺', '1/4', 10, 15, 2, 9, '-1,2,0,0,-1,-1', 1, [atk('Cimeterre|4|1d6+2|1.5|tranchant'), atk('Arc court|4|1d6+2|24|perçant')]),
  m('Squelette', '💀', '1/4', 13, 14, 2, 9, '0,2,2,-2,-1,-3', 1, [atk('Épée courte|4|1d6+2|1.5|perçant'), atk('Arc court|4|1d6+2|24|perçant')]),
  m('Zombie', '🧟', '1/4', 15, 8, -2, 6, '1,-2,3,-4,0,-3', 1, [atk('Coup|3|1d6+1|1.5|contondant')]),
  m('Loup', '🐺', '1/4', 11, 12, 2, 12, '1,2,1,-4,1,-2', 1, [atk('Morsure|4|1d6+2|1.5|perçant')]),
  m('Sanglier', '🐗', '1/4', 13, 11, 0, 12, '1,0,1,-4,-1,-3', 1, [atk('Défense|3|1d6+1|1.5|perçant')]),
  m('Orc', '👹', '1/2', 16, 13, 1, 9, '3,1,3,-2,0,0', 1, [atk('Hache à deux mains|5|1d12+3|1.5|tranchant'), atk('Javeline|5|1d6+3|9|perçant')]),
  m('Hobgobelin', '👺', '1/2', 11, 18, 1, 9, '1,1,1,0,0,-1', 1, [atk('Épée longue|3|2d10+1|1.5|tranchant'), atk('Arc long|3|1d8+1|45|perçant')]),
  m('Gnoll', '🐕', '1/2', 27, 15, 1, 9, '2,1,0,-2,0,-2', 1, [atk('Lance|4|1d6+2|1.5|perçant'), atk('Arc long|3|1d8+1|45|perçant')]),
  m('Worg', '🐺', '1/2', 26, 13, 1, 15, '3,1,1,-2,0,-1', 1, [atk('Morsure|5|1d8+3|1.5|perçant')]),
  m('Araignée géante', '🕷️', '1', 26, 14, 3, 9, '2,3,1,-4,0,-3', 1, [atk('Morsure|5|1d8+3|1.5|perçant')]),
  m('Goule', '🧟', '1', 22, 12, 2, 9, '1,2,0,-2,0,-2', 2, [atk('Morsure|4|1d6+2|1.5|perçant'), atk('Griffes|4|1d4+2|1.5|tranchant')]),
  m('Gobelours', '🐻', '1', 33, 17, 2, 9, '2,2,1,-1,0,-1', 1, [atk('Morgenstern|4|2d8+2|3|perçant'), atk('Javeline|4|1d6+2|9|perçant')]),
  m('Ours brun', '🐻', '1', 22, 11, 0, 12, '3,0,2,-4,1,-2', 2, [atk('Morsure|5|1d8+3|1.5|perçant'), atk('Griffes|5|1d6+3|1.5|tranchant')]),
  m('Chef bandit', '🏴‍☠️', '2', 52, 15, 3, 9, '4,5,2,0,2,2', 3, [atk('Cimeterre|5|1d6+3|1.5|tranchant'), atk('Pistolet|5|1d10+3|9|perçant')]),
  m('Ogre', '👹', '2', 68, 11, -1, 12, '4,-1,3,-3,-2,-2', 1, [atk('Massue|6|2d8+4|1.5|contondant'), atk('Javeline|6|2d6+4|9|perçant')]),
  m('Hibours', '🦉', '3', 59, 13, 1, 12, '5,1,3,-4,1,-2', 2, [atk('Bec|7|1d10+5|1.5|perçant'), atk('Griffes|7|2d8+5|1.5|tranchant')]),
  m('Minotaure', '🐂', '3', 85, 14, 0, 12, '4,0,3,-2,3,-1', 1, [atk('Hache à deux mains|6|2d12+4|1.5|tranchant'), atk('Coup de cornes|6|3d6+4|1.5|perçant')]),
  m('Nécrophage', '👻', '3', 82, 14, 2, 9, '2,2,3,0,1,2', 2, [atk('Épée longue|4|1d10+2|1.5|tranchant'), atk('Contact nécrotique|4|1d8+2|1.5|nécrotique')]),
  m('Troll', '🧌', '5', 94, 15, 1, 9, '4,1,5,-2,-1,-2', 3, [atk('Griffes|7|2d6+4|3|tranchant')]),
  m('Jeune dragon blanc', '🐉', '6', 123, 17, 0, 12, '4,3,7,-2,3,1', 3, [atk('Rend|7|2d8+4|3|tranchant'), save('Souffle de froid|15|10d8|0|froid|con|cone:9')]),
  m('Jeune dragon rouge', '🐉', '10', 178, 18, 4, 12, '6,4,9,1,4,8', 3, [atk('Rend|10|2d10+6|3|tranchant'), save('Souffle de feu|17|16d6|0|feu|dex|cone:9')]),
];

/** Défenses des monstres du SRD (types de dégâts). */
const DEFENSES: Record<string, Defenses> = {
  Squelette: { vuln: ['contondant'], immune: ['poison'] },
  Zombie: { immune: ['poison'] },
  Goule: { immune: ['poison'] },
  Nécrophage: { resist: ['nécrotique'], immune: ['poison'] },
  'Jeune dragon blanc': { immune: ['froid'] },
  'Jeune dragon rouge': { immune: ['feu'] },
};
for (const b of BESTIARY) if (DEFENSES[b.name]) b.defenses = DEFENSES[b.name];

/** Recherche d'un monstre par nom (sans accents ni majuscules). */
export function findMonsters(q: string): BestiaryMonster[] {
  const n = norm(q.trim());
  return BESTIARY.filter((x) => !n || norm(x.name).includes(n));
}
