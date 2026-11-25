# Cahier des charges

Réponses de Jo (22/11/2026). Référence pour toutes les évolutions.

## Contexte de jeu

| Sujet | Choix |
| --- | --- |
| Jeu | **Donjons & Dragons 5e, règles 2024** (uniquement) |
| Table | 5 à 7 joueurs + 1 MJ, **tous autour d'une table** |
| Appareils | chaque joueur sur son téléphone ; **MJ sur téléphone** aussi |
| Fiche | **complète** : calculs auto, sorts, attaques, états et survie |
| Création de perso | **assistant guidé** |
| Outils MJ | combat/initiative, bibliothèque d'objets, marchands & coffres, messages secrets |

## Règles de la table (décisions de Jo)

- **Le MJ donne, le joueur utilise** : le joueur ne se redonne jamais seul PV, sorts, emplacements, capacités, objets ou pièces.
  Exceptions prévues plus tard : utiliser un objet (potion), repos, achat chez un marchand.
- Les PV sont gérés par le MJ (réglage modifiable). Les jets contre la mort restent au joueur.
- Les capacités et les sorts sont ajoutés par le MJ.

## Conséquences de conception

- **Tout tient sur un écran de téléphone**, MJ compris : vues compactes (listes plutôt que grandes cartes), actions en 1-2 taps.
- Jeu en présentiel : l'appli **complète** la table (pas de carte, pas de chat vocal). Priorité à la rapidité et aux infos secrètes (jets cachés, messages MJ).
- 7 joueurs : la vue MJ doit afficher 7-8 persos + monstres sans défilement pénible.
- Le moteur de modèles génériques (v0.1) est remplacé par une **fiche D&D 2024 dédiée** : données structurées, calculs automatiques.

## Fiche D&D 2024 : contenu attendu

- **Identité** : nom, espèce, classe(s) + sous-classe, niveau, historique, alignement, XP, inspiration héroïque.
- **Caractéristiques** FOR DEX CON INT SAG CHA → modificateurs auto.
- **Bonus de maîtrise** auto selon le niveau total (+2 niv. 1-4, +3 5-8, +4 9-12, +5 13-16, +6 17-20).
- **Sauvegardes** (6) et **compétences** (18) : maîtrise / expertise cochables, bonus calculés, jet en un tap.
- **Défense** : CA, initiative, vitesse, perception passive, taille.
- **Survie** : PV / PV max / PV temporaires, dés de vie par type, jets contre la mort (3 succès / 3 échecs).
- **États** (15 conditions 2024) dont **Épuisement** à niveaux (−2 aux jets d20 par niveau, mort au niveau 6).
- **Attaques** : arme ou sort, bonus d'attaque et dégâts calculés, jet attaque + dégâts en un tap, critique.
- **Sorts** : caractéristique d'incantation, DD et bonus auto, emplacements par niveau à cocher, sorts préparés, rituels, concentration.
- **Équipement** : inventaire (existant) + objets équipés, harmonisation (3 max), monnaie en pc/pa/pe/po/pp.
- **Capacités** : aptitudes de classe/espèce/don avec compteur d'utilisations et recharge (repos court/long).
- **Repos court / long** : un bouton qui applique les recharges (PV, dés de vie, emplacements, capacités).

## Contenu de règles (droits d'auteur)

Seul le **SRD 5.2** (règles 2024, licence Creative Commons CC-BY-4.0) peut être intégré dans l'appli : espèces, classes (1 sous-classe chacune), historiques, sorts, objets et monstres du SRD, avec la mention d'attribution obligatoire. Le contenu hors SRD (autres sous-classes, livres de suppléments) : saisie libre par les joueurs. À vérifier précisément au moment de l'implémentation.

## Outils MJ attendus

- **Combat** : ordre d'initiative (persos + monstres), tour actif visible par tous, PV des monstres cachés aux joueurs, états, rounds.
- **Bibliothèque d'objets** : objets types réutilisables, distribution en un tap (SRD + objets maison).
- **Marchands & coffres** : inventaires de PNJ, ouverts aux joueurs par le MJ, achat/vente avec la bourse, butin à partager.
- **Messages secrets** : texte du MJ à un ou plusieurs joueurs, notification + vibration.
