# Journal des versions

## 1.0.0 (24/11/2026) : première version complète (ménage et sécurité avant installation)

**SQL** : la base tient maintenant en 9 fichiers par thème (`supabase/migrations/01_tables.sql` → `09_combat.sql`) au lieu de 28 migrations ; `installation_complete.sql` passe de 4 000 à 2 100 lignes. Schéma vérifié identique à l'ancien (comparaison complète des deux bases), puis corrigé :

- **Fiche protégée** : un joueur ne peut plus modifier sa fiche en écrivant directement dans la base (niveau, caracs, CA…). Il passe forcément par l'appli, qui vérifie tout. Nom, avatar et notes restent libres.
- **Règle « les joueurs modifient leur fiche »** appliquée aussi par le serveur : désactivée, le joueur ne change plus que ses états, sa concentration et son inspiration.
- **Rechargements légers (en ligne)** : seule la partie qui a changé est relue (un jet de dé d'un autre joueur s'ajoute sans rien recharger) ; les suppressions dans d'autres parties sont ignorées. Tout est relu au retour de veille ou de connexion.
- **Réseau coupé** : pastille « 📡 Hors connexion » ; une action envoyée pendant une coupure est renvoyée toute seule (2 fois, jusqu'à 20 s d'attente), sinon un message clair.
- **Ancien ✉️ Messages supprimé** (écran, table, opérations, notifications) : les messages secrets passent par les notes.
- **Historique des niveaux allégé** : 3 dernières montées gardées (au lieu de 5), sorts mémorisés par leur identifiant seulement ; annuler retire les sorts appris sans toucher aux autres.
- **Code** : recherche sans accents et modificateur de caractéristique écrits une seule fois (5 et 4 copies avant), malus d'épuisement centralisé.
- **Tests** : nouveaux tests du chargement par morceaux, du réseau, de la sécurité SQL ; tests de bout en bout fiabilisés (onglets réappuyés si besoin), 3 passages d'affilée sans erreur.

## 0.23.0 (24/11/2026) : arme à deux mains et bouclier

⚠️ En ligne : nouveau script `028_deux_mains.sql` (déjà dans `installation_complete.sql`, à exécuter à la fin).

- **🤲 Deux mains** : une arme à deux mains (arcs, arbalètes, épée et hache à deux mains, coutille, hallebarde, pique, maillet, massue, ou tout objet « à deux mains ») et un bouclier ne vont pas ensemble. Équiper l'un retire l'autre, avec un message. Étiquette « 🤲 Deux mains » dans le sac.

## 0.22.0 (24/11/2026) : emplacements d'équipement, lumière, guide refait

⚠️ En ligne : 2 nouveaux scripts `026_emplacements.sql`, `027_lumiere.sql` (déjà dans `installation_complete.sql`, à exécuter à la fin).

- **⚔️ Emplacements** (règles 2024) : une armure, un bouclier, un couvre-chef, des lunettes, une amulette, une cape, une ceinture, des gants, des bracelets, des bottes, 2 anneaux. L'emplacement s'affiche à côté de chaque objet. Équiper un objet retire celui qui occupait la place (message). Les armes n'ont pas d'emplacement.
- **Équipement porté** (en haut du Sac) : les emplacements occupés, et ce que l'équipement change sur la fiche (« CA 10 → 17 · FOR 10 → 19 · vitesse +3 m · attaques : Rapière +1 »). Les objets sans effet calculé (bottes elfiques, objets maison) sont signalés.
- **Le « +1 » expliqué** : « CA 17 (armure 16 + 1 magique) », « +3 CA (bouclier 2 + 1 magique) », « +1 au toucher et aux dégâts » pour les armes ; aussi dans les règles (Argent, objets).
- **💡 Lumière** : torches de la carte à allumer / éteindre (touchées au contact, comme une porte ; 🪵 torche éteinte dans le Décor) ; sorts Lumière (6 m), Lumière du jour (18 m), Lueurs féeriques (3 m, aussi sur un ennemi) éclairent dans l'obscurité.
- **Appli plus légère en ligne** : carte, marché, dés, écrans du MJ et assistant de création se chargent au premier passage.
- **Guide** (docs/GUIDE.md) réorganisé : partie joueur, partie MJ, par thème.
- **Tests** : scénarios de bout en bout indépendants (`partie`, `objets`, `messages`), relançables un par un.

## 0.21.0 (24/11/2026) : dons, compagnons, vision dans le noir

⚠️ En ligne : 3 nouveaux scripts `023_dons.sql`, `024_compagnons.sql`, `025_combat_compagnons.sql` (déjà inclus dans `installation_complete.sql`, à exécuter à la fin avec le reste).

