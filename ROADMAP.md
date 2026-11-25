# Feuille de route

Basée sur [docs/CAHIER_DES_CHARGES.md](docs/CAHIER_DES_CHARGES.md). Une version = un lot testable par Jo.

## v1.0 ✅ Première version complète

Évolutions arrêtées (décision de Jo) : place aux tests en partie réelle et à l'installation en ligne (docs/MISE_EN_LIGNE.md). Prochaines idées éventuelles, dans les sections ci-dessous (cases non cochées).

## v0.1 ✅ Base générique

Campagnes, fiches génériques, inventaire en direct, dés, notes, PWA.

## v0.1.1 ✅ Maintenance

Fichiers ≤ 300 lignes, carte du code générée, cahier des charges D&D.

## v0.2 ✅ Fiche D&D 2024 (cœur)

- [x] Modèle de données D&D (`lib/dnd/`) : caracs, maîtrise, compétences, sauvegardes, calculs testés.
- [x] Fiche : identité, caracs, sauvegardes, compétences (jet en un tap), CA/initiative/vitesse/perception passive.
- [x] Survie : PV/PV temp, dés de vie, jets contre la mort, états + épuisement, inspiration.
- [x] Repos court / long.
- [x] Monnaie D&D (pc/pa/pe/po/pp).
- [x] Vue MJ compacte pour 7 joueurs.

## v0.3 ✅ Attaques, sorts, capacités

- [x] Attaques (arme/sort) : jet attaque + dégâts, critique, avantage.
- [x] Sorts : DD/bonus auto, emplacements à cocher, préparés, concentration.
- [x] Capacités avec utilisations et recharge.
- [x] Objets équipés, harmonisation.

## v0.3.1 ✅ Droits joueurs + bibliothèque de sorts

- [x] Le joueur ne se redonne rien (PV, sorts, capacités, objets, pièces) ; il utilise seulement.
- [x] Capacités et sorts gérés par le MJ ; bibliothèque de 140 sorts SRD.

## v0.3.x À venir (sur demande de Jo)

- [ ] Utiliser un objet avec effet : potion de soins qui rend des PV (le seul cas où le joueur se soigne lui-même).
- [ ] Achat chez un marchand (le joueur reçoit un objet contre des pièces).

## v0.4 ✅ Combat (MJ)

- [x] Initiative persos + monstres, tour actif visible par tous, rounds.
- [x] Monstres : PV (cachés aux joueurs), CA, états.

## v0.4.x Idées combat

- [ ] Avantage/désavantage automatique selon les états (empoisonné, à terre, invisible…).
- [ ] Bibliothèque de monstres SRD (PV, CA, attaques pré-remplis).
- [ ] Durée des effets en rounds (Bénédiction 10 rounds…), rappel de fin de concentration en cas de dégâts.

## v0.5 ✅ Actions de combat des joueurs

- [x] Zones et distances, ciblage dans les deux sens, actions avec coût/portée/utilisations, économie du tour.
- [x] Résolution automatique (CA, sauvegardes, soins), objets de soin.

## v0.6 ✅ Carte, sorts surpuissants, monstres, historique

- [x] Carte en grille (MJ place, joueur se déplace pendant son tour), distances automatiques, Foncer.
- [x] Sorts lancés à un niveau supérieur, attaques des monstres jouées par le MJ, historique 🕘.

## v0.7 ✅ Plan, décor, zones, réactions

- [x] Carte hors combat, plan en fond, murs et terrain difficile, chemins.
- [x] Sorts de zone, attaques d'opportunité, sauvegardes des persos contre les monstres.

## Idées

- [ ] Ligne de vue (les murs bloquent les sorts et attaques à distance), brouillard de guerre.
- [ ] Portée longue des armes à distance (avec désavantage).
- [ ] Plusieurs cartes par campagne (bibliothèque de plans), zoom.
- [ ] Monstres du SRD pré-remplis (Gobelin, Loup, Dragon…) avec leurs attaques.

## v0.8 ✅ Objets, marchands, coffres + carte avancée

- [x] Bibliothèque d'objets (SRD + maison), marchands et coffres préparés et montrés par le MJ, achat, potions.
- [x] Ligne de vue, brouillard de guerre, embuscades, bestiaire SRD, plans enregistrés.
- [x] Vente d'objets aux marchands (reprise à moitié prix). (v0.9)
- [ ] Marchandage (jet de Persuasion pour un meilleur prix).

## v0.20 ✅ Tests de groupe, monstres

