# Grimoire JDR

Application mobile (PWA installable sur Android et iPhone) pour gérer ses personnages de **Donjons & Dragons 5e (2024)**, avec un MJ qui pilote la table **en direct** : inventaires, bourse, PV, jets de dés, notes de campagne.

## Fonctions (v1.0)

| Pour les joueurs | Pour le MJ |
| --- | --- |
| Équipement par emplacement (armure, tête, cape, bottes, 2 anneaux…) et effets visibles (« CA 12 → 17 ») | Torches à allumer / éteindre, sorts de lumière |
| Dons (origine et à la place d'une amélioration) ; compagnons et invocations à appeler sur la carte ; vision dans le noir | Obscurité sur la carte (torches, lanternes, vision dans le noir) ; message secret : note envoyée à certains joueurs |
| Choix des gains à chaque niveau accordé (PV, sous-classe, aptitudes, sorts, améliorations) | Niveaux et XP accordés, −1 niveau en cas d'erreur, épuisement de groupe |
| Objets équipables (armures, armes, objets magiques) : la fiche se met à jour | Liste préfaite d'objets à mettre dans les coffres ou à donner ; lieux préparés avec favoris |
| Fiche ouverte directement, groupe consultable | Carte : murs, terrain, portes verrouillées, objets, pièges réglables qui se déclenchent |
| Assistant de création guidé (classe, historique, espèce, caracs, compétences, équipement) | Assistant aussi pour les PNJ |
| Fiche D&D 2024 : caracs, sauvegardes, 18 compétences, calculs automatiques | Table de jeu compacte (PV, CA, perception passive, états) |
| Jets en un tap, avantage / désavantage, épuisement inclus | Dégâts, soins, PV temp., repos long, états à un ou plusieurs persos |
| Attaques (jet, dégâts, critique), capacités, sorts et emplacements, concentration | Distribution d'objets et de pièces en direct |
| Jets contre la mort, objets équipés / harmonisés | PV gérés par le MJ (réglable) |
| Combat : ses actions (coût, portée, utilisations), ciblage selon la distance, PV appliqués tout seuls | Combat : ordre d'initiative, tours, rounds, monstres aux PV secrets |
| Utiliser : emplacements, capacités, objets, pièces | Seul à donner : sorts (bibliothèque SRD de 140 sorts), capacités, objets, pièces |
| Inventaire, pièces (pp/po/pe/pa/pc), notes | Jets cachés, règles de la table, exclusion de joueurs |
| Carte (aussi hors combat) : déplacement, sorts de zone visés, attaques d'opportunité | Carte : plan en fond, murs, terrain difficile, pions ; attaques et souffles des monstres |
| Marché : acheter chez les marchands, prendre dans les coffres, boire ses potions | Marchands et coffres préparés à l'avance, montrés quand tu veux ; bestiaire SRD, brouillard, plans |
| Revendre ses objets ; revoir les cartes déjà visitées | Cartes passées partagées ou cachées ; mode « vrais dés » ; décor de carte |
| Ouvrir les portes au contact ; pièces fermées cachées | Plans et notes préparés à l'avance, révélés au bon moment ; portes |
| Avantage/désavantage automatiques ; à 0 PV : jet contre la mort et fin de tour | Avantage donné en un tap ; bestiaire de monstres préparés ; règles simplifiées sur l'accueil |
| Historique 🕘 de la partie (jets, dégâts, objets, tours) | Historique 🕘 de la partie |

## Deux modes

- **Démo** (aucune configuration) : données dans le navigateur. Pour tester MJ + joueur, ouvre deux onglets.
- **En ligne** (Supabase) : comptes, données partagées entre téléphones, temps réel. Voir [docs/MISE_EN_LIGNE.md](docs/MISE_EN_LIGNE.md) (≈ 15 min, gratuit).

## Documentation

- [docs/MISE_EN_LIGNE.md](docs/MISE_EN_LIGNE.md) : mettre l'appli en ligne pas à pas
- [docs/GUIDE.md](docs/GUIDE.md) : utilisation (joueurs et MJ)
- [docs/CAHIER_DES_CHARGES.md](docs/CAHIER_DES_CHARGES.md) : besoins (D&D 2024, table de 5-7 joueurs)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) : organisation du code, « où modifier quoi »
- [docs/CARTE_DU_CODE.md](docs/CARTE_DU_CODE.md) : chaque fichier et ses fonctions (généré)
- [ROADMAP.md](ROADMAP.md) / [CHANGELOG.md](CHANGELOG.md)
- [docs/LICENCES.md](docs/LICENCES.md) : attribution SRD 5.2.1 (CC-BY-4.0)
- [CLAUDE.md](CLAUDE.md) : consignes pour Claude (développement autonome)

## Commandes (développeurs)

```bash
npm install
npm run dev        # serveur local
npm test           # tests unitaires
npm run build      # build de production dans dist/
```