- **🎖️ Dons** (règles 2024, 20 dons) : le don d'origine de l'historique est appliqué à la création (Vigilant : initiative, Robuste : PV, Chanceux : points de chance, Doué : 3 compétences au choix, Initié à la magie : sorts au choix, Bagarreur : coup à mains nues…). L'humain choisit un don d'origine en plus. Aux niveaux d'amélioration : « 💪 Amélioration » ou « 🎖️ Un don » (Résilient, Mage de guerre, Mobile, Sentinelle, Tireur d'élite…), effets appliqués et annulables par le MJ (−1).
- **🐾 Compagnons et invocations** : sur la fiche (onglet Combat), ajoute un familier, une bête, une monture ou un esprit invoqué (11 modèles, PV et CA réglables). Sur la carte : « 🐾 Appeler » le fait venir à côté du perso, il joue juste après lui, avec ses propres PV, CA, vitesse et attaques ; « Renvoyer » le retire.
- **🌑 Obscurité** (outils de la carte, MJ) : les joueurs ne voient que les cases éclairées (torches de la carte, torche ou lanterne équipée) et ce qui est à portée de leur vision dans le noir (espèce, ou réglable sur la fiche). Le MJ voit tout, les zones sombres pour les joueurs sont assombries chez lui.
- **✉️ Messages secrets** : une note cachée peut être envoyée directement à certains joueurs (cases à cocher dans la note, bouton « ✉️ Envoyer ») ; « 📣 Révéler » sert à la montrer à toute la table.

## 0.20.0 (23/11/2026) : tests de groupe, suggestion pour les monstres, résistances des espèces, SQL en un fichier

Pas de nouveau script SQL. **Nouveau : `supabase/installation_complete.sql`** = toutes les migrations en un seul fichier, pour la mise en ligne.

- **🎯 Test demandé au groupe** (écran du MJ) : compétence, sauvegarde ou caractéristique, DD (montré ou non), persos choisis, jets cachés ou non. Les joueurs sont prévenus et lancent depuis un bandeau qui reste en haut de l'écran (avantage automatique compris) ; en mode vrais dés, ils tapent leur total. Le MJ voit les résultats arriver (✓ réussi / ✗ raté).
- **💡 Tour des monstres** : sur la carte, pendant le tour d'un monstre, une suggestion « Cimeterre sur Thalia (contact) » (ennemi debout le plus proche qu'une attaque peut viser). Un tap la prépare, le MJ lance ou choisit autre chose.
- **Résistances des espèces** à la création : nain (poison), aasimar (nécrotique, radiant), tieffelin et drakéide (héritage à choisir dans l'assistant).
- **Notifications** : plus de doublons à l'écran.
- **SQL** : `scripts/sql-complet.mjs` génère le fichier unique, testé sur une base neuve (`bash scripts/test-sql.sh complet`).

## 0.19.0 (23/11/2026) : concentration, résistances, effets à durée

⚠️ En ligne : exécuter `supabase/migrations/022_effets_concentration.sql` (avec les autres, à la fin).

- **Concentration automatique** : un perso concentré qui prend des dégâts en combat fait tout seul sa sauvegarde de CON (DD 10 ou la moitié des dégâts). Ratée (ou à 0 PV) : il perd sa concentration et les effets du sort disparaissent. Résultat dans l'historique. Dégâts donnés à la main par le MJ : rappel « sauvegarde de CON DD X ». 🧠 + nom du sort sur sa ligne.
- **Types de dégâts et défenses** : le type (feu, froid, tranchant…) est lu dans l'attaque, le sort ou l'attaque du monstre. Résistance = moitié, immunité = 0, vulnérabilité = ×2. Le MJ règle les défenses d'un monstre (détail du combattant, bestiaire) ou d'un perso (fiche, États et repos) en touchant les types. Monstres du SRD déjà réglés (squelette, zombie, dragons…).
- **Effets à durée** : Bénédiction, Fléau, Bouclier, Bouclier de la foi, Hâte, Lenteur, Rage, Peau de pierre. Lancés depuis la carte (sort ou capacité du même nom) ou posés par le MJ (détail du combattant). Icône et rounds restants sur la ligne ; CA, dés d'attaque et de sauvegarde, résistances appliqués tout seuls ; un nouveau sort de concentration remplace l'ancien.

## 0.18.0 (23/11/2026) : zoom de la carte, écran du MJ

Pas de script SQL à exécuter.

- **Zoom de la carte** : boutons − / + (×1, ×1,5, ×2, ×3) en haut de la carte, ou pincement à deux doigts. La carte se recentre sur le pion choisi, le tien ou celui dont c'est le tour ; on fait défiler d'un doigt. Le niveau est retenu sur le téléphone.
- **Écran du MJ** (onglet 🛡️ Persos du MJ) : tout sur une page. En combat : round, tour, ordre d'initiative avec les PV (toucher un combattant ouvre son détail), « Tour suivant ▶ ». Puis la table des persos (PV, CA, avantage) et « Distribuer en direct » (déplacé depuis l'onglet MJ).