- [x] Test demandé au groupe, suggestion du tour des monstres, résistances des espèces, SQL d'installation en un fichier.
- [x] Dons (don d'origine, don au lieu d'une amélioration) ; compagnons et invocations contrôlés par un joueur ; vision dans le noir et lumière ; message secret depuis les notes (v0.21).
- [x] Code : pages chargées à la demande, tests de bout en bout découpés, guide réorganisé (joueur / MJ) (v0.22).
- [x] Emplacements d'équipement, effets visibles, torches et sorts de lumière (v0.22).
- [x] Arme à deux mains + bouclier interdits ensemble (v0.23).
- [x] v1.0 : fiche protégée, règle de la table côté serveur, rechargements légers, réseau coupé, SQL fusionné, ménage.
- [ ] Effets des bottes elfiques & co. (avantage en Discrétion).

## v0.18 ✅ Confort du MJ

- [x] Zoom de la carte (boutons et pincement), écran du MJ sur une page.
- [x] Concentration, résistances/immunités, effets à durée (v0.19).
- [ ] Effets personnalisés par le MJ (nom, CA, dé, durée) ; dégâts de Rage (+2) ; défenses des espèces (nain : poison, tieffelin : feu) à la création.

## v0.17 ✅ Comptes

- [x] Lien de connexion par email, mot de passe oublié, page Mon compte (pseudo, mot de passe).
- [ ] Connexion avec Google / Apple (réglage Supabase en plus).

## v0.16 ✅ Vrais dés, cartes passées

- [x] Mode vrais dés, sorts dans l'historique, états retirés par le MJ seul, cartes passées consultables, ✉️ retiré.
- [ ] Saisir le résultat d'un vrai dé (le joueur tape son total, l'appli applique : ex. sauvegarde contre un piège).

## v0.15 ✅ Objets équipables, lieux

- [x] Objets équipables (CA, caractéristiques, vitesse, sauvegardes, attaques), liste préfaite, dépôt dans les coffres.
- [x] Lieux préparés avec favoris, lieu affiché en haut ; pièges gardés dans les plans ; icônes coffre et piège.
- [ ] Objets maison avec effets (le MJ choisit +CA, caractéristique…), objets à charges (baguettes), butin aléatoire par FP.

## v0.14 ✅ Niveaux accordés par le MJ, sous-classes, pièges

- [x] Niveaux et XP accordés par le MJ, choix du joueur, −1 niveau (annulation) ; épuisement géré par le MJ.
- [x] Sous-classes au niveau 3 ; pièges qui se déclenchent ; fiche du joueur ouverte directement.
- [ ] Dons (au lieu d'une amélioration), pièges détectables (Perception passive contre le DD), désamorçage (outils de voleur).

## v0.13 ✅ Niveaux, carte enrichie, règles détaillées

- [x] Montée de niveau autonome (PV, aptitudes, sorts, améliorations, expertise).
- [x] Objets et murs sur la carte, portes verrouillées, pièges cachés ; règles détaillées.
- [x] Sous-classes et pièges qui se déclenchent (v0.14).

## v0.11 ✅ Règles automatiques, bestiaire du MJ

- [x] 0 PV : plus d'action, jet contre la mort, finir son tour.
- [x] Avantage automatique (états) + donné par le MJ ; bestiaire de campagne ; règles simplifiées.
- [x] Esquiver et Aider avec effet ; jet contre la mort automatique (v0.12).

## v0.10 ✅ Portes, préparation du MJ

- [x] Portes (vue et passage), pièces fermées cachées aux joueurs.
- [x] Plans et notes préparés à l'avance, révélés au bon moment.
- [ ] Portes verrouillées (crochetage avec un test de Dextérité + outils de voleur).

## v0.9 ✅ Messages secrets, décor, navigation

- [x] Message MJ → un ou plusieurs joueurs (et joueur → MJ), notification + vibration.
- [x] Matériaux du décor (pierre, brique, bois, buisson, table).
- [x] Dés en icône, Marché dans l'onglet MJ.

## v0.12 ✅ Assistant de création

- [x] Étapes guidées 2024 : classe → historique → espèce → caracs (tableau standard, achat de points, dés) → compétences → équipement.
- [ ] Sous-classes, dons d'origine appliqués automatiquement, sorts de départ proposés au MJ.
- [ ] Contenu SRD 5.2 avec attribution CC-BY-4.0.

## Plus tard

- Photo d'avatar, export PDF de la fiche, mode hors-ligne, connexion par lien magique.
- Appliquer `playersEditStats` côté base.
- Dégâts reçus à 0 PV = échec au jet contre la mort (règle pas encore automatisée).
- Compléter la bibliothèque de sorts (les ~340 sorts du SRD) et vérifier les noms avec le PDF français officiel.
- Bibliothèque d'objets et de capacités de classe (SRD).
- Nettoyer les styles hérités de la v0.1 (`.res`, `.stats-grid`, `.char-card`…) dans `fiche.css`.
