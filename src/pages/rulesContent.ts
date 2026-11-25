// Contenu des règles D&D 2024 expliquées simplement (bouton « 📖 Les règles » de l'accueil). Texte seulement :
// une section = un pli du menu, découpée en parties courtes. Le MJ a toujours le dernier mot.

export interface RulePart {
  title: string;
  lines: string[];
}
export interface RuleSection {
  icon: string;
  title: string;
  intro: string;
  parts: RulePart[];
}

export const RULES: RuleSection[] = [
  { icon: '🎭', title: 'Le principe', intro: 'Une histoire racontée ensemble : le MJ décrit le monde, les joueurs décident ce que font leurs héros.', parts: [
    { title: 'Le déroulement', lines: ['1. Le MJ décrit la scène (où on est, ce qu’on voit, qui est là).', '2. Chaque joueur dit ce que tente son personnage.', '3. Si le résultat est incertain, on lance un dé ; le MJ raconte la suite.'] },
    { title: 'Les trois piliers', lines: ['Exploration : fouiller, voyager, trouver son chemin, éviter les pièges.', 'Interaction : parler, négocier, mentir, intimider les personnages du MJ.', 'Combat : quand ça tourne mal, on passe au tour par tour (onglet Carte).'] },
    { title: 'Le rôle du MJ', lines: ['Il joue tout le monde sauf les héros, fixe les difficultés et interprète les règles.', 'Dans l’appli : il donne les PV, objets, sorts, pièces, l’avantage, et prépare cartes, marchands, monstres et notes.'] },
  ] },
  { icon: '🎲', title: 'Les dés', intro: 'Le dé à 20 faces (d20) décide presque tout ; les autres servent aux dégâts et aux soins.', parts: [
    { title: 'Le test d20', lines: ['d20 + bonus, comparé à un chiffre à battre : la Difficulté (DD) ou la Classe d’Armure (CA).', 'Égal ou plus haut : réussite.', 'Difficultés courantes : très facile 5, facile 10, moyen 15, difficile 20, très difficile 25, presque impossible 30.'] },
    { title: 'Lire une formule', lines: ['« 2d6+3 » : deux dés à 6 faces, on additionne, puis +3.', 'd4, d6, d8, d10, d12 : nombre de faces. d100 : deux d10 (dizaines et unités).'] },
    { title: '20 et 1 naturels', lines: ['En attaque, un 20 sur le dé est un coup critique (tous les dés de dégâts doublés) et touche toujours.', 'Un 1 sur le dé rate toujours une attaque.', 'Pour les tests de caractéristique et les sauvegardes, 20 et 1 n’ont rien de spécial (sauf le jet contre la mort).'] },
  ] },
  { icon: '💪', title: 'Caractéristiques et compétences', intro: 'Six valeurs (de 1 à 20 pour un héros) décrivent le personnage ; leur modificateur s’ajoute aux dés.', parts: [
    { title: 'Les six caractéristiques', lines: ['Force (FOR) : porter, pousser, frapper au corps à corps.', 'Dextérité (DEX) : agilité, discrétion, armes à distance, CA, initiative.', 'Constitution (CON) : endurance, PV, concentration.', 'Intelligence (INT) : savoir, enquête, magie des magiciens.', 'Sagesse (SAG) : perception, intuition, magie des clercs et druides.', 'Charisme (CHA) : persuasion, présence, magie des bardes, ensorceleurs, occultistes, paladins.'] },
    { title: 'Le modificateur', lines: ['(valeur − 10) ÷ 2 arrondi en dessous : 8 → −1, 10 → +0, 12 → +1, 14 → +2, 16 → +3, 18 → +4, 20 → +5.'] },
    { title: 'Bonus de maîtrise', lines: ['+2 au niveau 1, +3 au niveau 5, +4 au 9, +5 au 13, +6 au 17.', 'Il s’ajoute à ce que le perso maîtrise : armes, compétences, sauvegardes de sa classe, sorts.', 'Expertise : maîtrise doublée sur une compétence (roublard, barde, rôdeur).'] },
    { title: 'Les 18 compétences', lines: ['FOR : Athlétisme. DEX : Acrobaties, Discrétion, Escamotage.', 'INT : Arcanes, Histoire, Investigation, Nature, Religion.', 'SAG : Dressage, Médecine, Perception, Perspicacité, Survie.', 'CHA : Intimidation, Persuasion, Représentation, Tromperie.', 'Perception passive = 10 + bonus de Perception : ce que le perso remarque sans chercher.'] },
    { title: 'Sauvegardes', lines: ['Un jet pour résister : DEX contre une explosion, CON contre le poison, SAG contre un charme…', 'Chaque classe maîtrise deux sauvegardes.'] },
  ] },
  { icon: '⚖️', title: 'Avantage, désavantage, inspiration', intro: 'Le moyen le plus simple de rendre un jet plus facile ou plus dur.', parts: [
    { title: 'La règle', lines: ['Avantage : 2d20, on garde le meilleur. Désavantage : 2d20, on garde le moins bon.', 'Plusieurs avantages ne se cumulent pas ; un avantage et un désavantage s’annulent toujours.'] },
    { title: 'D’où ça vient', lines: ['États : empoisonné, effrayé, aveuglé, à terre, entravé (désavantage en attaque) ; invisible (avantage).', 'Cible à terre (avantage au contact, désavantage à distance), étourdie, paralysée, inconsciente (avantage).', 'Actions : Esquiver (désavantage pour attaquer celui qui esquive), Aider (avantage à l’allié).', 'Le MJ peut en donner un quand la situation s’y prête. L’appli applique tout ça toute seule.'] },
    { title: 'Inspiration héroïque', lines: ['Donnée par le MJ (ou les humains chaque jour) : permet de relancer un dé. Une seule à la fois.'] },
  ] },
  { icon: '⚔️', title: 'Le combat', intro: 'Un round dure environ 6 secondes ; chacun joue à son tour dans l’ordre d’initiative.', parts: [
    { title: 'Initiative', lines: ['d20 + modificateur de DEX au début du combat. On joue du plus haut au plus bas.', 'Surpris : désavantage à l’initiative.'] },
    { title: 'Ton tour', lines: ['Déplacement : jusqu’à ta vitesse (souvent 9 m = 6 cases), en plusieurs fois si tu veux.', '1 action : attaquer, lancer un sort, Foncer (déplacement doublé), Esquiver, Se désengager, Aider, Se cacher, utiliser un objet, chercher…', '1 action bonus si une aptitude ou un sort le permet (boire une potion compte comme action bonus en 2024).', 'Interagir avec un objet (ouvrir une porte, dégainer) est gratuit une fois par tour.'] },
    { title: 'Réaction', lines: ['Une par round, même hors de ton tour : attaque d’opportunité, sort Bouclier, Contresort…', 'Attaque d’opportunité : quand un ennemi au contact s’éloigne sans Se désengager.'] },
    { title: 'Attaquer', lines: ['d20 + bonus d’attaque (modificateur + maîtrise) contre la CA de la cible.', 'Touché : dés de l’arme + modificateur. Corps à corps : FOR (ou DEX pour les armes de finesse). Distance : DEX.', 'Attaque supplémentaire : à partir du niveau 5, certaines classes attaquent 2 fois par action.'] },
    { title: 'Couverts et distances', lines: ['Un obstacle entre toi et la cible : +2 ou +5 à sa CA (demi ou trois-quarts couvert). Totalement caché : impossible à viser.', 'Dans l’appli : les murs bloquent la vue, la portée est calculée sur la carte (1 case = 1,5 m).'] },
    { title: 'Compagnons et invocations', lines: ['Familier, bête du rôdeur, monture, créature invoquée : un pion à part, avec ses PV, sa CA et ses attaques, joué par le joueur juste après son perso.', 'À 0 PV, il est vaincu ; le joueur peut le renvoyer et le rappeler.'] },
    { title: 'Lumière et obscurité', lines: ['Dans le noir, on ne voit rien sans lumière : torche 6 m, lanterne 9 m.', 'Vision dans le noir (elfe, nain, gnome, orc, tieffelin…) : voit sans lumière jusqu’à 18 m (36 m pour nain et orc), en nuances de gris.'] },
    { title: 'Pièges', lines: ['Un perso qui marche sur un piège fait une sauvegarde (souvent DEX) contre son DD ; raté : il subit les dégâts (parfois la moitié s’il réussit).', 'Dans l’appli : invisible pour les joueurs jusqu’à ce qu’il se déclenche ; tout est calculé.'] },
  ] },
  { icon: '❤️', title: 'Points de vie, mort et soins', intro: 'Les PV mesurent l’énergie et la chance ; tomber à 0 ne veut pas dire mourir tout de suite.', parts: [
    { title: 'Dégâts', lines: ['Les PV temporaires partent en premier et ne se cumulent pas.', 'Résistance : dégâts divisés par 2. Vulnérabilité : doublés. Immunité : aucun.', 'Dans l’appli : le type de dégâts (feu, tranchant…) est lu dans l’attaque ou le sort, et les défenses réglées par le MJ s’appliquent toutes seules.'] },
    { title: 'À 0 PV', lines: ['Inconscient : plus d’action, de déplacement ni de réaction.', 'À chaque tour : jet contre la mort (d20, sans bonus). 10+ : réussite ; moins : échec ; 1 : deux échecs ; 20 : se relève avec 1 PV.', '3 réussites : stabilisé. 3 échecs : mort. Des dégâts à 0 PV = un échec (critique = deux).', 'Mort instantanée si les dégâts restants atteignent le maximum de PV.'] },
    { title: 'Se soigner', lines: ['Sorts et potions (2d4+2 pour une potion de soins), dés de vie au repos court.', 'N’importe quel soin relève un personnage à 0 PV.'] },
  ] },
  { icon: '🌀', title: 'Les états', intro: 'Effets temporaires posés par les sorts, les monstres ou le MJ.', parts: [
    { title: 'Les plus courants', lines: ['À terre : désavantage en attaque ; attaques contre lui avec avantage au contact. Se relever coûte la moitié du déplacement.', 'Agrippé : vitesse 0. Entravé : vitesse 0, désavantage en attaque et aux sauvegardes DEX.', 'Aveuglé : rate tout ce qui demande la vue ; désavantage en attaque.', 'Charmé : ne peut pas attaquer le charmeur. Effrayé : désavantage tant qu’il voit la source.', 'Empoisonné : désavantage aux attaques et aux tests de caractéristique.', 'Invisible : avantage en attaque et à l’initiative ; désavantage pour l’attaquer.'] },
    { title: 'Les plus graves', lines: ['Neutralisé : aucune action ni réaction. Étourdi, paralysé, pétrifié, inconscient : neutralisé et plus encore (rate FOR/DEX, critique automatique au contact pour paralysé et inconscient).'] },
    { title: 'Épuisement (2024)', lines: ['De 1 à 6 niveaux : −2 par niveau à tous les tests d20, −1,5 m de vitesse par niveau. 6 = mort.', 'Un repos long en retire un niveau.', 'Dans l’appli : c’est le MJ qui le donne ou le retire (fiche, ou MJ › Distribuer › État pour tout le groupe). Pareil pour les autres états : un joueur peut s’en mettre un, seul le MJ le retire.'] },
  ] },
  { icon: '✨', title: 'La magie', intro: 'Les lanceurs de sorts dépensent des emplacements pour lancer leurs sorts.', parts: [
    { title: 'Emplacements', lines: ['Un sort de niveau 1 à 9 consomme un emplacement de ce niveau ou plus haut (lancé plus haut, il est souvent plus fort).', 'Sorts mineurs (niveau 0) : illimités.', 'Les emplacements reviennent au repos long (au repos court pour l’occultiste).'] },
    { title: 'Préparer ses sorts', lines: ['Chaque classe prépare un nombre de sorts qui augmente avec le niveau ; seuls les sorts préparés se lancent.', 'Dans l’appli : « 📖 Mes sorts » pour cocher, et « ⬆️ Choisir le niveau » pour en apprendre de nouveaux.'] },
    { title: 'DD et attaque de sort', lines: ['DD = 8 + modificateur d’incantation + maîtrise ; attaque de sort = modificateur + maîtrise.', 'La cible fait une sauvegarde contre le DD, ou tu lances une attaque contre sa CA.'] },
    { title: 'Concentration', lines: ['Un seul sort de concentration à la fois. Subir des dégâts : sauvegarde de CON (DD 10 ou moitié des dégâts) sinon le sort s’arrête.', 'Dans l’appli : en combat, la sauvegarde se lance toute seule ; si elle rate, le sort et ses effets (Bénédiction…) s’arrêtent. Le MJ reçoit un rappel quand il retire des PV à la main.'] },
    { title: 'Effets qui durent', lines: ['Bénédiction (+1d4 attaques et sauvegardes), Bouclier (+5 CA jusqu’au prochain tour), Bouclier de la foi (+2 CA), Hâte (+2 CA), Rage (résistance aux coups physiques)…', 'Dans l’appli : lancés depuis la carte ou posés par le MJ, ils s’affichent sur le pion avec les rounds restants et s’appliquent tout seuls.'] },
    { title: 'Zones et rituels', lines: ['Sphère, cube, cône, ligne : toutes les créatures dedans sont touchées (l’appli les trouve sur la carte).', 'Rituel : lancé en 10 minutes de plus, sans emplacement.'] },
  ] },
  { icon: '🌙', title: 'Repos', intro: 'Souffler un peu pour récupérer.', parts: [
    { title: 'Repos court (1 heure)', lines: ['Dépense des dés de vie : chaque dé + modificateur de CON rend des PV.', 'Certaines aptitudes reviennent (Second souffle, Conduit divin, magie de pacte…).'] },
    { title: 'Repos long (8 heures)', lines: ['Tous les PV, la moitié des dés de vie, tous les emplacements de sorts et la plupart des aptitudes.', '−1 niveau d’épuisement. Un seul repos long par 24 h.'] },
  ] },
  { icon: '⬆️', title: 'Monter de niveau', intro: 'L’expérience (ou la décision du MJ) fait progresser les héros, du niveau 1 au 20.', parts: [
    { title: 'À chaque niveau', lines: ['PV : la moyenne du dé de vie + CON (ou lancer le dé), au moins 1.', 'Nouvelles aptitudes de classe ; plus d’emplacements et de sorts pour les lanceurs.', 'Le bonus de maîtrise augmente aux niveaux 5, 9, 13 et 17.'] },
    { title: 'Améliorations', lines: ['Aux niveaux 4, 8, 12, 16 (plus 6 et 14 pour le guerrier, 10 pour le roublard) : +2 à une caractéristique ou +1 à deux (20 maximum), ou un don.', 'Niveau 19 : un don épique.'] },
    { title: 'Les dons', lines: ['Don d’origine : donné par l’historique au niveau 1 (Vigilant, Robuste, Chanceux, Doué, Initié à la magie…). L’humain en a un de plus.', 'Don général : au lieu d’une amélioration, souvent avec +1 à une caractéristique (Résilient, Mage de guerre, Mobile, Sentinelle…).', 'Dans l’appli : effets appliqués tout seuls (initiative, PV, vitesse, sauvegardes, avantage en concentration).'] },
    { title: 'Expérience (XP)', lines: ['Paliers : 300 XP pour le niveau 2, 900 → 3, 2 700 → 4, 6 500 → 5, 14 000 → 6, 23 000 → 7, 34 000 → 8, 48 000 → 9, 64 000 → 10… 355 000 → 20.', 'Beaucoup de MJ préfèrent faire monter tout le groupe à la fin d’une aventure (« par jalons »).'] },
    { title: 'Sous-classe', lines: ['Au niveau 3, chaque classe choisit sa voie : Champion ou Maître de guerre pour le guerrier, Voleur ou Assassin pour le roublard…', 'Elle donne de nouvelles aptitudes à certains niveaux (3, puis 6, 10, 14 selon la classe).'] },
    { title: 'Dans l’appli', lines: ['Le MJ accorde les niveaux : « +1 niveau » sur la fiche ou dans MJ › Distribuer (⭐ Niveau, avec l’XP).', 'Le joueur touche alors « ⬆️ Choisir le niveau » sur sa fiche : PV, sous-classe, améliorations, expertise et nouveaux sorts ; le reste est calculé.', 'Une erreur ? Le MJ touche « −1 » : la dernière montée est annulée (fiche et PV d’avant).'] },
  ] },
  { icon: '💰', title: 'Argent, objets et équipement', intro: 'L’or sert à s’équiper, se soigner et voyager.', parts: [
    { title: 'Les pièces', lines: ['1 pp (platine) = 10 po (or) = 20 pe (électrum) = 100 pa (argent) = 1 000 pc (cuivre).', 'Prix courants : potion de soins 50 po, épée longue 15 po, cotte de mailles 75 po, une nuit à l’auberge 5 pa à 2 po.'] },
    { title: 'Armures et CA', lines: ['Légère : 11 ou 12 + DEX. Intermédiaire : 13 à 15 + DEX (2 max). Lourde : 16 à 18, sans DEX, parfois FOR requise. Bouclier : +2.'] },
    { title: 'Objets magiques', lines: ['Certains demandent une harmonisation (repos court passé avec l’objet) : 3 objets harmonisés au maximum.', 'Dans l’appli : marchands et coffres ouverts par le MJ ; revente à moitié prix.'] },
    { title: 'Le « +1 » des objets magiques', lines: ['Armure +1 : +1 à la CA en plus de l’armure (cotte de mailles +1 = CA 17 au lieu de 16). Bouclier +1 : +3 au lieu de +2.', 'Arme +1 : +1 au jet pour toucher ET +1 aux dégâts.'] },
    { title: 'Emplacements', lines: ['Une seule armure, un bouclier, un couvre-chef, une paire de lunettes, une amulette, une cape, une ceinture, une paire de gants, de bracelets, de bottes ; deux anneaux.', 'Les armes n’ont pas d’emplacement : on peut en avoir plusieurs prêtes. Une arme à deux mains (arc, épée à deux mains…) et un bouclier ne vont pas ensemble. Dans l’appli, équiper un objet retire celui qui occupait déjà la place.'] },
    { title: 'S’équiper', lines: ['Armure : elle remplace ta CA (ex. cotte de mailles 16, chemise de mailles 13 + Dex max 2). Bouclier : +2.', 'Arme équipée : son attaque apparaît sur ta fiche (finesse : la meilleure de FOR et DEX).', 'Dans l’appli : Sac → objet → ⚔️ Équiper ; CA, caractéristiques, vitesse et sauvegardes se mettent à jour (« +1 objets » sous la CA).', 'Donner ou déposer : Sac → objet → choisis un perso ou un coffre ouvert.'] },
  ] },
  { icon: '📱', title: 'Dans l’appli', intro: 'Ce que l’appli fait pour toi, et où trouver chaque chose.', parts: [
    { title: 'Joueur', lines: ['Persos : ta fiche s’ouvre directement ; chaque valeur se lance d’un tap. « 👥 Voir tous les persos » pour consulter le groupe.', 'Quand le MJ t’accorde un niveau : « ⬆️ Choisir le niveau » sur ta fiche.', 'Carte : déplace ton pion, choisis une action puis une cible ; les règles sont appliquées toutes seules.', '🎲 dés libres, 🕘 historique, 🏪 marché quand il est ouvert. Carte : revois les cartes déjà visitées (si le MJ le permet).'] },
    { title: 'MJ', lines: ['Persos : la table (PV, avantage). MJ : distribuer, marché, bestiaire, règles de la table.', 'Carte : décor, portes, objets, pièges (touche-les avec ✋ pour les régler, gardés dans les plans), brouillard, plans préparés, monstres.', 'Lieux (MJ › 📍 Lieux, ou touche le titre en haut) : le lieu s’affiche chez tout le monde ; ses plans, monstres et notes favoris ⭐ passent en premier.', 'Notes : prépare-les cachées, révèle-les au bon moment.'] },
  ] },
];