## 0.17.0 (23/11/2026) : comptes des joueurs

⚠️ En ligne : exécuter `supabase/migrations/021_compte.sql`, et régler l'adresse de retour des emails (docs/MISE_EN_LIGNE.md, étape 3.5).

- **Connexion** (mode en ligne) : compte email + mot de passe qui garde persos, campagnes et progression sur tous les appareils ; on reste connecté jusqu'à « Déconnexion ».
- **📧 Lien de connexion par email** (sans mot de passe) et **mot de passe oublié** (email → choisir un nouveau mot de passe dans l'appli).
- **👤 Mon compte** (accueil, en haut à droite) : changer son pseudo (aussi dans toutes ses campagnes), son mot de passe, se déconnecter. En démo : rappel que les données restent sur l'appareil.

## 0.16.0 (23/11/2026) : vrais dés, cartes passées, états gérés par le MJ

⚠️ En ligne : exécuter `supabase/migrations/020_etats_cartes.sql` dans Supabase.

- **États** : un joueur peut se mettre un état (à terre…), mais seul le MJ le retire (vérifié côté serveur).
- **🎲 Vrais dés** (MJ › Partie › Règles de la table) : les jets lancés depuis la fiche des joueurs ne sont plus lancés par l'appli ni écrits dans l'historique ; la fiche rappelle juste quoi lancer (« Initiative : lance 1d20 +2 »). Le jet contre la mort et les actions sur la carte restent automatiques.
- **Sorts dans l'historique** : lancer un sort sans jet de dégâts écrit « ✨ Thalia lance Bouclier (emplacement niv. 1) » (pas en mode vrais dés).
- **Cartes passées** : chaque plan ouvert par le MJ est gardé ; les joueurs peuvent le revoir (onglet Carte, puces au-dessus de la carte, lecture seule, pièges cachés retirés). Le MJ choisit la carte active (« Ouvrir ») et, pour chaque plan déjà montré, 👁️ revoir autorisé / 🙈 caché.
- **Image de fond** : bouton « 🖼️ Image de fond (galerie) » directement sous la carte.
- **✉️ Messages secrets** retirés de la barre du haut.
- **Nouveaux objets** : ceinturons de force de géant (FOR 21 à 29), boucliers +2/+3, cuir clouté +2, demi-plate +1, harnois +1, arc long +2, épée longue +3, pierre de Ioun (protection).

## 0.15.0 (23/11/2026) : objets équipables, lieux, coffres, nouvelles icônes

⚠️ En ligne : exécuter `supabase/migrations/018_objets.sql` puis `019_sauvegardes_objets.sql` dans Supabase.

- **Objets équipables** : armures (la CA est recalculée), bouclier, armes (l'attaque s'ajoute à la fiche), objets magiques (Cape et Anneau de protection +1 CA/sauvegardes, Bracelets de défense, Gantelets de puissance d'ogre FOR 19, Bandeau d'intellect, Amulette de santé, Bottes de vitesse, Pierre porte-bonheur, armes et armures +1/+2…). Sac → objet → ⚔️ Équiper : la fiche change toute seule, et revient exactement comme avant en retirant l'objet. « +N objets » sous la CA.
- **Liste préfaite** élargie (~80 objets) : à glisser dans un coffre ou à donner depuis MJ › Distribuer › 🎁 Objet (liste proposée en tapant, effets affichés).
- **Donner / déposer** : Sac → objet → un autre perso, ou un coffre ouvert (et « Déposer dans… » sur la page du coffre).
- **Lieux** (MJ › 📍 Lieux) : préparés à l'avance (nom, icône, notes secrètes) avec des favoris ⭐ (plans, monstres, notes) mis en premier dans la Carte, l'ajout de monstres et les Notes. « 📍 Y aller » : le lieu s'affiche en haut au centre chez tout le monde (le MJ touche le titre pour en changer) ; les joueurs sont prévenus.
- **Pièges** gardés dans les plans enregistrés (et dans les plans préparés).
- Nouvelles icônes dessinées pour le **coffre** et le **piège** (ouvert / déclenché).

## 0.14.0 (23/11/2026) : niveaux accordés par le MJ, sous-classes, pièges, fiche directe

⚠️ En ligne : exécuter `supabase/migrations/017_niveaux_mj_pieges.sql` dans Supabase.

- **Niveaux accordés par le MJ** : bandeau « Niveau » sur la fiche (XP, prochain palier). Le MJ touche « +1 niveau » (fiche, ou MJ › Distribuer › ⭐ Niveau pour plusieurs persos) ou donne de l'XP (le palier accorde le niveau). Le joueur est prévenu et touche « ⬆️ Choisir le niveau » pour choisir ses gains, un niveau à la fois. **−1** (double appui) : retire un niveau accordé, ou annule la dernière montée (fiche et PV d'avant). Le joueur ne peut plus changer son niveau, son XP ni son épuisement.
- **Sous-classes au niveau 3** : 4 par classe (celle du SRD avec ses aptitudes nommées : Champion, Berserker, Voleur…, les autres avec une aptitude générique) ; choisie à la montée au niveau 3 ou dans l'assistant si le perso commence au niveau 3+. Ses aptitudes arrivent aux bons niveaux.
- **Pièges qui se déclenchent** : le MJ touche un piège (outil ✋) pour le régler (Fosse, Fléchettes, Lame, Rune ou maison : sauvegarde, DD, dégâts, moitié). Quand un pion s'arrête dessus (déplacement d'un joueur, ou n'importe quel pion en combat), jet de sauvegarde et dégâts calculés, puis le piège devient visible 💥. Récit dans l'historique.
- **Onglet Persos** : un joueur arrive directement sur sa fiche ; « 👥 Voir tous les persos » (ou ←) pour consulter le groupe en lecture seule. Le MJ arrive sur la table.
- **Épuisement** géré par le MJ : sur la fiche, ou pour un groupe dans MJ › Distribuer › 🌀 État (+1 / −1).
- Règles mises à jour (XP, sous-classes, pièges, épuisement).

## 0.13.0 (22/11/2026) : montée de niveau autonome, carte enrichie, règles détaillées

⚠️ En ligne : exécuter `supabase/migrations/016_niveaux_carte.sql` dans Supabase.

- **⬆️ Monter de niveau** (bouton en haut de la fiche, joueur ou MJ) : PV (moyenne ou dé de vie), aptitudes de classe 2024 ajoutées (avec utilisations : Rage, Second souffle, Conduit divin…), emplacements de sorts et sorts préparés recalculés, nouveaux sorts mineurs et sorts à choisir dans la bibliothèque de la classe, amélioration de caractéristiques (+2 / +1+1) aux bons niveaux, expertise (roublard, barde, rôdeur), attaques supplémentaires. Vérifié côté serveur (`level_up`).
- **Création** : l'assistant ajoute aussi les aptitudes de classe, les emplacements de sorts, et propose les sorts de départ (choisis dans la bibliothèque) ; le niveau de départ se choisit à la première étape.
- **Carte** : palette par groupes — Murs (pierre, brique, bois, glace, grille), Terrain (difficile, buisson, eau, éboulis), Portes (fermée, ouverte, 🔒 verrouillée : seul le MJ l'ouvre), Objets (table, coffre, trésor, tonneau, pilier, statue, escalier, torche, piège invisible pour les joueurs). Nouvelles icônes dessinées pour les portes et la table.
- **Règles** : 12 thèmes détaillés (dés, caractéristiques et compétences, avantage, combat, PV et mort, états, magie, repos, niveaux, argent et objets, l'appli), avec une recherche.

## 0.12.0 (22/11/2026) : assistant de création, Esquiver/Aider, jet contre la mort automatique

⚠️ En ligne : exécuter `supabase/migrations/015_esquiver_aider.sql` dans Supabase.

- **Assistant de création** (règles 2024), en 6 étapes : classe (rôle, caractéristiques clés), historique (bonus de caractéristiques, 2 compétences, don), espèce (taille, vitesse, traits), caractéristiques (tableau standard proposé selon la classe, achat de 27 points ou 4d6 ; bonus +2/+1 ou +1/+1/+1), compétences de classe (+1 pour l'humain), équipement de départ ou or. La fiche est remplie : PV, CA selon l'armure, sauvegardes, compétences, attaques de départ, vitesse, notes (traits, don, équipement à donner par le MJ). « Création rapide » reste possible.
- **Esquiver** : les attaques contre lui ont le désavantage jusqu'à son prochain tour (🛡️ sur sa ligne).
- **Aider** : l'allié ciblé (au contact) a l'avantage à sa prochaine attaque (🤝), puis l'aide disparaît.
- **0 PV** : au début du tour, le jet contre la mort se lance tout seul sur le téléphone du joueur, puis le tour passe (sur un 20, le perso se relève avec 1 PV et joue).

## 0.11.0 (22/11/2026) : 0 PV, avantage automatique, bestiaire du MJ, règles simplifiées

⚠️ En ligne : exécuter `supabase/migrations/014_a_terre_tour.sql` dans Supabase.

- **0 PV en combat** : plus d'action, de déplacement ni de réaction. Pendant son tour, le joueur fait son jet contre la mort puis touche « ⏭️ Finir mon tour ». Bloqué aussi côté serveur.
- **Finir mon tour** : bouton pour le joueur pendant son tour (le suivant est prévenu), en plus du « Tour suivant » du MJ.
- **Avantage / désavantage automatiques** (règles 2024) : états du lanceur (empoisonné, effrayé, aveuglé, à terre, entravé, agrippé, invisible), états de la cible (à terre au contact ou à distance, étourdie, paralysée, inconsciente, entravée, aveuglée, invisible). Ils s'annulent entre eux. La raison s'affiche dans le jet (« avantage : cible à terre, au contact »).
- **Le MJ donne l'avantage** : le choix Désav. / Normal / Avantage disparaît pour le joueur. Le MJ le donne depuis la table (bouton 🎲 Normal / 🎯 Avantage / ⚠️ Désav. sur la ligne du perso) ou en haut de la fiche ; il reste jusqu'à ce que le MJ le retire. En combat, le MJ peut forcer le mode pour ses monstres.
- **Bestiaire du MJ** (onglet MJ → 🐉 Bestiaire) : monstres préparés à l'avance (PV, CA, initiative, vitesse, sauvegardes, attaques et souffles), à partir de rien ou d'un monstre du SRD. Ils apparaissent dans « Mes monstres » à l'ajout au combat et dans les plans préparés.
- **📖 Les règles en 2 minutes** sur l'accueil : D&D expliqué très simplement (d20, caractéristiques, avantage, combat, 0 PV, sorts, repos, l'appli).

## 0.10.0 (22/11/2026) : portes, plans préparés à l'avance, notes préparées

⚠️ En ligne : exécuter `supabase/migrations/013_portes_notes.sql` dans Supabase.

- **Portes** (🖌️ Décor → 🚪 Porte) : fermée, elle bloque le passage et la vue ; touche-la pour l'ouvrir ou la fermer (MJ partout, joueur avec un perso au contact, pendant son tour en combat). Les joueurs ne voient pas l'intérieur d'une pièce fermée par une porte, même sans brouillard ; le MJ voit tout.
- **Plans préparés à l'avance** : « 🛠️ Préparer un nouveau plan » ou ✏️ sur un plan enregistré ouvre un éditeur complet (nom, décor, portes, image, taille, brouillard, monstres du bestiaire) sans toucher la carte affichée. Les joueurs ne voient rien avant « Ouvrir ».
- **Notes préparées** : les notes du MJ sont cachées par défaut (filtre 🙈 Préparées) ; « 📣 Révéler » à toute la table ou seulement à certains joueurs, avec notification.

## 0.9.0 (22/11/2026) : revente, messages secrets, matériaux du décor, nouvelle navigation

⚠️ En ligne : exécuter `supabase/migrations/012_vente_messages.sql` dans Supabase.

- **Revente** : chez un marchand visible, « Vendre à … (moitié prix) » liste les objets du sac (sauf équipés). Le prix vient du marchand s'il vend le même objet, sinon de la bibliothèque ; l'objet rejoint son stock au prix plein. Le MJ peut décocher « Rachète les objets des joueurs ».
- **Messages secrets ✉️** (en haut) : le MJ écrit à un, plusieurs ou tous les joueurs ; un joueur écrit au MJ. Seuls l'auteur et les destinataires les voient. Notification + vibration, pastille « non lu ».
- **Décor de la carte** : outil 🖌️ Décor avec 5 matériaux + terrain difficile : 🪨 pierre, 🧱 brique, 🪵 bois (murs), 🌳 buisson (cache la vue, terrain difficile), 🪑 table (bloque le passage, pas la vue). En mode ✋ Pions, toucher un mur change son matériau.
- **Navigation** : en bas il reste Persos, Carte, Notes (+ MJ). Les dés passent en icône 🎲 en haut, à côté de ✉️ et 🕘. Le Marché est dans l'onglet MJ (volet 🏪 Marché) ; pour les joueurs, une icône 🏪 apparaît en haut quand un marchand ou un coffre est ouvert.

## 0.8.0 (22/11/2026) : marchands, coffres, potions, ligne de vue, brouillard, bestiaire, plans

⚠️ En ligne : exécuter `supabase/migrations/011_marchands.sql` dans Supabase.

- **Onglet 🏪 Marché** : le MJ prépare à l'avance des **marchands** et des **coffres** (nom, icône, description, objets, prix, stock), cachés par défaut ; 👁️ les montre aux joueurs au bon moment (notification). L'onglet n'apparaît chez les joueurs que s'il y a quelque chose à voir.
- **Achat** : le joueur achète avec la bourse de son perso (monnaie rendue automatiquement) ; l'objet quitte le marchand et arrive dans son sac. Coffre : « Prendre », gratuit. Tout est noté dans l'historique.
- **Bibliothèque d'objets** (SRD) : 51 armes, armures, potions, équipements et objets magiques avec leur prix ; suggestions dans l'inventaire (MJ) et ajout en un tap chez les marchands. Objets maison possibles.
- **Potions** : bouton **🧪 Boire** dans le sac (PV rendus tout de suite) ; en combat, depuis l'onglet Carte (action bonus, sur soi ou un allié au contact).
- **Ligne de vue** : les murs bloquent attaques à distance, sorts et zones d'effet (la boule de feu ne traverse plus les murs).
- **Brouillard de guerre** (option du MJ, distance de vue réglable) : les joueurs ne voient que ce que voient leurs persos ; les monstres hors de vue disparaissent. **Embuscade** : le MJ peut cacher des monstres aux joueurs.
- **Bestiaire** : 26 monstres du SRD pré-remplis (Gobelin, Loup, Orc, Troll, jeunes dragons avec souffle…) dans l'ajout de monstres.
- **Plans enregistrés** : le MJ enregistre la carte (décor, image, monstres placés) et en rouvre une autre ; les persos suivent le groupe.

## 0.7.0 (22/11/2026) : plan, décor, sorts de zone, attaques d'opportunité

⚠️ En ligne : exécuter `supabase/migrations/010_plan_reactions.sql` dans Supabase.

- **Onglet Carte** (ex-Combat) : la carte reste visible **hors combat**. Exploration : le MJ déplace tous les pions, chaque joueur déplace le sien librement. « Terminer le combat » garde la carte et les pions (monstres vaincus retirés) ; « Vider la carte » dans les outils du MJ.
- **Plan** : le MJ pose une image de fond (photo ou plan du donjon, compressée automatiquement) et choisit la taille de la grille.
- **Décor** : le MJ peint des **murs** (infranchissables) et du **terrain difficile** (déplacement ×2) au doigt. Les déplacements suivent le chemin le plus court : on contourne murs et ennemis, on traverse les alliés.
- **Préparer un combat** : bouton du MJ qui demande aux joueurs leur initiative (notification), puis « Démarrer ».
- **Sorts de zone** : sphère, cube, cône, ligne. Choisis le sort, touche la case visée : la zone s'affiche et les créatures dedans deviennent les cibles (touche un nom pour le retirer). Cône, ligne et cube partent du lanceur quand la portée est « soi-même ». 19 sorts de la bibliothèque pré-remplis ; zone réglable sur tout sort (fiche du sort).
- **Attaques d'opportunité** : quitter le contact d'un ennemi pendant son tour propose une attaque (réaction) à celui qui le contrôle (joueur ou MJ), avec notification. « Se désengager » l'évite.
- **Sauvegardes des persos** : le MJ crée des attaques de monstre « à sauvegarde » (souffle : DD, caractéristique, moitié, zone). Le jet de sauvegarde du perso est lancé automatiquement et affiché (« sauvegarde ratée (13) »).
- **Historique** : les dégâts infligés par le MJ aux monstres sont visibles par le MJ seul.

## 0.6.0 (22/11/2026) : carte, sorts surpuissants, attaques des monstres, historique

⚠️ En ligne : exécuter `supabase/migrations/009_carte_historique.sql` dans Supabase.

- **Carte de combat** (remplace les zones) : grille où 1 case = 1,5 m (diagonales comprises). Persos placés à gauche, monstres à droite.
  Le MJ touche un pion puis une case pour le placer ; il peut changer la taille de la carte. Les distances et portées se calculent seules.
- **Déplacement du joueur** pendant son tour : touche ton pion, les cases atteignables s'allument ; le mouvement restant est décompté (« Déplacement 7,5 m »).
- **Actions de base** pour tous : Foncer (déplacement ×2), Esquiver, Se désengager, Aider, Se cacher.
- **Sorts à niveau supérieur** : choisis l'emplacement (niv. 1, 2, 3…) avant de lancer ; les dés en plus s'ajoutent (champ « + / niveau » du sort, pré-rempli pour la bibliothèque).
- **Attaques des monstres** : le MJ les saisit (nom, bonus, dégâts, portée, attaques par action) et les joue pendant le tour du monstre comme un joueur ; touché/raté contre la CA du perso et PV appliqués.
- **Historique 🕘** (en haut à droite, pastille = nouveautés) : panneau qui glisse depuis la droite avec tous les jets, attaques, dégâts/soins du MJ, objets donnés ou utilisés, pièces, repos, débuts de round. Filtres Tout / Événements / Jets.

## 0.5.0 (22/11/2026) : actions de combat des joueurs

⚠️ En ligne : exécuter `supabase/migrations/008_actions_combat.sql` dans Supabase.

- **Positions par zones** (en attendant la carte) : 5 zones en ligne, même zone = contact (1,5 m), chaque zone d'écart = 9 m.
  Le MJ touche un combattant puis une zone (ou un autre combattant) pour le déplacer. La distance avec ton perso s'affiche sur chaque combattant.
- **Panneau « Mes actions »** dans l'onglet Combat : attaques, sorts préparés, capacités et objets de soin, avec coût (A action, B bonus, R réaction), portée et utilisations restantes.
- **Économie du tour** affichée : action, action bonus, réaction (et attaques restantes avec Attaque supplémentaire). Remise à zéro au début de ton tour.
- **Ciblage** : choisis une action → les combattants à portée s'allument, les autres s'éteignent ; ou choisis d'abord une cible → seules les actions possibles restent actives.
- **Résolution automatique** : jet d'attaque contre la CA (secrète pour les monstres), critique sur 20, sauvegardes des monstres lancées avec leurs bonus secrets (moitié des dégâts si réussie), soins. Les PV changent tout seuls, l'emplacement ou la capacité est dépensé, le résultat part dans le fil des dés.
- **Objets de soin** : le MJ donne une formule (« 2d4+2 ») à un objet ; le joueur l'utilise (action bonus en combat, ou depuis le Sac) et récupère les PV.
- MJ : portée sur les attaques ; effet, portée, sauvegarde et temps d'incantation sur les sorts (pré-remplis depuis la bibliothèque) ; effet « soin » ou « action supplémentaire » sur les capacités ; bonus de sauvegarde et zone de départ des monstres ; attaques par action.

## 0.4.0 (22/11/2026) : combat + sorts dans l'onglet Combat

⚠️ En ligne : exécuter `supabase/migrations/007_combat.sql` dans Supabase.

- **Nouvel onglet ⚔️ Combat** (en bas, pour tous) :
  - Le MJ ajoute les persos (cochés d'office) et des monstres (nom, nombre, PV, CA, bonus d'initiative ; « Gobelin 1, 2, 3… »).
  - Initiative : chaque joueur lance la sienne depuis son téléphone ; le MJ lance celle des monstres, ou de tous, en un tap, et peut corriger.
  - Ordre trié automatiquement, tour actif surligné, rounds, « Tour suivant » / retour, monstres vaincus sautés.
  - Notification + vibration « C'est ton tour ! » au joueur concerné, et « Le combat commence ! ».
  - PV et CA des monstres **secrets** (stockés à part) : les joueurs voient seulement leur état (indemne, blessé, en sang, vaincu).
  - Le MJ touche un combattant : dégâts/soins, états, notes, initiative, retrait ; pour un perso : PV et accès à la fiche.
- **Sorts déplacés dans l'onglet Combat de la fiche** (l'onglet Sorts disparaît) : DD, attaque de sort, concentration, emplacements et sorts prêts à lancer.
- **Grimoire** (📖) : le MJ y ajoute les sorts possibles (bibliothèque ou sort maison) ; le joueur **coche les sorts qu'il prépare** parmi eux, dans la limite fixée par le MJ (« Max », 0 = libre). Seuls les sorts mineurs et préparés se lancent.

## 0.3.1 (22/11/2026) : droits joueurs + bibliothèque de sorts

⚠️ En ligne : exécuter `supabase/migrations/006_droits_joueurs.sql` dans Supabase.

- **Le joueur ne se redonne rien seul** (bloqué aussi côté serveur) : PV, sorts, emplacements, capacités, objets, pièces, inspiration.
  Il peut seulement **utiliser** : dépenser un emplacement ou une capacité, consommer (« ✋ Utiliser »), jeter, équiper, donner à un autre perso, dépenser des pièces, préparer ses sorts.
- **Capacités et sorts : ajoutés et modifiés par le MJ uniquement** (depuis la fiche du perso).
- **Bibliothèque de sorts** (MJ, onglet Sorts → 📚) : 140 sorts du SRD 5.2.1, recherche par nom, niveau et classe, ajout en un tap.
- Le joueur ne peut plus récupérer seul un emplacement ou une utilisation (seuls les repos, faits par le MJ, les rendent).

## 0.3.0 (22/11/2026) : attaques, sorts, capacités

⚠️ En ligne : exécuter `supabase/migrations/005_pv_mj_equipement.sql` dans Supabase.

- **PV réservés au MJ** : les joueurs ne peuvent plus modifier leurs PV ni faire de repos (bloqué aussi côté serveur).
  Réglage « Les joueurs gèrent leurs PV » dans l'onglet MJ (désactivé par défaut). Les jets contre la mort restent au joueur.
- Attaques : arme ou sort, bonus d'attaque et dégâts calculés, jet d'attaque (avec avantage), dégâts et critique en un tap.
- Capacités à utilisations limitées avec compteur, récupérées au repos court ou long.
- Nouvel onglet Sorts : caractéristique d'incantation, DD et attaque des sorts, emplacements à cocher (remplissage auto selon classe/niveau, magie de pacte), liste des sorts par niveau, lancer un sort (emplacement dépensé, concentration, dégâts).
- Concentration affichée sur la fiche et dans la table du MJ (🧠).
- Repos court : récupère les capacités « repos court » et la magie de pacte. Repos long : capacités, emplacements, fin de concentration.
- Objets équipés ⚔️ et harmonisés ✨ (3 maximum).
- Technique : `supabaseStore.ts` découpé (`supabaseGameOps.ts`, `supabaseUtils.ts`).

## 0.2.0 (22/11/2026) : fiche D&D 2024

⚠️ En ligne : exécuter `supabase/migrations/004_fiche_dnd.sql` dans Supabase.

- Fiche D&D 2024 en 4 sous-onglets (Combat, Caracs, Sac, Perso).
- Calculs automatiques : modificateurs, maîtrise selon le niveau, 6 sauvegardes, 18 compétences (maîtrise / expertise), initiative, perception passive.
- Jets en un tap avec mode Avantage / Désavantage et malus d'épuisement inclus.
- PV avec PV temporaires (absorbés en premier), jets contre la mort, dés de vie, repos court et long.
- 14 états + épuisement (6 niveaux), inspiration héroïque.
- Bourse en pp/po/pe/pa/pc.
- Création de perso : classe, niveau, espèce → PV max, dé de vie et sauvegardes remplis automatiquement.
- MJ : liste compacte de la table (PV, CA, perception passive, états), bouton PV rapide ; distribution de dégâts, soins, PV temporaires, repos long, pièces, états, objets.
- Notifications en bas de l'écran (n'empiètent plus sur le haut de la fiche).
- Supprimé : modèles de fiche génériques et éditeur de modèle.

## 0.1.1 (22/11/2026)

Maintenance, aucune nouveauté visible.

- Tous les fichiers de code font moins de 300 lignes (test automatique).
- Styles découpés en 4 fichiers (`src/styles/`), mode démo en 3 fichiers (`localDb`, `localGameOps`, `localStore`).
- Script SQL découpé en 3 fichiers : `001_tables.sql`, `002_regles_acces.sql`, `003_fonctions.sql` (à exécuter dans l'ordre).
- Nouvelle doc : `docs/CARTE_DU_CODE.md` (générée), `docs/CAHIER_DES_CHARGES.md`, ARCHITECTURE « où modifier quoi ».

## 0.1.0 (22/11/2026)

Première version.

- PWA installable (Android, iPhone), thème sombre/clair.
- Deux modes : démo locale (sans config) et en ligne (Supabase, temps réel).
- Campagnes avec code d'invitation, rôles MJ / joueur.
- Fiches de personnage : jauges, caractéristiques configurables avec jets, bourse, notes.
- Inventaire : ajout, quantités, description, don entre persos, fusion des objets identiques.
- Panneau MJ : distribution en direct (objets, monnaie, dégâts/soins, repos complet), règles de la table, modèle de fiche, gestion des joueurs.
- Dés : formules (`kh`, `kl`, `d%`, `dF`), pavé rapide, avantage/désavantage, jets cachés, fil partagé.
- Notes de campagne avec visibilité (table, MJ, privé).
- Notifications + vibration quand le MJ modifie l'inventaire, la bourse ou les jauges d'un perso.
- Tests unitaires (dés, scénario MJ/joueur) et test e2e navigateur.
