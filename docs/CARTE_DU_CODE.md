# Carte du code

> Fichier généré par `node scripts/carte-du-code.mjs`. Ne pas modifier à la main.
> Pour chaque fichier : son rôle, puis ses éléments avec le numéro de ligne.

## src/

### `src/App.tsx` (35 lignes)

Racine de l'appli : fournisseurs (notifications, session) et choix de l'écran selon la route (connexion, accueil, mon compte, campagne) ; nouveau mot de passe après le lien « mot de passe oublié ».

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Routes` | composant interne | 12 |  |
| `App` | composant | 26 |  |

## src/components/

### `src/components/DefensesEditor.tsx` (42 lignes)

Résistances / immunités / vulnérabilités aux types de dégâts : le MJ touche un type pour passer de « rien » à « résistance » (½), « immunité » (0) puis « vulnérabilité » (×2). Lecture seule pour les joueurs.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `defensesLine` | fonction | 11 | Résumé : « Résiste : feu, froid · Immunisé : poison ». |
| `DefensesEditor` | composant | 20 |  |

### `src/components/Drawer.tsx` (75 lignes)

Panneau qui glisse depuis la droite (historique), avec bouton d'ouverture et pastille « non lu ».

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `useSeen` | fonction | 6 | Mémorise (par appareil) la date du dernier élément vu, pour la pastille « non lu ». |
| `Drawer` | composant | 40 | Bouton de la barre du haut + panneau latéral (Échap ou fond pour fermer). |

### `src/components/HistoryDrawer.tsx` (61 lignes)

Historique de la campagne : bouton 🕘 (avec pastille « non lu ») qui ouvre un panneau glissant depuis la droite.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `HistoryDrawer` | composant | 16 | Bouton de la barre du haut + tiroir d'historique (jets, dégâts, soins, objets, tours de combat). |
| `HistoryRow` | composant interne | 42 |  |

### `src/components/InstallButton.tsx` (40 lignes)

Bouton « Installer l'appli » (Android) ou explication pour iPhone.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `InstallButton` | composant | 9 | Propose d'installer l'appli sur l'écran d'accueil (Android/Chrome), ou explique comment faire sur iPhone. |

### `src/components/OfflineBadge.tsx` (20 lignes)

Pastille « hors connexion » en haut de l'écran quand le téléphone perd le réseau (version en ligne).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `OfflineBadge` | composant | 4 |  |

### `src/components/RangeSelect.tsx` (19 lignes)

Liste déroulante de portée en mètres (soi-même, contact, 9 m…), utilisée pour les attaques et les sorts.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `RangeSelect` | composant | 4 |  |

### `src/components/ShapeSelect.tsx` (37 lignes)

Choix d'une zone d'effet (aucune, sphère, cube, cône, ligne) et de sa taille en mètres.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `ShapeSelect` | composant | 14 | Zone d'effet : la portée 0 (« soi-même ») fait partir cône, ligne et cube du lanceur. |

### `src/components/Toast.tsx` (39 lignes)

Notifications éphémères en bas de l'écran (au-dessus des onglets) : ToastProvider + hook useToast(). 3 au plus, sans doublon ; toucher une notification la ferme.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `ToastProvider` | composant | 16 |  |
| `useToast` | constante | 38 |  |

### `src/components/ui.tsx` (198 lignes)

Composants d'interface réutilisables : Modal, ConfirmButton, Stepper, LazyInput, AmountDialog, Empty.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Modal` | composant | 4 |  |
| `ConfirmButton` | composant | 26 | Bouton qui demande une seconde pression pour confirmer (pas de confirm() natif). |
| `Stepper` | composant | 54 |  |
| `LazyInput` | composant | 82 | Champ texte qui n'enregistre qu'à la sortie (évite une requête par lettre). |
| `AmountDialog` | composant | 126 | Pavé pour saisir un nombre ou un écart (+5 / -3). |
| `Empty` | composant | 187 |  |

## src/data/

### `src/data/actions.ts` (50 lignes)

Actions composées D&D réutilisées par plusieurs écrans (fiche, vue MJ, distribution).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `longRestChar` | fonction | 11 | Repos long : PV au max, PV temporaires perdus, dés de vie, capacités et emplacements récupérés, épuisement −1. |
| `toggleCondition` | fonction | 21 | Ajoute ou retire un état (Empoisonné, À terre…). |
| `setMaxHp` | fonction | 30 | Fixe les PV max (et ramène les PV actuels sous le nouveau max). |
| `logEvent` | fonction | 39 | Ajoute une entrée à l'historique de la campagne (tiroir 🕘), visible par tous sauf si `secret` (MJ + auteur). |
| `concentrationReminder` | fonction | 46 | Rappel quand un perso concentré prend des dégâts hors action de combat (PV du MJ) : sauvegarde de CON à faire. |

### `src/data/localCombatOps.ts` (225 lignes)

Mode démo : combat (initiative fixée par le joueur pour son perso, secrets du MJ).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `setInitiative` | fonction | 15 | Initiative d'un combattant : le MJ pour tous, un joueur seulement pour son propre personnage. |
| `saveSecrets` | fonction | 34 | Enregistre les secrets du MJ (PV des monstres). |
| `loadSecrets` | fonction | 43 | Secrets d'une campagne (MJ uniquement, sinon null). |
| `combatAct` | fonction | 49 | Action de combat (même calcul que la fonction SQL combat_act). |
| `useItem` | fonction | 77 | Objet de soin : −1 exemplaire et PV rendus (exception à « le joueur ne se soigne pas seul »). |
| `combatDismiss` | fonction | 97 | Ignore une attaque d'opportunité : MJ, ou propriétaire du perso qui pouvait attaquer. |
| `saveMapImage` | fonction | 116 |  |
| `loadMapImage` | fonction | 129 |  |
| `toggleDoor` | fonction | 139 | Porte : ouvrir/fermer (même règle que SQL toggle_door). |
| `endTurn` | fonction | 153 | Joueur : finit le tour de son perso (même règle que SQL end_turn). Le MJ peut finir n'importe quel tour. |
| `combatMove` | fonction | 168 | Déplacement sur la carte (même règle que SQL combat_move), puis piège éventuel ; renvoie le récit du piège. |
| `summonCompanionOp` | fonction | 198 | Fait venir un compagnon de la fiche sur la carte (joueur : son perso ; MJ : tous). = SQL summon_companion. |
| `dismissCompanionOp` | fonction | 213 | Renvoie un compagnon (joueur : le sien ; MJ : tous). = SQL dismiss_companion. |

### `src/data/localDb.ts` (146 lignes)

Mode démo : base de données stockée dans le localStorage du navigateur. Gère la lecture/écriture, la synchro entre onglets (BroadcastChannel) et l'utilisateur courant (mémorisé par onglet dans sessionStorage).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `DB` | type | 9 |  |
| `safeGet` | fonction interne | 27 |  |
| `safeSet` | fonction interne | 35 |  |
| `LocalDb` | classe | 44 |  |
| `invalidate` | méthode | 66 |  |
| `read` | méthode | 72 | Lit la base (cache mémoire, rechargé quand un autre onglet écrit). |
| `write` | méthode | 88 | Modifie la base, l'enregistre et prévient les autres onglets. |
| `subscribe` | méthode | 100 |  |
| `emit` | méthode | 107 |  |
| `currentUserId` | méthode | 113 |  |
| `setCurrentUserId` | méthode | 117 |  |
| `me` | méthode | 123 | Utilisateur connecté, ou erreur. |
| `role` | méthode | 131 | Rôle de l'utilisateur courant dans une campagne (null si non membre). |
| `isGmOfCharacter` | méthode | 137 | L'utilisateur courant est-il MJ de la campagne de ce personnage ? |
| `requireGM` | méthode | 142 |  |

### `src/data/localGameOps.ts` (196 lignes)

Mode démo : opérations de jeu (personnages, inventaire, dés, notes). Fonctions pures sur LocalDb, appelées par LocalStore.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `createCharacter` | fonction | 16 |  |
| `patchChar` | fonction | 22 |  |
| `updateCharacter` | constante | 32 |  |
| `adjustResource` | constante | 36 | Ajuste une jauge, bornée entre 0 et son max. |
| `writeHp` | fonction interne | 49 |  |
| `requireHpRight` | fonction interne | 55 | Refuse si l'utilisateur n'est pas MJ et que la table interdit aux joueurs de gérer leurs PV. |
| `applyHp` | fonction | 64 | Dégâts ou soins (PV temporaires absorbés d'abord). |
| `setTempHp` | fonction | 69 |  |
| `deathSave` | constante | 75 | Jet contre la mort : autorisé au propriétaire même si les PV sont réservés au MJ. |
| `deleteCharacter` | fonction | 84 |  |
| `addItem` | fonction | 93 | Ajoute un objet ; fusionne avec un objet identique déjà possédé. |
| `updateItem` | fonction | 102 |  |
| `deleteItem` | fonction | 117 |  |
| `transferItem` | fonction | 124 | Donne `qty` exemplaires d'un objet à un autre personnage. |
| `addRoll` | fonction | 141 |  |
| `clearRolls` | fonction | 158 |  |
| `NoteInput` | type | 166 |  |
| `saveNote` | fonction | 168 |  |
| `deleteNote` | fonction | 191 |  |

### `src/data/localGear.ts` (25 lignes)

Mode démo : après chaque écriture, recalcule la fiche des persos dont les objets équipés ont changé (équivalent du déclencheur SQL items_gear (supabase/migrations/06_equipement.sql)).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `gearKeys` | fonction | 10 | Signature des objets équipés (avec effets) de chaque perso. |
| `syncGear` | fonction | 17 | Applique les objets aux persos dont la signature a changé depuis `before`. |

### `src/data/localSheetOps.ts` (85 lignes)

Mode démo : modifications de la fiche D&D avec les droits joueur/MJ (pièces, champs de fiche, capacités, emplacements, sorts préparés).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `adjustCoins` | fonction | 11 | Pièces : le joueur peut seulement dépenser (delta négatif), le MJ peut tout faire. |
| `patchSheet` | fonction | 21 | Fusionne des champs dans la fiche ; un joueur est limité aux champs autorisés (lib/dnd/permissions.ts). |
| `apply` | fonction interne | 34 | Applique une action « joueur » calculée à partir de la fiche actuelle. |
| `useFeature` | constante | 43 |  |
| `spendSlot` | constante | 44 |  |
| `setPrepared` | constante | 45 |  |
| `levelUp` | fonction | 52 | Montée de niveau du perso (joueur propriétaire jusqu'au niveau accordé par le MJ, ou MJ) : vérifiée (checkLevelUp), emplacements recalculés, PV max augmentés, fiche d'avant gardée dans l'historique (annulable par le MJ). |
| `levelDown` | fonction | 71 | MJ : −1 niveau (retire un niveau accordé non pris, ou annule la dernière montée et ses PV). |

### `src/data/localShopOps.ts` (159 lignes)

Mode démo : marchands et coffres (même règles que supabase/migrations/05_objets.sql).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `shopsFor` | fonction | 13 | Marchands et objets d'une campagne visibles pour l'utilisateur (joueur : seulement les visibles). |
| `saveShop` | fonction | 20 |  |
| `deleteShop` | fonction | 36 |  |
| `saveShopItem` | fonction | 46 |  |
| `deleteShopItem` | fonction | 62 |  |
| `buyItem` | fonction | 72 | Achat (marchand, payé avec la bourse) ou prise (coffre, gratuit) : l'objet quitte la boutique et rejoint le sac. |
| `sellItem` | fonction | 103 | Vente à un marchand visible qui rachète : moitié de la valeur, l'objet passe du sac au stock du marchand. |
| `depositItem` | fonction | 135 | Dépôt dans un coffre (joueur : coffre visible ; MJ : tout coffre) : l'objet passe du sac au coffre, gratuitement. |

### `src/data/localStore.ts` (280 lignes)

Mode démo (implémentation de Store sans serveur). Compte + campagnes + chargement ici ; opérations de jeu dans localGameOps.ts ; stockage et synchro entre onglets dans localDb.ts.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `LocalStore` | classe | 17 |  |
| `lastLocalWrite` | méthode | 21 |  |
| `currentUser` | méthode | 26 |  |
| `onAuthChange` | méthode | 34 |  |
| `setUser` | méthode | 41 |  |
| `signIn` | méthode | 46 |  |
| `signUp` | méthode | 50 |  |
| `signInLocal` | méthode | 55 | Connexion par pseudo : crée le profil s'il n'existe pas. |
| `listLocalProfiles` | méthode | 67 |  |
| `signOut` | méthode | 71 |  |
| `resetPassword` | méthode | 76 | Emails et mots de passe : seulement en ligne (Supabase). En démo, un profil = un pseudo sur cet appareil. |
| `sendLoginLink` | méthode | 79 |  |
| `updatePassword` | méthode | 82 |  |
| `onPasswordRecovery` | méthode | 85 |  |
| `updateName` | méthode | 90 | Change mon pseudo (profil et nom affiché dans mes campagnes). |
| `listCampaigns` | méthode | 103 |  |
| `createCampaign` | méthode | 116 |  |
| `joinCampaign` | méthode | 134 |  |
| `updateCampaign` | méthode | 147 |  |
| `deleteCampaign` | méthode | 155 |  |
| `leaveCampaign` | méthode | 169 |  |
| `removeMember` | méthode | 176 |  |
| `loadCampaign` | méthode | 184 | Charge toute la campagne en appliquant les mêmes règles de visibilité que Supabase. |
| `subscribe` | méthode | 208 |  |
| `createCharacter` | méthode | 213 |  |
| `updateCharacter` | méthode | 216 |  |
| `adjustResource` | méthode | 219 |  |
| `applyHp` | méthode | 222 |  |
| `setTempHp` | méthode | 225 |  |
| `deathSave` | méthode | 228 |  |
| `adjustCoins` | méthode | 231 |  |
| `patchSheet` | méthode | 234 |  |
| `levelUp` | méthode | 237 |  |
| `levelDown` | méthode | 240 |  |
| `useFeature` | méthode | 243 |  |
| `spendSlot` | méthode | 246 |  |
| `setPrepared` | méthode | 249 |  |
| `deleteCharacter` | méthode | 252 |  |
| `addItem` | méthode | 255 |  |
| `updateItem` | méthode | 258 |  |
| `deleteItem` | méthode | 261 |  |
| `transferItem` | méthode | 264 |  |
| `addRoll` | méthode | 267 |  |
| `clearRolls` | méthode | 270 |  |
| `saveNote` | méthode | 273 |  |
| `deleteNote` | méthode | 276 |  |

### `src/data/localTableStore.ts` (74 lignes)

Mode démo : opérations de table (combat, carte, marchands) partagées par LocalStore. La logique est dans localCombatOps.ts, et localShopOps.ts ; ici seulement l'aiguillage.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `LocalTableStore` | classe | 11 | Base de LocalStore : base locale + opérations de table. |
| `setInitiative` | méthode | 15 |  |
| `saveSecrets` | méthode | 18 |  |
| `combatAct` | méthode | 21 |  |
| `combatMove` | méthode | 24 |  |
| `summonCompanion` | méthode | 27 |  |
| `dismissCompanion` | méthode | 30 |  |
| `endTurn` | méthode | 33 |  |
| `toggleDoor` | méthode | 36 |  |
| `combatDismiss` | méthode | 39 |  |
| `saveMapImage` | méthode | 42 |  |
| `loadMapImage` | méthode | 45 |  |
| `saveShop` | méthode | 49 |  |
| `deleteShop` | méthode | 52 |  |
| `saveShopItem` | méthode | 55 |  |
| `deleteShopItem` | méthode | 58 |  |
| `buyItem` | méthode | 61 |  |
| `sellItem` | méthode | 64 |  |
| `depositItem` | méthode | 67 |  |
| `useItem` | méthode | 70 |  |

### `src/data/network.ts` (19 lignes)

Réseau coupé (métro, cave, téléphone en veille) : reconnaître l'erreur et attendre le retour de la connexion.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `isNetworkError` | fonction | 4 | L'erreur vient-elle du réseau (requête pas arrivée) plutôt que du serveur ? |
| `waitForNetwork` | fonction | 10 | Attend `ms` millisecondes, ou le retour de la connexion si le téléphone est hors ligne (20 s au plus). |

### `src/data/session.tsx` (40 lignes)

Contexte de session : donne à tous les écrans le Store actif et l'utilisateur connecté (useSession).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `SessionProvider` | composant | 14 |  |
| `useSession` | fonction | 35 |  |

### `src/data/store.ts` (179 lignes)

Interface unique d'accès aux données. Deux implémentations : - LocalStore    : tout dans le navigateur (mode démo, multi-onglets en direct) - SupabaseStore : base partagée + temps réel entre téléphones L'appli choisit automatiquement : Supabase si VITE_SUPABASE_URL est défini.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `CharacterPatch` | type | 24 |  |
| `ItemPatch` | type | 25 |  |
| `CampaignPatch` | type | 26 |  |
| `ShopInput` | type | 29 | Création (sans id) ou modification (avec id) d'un marchand/coffre. |
| `ShopItemInput` | type | 31 | Création (sans id) ou modification (avec id) d'un objet de marchand/coffre. |
| `NewRoll` | type | 33 |  |
| `Store` | type | 44 |  |
| `getStore` | fonction | 166 |  |

### `src/data/supabaseCache.ts` (111 lignes)

Mode en ligne : chargement d'une campagne par morceaux. On garde la dernière version en mémoire et on ne recharge que les tables qui ont changé (signalées par le temps réel). Un jet de dé d'un autre joueur est ajouté tel quel à l'historique, sans rien recharger. Après une écriture locale, au retour de veille ou de connexion : tout est rechargé.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `TABLES` | constante | 11 | Tables suivies en temps réel (toutes ont une colonne campaign_id, sauf campaigns). |
| `Table` | type | 12 |  |
| `Change` | type | 17 | Changement reçu du temps réel (forme réduite des événements Supabase). |
| `CampaignCache` | classe | 24 |  |
| `invalidate` | méthode | 34 | Tout recharger au prochain chargement. Après une écriture locale (`withRolls` false) l'historique des jets n'est pas relu : mes jets y sont ajoutés directement (addRoll), ceux des autres par le temps réel. |
| `apply` | méthode | 42 | Applique un changement reçu. Renvoie false s'il ne concerne pas cette campagne (suppression ailleurs : Supabase ne filtre pas les suppressions, on vérifie que l'identifiant supprimé est bien chez nous). |
| `addRoll` | méthode | 60 | Ajoute mon propre jet à l'historique (sans attendre le temps réel). |
| `load` | méthode | 66 | Charge la campagne : tout la première fois, ensuite seulement les tables marquées. |
| `mark` | méthode | 100 |  |
| `idsOf` | méthode | 106 |  |

### `src/data/supabaseGameOps.ts` (162 lignes)

Mode en ligne : opérations de jeu (personnages, PV, pièces, inventaire, dés, notes) via Supabase. Fonctions appelées par SupabaseStore ; les opérations sensibles passent par des fonctions SQL atomiques.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `rpcVoid` | constante | 18 | Appel d'une fonction SQL sans résultat. |
| `setInitiative` | constante | 21 |  |
| `saveSecrets` | fonction | 24 |  |
| `combatAct` | fonction | 29 | Action de combat résolue côté serveur (CA et sauvegardes des monstres restent secrètes). |
| `combatMove` | fonction | 34 | Déplacement (renvoie le récit d'un piège déclenché, sinon null). |
| `combatDismiss` | constante | 38 |  |
| `saveMapImage` | fonction | 42 | Image de fond (table campaign_maps, clé (campagne, map_id) : lecture membres pour 'current', écriture MJ). |
| `loadMapImage` | fonction | 51 |  |
| `useItem` | constante | 56 |  |
| `loadSecrets` | fonction | 60 | Secrets du MJ (la base ne renvoie rien aux joueurs). |
| `createCharacter` | fonction | 67 |  |
| `updateCharacter` | fonction | 71 |  |
| `adjustResource` | constante | 75 |  |
| `applyHp` | constante | 78 |  |
| `setTempHp` | constante | 80 |  |
| `deathSave` | constante | 82 |  |
| `adjustCoins` | constante | 84 |  |
| `patchSheet` | constante | 87 |  |
| `useFeature` | constante | 89 |  |
| `spendSlot` | constante | 91 |  |
| `setPrepared` | constante | 93 |  |
| `deleteCharacter` | fonction | 96 |  |
| `addItem` | fonction | 102 | Le MJ donne un objet (fusionné avec un objet identique) ; formule de soin ajoutée ensuite (potions). |
| `updateItem` | fonction | 107 |  |
| `deleteItem` | fonction | 111 |  |
| `transferItem` | constante | 115 |  |
| `addRoll` | fonction | 119 |  |
| `clearRolls` | fonction | 123 |  |
| `NoteInput` | type | 128 |  |
| `saveNote` | fonction | 137 |  |
| `deleteNote` | fonction | 159 |  |

### `src/data/supabaseShopOps.ts` (47 lignes)

Mode en ligne : marchands et coffres (tables shops / shop_items, achat atomique par la fonction buy_item).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `loadShops` | fonction | 10 | Marchands visibles (RLS : joueurs → seulement les visibles) et leurs objets. |
| `saveShop` | fonction | 18 |  |
| `deleteShop` | fonction | 23 |  |
| `saveShopItem` | fonction | 27 |  |
| `deleteShopItem` | fonction | 32 |  |
| `buyItem` | fonction | 36 |  |
| `sellItem` | fonction | 40 |  |
| `depositItem` | fonction | 44 |  |

### `src/data/supabaseStore.ts` (241 lignes)

Mode en ligne : données partagées via Supabase (Postgres + Auth + Realtime). Compte, campagnes, chargement et temps réel ici ; opérations de jeu dans supabaseGameOps.ts. Les règles d'accès sont appliquées côté serveur (RLS, voir supabase/migrations).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `SupabaseStore` | classe | 14 |  |
| `uidOrThrow` | méthode | 18 |  |
| `currentUser` | méthode | 25 |  |
| `onAuthChange` | méthode | 32 |  |
| `signIn` | méthode | 40 |  |
| `signUp` | méthode | 44 |  |
| `signInLocal` | méthode | 51 |  |
| `listLocalProfiles` | méthode | 55 |  |
| `signOut` | méthode | 59 |  |
| `siteUrl` | méthode | 65 | Adresse de retour des emails (lien de connexion, nouveau mot de passe) : l'appli elle-même. |
| `resetPassword` | méthode | 69 |  |
| `sendLoginLink` | méthode | 73 |  |
| `updatePassword` | méthode | 77 |  |
| `updateName` | méthode | 82 |  |
| `onPasswordRecovery` | méthode | 90 |  |
| `listCampaigns` | méthode | 96 |  |
| `createCampaign` | méthode | 107 |  |
| `joinCampaign` | méthode | 114 |  |
| `updateCampaign` | méthode | 119 |  |
| `deleteCampaign` | méthode | 124 |  |
| `leaveCampaign` | méthode | 129 |  |
| `removeMember` | méthode | 134 |  |
| `loadCampaign` | méthode | 139 |  |
| `invalidate` | méthode | 144 | Tout relire au prochain chargement (retour de veille, reconnexion). |
| `subscribe` | méthode | 148 |  |
| `createCharacter` | méthode | 172 |  |
| `updateCharacter` | méthode | 175 |  |
| `adjustResource` | méthode | 178 |  |
| `applyHp` | méthode | 181 |  |
| `setTempHp` | méthode | 184 |  |
| `deathSave` | méthode | 187 |  |
| `adjustCoins` | méthode | 190 |  |
| `patchSheet` | méthode | 193 |  |
| `levelUp` | méthode | 196 |  |
| `levelDown` | méthode | 199 |  |
| `useFeature` | méthode | 202 |  |
| `spendSlot` | méthode | 205 |  |
| `setPrepared` | méthode | 208 |  |
| `deleteCharacter` | méthode | 211 |  |
| `addItem` | méthode | 214 |  |
| `updateItem` | méthode | 217 |  |
| `deleteItem` | méthode | 220 |  |
| `transferItem` | méthode | 223 |  |
| `addRoll` | méthode | 226 |  |
| `clearRolls` | méthode | 231 |  |
| `saveNote` | méthode | 234 |  |
| `deleteNote` | méthode | 237 |  |

### `src/data/supabaseTableStore.ts` (106 lignes)

Mode en ligne : opérations de table (combat, carte, marchands) partagées par SupabaseStore.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `SupabaseTableStore` | classe | 12 | Base de SupabaseStore : client Supabase, horodatage des écritures locales, opérations de table. |
| `setInitiative` | méthode | 47 |  |
| `saveSecrets` | méthode | 50 |  |
| `combatAct` | méthode | 53 |  |
| `summonCompanion` | méthode | 56 |  |
| `dismissCompanion` | méthode | 59 |  |
| `combatMove` | méthode | 62 |  |
| `endTurn` | méthode | 65 |  |
| `toggleDoor` | méthode | 68 |  |
| `combatDismiss` | méthode | 71 |  |
| `saveMapImage` | méthode | 74 |  |
| `loadMapImage` | méthode | 77 |  |
| `saveShop` | méthode | 81 |  |
| `deleteShop` | méthode | 84 |  |
| `saveShopItem` | méthode | 87 |  |
| `deleteShopItem` | méthode | 90 |  |
| `buyItem` | méthode | 93 |  |
| `sellItem` | méthode | 96 |  |
| `depositItem` | méthode | 99 |  |
| `useItem` | méthode | 102 |  |

### `src/data/supabaseUtils.ts` (28 lignes)

Mode en ligne : petits utilitaires Supabase (gestion d'erreur traduite, conversion utilisateur, réglages).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `toUser` | constante | 7 | Utilisateur Supabase → utilisateur de l'appli (pseudo depuis user_metadata.name). |
| `check` | fonction | 11 | Renvoie les données ou lève une erreur en français. |
| `translate` | fonction | 17 | Traduit les messages d'erreur courants de Supabase. |
| `withSettings` | constante | 27 | Complète les réglages de campagne avec les valeurs par défaut (réglages ajoutés après coup). |

### `src/data/useCampaign.ts` (219 lignes)

Hook central d'une campagne : chargement, temps réel, droits (can), notifications de changements.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `CampaignView` | type | 11 |  |
| `useCampaign` | fonction | 29 | Charge une campagne et la garde synchronisée en temps réel. Affiche aussi une notification quand le MJ (ou un autre joueur) modifie l'inventaire, la bourse ou les jauges d'un de mes persos. |
| `notifyChanges` | fonction interne | 96 |  |
| `notifyMessages` | fonction interne | 213 | Note révélée ou envoyée (même juste après une action de ma part : seul l'auteur n'est pas prévenu). |

### `src/data/useRoller.ts` (40 lignes)

Hook de lancer de dés : calcule, publie dans le fil de la campagne, notifie.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `useRoller` | fonction | 11 | Lance des dés, publie le résultat dans le fil de la campagne et l'affiche en notification. |

## src/lib/

### `src/lib/dice.ts` (139 lignes)

Moteur de dés. Syntaxe supportée (insensible à la casse, espaces ignorés) : 2d6+3, d20, 1d100, d%, 4d6kh3 (garde les 3 meilleurs), 2d20kl1 (garde le pire), 3dF (dés Fudge -1/0/+1), combinaisons : 1d8+1d6-2 Limites : 100 dés par groupe, 1000 faces max.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `DiceGroupResult` | type | 7 |  |
| `DiceResult` | type | 16 |  |
| `Rng` | type | 24 |  |
| `cryptoRng` | constante | 26 |  |
| `DiceError` | classe | 39 |  |
| `normalizeFormula` | fonction | 43 |  |
| `rollDice` | fonction | 50 |  |
| `describe` | fonction interne | 92 |  |
| `fmt` | fonction interne | 102 |  |
| `statFormula` | fonction | 108 | Remplace {v} et {mod} dans une formule de jet de caractéristique. |
| `appendDie` | fonction | 115 | Ajoute un dé à une formule : d6 + "2d6" -> "3d6", sinon concatène. |
| `bumpModifier` | fonction | 128 | Ajuste le modificateur final : "1d20+2" + 1 -> "1d20+3". |

## src/lib/dnd/

### `src/lib/dnd/actions.ts` (81 lignes)

Calculs D&D des attaques, capacités et repos (fonctions pures, testées dans tests/dndActions.test.ts).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `attackAbility` | fonction | 7 | Caractéristique réellement utilisée par une attaque (« spell » = caractéristique d'incantation). |
| `attackBonus` | fonction | 12 | Bonus d'attaque : mod + maîtrise (si maîtrisée) + bonus divers. |
| `damageBonus` | fonction | 17 | Bonus fixe ajouté aux dégâts. |
| `damageFormula` | fonction | 22 | Formule de dégâts (critique = dés doublés, bonus fixe une seule fois). |
| `doubleDice` | fonction | 31 | Double le nombre de dés de chaque groupe : "1d8+2d6" -> "2d8+4d6". |
| `attackSummary` | fonction | 36 | Libellé court d'une attaque pour l'affichage : « +5 · 1d8+3 tranchant ». |
| `newAttack` | constante | 40 |  |
| `newFeature` | constante | 53 |  |
| `restoreFeatures` | fonction interne | 56 | Remet à zéro les utilisations des capacités concernées par le repos. |
| `shortRestPatch` | fonction | 61 | Effets d'un repos court sur la fiche : capacités « repos court » et magie de pacte. |
| `longRestSheetPatch` | fonction | 68 | Effets d'un repos long sur la fiche (hors PV) : capacités, emplacements, concentration. |
| `resetSlots` | fonction interne | 76 |  |

### `src/lib/dnd/advantage.ts` (78 lignes)

Avantage / désavantage automatiques (règles 2024) : états du lanceur, états de la cible, avantage donné par le MJ. Un avantage et un désavantage s'annulent. Tests : tests/advantage.test.ts.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `D20Kind` | type | 5 |  |
| `AutoMode` | type | 7 |  |
| `AutoModeInput` | type | 13 |  |
| `autoMode` | fonction | 32 | Mode du d20 et ses raisons. |
| `modeTag` | fonction | 74 | Suffixe de libellé : « (avantage : empoisonné…) ». |

### `src/lib/dnd/area.ts` (97 lignes)

Zones d'effet sur la carte (sphère, cube, cône, ligne) : cases touchées et combattants pris dedans. Portée 0 = la zone part du lanceur (cône, ligne, cube collé à lui, ou aura centrée sur lui).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Cell` | type | 8 |  |
| `cellKey` | constante | 9 |  |
| `needsAim` | constante | 15 | La zone a-t-elle besoin qu'on vise une case ? (Aura centrée sur le lanceur : non.) |
| `canAim` | fonction | 18 | Case visée valable : dans la portée du sort (ou n'importe où autour du lanceur si portée 0). |
| `areaCells` | fonction | 27 | Cases touchées par la zone. `caster` = case du lanceur, `aim` = case visée (centre pour une sphère/cube à distance, direction pour un cône, une ligne ou un cube partant du lanceur). |
| `inArea` | fonction | 75 | Combattants dans les cases (hors vaincus). |
| `actionArea` | fonction | 80 | Zone d'une action pour un lanceur et une case visée : les murs arrêtent l'effet (vue depuis son origine). |
| `fmtShape` | fonction | 93 | Libellé : « sphère 6 m », « cône 4,5 m ». |

### `src/lib/dnd/combat.ts` (300 lignes)

Combat D&D : ordre d'initiative, tours et rounds, état des monstres (fonctions pures, tests/combat.test.ts). L'état public (visible par tous) est dans campaign.combat ; les PV des monstres sont secrets (campaign_secrets).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Combatant` | type | 9 |  |
| `Economy` | type | 41 | Économie d'actions du tour : action, action bonus, réaction, attaques déjà faites. |
| `FRESH_ECONOMY` | constante | 56 |  |
| `MonsterStatus` | type | 58 |  |
| `CombatState` | type | 60 |  |
| `CellKind` | type | 79 | Type de case peinte par le MJ. Murs (pierre = 'wall', brique, bois) : bloquent déplacement et vue. Buisson : bloque la vue, se traverse en terrain difficile. Table : bloque le déplacement, pas la vue. Terrain difficile : déplacement ×2. Porte fermée : comme un mur ; ouverte : passage libre. Règles dans terrain.ts. |
| `MapSettings` | type | 85 |  |
| `Scene` | type | 105 | Plan enregistré par le MJ (secret) : décor, réglages et monstres placés. Image stockée sous la clé `scene.id`. |
| `Opportunity` | type | 117 | `by` peut attaquer `target` avec sa réaction. |
| `MonsterSecret` | type | 123 |  |
| `MonsterAttack` | type | 140 |  |
| `AreaShape` | type | 157 | Zone d'effet : sphère (rayon), cube (côté), cône (longueur), ligne (longueur, 1,5 m de large). En mètres. |
| `CampaignSecrets` | type | 162 |  |
| `TrapSecret` | type | 175 | Piège : sauvegarde demandée, DD et dégâts (formule de dés). |
| `EMPTY_COMBAT` | constante | 184 |  |
| `normalizeCombat` | fonction | 187 | Complète un état de combat partiel ou absent. |
| `sortedCombatants` | fonction | 192 | Ordre d'initiative : plus haut d'abord, égalité → meilleur bonus, puis persos avant monstres. Sans initiative à la fin. |
| `currentCombatant` | fonction | 202 | Combattant dont c'est le tour (null si combat inactif). |
| `nextTurn` | fonction | 210 | Passe au tour suivant (saute les monstres vaincus) ; nouveau round après le dernier. |
| `previousTurn` | fonction | 230 | Revient au tour précédent (correction d'erreur). |
| `startCombat` | constante | 237 | Démarre le combat au round 1, sur le premier de l'ordre. |
| `endCombat` | constante | 248 | Fin du combat : la carte et les pions restent (exploration), les monstres vaincus et l'initiative disparaissent. |
| `clearBoard` | constante | 259 | Vide la carte (pions) en gardant sa taille, son décor et son image. |
| `monsterStatus` | fonction | 262 | État visible d'un monstre selon ses PV. |
| `upsertCombatant` | fonction | 270 | Ajoute ou modifie un combattant en gardant le combattant actif à sa place. |
| `removeCombatant` | fonction | 277 | Retire un combattant en gardant le combattant actif à sa place. |
| `keepTurn` | fonction interne | 282 |  |
| `numberedNames` | fonction | 290 | Numérote les monstres du même nom : « Gobelin 1 », « Gobelin 2 »… |

### `src/lib/dnd/combatActions.ts` (215 lignes)

Liste des actions possibles d'un perso en combat (attaques, sorts préparés, capacités, objets de soin), avec coût, portée, utilisations restantes, et calcul des jets à envoyer pour la résolution.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Targeting` | type | 14 |  |
| `CombatAction` | type | 16 |  |
| `costLabel` | constante | 63 |  |
| `cantripDice` | fonction | 66 | Dés des sorts mineurs qui augmentent aux niveaux 5, 11 et 17 : "1d10" -> "2d10" au niveau 5. |
| `combatActions` | fonction | 74 | Toutes les actions de combat d'un perso. |
| `STANDARD_ACTIONS` | constante | 147 | Actions ouvertes à tous les persos (règles 2024). |
| `scaleFormula` | fonction | 156 | Multiplie une formule : "1d4+1" × 2 -> "2d4+2". |
| `atSlot` | fonction | 163 | Formule de dégâts/soins lancée avec un emplacement de niveau `slot` (dés en plus au-dessus du niveau du sort). |
| `monsterActions` | fonction | 169 | Actions d'un monstre (attaques et souffles saisis par le MJ). |
| `isWeaponAttack` | constante | 186 | Une action d'arme/attaque (paie sur l'action Attaquer, partage les attaques multiples). Souffles : action normale. |
| `opportunityAttacks` | constante | 189 | Attaques utilisables pour une attaque d'opportunité (au contact). |
| `canAfford` | fonction | 192 | Peut-on encore payer ce coût ce tour-ci ? Les attaques suivent l'action Attaquer (Attaque supplémentaire). |
| `spend` | fonction | 200 | Économie après avoir payé l'action. |
| `remaining` | fonction | 207 | Ce qu'il reste ce tour : « Action 1 · Bonus 0 · Réaction 1 · Attaques 1/2 ». |

### `src/lib/dnd/companions.ts` (91 lignes)

Compagnons et invocations (bête du rôdeur, familier, monture, créature invoquée) : modèles sur la fiche du perso (sheet.companions), pion sur la carte contrôlé par son joueur (Combatant.companion, PV publics). Le pion est rattaché au perso (characterId) mais ses PV, sa CA et ses attaques sont les siens. = SQL summon_companion (08_tours_compagnons.sql).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `CompanionStats` | type | 12 | Statistiques d'un compagnon (modèle sur la fiche, copié sur le pion). |
| `CompanionDef` | type | 26 | Compagnon enregistré sur la fiche. |
| `COMPANION_TEMPLATES` | constante | 36 | Modèles proposés (bêtes du SRD) : familiers, compagnons, montures. Le MJ peut ajuster PV, CA et attaques. |
| `companionFrom` | constante | 51 | Nouveau compagnon pour la fiche à partir d'un modèle. |
| `companionToken` | constante | 54 | Pion du compagnon déjà sur la carte (s'il y est). |
| `nearestFree` | fonction | 58 | Case libre la plus proche de (x0, y0) (ni mur ni pion), en tournant autour. |
| `summonCompanion` | fonction | 73 | Fait venir un compagnon de la fiche sur la carte, à côté de son maître (juste après lui dans l'ordre d'initiative). |
| `dismissCompanion` | constante | 87 | Renvoie un compagnon (le pion quitte la carte). |
| `companionHp` | constante | 90 | PV d'un pion de compagnon après dégâts (négatif) ou soins (positif). |

### `src/lib/dnd/creation.ts` (147 lignes)

Création guidée (règles 2024) : méthodes de caractéristiques (tableau standard, achat de points, 4d6), bonus d'historique, et construction de la fiche finale (CA, PV, compétences, attaques, équipement). Fonctions pures, tests : tests/creation.test.ts.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Scores` | type | 14 |  |
| `Method` | type | 15 |  |
| `STANDARD_ARRAY` | constante | 17 |  |
| `POINT_COST` | constante | 19 | Coût de chaque valeur à l'achat de points (8 à 15, 27 points). |
| `POINT_BUDGET` | constante | 20 |  |
| `BASE_SCORES` | constante | 21 |  |
| `pointsSpent` | constante | 24 | Points dépensés à l'achat de points. |
| `roll4d6` | fonction | 27 | 4d6 en gardant les 3 meilleurs. |
| `suggestStandard` | fonction | 33 | Valeurs proposées par la classe pour le tableau standard : meilleures valeurs dans ses caractéristiques principales. |
| `bonusValid` | fonction | 42 | Bonus d'historique valable : +2/+1 ou +1/+1/+1, seulement sur les 3 caractéristiques de l'historique. |
| `finalScores` | constante | 52 | Valeurs finales (bonus compris, 20 au maximum). |
| `Choices` | type | 55 |  |
| `startingFeatures` | fonction | 80 | Aptitudes de classe des niveaux 1 à `level` (utilisations au niveau atteint ; avec celles de la sous-classe). |
| `buildCharacter` | fonction | 93 | Fiche, PV max et notes d'équipement à partir des choix. |

### `src/lib/dnd/damage.ts` (68 lignes)

Types de dégâts (règles 2024) et défenses : résistance (moitié), immunité (aucun dégât), vulnérabilité (double). Le type est déduit du texte de l'attaque ou du sort (« dégâts de feu », « tranchant »…). = SQL combat_act (09_combat.sql).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `DAMAGE_TYPES` | constante | 4 |  |
| `DamageType` | type | 5 |  |
| `Defenses` | type | 8 | Défenses d'une créature (types de dégâts). |
| `damageTypeOf` | fonction | 31 | Type de dégâts trouvé dans un texte (le premier cité), ou undefined. |
| `mergeDefenses` | constante | 42 | Fusionne plusieurs défenses (fiche + effets). |
| `adjustDamage` | fonction | 49 | Dégâts après défenses : immunité 0, résistance moitié (arrondie en dessous), vulnérabilité ×2 (les deux s'annulent). |
| `cycleDefense` | fonction | 60 | Prochaine défense quand le MJ touche un type : aucune → résistance → immunité → vulnérabilité → aucune. |

### `src/lib/dnd/data.ts` (105 lignes)

Données de référence D&D 5e (règles 2024) : caractéristiques, compétences, classes, états, pièces. Noms et résumés reformulés en français ; aucune reproduction de texte des livres.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Ability` | type | 4 |  |
| `Coin` | type | 5 |  |
| `RollMode` | type | 6 |  |
| `abilityMod` | constante | 9 | Modificateur d'une valeur de caractéristique (10 → +0, 16 → +3, 7 → −2). |
| `ABILITIES` | constante | 11 |  |
| `abilityShort` | constante | 20 |  |
| `SKILLS` | constante | 23 | Les 18 compétences et leur caractéristique. |
| `CLASSES` | constante | 45 | Les 12 classes : dé de vie et sauvegardes maîtrisées. |
| `findClass` | constante | 60 |  |
| `SPECIES` | constante | 62 |  |
| `BACKGROUNDS` | constante | 64 |  |
| `ALIGNMENTS` | constante | 69 |  |
| `SIZES` | constante | 71 |  |
| `CONDITIONS` | constante | 74 | Les états (conditions). Résumés courts pour rappel en jeu. |
| `conditionOf` | constante | 91 |  |
| `COINS` | constante | 93 |  |
| `COIN_VALUE` | constante | 102 | Valeur de chaque pièce en pièces de cuivre. |
| `EXHAUSTION_MAX` | constante | 104 |  |

### `src/lib/dnd/effects.ts` (105 lignes)

Effets temporaires sur un combattant (Bénédiction, Bouclier, Rage…) : bonus de CA, dés en plus aux attaques et aux sauvegardes, résistances. Un effet dure jusqu'à la fin du round `until` ; ceux d'un sort de concentration tombent quand le lanceur perd sa concentration. Même calcul côté serveur : combat_act (09_combat.sql).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Effect` | type | 7 |  |
| `EffectInput` | type | 30 | Effet à poser (sans id ni round de fin) : durée en rounds. |
| `EFFECT_PRESETS` | constante | 35 | Effets courants proposés au MJ (et utilisés par les sorts et capacités du même nom). |
| `effectsLight` | constante | 50 | Lumière émise par les effets actifs (m, la plus grande). |
| `presetOf` | constante | 53 | Effet courant portant ce nom (sort ou capacité), sinon undefined. |
| `activeEffects` | constante | 56 | Effets encore actifs au round `round`. |
| `effectsAc` | constante | 59 | Bonus de CA des effets actifs. |
| `effectsDice` | constante | 62 | Dés en plus (« +1d4-1d4 ») pour les attaques ou les sauvegardes, '' si aucun. |
| `effectsResist` | constante | 70 | Résistances données par les effets actifs. |
| `checkEffect` | fonction | 73 | Vérifie un effet envoyé par un joueur (valeurs raisonnables). |
| `addEffect` | fonction | 79 | Pose un effet sur des combattants (effets expirés retirés ; un nouvel effet de concentration remplace les anciens du même lanceur). |
| `removeEffect` | constante | 92 | Retire un effet. |
| `dropConcentration` | constante | 98 | La concentration de `source` s'arrête : ses effets de concentration disparaissent. |
| `concentrationDc` | constante | 104 | DD de la sauvegarde de concentration après `damage` dégâts : 10 ou la moitié des dégâts (30 au plus). |

### `src/lib/dnd/feats.ts` (77 lignes)

Application d'un don à la fiche (création ou montée de niveau) : +1 caractéristique, sauvegarde, vitesse, compétences, aptitude affichée (avec utilisations pour Chanceux), attaque à mains nues, sorts, PV de Robuste. Effets permanents : Vigilant (initiative, rules.ts) et Mage de guerre (concentration, resolve.ts). = SQL 04_niveaux_dons.sql et 09_combat.sql.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `FeatChoice` | type | 10 |  |
| `hasFeat` | constante | 22 | Le perso a-t-il ce don ? |
| `featHpPerLevel` | constante | 25 | PV en plus par niveau donnés par les dons (Robuste : 2). |
| `featInitiative` | constante | 28 | Bonus d'initiative des dons (Vigilant : bonus de maîtrise). |
| `concentrationAdvantage` | constante | 31 | Avantage aux sauvegardes de concentration (Mage de guerre). |
| `featPatch` | fonction | 36 | Modifications de la fiche quand le perso prend ce don au niveau `level`, et PV max en plus (Robuste : 2 × niveau). |
| `checkFeatLevelUp` | fonction | 63 | Vérifie le don d'une montée de niveau (mode démo ; = SQL level_up). Renvoie le don pris (ou null), les PV de dons attendus en plus du dé de vie (Robuste), et les compétences que le don peut ajouter (Doué). |

### `src/lib/dnd/gear.ts` (120 lignes)

Objets équipés → fiche : armure (CA), bouclier, bonus de CA et de sauvegardes, caractéristique fixée (gantelets…), vitesse, et attaque ajoutée pour une arme. Les bonus déjà appliqués sont gardés dans `sheet.gear` : on les retire avant de recalculer, donc le calcul peut être refait à chaque changement d'inventaire sans rien cumuler. Même calcul côté serveur : 06_equipement.sql (_apply_gear, déclenché à chaque changement d'objet).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `ItemEffects` | type | 9 |  |
| `Gear` | type | 29 | Bonus des objets actuellement appliqués à la fiche. |
| `NO_GEAR` | constante | 36 |  |
| `effectsOf` | constante | 39 | Effets d'un objet (ceux de la bibliothèque, d'après son nom). |
| `GEAR_ATTACK` | constante | 42 | Préfixe des attaques ajoutées par une arme équipée. |
| `applyGear` | fonction | 50 | Recalcule la fiche à partir des objets équipés (`equipped` : id et nom). Renvoie les champs modifiés : CA, caractéristiques, vitesse, attaques et `gear` (bonus appliqués). |
| `describeEffects` | fonction | 105 | Résumé lisible des effets d'un objet. Le « +1 » d'un objet magique est détaillé : armure « CA 17 (16 + 1 magique) », bouclier « +3 CA (2 + 1 magique) », arme « 1d8 tranchant, +1 au toucher et aux dégâts ». |

### `src/lib/dnd/grid.ts` (61 lignes)

Carte de combat en grille : 1 case = 1,5 m. Distance D&D simplifiée : chaque case, même en diagonale, compte 1,5 m. Remplace les zones de la v0.5 (un combattant sans x/y est placé selon son ancienne zone).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `CELL` | constante | 5 |  |
| `MELEE` | constante | 6 |  |
| `DEFAULT_MAP` | constante | 7 |  |
| `mapOf` | constante | 10 | Taille de la carte d'un combat. |
| `posOf` | fonction | 13 | Position (case) d'un combattant ; ancienne zone 1-5 → colonnes 0, 3, 6, 9, 11. |
| `cellsBetween` | constante | 20 | Nombre de cases entre deux positions (diagonale = 1 case). |
| `distance` | fonction | 23 | Distance en mètres entre deux combattants (au moins « contact »). |
| `fmtDistance` | fonction | 28 | Affichage d'une distance : « contact », « 9 m », « 13,5 m ». |
| `fmtRange` | fonction | 34 | Affichage d'une portée d'action : « soi-même », « contact », « 36 m ». |
| `inRange` | fonction | 40 | La cible est-elle à portée ? (portée 0 = soi-même uniquement). |
| `movementLeft` | fonction | 46 | Déplacement restant ce tour (mètres) : vitesse (doublée si Foncer) moins le chemin parcouru. |
| `freeCell` | fonction | 51 | Première case libre en partant de (x0, y0), en balayant les colonnes dans le sens `dir`. |

### `src/lib/dnd/levels.ts` (65 lignes)

Niveaux accordés par le MJ (règles 2024) : seuils d'XP, niveau accordé (bouton +1 ou XP), historique des montées et retour d'un niveau en arrière (fausse manip). Mêmes règles côté serveur : 04_niveaux_dons.sql (level_up, level_down).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `XP_THRESHOLDS` | constante | 8 | XP totale pour atteindre chaque niveau (index 0 = niveau 1). |
| `levelForXp` | constante | 11 | Niveau correspondant à une XP totale. |
| `xpToNext` | constante | 14 | XP manquante pour le niveau suivant (null au niveau 20). |
| `allowedLevelOf` | constante | 17 | Niveau jusqu'où le joueur peut monter (jamais sous son niveau actuel). |
| `canLevelUp` | constante | 20 | Le joueur a un niveau à choisir. |
| `grantLevelPatch` | constante | 23 | MJ : accorde un niveau de plus. |
| `xpPatch` | fonction | 26 | MJ : ajoute de l'XP ; atteindre un seuil accorde le niveau correspondant. |
| `SNAPSHOT_KEYS` | constante | 32 | Champs de la fiche sauvegardés avant une montée (pour pouvoir l'annuler). |
| `pushHistory` | fonction | 39 | Historique après une montée de niveau (les 3 dernières sont gardées). Pour rester léger, les sorts sont mémorisés par leur identifiant seulement (`spellIds`) : annuler retire les sorts appris, sans toucher aux autres. |
| `levelDownPatch` | fonction | 48 | MJ : −1 niveau. Si un niveau accordé n'a pas encore été pris, on le retire. Sinon on annule la dernière montée (fiche d'avant et PV gagnés retirés) ; sans historique, le niveau baisse simplement (emplacements recalculés). |

### `src/lib/dnd/levelup.ts` (157 lignes)

Montée de niveau en autonomie (règles 2024) : ce que le niveau suivant apporte (PV, aptitudes, emplacements, sorts préparés et mineurs, amélioration de caractéristiques, expertise, attaques) et la modification de la fiche. `checkLevelUp` est la vérification faite par le mode démo ; SQL level_up (04_niveaux_dons.sql) fait la même côté serveur.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `LevelUpPlan` | type | 14 |  |
| `levelUpPlan` | fonction | 42 | Ce qu'apporte le niveau suivant (`subclass` : sous-classe choisie à cette montée, sinon celle de la fiche). |
| `LevelUpChoices` | type | 66 |  |
| `applyLevelUp` | fonction | 82 | Modifications de la fiche pour monter d'un niveau. |
| `checkLevelUp` | fonction | 126 | Vérifie une montée de niveau (mode démo ; mêmes règles que SQL level_up). Joueur : seulement jusqu'au niveau accordé par le MJ. |

### `src/lib/dnd/monsterAi.ts` (24 lignes)

Suggestion pour le tour d'un monstre (le MJ valide ou choisit autre chose) : l'ennemi debout le plus proche qu'une de ses attaques peut viser, en essayant les attaques dans l'ordre (souvent le corps à corps d'abord).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Suggestion` | type | 7 |  |
| `suggestMonster` | fonction | 17 | `canTarget(action, cible)` : portée et ligne de vue (ActionsPanel.targetable) ; `alive(x)` : cible encore debout. |

### `src/lib/dnd/movement.ts` (109 lignes)

Déplacements sur la carte : coût du chemin (murs infranchissables, terrain difficile ×2, ennemis bloquants), règles du tour, et attaques d'opportunité déclenchées en quittant le contact d'un ennemi. Même calcul côté serveur : supabase/migrations/07_carte.sql (_move_cost, combat_move).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `moveCosts` | fonction | 17 | Coût (en cases) pour atteindre chaque case depuis la position de `mover`, sans dépasser `maxCost`. Diagonales autorisées ; mur = infranchissable ; terrain difficile = 2 ; on traverse les alliés, pas les ennemis. |
| `opportunities` | fonction | 45 | Combattants ennemis qui peuvent faire une attaque d'opportunité quand `mover` va de `from` à `to`. |
| `applyMove` | fonction | 60 | Déplace un combattant. MJ : libre. Joueur (son perso, vérifié par l'appelant) : libre hors combat ; en combat seulement pendant son tour, par un chemin dont le coût ne dépasse pas son déplacement restant. En combat, quitter le contact d'un ennemi pendant son tour crée une attaque d'opportunité en attente. |
| `dropReaction` | constante | 84 | Retire une attaque d'opportunité en attente (jouée ou ignorée). |
| `toggleDoor` | fonction | 93 | Ouvre ou ferme une porte. MJ : toujours. Joueur : avec un perso au contact de la porte (en combat, seulement pendant son tour). Impossible de fermer une porte sur un pion. = SQL toggle_door. |

### `src/lib/dnd/pastMaps.ts` (35 lignes)

Cartes déjà montrées aux joueurs : quand le MJ ouvre un plan enregistré, une copie publique (décor sans les pièges cachés, taille, image) est gardée dans campaign.settings.maps. Les joueurs peuvent la réafficher plus tard, sauf si le MJ la décoche (« partagée »). La carte active reste celle que le MJ a ouverte (campaign.combat.map).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `PastMap` | type | 7 |  |
| `publicCells` | constante | 17 | Décor visible par les joueurs (pièges cachés retirés). |
| `recordMap` | fonction | 21 | Ajoute ou met à jour une carte montrée (partagée par défaut ; le choix du MJ est gardé). |
| `setShared` | constante | 28 | Partage ou retire une carte de l'archive des joueurs. |
| `forgetMap` | constante | 31 | Retire une carte de l'archive (plan supprimé). |
| `viewableMaps` | constante | 34 | Cartes que les joueurs peuvent réafficher (hors carte active). |

### `src/lib/dnd/permissions.ts` (55 lignes)

Ce qu'un joueur peut modifier lui-même sur sa fiche (le MJ peut tout faire). Règle de la table : un joueur ne se redonne jamais seul PV, sorts, emplacements, capacités, objets ou pièces ; niveau, XP et épuisement sont gérés par le MJ (le joueur choisit ses gains via « Monter de niveau ») ; un joueur peut se mettre un état (à terre…) mais seul le MJ le retire. Même liste côté serveur : supabase/migrations/03_fiche.sql (patch_sheet). Règle de la table « les joueurs modifient leur fiche » désactivée : seulement PLAY_SHEET_KEYS (en jeu).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `PLAYER_SHEET_KEYS` | constante | 10 | Champs de la fiche qu'un joueur peut modifier librement (identité, caracs, compétences, attaques, états…). |
| `PLAY_SHEET_KEYS` | constante | 17 | Ce qu'un joueur modifie encore quand le MJ a bloqué les fiches : états, concentration, inspiration dépensée. |
| `checkPlayerSheetPatch` | fonction | 23 | Lève une erreur si un joueur tente de modifier un champ réservé au MJ (ou de se retirer un état). `canEditStats` : règle de la table « les joueurs modifient leur fiche ». |
| `useFeaturePatch` | fonction | 32 | Utilise une fois une capacité (jamais au-delà du maximum). |
| `spendSlotPatch` | fonction | 39 | Dépense un emplacement de sort du niveau donné. |
| `preparedCount` | constante | 47 | Nombre de sorts préparés (les sorts mineurs ne comptent pas). |
| `setPreparedPatch` | fonction | 50 | Prépare ou retire un sort de la liste des sorts préparés (limite fixée par le MJ). |

### `src/lib/dnd/places.ts` (32 lignes)

Lieux préparés par le MJ (taverne, crypte, forêt…) : nom, icône, notes du MJ et favoris (plans, monstres, notes) mis en avant quand le groupe s'y trouve. Le lieu actuel (nom + icône) est public : campaign.settings.place.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Place` | type | 5 |  |
| `PLACE_ICONS` | constante | 18 | Icônes proposées pour un lieu. |
| `newPlace` | constante | 21 | Nouveau lieu vide. |
| `toggleFav` | constante | 24 | Ajoute ou retire un favori d'une liste. |
| `favoritesFirst` | fonction | 27 | Met les favoris du lieu en premier (ordre d'origine conservé) et dit lesquels le sont. |

### `src/lib/dnd/requests.ts` (54 lignes)

Test demandé par le MJ à plusieurs persos (« tout le monde, Perception DD 15 ») : la demande est dans campaign.settings.request ; chaque réponse est un jet ordinaire de l'historique, marqué ⟦demande:perso⟧ dans son libellé (marque cachée à l'affichage). Le MJ voit qui a réussi. Avec les vrais dés, le joueur tape son total.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `CheckRequest` | type | 11 |  |
| `requestLabel` | fonction | 26 | Nom du test : « Perception », « Sauvegarde de DEX », « Force ». |
| `requestBonus` | fonction | 33 | Bonus du perso pour ce test, et type de jet d20 (pour l'avantage automatique). |
| `requestTag` | constante | 40 | Marque d'une réponse dans le libellé d'un jet. |
| `cleanLabel` | constante | 43 | Libellé sans marque (affichage). |
| `requestResults` | fonction | 46 | Réponses reçues : perso → total (le premier jet compte). |

### `src/lib/dnd/resolve.ts` (215 lignes)

Résolution d'une action de combat : vérifie le tour et l'économie d'actions, compare aux CA/sauvegardes (secrètes pour les monstres), applique dégâts ou soins. Utilisée telle quelle par le mode démo ; le mode en ligne fait le même calcul côté serveur (supabase/migrations/09_combat.sql, combat_act) : effets temporaires (CA, dés de sauvegarde, résistances), types de dégâts, sauvegarde de concentration.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `EconomyCost` | type | 17 |  |
| `ActPayload` | type | 19 |  |
| `ActResult` | type | 50 |  |
| `CombatWorld` | type | 67 |  |
| `payEconomy` | fonction | 74 | Applique le coût sur l'économie du tour (erreur si plus disponible). |
| `resolveAction` | fonction | 92 | Résout une action. `rng(20)` sert aux sauvegardes des cibles. Renvoie le nouvel état (combat, secrets, PV des persos) et le détail par cible. |
| `describeResults` | fonction | 199 | Phrase de résumé pour le fil des dés : « Gobelin 1 : touché, 8 dégâts ; Gobelin 2 : raté ». |

### `src/lib/dnd/rules.ts` (108 lignes)

Calculs D&D 2024 (fonctions pures, testées dans tests/dndRules.test.ts).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `profBonus` | constante | 10 | Bonus de maîtrise selon le niveau : +2 (1-4) … +6 (17-20). |
| `fmtBonus` | constante | 12 |  |
| `modOf` | fonction | 14 |  |
| `saveBonus` | fonction | 19 | Bonus de sauvegarde : mod + maîtrise si la sauvegarde est maîtrisée + bonus des objets équipés. |
| `skillBonus` | fonction | 24 | Bonus de compétence : mod + maîtrise × (0, 1 ou 2 pour l'expertise). |
| `initiative` | constante | 30 |  |
| `passivePerception` | constante | 33 | Perception passive = 10 + bonus de Perception. |
| `effectiveSpeed` | constante | 36 | Vitesse réduite par l'épuisement (1,5 m par niveau en 2024). |
| `exhaustionPenalty` | constante | 39 | Malus d'épuisement aux tests d20 (−2 par niveau). |
| `d20Formula` | fonction | 42 | Formule d'un test d20 avec avantage/désavantage et épuisement inclus. |
| `hitDieOf` | constante | 49 | Dé de vie de la classe (ou celui saisi si classe inconnue). |
| `suggestedMaxHp` | fonction | 52 | PV max conseillés : dé max au niv. 1 puis moyenne arrondie au-dessus, + CON par niveau. |
| `Hp` | type | 58 |  |
| `applyHpDelta` | fonction | 68 | Applique dégâts (delta < 0) ou soins (delta > 0). Les dégâts entament d'abord les PV temporaires ; les soins sont plafonnés au max. |
| `deathSaveResult` | fonction | 76 | Résultat d'un jet contre la mort (d20 naturel). |
| `longRest` | fonction | 84 | Repos long 2024 : PV au max, PV temporaires perdus, tous les dés de vie récupérés, épuisement −1. |
| `hitDiceLeft` | constante | 95 |  |
| `hitDieFormula` | constante | 98 | Formule pour dépenser un dé de vie (repos court) : 1dX + mod CON (minimum 0 en pratique). |
| `totalGold` | fonction | 104 | Valeur totale de la bourse, exprimée en po (arrondie à 2 décimales). |

### `src/lib/dnd/sheet.ts` (198 lignes)

Fiche D&D 2024 : structure des données stockées (colonne `sheet`) et valeurs par défaut. Les PV sont dans character.resources.pv / pvtemp (ajustés de façon atomique).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `ProfLevel` | type | 8 |  |
| `ActionCost` | type | 11 | Coût d'une action en combat. |
| `SpellEffect` | type | 13 | Effet d'un sort en combat : attaque de sort, sauvegarde, soin, dégâts automatiques, ou utilitaire. |
| `Attack` | type | 16 | Attaque (arme ou sort) : bonus = mod + maîtrise + divers ; dégâts = dés + mod (option) + divers. |
| `Spell` | type | 32 | Sort connu ou préparé. Niveau 0 = sort mineur. |
| `Feature` | type | 59 | Capacité à utilisations limitées (Second souffle, Rage, Inspiration bardique…). |
| `Spellcasting` | type | 73 |  |
| `DndSheet` | type | 83 |  |
| `LevelStep` | type | 134 | Une montée de niveau enregistrée : niveau de départ, PV gagnés et fiche avant la montée. |
| `DEFAULT_SHEET` | constante | 141 |  |
| `normalizeSheet` | fonction | 176 | Complète une fiche partielle (perso créé avant la v0.2, champ ajouté plus tard…). |

### `src/lib/dnd/shop.ts` (74 lignes)

Marchands et coffres : prix en pièces de cuivre, affichage, paiement avec la bourse du perso (rendu de monnaie), revente aux marchands (moitié prix). Même calcul côté serveur : 05_objets.sql (_pay_coins, sell_item). Tests : tests/shop.test.ts.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `CP` | constante | 6 | Valeur de chaque pièce en pièces de cuivre. |
| `purseCp` | constante | 12 | Total de la bourse en pièces de cuivre. |
| `fmtPrice` | fonction | 15 | Prix lisible : 150 → « 1 po 5 pa », 0 → « gratuit ». |
| `poToCp` | constante | 28 | Prix saisi en po (décimales permises : 0,5 po = 5 pa) → pièces de cuivre. |
| `payCoins` | fonction | 34 | Paie `price` (pc) avec la bourse : garde les plus grosses pièces possibles et rend la monnaie en po, pa, pc. Erreur si la bourse ne suffit pas. |
| `addCoins` | fonction | 52 | Ajoute `cp` pièces de cuivre à la bourse, en po, pa et pc (vente d'objets). |
| `resalePrice` | constante | 64 | Prix de reprise d'un objet par un marchand : la moitié de sa valeur (arrondie au pc inférieur). |
| `itemValue` | fonction | 70 | Valeur d'un objet pour un marchand : son propre prix s'il en vend un du même nom, sinon le prix de la bibliothèque (`libraryCp`), sinon null (il ne l'achète pas). = SQL sell_item. |

### `src/lib/dnd/sight.ts` (177 lignes)

Ligne de vue sur la carte : un mur entre deux cases bloque la vue (attaques à distance, sorts, zones) et le brouillard de guerre (les joueurs ne voient que ce que leurs persos voient). Fonctions pures, tests/map.test.ts.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `lineBlocked` | fonction | 16 | Cases traversées par le segment entre les centres de `a` et `b` (extrémités exclues). Un segment qui passe exactement par un coin n'est bloqué que si les deux cases de côté sont des murs (on ne se faufile pas entre deux murs qui se touchent par l'angle). |
| `canSee` | fonction | 49 | `a` voit-il `b` ? (même case ou voisines : toujours). |
| `seeEachOther` | constante | 55 | Les deux combattants se voient-ils ? |
| `visibleCells` | fonction | 58 | Cases visibles depuis un ensemble de points de vue (brouillard de guerre). `radius` en cases (0 = illimité). |
| `openArea` | fonction | 76 | Pièces accessibles aux persos : remplissage depuis leurs cases sans traverser murs pleins ni portes fermées (côtés seulement), plus les murs et portes qui les bordent. Ce qui est derrière une porte fermée reste caché. |
| `Vision` | type | 104 | Vision d'un pion du groupe dans l'obscurité, en cases : vision dans le noir, et lumière qu'il porte (torche…). |
| `TORCH_RADIUS` | constante | 110 | Rayon de lumière d'une torche posée sur la carte (6 m = 4 cases). |
| `litCells` | fonction | 113 | Cases éclairées par des sources de lumière (rayon en cases, la lumière ne traverse pas les murs). |
| `darkView` | fonction | 129 | Obscurité : chaque pion voit les cases éclairées (torches allumées, lumière portée, sorts de lumière) en ligne de vue, et, sans lumière, jusqu'à sa vision dans le noir. `vision` : par id de pion (sans entrée : ni vision ni lumière). |
| `playerView` | fonction | 157 | Ce qu'un joueur voit. Obscurité (carte « sombre ») : lumière et vision dans le noir (darkView). Brouillard : ce que voient les persos du groupe (murs et portes fermées bloquent la vue). Sinon : tout, sauf l'intérieur des pièces fermées par une porte (si la carte a des portes fermées). |
| `visibleTokens` | fonction | 169 | Pions qu'un joueur voit (monstres cachés par le MJ ou dans le brouillard : invisibles). |

### `src/lib/dnd/slots.ts` (86 lignes)

Emplacements des objets portés (règles 2024, Guide du MJ : une seule armure, un seul bouclier, une seule paire de bottes, de gants, de bracelets, une cape, une ceinture, un couvre-chef, une amulette, une paire de lunettes ; 2 anneaux). Les armes n'ont pas d'emplacement (on en garde plusieurs prêtes), mais une arme à deux mains et un bouclier ne vont pas ensemble. = SQL _item_slot, _two_handed et déclencheur items_slot (06_equipement.sql).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Slot` | type | 8 |  |
| `SlotInfo` | type | 10 |  |
| `SLOTS` | constante | 18 |  |
| `slotInfo` | constante | 32 |  |
| `SLOT_PATTERNS` | constante | 35 | Début du nom → emplacement (sans accents, en minuscules). Recopié tel quel en SQL. |
| `TWO_HANDED_PATTERN` | constante | 50 | Armes à deux mains (règles 2024 : propriété « à deux mains »). Recopié tel quel en SQL (_two_handed). |
| `slotOf` | fonction | 54 | Emplacement d'un objet (armure et bouclier de la bibliothèque d'après leurs effets, sinon d'après le nom). |
| `isTwoHanded` | constante | 64 | Arme à deux mains (d'après le nom, objets de la bibliothèque ou maison). |
| `slotConflicts` | fonction | 70 | Objets à retirer pour équiper `name` : ceux du même emplacement au-delà de la limite (le plus ancien d'abord). `worn` : objets déjà équipés du perso (sans celui qu'on équipe). |
| `checkSlot` | fonction | 81 | Message d'erreur quand l'emplacement est déjà pris (mode démo = SQL). |

### `src/lib/dnd/spells.ts` (64 lignes)

Incantation D&D 2024 : caractéristique, DD et bonus d'attaque des sorts, emplacements par classe et niveau.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `pactSlots` | fonction interne | 18 | Magie de pacte de l'Occultiste : [nombre d'emplacements, niveau des emplacements]. |
| `spellAbility` | fonction | 26 | Caractéristique d'incantation : celle choisie sur la fiche, sinon celle de la classe. |
| `spellDC` | fonction | 31 | DD des sorts = 8 + mod + maîtrise. |
| `spellAttack` | fonction | 37 | Bonus d'attaque des sorts = mod + maîtrise. |
| `suggestedSlots` | fonction | 43 | Emplacements conseillés selon la classe et le niveau (null si la classe ne lance pas de sorts). |
| `isPactCaster` | constante | 60 |  |
| `spellLevelLabel` | constante | 63 | Libellé d'un niveau de sort. |

## src/lib/dnd/srd/

### `src/lib/dnd/srd/creation.ts` (129 lignes)

Données de l'assistant de création (règles 2024) : classes (compétences, armure, armes, équipement, or), historiques (caractéristiques, compétences, don d'origine), espèces (taille, vitesse, traits). Textes courts.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `ClassInfo` | type | 5 |  |
| `CLASS_INFO` | constante | 20 |  |
| `BackgroundInfo` | type | 59 |  |
| `BACKGROUND_INFO` | constante | 71 |  |
| `SpeciesInfo` | type | 90 |  |
| `SPECIES_INFO` | constante | 97 |  |
| `SPECIES_LEGACY` | constante | 111 | Héritages à choisir (type de dégâts auquel l'espèce résiste). |
| `speciesDefenses` | fonction | 117 | Résistances données par l'espèce (2024) ; `legacy` = type choisi pour le drakéide ou le tieffelin. |
| `speciesDarkvision` | fonction | 126 | Vision dans le noir de l'espèce en mètres (2024). |

### `src/lib/dnd/srd/feats.ts` (76 lignes)

Dons des règles 2024 : dons d'origine (donnés par l'historique, ou par l'humain) et dons généraux (au niveau 4, 8… à la place de l'amélioration de caractéristiques). Effets appliqués par lib/dnd/feats.ts ; noms et règles recopiés côté serveur : 04_niveaux_dons.sql (_feat_info, level_up). Résumés rédigés pour l'appli.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Feat` | type | 6 |  |
| `FEATS` | constante | 34 |  |
| `featOf` | constante | 60 | Don par son nom (« Initié à la magie (clerc) » → Initié à la magie). |
| `featClass` | constante | 66 | Classe précisée dans le nom (« Initié à la magie (clerc) » → Clerc). |
| `LEVELUP_FEATS` | constante | 72 | Dons proposés à une montée de niveau (à la place de l'amélioration) : tous ceux qui ne demandent pas de choisir des sorts. |
| `SIMPLE_ORIGIN_FEATS` | constante | 75 | Dons d'origine sans choix à faire (proposés à l'humain en plus de celui de son historique). |

### `src/lib/dnd/srd/items.ts` (144 lignes)

Bibliothèque d'objets (d'après le SRD 5.2.1, CC-BY-4.0) : armes, armures, potions, équipement, objets magiques, avec prix en po. Sert à remplir l'inventaire (MJ), les marchands et les coffres en un tap. Les potions ont une formule de soin ; armes, armures et objets magiques ont des effets appliqués quand on les équipe (lib/dnd/gear.ts). Effets et prix recopiés côté serveur : supabase/migrations/06_equipement.sql (_item_effects, _library_price) — générée par scripts/gen-objets-sql.ts, test de parité dans tests/gear.test.ts.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `ItemCategory` | type | 9 |  |
| `LibraryItem` | type | 11 |  |
| `ITEM_LIBRARY` | constante | 34 |  |
| `searchItems` | fonction | 131 | Recherche (nom, sans accents) et filtre par catégorie. |
| `libraryCp` | constante | 137 | Prix de la bibliothèque en pièces de cuivre (null si l'objet n'y est pas). |
| `libraryItem` | constante | 143 | Objet de la bibliothèque portant ce nom (exact, sans tenir compte des majuscules). |

### `src/lib/dnd/srd/library.ts` (64 lignes)

Accès à la bibliothèque de sorts : conversion en objets Spell, recherche par nom, niveau et classe.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `LibrarySpell` | type | 8 |  |
| `SPELL_LIBRARY` | constante | 33 | Tous les sorts de la bibliothèque, triés par niveau puis par nom. |
| `searchSpells` | fonction | 40 | Recherche : texte (nom), niveau (null = tous) et classe ('' = toutes). |
| `librarySpellToSheet` | fonction | 48 | Copie un sort de la bibliothèque dans la fiche d'un personnage. |
| `SRD_ATTRIBUTION` | constante | 62 |  |

### `src/lib/dnd/srd/monsters.ts` (91 lignes)

Bestiaire : monstres courants d'après le SRD 5.2.1 (CC-BY-4.0, voir docs/LICENCES.md), pour remplir l'ajout de monstres en un tap. Format compact : PV, CA, bonus d'initiative, vitesse (m), sauvegardes (bonus), attaques.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `BestiaryMonster` | type | 8 |  |
| `BESTIARY` | constante | 46 |  |
| `findMonsters` | fonction | 87 | Recherche d'un monstre par nom (sans accents ni majuscules). |

### `src/lib/dnd/srd/progression.ts` (92 lignes)

Progression des classes 2024 (niveaux 1 à 20) : aptitudes gagnées, sorts préparés, sorts mineurs, niveaux d'amélioration de caractéristiques, expertise, attaques par action, utilisations des aptitudes. Noms courts en français ; le détail se lit dans le manuel (le MJ peut compléter la description).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `featuresAt` | fonction | 24 | Aptitudes gagnées à un niveau (sans « Amélioration », gérée à part). Avec une sous-classe, ses aptitudes remplacent les lignes génériques (« Aptitude de voie »…). |
| `preparedAt` | constante | 51 | Nombre de sorts préparés autorisés (0 si la classe n'en a pas). |
| `cantripsAt` | constante | 53 | Nombre de sorts mineurs connus. |
| `isAsiLevel` | fonction | 59 | Niveaux d'amélioration de caractéristiques (+2, ou +1/+1, ou un don). |
| `expertiseAt` | fonction | 65 | Nombre de compétences à passer en expertise à ce niveau. |
| `attacksAt` | fonction | 71 | Attaques par action (Attaque supplémentaire). |
| `featureUses` | fonction | 77 | Utilisations des aptitudes à ressource (max, récupération) au niveau donné ; null si sans utilisations. |

### `src/lib/dnd/srd/spellMeta.ts` (94 lignes)

Données de combat des sorts de la bibliothèque : effet, portée (m), sauvegarde, options. Format : "effet,portée,options…" — effet : a = attaque de sort, s = sauvegarde, h = soin, m = touche toujours, u = utilitaire. Options : str/dex/con/int/wis/cha (sauvegarde), half (moitié si réussite), zone (plusieurs cibles), bonus (action bonus), reac (réaction). Portée 0 = soi-même, 1.5 = contact. Sorts absents : utilitaire à 18 m.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `SPELL_META` | constante | 9 |  |
| `SPELL_UPCAST` | constante | 47 | Dés ajoutés par niveau d'emplacement au-dessus du niveau du sort. |
| `SPELL_SHAPES` | constante | 60 | Zones d'effet (en mètres) : sphère = rayon, cube = côté, cône/ligne = longueur. Portée 0 = part du lanceur. |
| `parseShape` | fonction | 69 | Lit « cone:4.5 ». |
| `spellCombatFields` | fonction | 79 | Champs de combat d'un sort de la bibliothèque. |

### `src/lib/dnd/srd/spellsHigh.ts` (75 lignes)

Bibliothèque de sorts (niveaux 3 à 9), d'après le SRD 5.2.1 (CC-BY-4.0, voir docs/LICENCES.md). Même format que spellsLow.ts : [nom, niveau, classes, drapeaux, dés, résumé].

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `SPELLS_HIGH` | constante | 5 |  |

### `src/lib/dnd/srd/spellsLow.ts` (101 lignes)

Bibliothèque de sorts (sorts mineurs à niveau 2), d'après le SRD 5.2.1 (CC-BY-4.0, voir docs/LICENCES.md). Format compact : [nom, niveau, classes, drapeaux, dés, résumé]. Classes : B Barde, C Clerc, D Druide, E Ensorceleur, M Magicien, O Occultiste, P Paladin, R Rôdeur. Drapeaux : C concentration, R rituel. Résumés rédigés pour l'appli (aide-mémoire, pas le texte officiel).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `SpellRow` | type | 6 |  |
| `SPELLS_LOW` | constante | 8 |  |

### `src/lib/dnd/srd/subclasses.ts` (78 lignes)

Sous-classes 2024 (choisies au niveau 3) : la sous-classe du SRD avec le nom de ses aptitudes, les autres sous-classes du manuel avec une aptitude générique (le détail se lit dans le manuel).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `SUBCLASS_LEVELS` | constante | 5 | Niveaux où la sous-classe donne une aptitude, par classe. |
| `Subclass` | type | 20 |  |
| `subclassesOf` | fonction | 57 | Sous-classes possibles d'une classe (celle du SRD en premier). |
| `SUBCLASS_LEVEL` | constante | 63 | Niveau où l'on choisit sa sous-classe (3 pour toutes les classes en 2024). |
| `subclassFeaturesAt` | fonction | 66 | Aptitudes de la sous-classe gagnées à ce niveau ([] si aucune). |
| `isGenericSubclassRow` | constante | 74 | Les lignes génériques du tableau de progression remplacées par les aptitudes de la sous-classe. |

## src/lib/dnd/

### `src/lib/dnd/terrain.ts` (69 lignes)

Effet des cases peintes sur la carte : murs (pierre, brique, bois, glace, grille), terrain (difficile, buisson, eau, éboulis), portes (ouverte, fermée, verrouillée) et objets (table, coffre, trésor, tonneau, pilier, statue, escalier, torche, piège caché aux joueurs, piège déclenché visible). Mêmes règles côté serveur : 07_carte.sql (_move_cost, combat_move, toggle_door).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `blocksMove` | constante | 16 | Bloque le déplacement (murs, tables, portes fermées, gros objets). |
| `blocksSight` | constante | 18 | Bloque la vue (murs, buissons, portes fermées, piliers, statues). |
| `isSlow` | constante | 20 | Terrain difficile (déplacement ×2). |
| `closesRoom` | constante | 22 | Ferme une pièce (mur plein ou porte fermée). |
| `isDoor` | constante | 24 | Porte (ouverte, fermée ou verrouillée). |
| `isTorch` | constante | 26 | Torche (allumée ou éteinte) : se rallume ou s'éteint comme une porte s'ouvre. |
| `hiddenFromPlayers` | constante | 28 | Case invisible pour les joueurs (piège). |
| `playerKind` | constante | 30 | Ce que voit un joueur d'une case (le piège n'apparaît pas). |
| `nextMaterial` | constante | 34 | Matériau suivant quand le MJ touche un mur : pierre → brique → bois → glace → grille → pierre (les objets ne changent pas). |
| `Material` | type | 36 |  |
| `MATERIALS` | constante | 45 | Palette du MJ, par groupe : matériau, nom, icône, effet résumé. |

### `src/lib/dnd/traps.ts` (64 lignes)

Pièges de la carte : quand un pion finit son déplacement sur une case piégée (déplacement d'un joueur, ou tout déplacement pendant un combat), il fait un jet de sauvegarde contre le DD du piège et subit les dégâts (moitié si réussi selon le piège). Le piège devient visible (« déclenché »). = SQL combat_move (07_carte.sql).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `DEFAULT_TRAP` | constante | 15 | Piège sans réglage du MJ. |
| `trapAt` | constante | 18 | Réglages d'un piège (ceux du MJ, sinon le piège par défaut). |
| `trapsArmed` | constante | 21 | Le déplacement déclenche-t-il les pièges ? Oui pour un joueur, et pour tous pendant un combat (pas quand le MJ place hors combat). |
| `TrapOutcome` | type | 23 |  |
| `springTrap` | fonction | 35 | Déclenche le piège sous le combattant `id` s'il y en a un (sinon null). `rng(n)` donne un entier de 1 à n. |

### `src/lib/dnd/vision.ts` (33 lignes)

Vision du groupe dans l'obscurité : vision dans le noir (fiche, sinon celle de l'espèce) et lumière portée (torche ou lanterne équipée), en cases, pour le calcul de ce que voient les joueurs (sight.ts, darkView).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `lightOf` | constante | 10 | Rayon de lumière (m) d'un objet porté : torche 6 m, lanterne 9 m. |
| `darkvisionOf` | constante | 13 | Vision dans le noir d'un perso (m). |
| `partyVision` | fonction | 19 | Vision de chaque pion du groupe (persos : leur fiche et leurs objets équipés ; compagnons : leurs statistiques). |

## src/lib/

### `src/lib/ids.ts` (28 lignes)

Petits utilitaires : identifiants, code d'invitation, date, « il y a X min ».

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `uid` | fonction | 2 | Petits utilitaires : identifiants, code d'invitation, date, « il y a X min ». |
| `joinCode` | fonction | 9 | Code d'invitation lisible (sans 0/O/1/I pour éviter les confusions). |
| `now` | constante | 16 |  |
| `timeAgo` | fonction | 18 |  |

### `src/lib/image.ts` (26 lignes)

Compression d'une image choisie par le MJ (plan de la carte) : redimensionnée et convertie en JPEG.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `compressImage` | fonction | 4 | Lit un fichier image et renvoie une data URL JPEG dont le plus grand côté fait au plus `max` pixels. |

### `src/lib/templates.ts` (32 lignes)

Modèle de campagne D&D, avatars, et valeurs initiales d'un nouveau personnage.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `DND_TEMPLATE` | constante | 6 | Modèle unique depuis la v0.2 : les PV sont une jauge, tout le reste est dans la fiche D&D. |
| `blankCharacterValues` | fonction | 13 | Valeurs initiales d'un nouveau personnage. |
| `hpOf` | fonction | 23 | PV d'un perso (avec valeurs par défaut). |
| `AVATARS` | constante | 31 |  |

### `src/lib/text.ts` (5 lignes)

Petits outils de texte partagés.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `searchKey` | constante | 4 | Clé de recherche : sans accents, en minuscules, sans espaces autour (« Épée » → « epee »). |

### `src/lib/types.ts` (199 lignes)

Modèle de données partagé par le mode local et le mode Supabase.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Role` | type | 9 |  |
| `User` | type | 11 |  |
| `StatDef` | type | 18 | Une caractéristique de la fiche (définie par le MJ dans le modèle de campagne). |
| `ResourceDef` | type | 28 | Une jauge (PV, Mana, Santé mentale...). |
| `CampaignTemplate` | type | 35 |  |
| `CampaignSettings` | type | 41 |  |
| `Campaign` | type | 60 |  |
| `Member` | type | 72 |  |
| `ResourceValue` | type | 79 |  |
| `Character` | type | 84 |  |
| `Item` | type | 101 |  |
| `Roll` | type | 117 |  |
| `Shop` | type | 133 | Marchand (on achète) ou coffre (on prend gratuitement), préparé par le MJ et montré aux joueurs quand il veut. |
| `ShopItem` | type | 148 | Objet en vente (ou dans un coffre). Prix en pièces de cuivre. |
| `NoteVisibility` | type | 160 |  |
| `Note` | type | 162 |  |
| `CampaignSummary` | type | 175 |  |
| `CampaignData` | type | 179 |  |
| `DEFAULT_SETTINGS` | constante | 193 |  |

## src/

### `src/main.tsx` (27 lignes)

Point d'entrée : monte React, charge les styles, enregistre le service worker (PWA).

## src/pages/

### `src/pages/Account.tsx` (84 lignes)

Mon compte : pseudo (changé dans toutes mes campagnes), email et mot de passe (en ligne), déconnexion. En démo, explique que les données restent sur l'appareil.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Account` | composant | 9 |  |
| `NewPasswordDialog` | composant | 70 | Après le lien « mot de passe oublié » : choisir le nouveau mot de passe. |

### `src/pages/Campaign.tsx` (125 lignes)

Écran d'une campagne : barre du haut, onglets du bas (Persos, Combat, Dés, Notes, MJ) et routage interne.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Campaign` | composant | 28 |  |
| `TopIcon` | composant interne | 90 | Bouton d'icône de la barre du haut (Dés, Marché). |
| `Body` | composant interne | 98 |  |

### `src/pages/Characters.tsx` (229 lignes)

Onglet Persos : liste compacte (table de jeu pour le MJ, mes persos + le groupe pour un joueur) et création.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Characters` | composant | 19 |  |
| `CharRow` | composant interne | 77 | Ligne compacte : avatar, nom, PV, CA, perception passive, états. Bouton PV rapide pour qui peut modifier. |
| `GrantButton` | composant interne | 137 | MJ : donne un avantage, un désavantage ou rien (cycle) pour tous les jets d20 du perso. |
| `NewCharacterDialog` | composant | 154 |  |

### `src/pages/Dice.tsx` (148 lignes)

Onglet Dés : composition de formule, lancer, jets cachés, fil des derniers jets.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `DicePage` | composant | 14 |  |

### `src/pages/Home.tsx` (161 lignes)

Accueil : liste des campagnes, créer (MJ) ou rejoindre avec un code.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Home` | composant | 12 |  |
| `CreateDialog` | composant interne | 90 |  |
| `JoinDialog` | composant interne | 122 |  |

### `src/pages/Inventory.tsx` (219 lignes)

Inventaire d'un perso : le MJ ajoute et modifie ; le joueur utilise, équipe, donne ou jette (jamais d'ajout).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Inventory` | composant | 15 |  |
| `ItemDialog` | composant interne | 108 |  |
| `DrinkButton` | composant interne | 199 | Boire une potion directement depuis le sac : PV rendus tout de suite (hors combat ; en combat, passer par l'onglet Carte). |

### `src/pages/ItemGive.tsx` (66 lignes)

Fenêtre d'un objet : le donner à un autre perso, ou le déposer dans un coffre (joueur : coffres visibles).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `ItemGive` | composant | 9 |  |

### `src/pages/Login.tsx` (125 lignes)

Connexion : pseudo (mode démo) ou email + mot de passe (mode en ligne), avec lien de connexion par email et « mot de passe oublié ». Le compte garde persos, campagnes et progression sur tous les appareils.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Login` | composant | 6 |  |

### `src/pages/Notes.tsx` (190 lignes)

Onglet Notes : journal de campagne avec visibilité (table, MJ, privé). Le MJ prépare des notes cachées (« Préparées ») et les révèle au bon moment, à toute la table ou à certains joueurs.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `NotesPage` | composant | 18 |  |
| `NoteDialog` | composant interne | 84 |  |
| `RevealNote` | composant interne | 169 | MJ : révéler d'un coup une note préparée à toute la table (les destinataires choisis se règlent au-dessus). |

### `src/pages/RequestBanner.tsx` (73 lignes)

Joueur : bandeau « Le MJ demande un test » en haut de l'écran pour chacun de ses persos concernés qui n'a pas encore répondu. Jet lancé par l'appli (avantage automatique compris), ou total tapé en mode vrais dés.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `RequestBanner` | composant | 14 |  |
| `RequestRow` | composant interne | 30 |  |

### `src/pages/RulesDialog.tsx` (65 lignes)

Règles de D&D 2024 expliquées simplement (bouton « 📖 Les règles » de l'accueil) : menu par thème, chaque thème découpé en parties courtes. Contenu dans rulesContent.ts ; recherche dans tout le texte.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `RulesButton` | composant | 10 | Bouton + fenêtre des règles. |

## src/pages/combat/

### `src/pages/combat/ActionsPanel.tsx` (176 lignes)

Panneau d'actions de l'onglet Combat (joueur, ou MJ pour un monstre/PNJ) : économie du tour, liste des actions (coût, portée, utilisations), niveau d'emplacement pour les sorts, mode de jet, bouton pour lancer.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `targetable` | fonction | 19 | Une cible est-elle valable pour l'action ? Portée, type de cible, ligne de vue (un mur entre les deux bloque), et pour une zone d'effet : prise dans la zone visée. |
| `ActionsPanel` | composant | 50 |  |

### `src/pages/combat/BattleMap.tsx` (188 lignes)

Carte (grille, 1 case = 1,5 m), visible en combat et hors combat. MJ : déplace tous les pions, peint murs et terrain difficile, pose un plan en fond. Joueur : déplace son pion (hors combat librement, en combat pendant son tour selon son déplacement restant ; murs, terrain difficile et ennemis comptés). Action choisie : portée teintée, zone d'effet à viser (cases touchées en surbrillance), toucher un pion le désigne comme cible.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `BattleMap` | composant | 46 |  |

### `src/pages/combat/CombatPage.tsx` (274 lignes)

Onglet Carte : plan (en combat et hors combat), ordre d'initiative (distance + ciblage), actions (joueur, ou MJ pour ses monstres/PNJ), zones d'effet à viser, attaques d'opportunité, contrôles du MJ.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `CombatPage` | composant | 34 |  |
| `GmControls` | composant interne | 234 | Boutons du MJ : préparer (initiatives), démarrer, tours, terminer. |

### `src/pages/combat/CombatRow.tsx` (80 lignes)

Ligne de l'ordre d'initiative : distance avec le perso qui agit, ciblable ou non, PV (persos) ou état (monstres).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `CombatRow` | composant | 22 |  |

### `src/pages/combat/CombatSetupDialog.tsx` (214 lignes)

MJ : ajouter au combat des persos de la campagne ou des monstres (nombre, PV, CA, bonus d'initiative).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `CombatSetupDialog` | composant | 16 | `monstersOnly` : préparation d'un plan (pas de persos). |

### `src/pages/combat/CombatantDialog.tsx` (140 lignes)

MJ : détail d'un combattant. Monstre : PV secrets (dégâts/soins), CA, états. Perso : PV via sa fiche. Initiative, retrait.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `CombatantDialog` | composant | 14 |  |

### `src/pages/combat/CompanionsPanel.tsx` (51 lignes)

Joueur (onglet Carte) : faire venir ses compagnons et invocations sur la carte, ou les renvoyer. Les compagnons se règlent sur la fiche du perso (section Compagnons) ; sur la carte, ils jouent juste après leur maître.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `CompanionsPanel` | composant | 11 |  |

### `src/pages/combat/DownPanel.tsx` (70 lignes)

Perso à 0 PV en combat : plus aucune action ni déplacement. Au début de son tour, le jet contre la mort se lance tout seul sur le téléphone du joueur, puis le tour passe (sauf sur un 20 : le perso se relève avec 1 PV).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `DownPanel` | composant | 14 |  |

### `src/pages/combat/EffectsEditor.tsx` (41 lignes)

MJ : effets temporaires d'un combattant (Bénédiction, Bouclier, Rage…) : liste avec rounds restants, retrait, ajout.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `EffectsEditor` | composant | 12 |  |

### `src/pages/combat/MapTools.tsx` (145 lignes)

Outils du MJ sous la carte : déplacer les pions ou peindre le décor (mur, terrain difficile, gomme), image de fond (plan du donjon), taille de la carte, vider la carte.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `MapTool` | type | 12 |  |
| `MapTools` | composant | 41 |  |

### `src/pages/combat/MonsterAttacks.tsx` (90 lignes)

MJ : attaques d'un monstre (secrètes) : attaque (bonus contre la CA) ou effet à sauvegarde (souffle : DD, carac, moitié si réussite, zone d'effet). Jouées depuis l'onglet Carte pendant le tour du monstre.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `attackLine` | constante | 16 | Résumé : « +4 · 1d6+2 · contact » ou « DD 13 DEX · 7d6 · cône 4,5 m ». |
| `MonsterAttacks` | composant | 21 |  |

### `src/pages/combat/OpportunityPanel.tsx` (62 lignes)

Attaques d'opportunité en attente : un ennemi a quitté le contact. Celui qui contrôle l'attaquant (joueur, ou MJ pour ses monstres/PNJ) choisit une attaque au contact (payée avec sa réaction) ou ignore.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `OpportunityChoice` | type | 7 |  |
| `choicesOf` | constante | 21 | Construit la liste des choix (attaques au contact de chaque attaquant). |
| `OpportunityPanel` | composant | 27 |  |

### `src/pages/combat/PastMaps.tsx` (54 lignes)

Joueur : réafficher une carte déjà passée dans l'aventure (archive campaign.settings.maps, plans que le MJ laisse revoir). Lecture seule : décor et image, sans pions. La carte active reste celle choisie par le MJ.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `PastMapsBar` | composant | 12 | Puces « Carte actuelle » + cartes passées que le joueur peut revoir (rien si aucune). |
| `PastMapView` | composant | 31 | Carte passée en lecture seule. |

### `src/pages/combat/ScenePrep.tsx` (56 lignes)

MJ : préparer un plan à l'avance (invisible des joueurs) : nom, décor, portes, image, taille, brouillard, monstres.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `ScenePrep` | composant | 11 |  |

### `src/pages/combat/ScenesPanel.tsx` (76 lignes)

MJ : plans enregistrés (salles, donjon, ville…). Enregistrer la carte affichée, en ouvrir une autre, supprimer. Les plans favoris du lieu actuel (⭐) passent en premier.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `ScenesPanel` | composant | 12 |  |

### `src/pages/combat/TrapDialog.tsx` (89 lignes)

MJ : réglage d'un piège de la carte (nom, sauvegarde, DD, dégâts). Secret : les joueurs ne voient pas le piège avant qu'il se déclenche. Le déclenchement est calculé par lib/dnd/traps.ts (et SQL combat_move).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `TrapDialog` | composant | 23 |  |

### `src/pages/combat/useCombat.ts` (249 lignes)

Hook du combat : état public + secrets du MJ, et toutes les actions (ajouter, initiative, tours, PV des monstres).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `NewMonster` | type | 17 |  |
| `useCombat` | fonction | 35 |  |
| `CombatCtx` | type | 237 |  |
| `MapCtx` | type | 240 | Ce dont la carte a besoin : la carte affichée (useCombat) ou un plan en préparation (useSceneDraft). |

### `src/pages/combat/useCombatActions.ts` (112 lignes)

Exécution d'une action de combat (joueur pour son perso, MJ pour un monstre ou un PNJ) : jets, dépenses (emplacement, capacité, objet), résolution (store.combatAct : touché/raté, sauvegardes, PV), historique et notification.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `ActorInfo` | type | 22 | Qui agit : un perso (avec sa fiche) ou un monstre (sans fiche). |
| `useCombatActions` | fonction | 28 |  |

### `src/pages/combat/useMapImage.ts` (25 lignes)

Charge l'image de fond de la carte quand sa version (combat.map.bg) change.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `useMapImage` | fonction | 6 | Data URL de l'image de fond, ou null. |

### `src/pages/combat/useMapZoom.ts` (74 lignes)

Zoom de la carte : boutons − / + et pincement à deux doigts. Le niveau est retenu sur l'appareil ; à chaque changement, la carte se recentre sur le pion choisi, le mien ou celui dont c'est le tour.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `ZOOMS` | constante | 5 |  |
| `useMapZoom` | fonction | 18 | Niveau de zoom, conteneur à faire défiler et gestes de pincement. |

### `src/pages/combat/useSceneDraft.ts` (108 lignes)

Plan en préparation (MJ) : mêmes outils que la carte affichée (décor, portes, image, taille, brouillard, monstres), mais tout est écrit dans le plan enregistré (secrets du MJ) : les joueurs ne voient rien avant « Ouvrir ».

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `blankScene` | constante | 12 | Nouveau plan vide, prêt à préparer. |
| `useSceneDraft` | fonction | 18 | Contexte de carte pour un plan en préparation, plus l'ajout/retrait de monstres et le renommage. |

### `src/pages/combat/useScenes.ts` (94 lignes)

Plans enregistrés du MJ (salles, donjon, ville…) : enregistrer la carte affichée (décor, image, monstres placés), en ouvrir une autre (les persos des joueurs suivent le groupe), supprimer. Stockés dans les secrets du MJ, avec les réglages de leurs pièges. Un plan ouvert est aussi gardé dans l'archive des joueurs (pastMaps.ts).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `useScenes` | fonction | 14 | Actions sur les plans enregistrés. |

## src/pages/creation/

### `src/pages/creation/AbilitiesStep.tsx` (114 lignes)

Assistant de création, étape Caractéristiques : tableau standard, achat de points ou 4d6, puis bonus d'historique.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `AbilitiesStep` | composant | 24 |  |

### `src/pages/creation/CreationWizard.tsx` (212 lignes)

Assistant de création de personnage (règles 2024) : classe → historique → espèce → caractéristiques → compétences → équipement et nom. Calculs dans lib/dnd/creation.ts ; création rapide toujours possible.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `CreationWizard` | composant | 26 |  |

### `src/pages/creation/OriginFeats.tsx` (66 lignes)

Assistant de création : don d'origine de l'historique (Doué : 3 compétences ; Initié à la magie : 2 sorts mineurs + 1 sort de niveau 1 de la classe indiquée) et, pour l'humain, un don d'origine en plus.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `OriginFeatChoices` | type | 7 |  |
| `originFeatsReady` | fonction | 23 | Les choix des dons sont-ils complets ? |
| `OriginFeats` | composant | 28 |  |

## src/pages/gm/

### `src/pages/gm/BestiaryPage.tsx` (141 lignes)

Onglet MJ, volet Bestiaire : monstres préparés à l'avance (statistiques, sauvegardes, attaques), à partir de rien ou d'un monstre du SRD. Ils apparaissent dans « Mes monstres » à l'ajout au combat ou dans un plan préparé.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `BestiaryPage` | composant | 17 |  |
| `MonsterEditor` | composant interne | 95 |  |

### `src/pages/gm/Distribute.tsx` (207 lignes)

Panneau MJ « Distribuer en direct » : objets, pièces, PV, états, épuisement, repos, XP et niveaux pour un ou plusieurs persos.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `Distribute` | composant | 15 |  |

### `src/pages/gm/GmPanel.tsx` (145 lignes)

Onglet MJ. « Partie » : invitation, joueurs, règles de la table, renommer/supprimer (la distribution est sur l'écran MJ). « Marché » : marchands et coffres (ShopPage). « Bestiaire » : monstres préparés (BestiaryPage). « Lieux » : PlacesPage.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `GmPanel` | composant | 12 |  |
| `GmGame` | composant interne | 39 | Volet « Partie » de l'onglet MJ. |
| `Toggle` | composant interne | 123 |  |

### `src/pages/gm/GmScreen.tsx` (57 lignes)

Écran du MJ (onglet Persos du MJ) : tout sur une page. Combat en cours (round, tour, ordre d'initiative avec PV, « Tour suivant »), test demandé au groupe, table des persos (PV, CA, avantage) et distribution en direct (PV, objets, états, niveaux…).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `GmScreen` | composant | 13 |  |

### `src/pages/gm/GroupCheck.tsx` (113 lignes)

MJ (écran du MJ) : demander un test à plusieurs persos (compétence, sauvegarde ou caractéristique, DD), voir les réponses arriver (réussi / raté), terminer. Les joueurs répondent depuis le bandeau en haut de leur écran.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `GroupCheck` | composant | 12 |  |

## src/pages/places/

### `src/pages/places/PlaceTitle.tsx` (67 lignes)

Titre de la barre du haut : lieu où se trouve le groupe (sinon nom de la campagne). Le MJ le touche pour changer de lieu.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `PlaceTitle` | composant | 8 |  |
| `PlacePicker` | composant interne | 38 | MJ : choisir le lieu du groupe parmi ses lieux préparés. |

### `src/pages/places/PlacesPage.tsx` (124 lignes)

Onglet MJ, volet Lieux : lieux préparés à l'avance (nom, icône, notes du MJ) avec leurs favoris (plans, monstres, notes), mis en avant dans la Carte, l'ajout de monstres et les Notes quand le groupe s'y trouve. « 📍 Y aller » affiche le lieu en haut de l'écran de tout le monde.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `PlacesPage` | composant | 11 |  |
| `PlaceDialog` | composant interne | 61 | Fenêtre d'un lieu : nom, icône, notes du MJ, favoris. |

### `src/pages/places/usePlaces.ts` (57 lignes)

Lieux du MJ : lecture (secrets), modification à partir de la dernière version, et « aller » dans un lieu (campaign.settings.place, visible de tous, affiché en haut de l'écran).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `usePlaces` | fonction | 11 | Lieux préparés, lieu actuel et actions du MJ. |

## src/pages/

### `src/pages/rulesContent.ts` (91 lignes)

Contenu des règles D&D 2024 expliquées simplement (bouton « 📖 Les règles » de l'accueil). Texte seulement : une section = un pli du menu, découpée en parties courtes. Le MJ a toujours le dernier mot.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `RulePart` | type | 4 |  |
| `RuleSection` | type | 8 |  |
| `RULES` | constante | 15 |  |

## src/pages/sheet/

### `src/pages/sheet/AbilitiesSection.tsx` (68 lignes)

Fiche : les 6 caractéristiques (test en un tap) et les jets de sauvegarde (maîtrise cochable en mode modifier).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `AbilitiesSection` | composant | 6 |  |

### `src/pages/sheet/AttacksSection.tsx` (136 lignes)

Fiche : attaques (arme ou sort). Un tap pour le jet d'attaque, un pour les dégâts, un pour le critique.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `AttacksSection` | composant | 12 |  |
| `AttackDialog` | composant interne | 53 |  |

### `src/pages/sheet/CharacterSheet.tsx` (168 lignes)

Fiche D&D d'un personnage : en-tête, barre d'outils (avantage/désavantage, modifier), niveau et 4 sous-onglets (Combat inclut attaques et sorts).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `CharacterSheet` | composant | 32 |  |
| `Sheet` | composant interne | 45 |  |
| `Toolbar` | composant interne | 99 | Avantage / désavantage : appliqués automatiquement (états) ; le MJ peut en donner un (valable jusqu'à ce qu'il le retire). Le joueur voit seulement ce qui s'applique. Et bouton « Modifier ». |
| `NotesAndDelete` | composant interne | 131 |  |

### `src/pages/sheet/CoinsSection.tsx` (52 lignes)

Fiche : bourse D&D (pp, po, pe, pa, pc), modifiable par type de pièce.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `CoinsSection` | composant | 10 |  |

### `src/pages/sheet/CompanionsSection.tsx` (68 lignes)

Fiche : compagnons et invocations (familier, bête du rôdeur, monture…) ajoutés depuis des modèles, PV et CA réglables. Sur la carte, le joueur les fait venir depuis l'onglet Carte (🐾 Compagnons).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `CompanionsSection` | composant | 9 |  |

### `src/pages/sheet/Equipment.tsx` (101 lignes)

Sac : objets portés par emplacement (armure, tête, cape, bottes…), ce que l'équipement change sur la fiche, et boutons Équiper / Harmoniser. Équiper un objet retire celui qui occupait déjà la place (2 anneaux au plus).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `SlotTag` | composant | 13 | Petite étiquette d'emplacement (« 🥾 Pieds ») à côté du nom d'un objet. |
| `WornPanel` | composant | 20 | Ce que l'équipement porté change sur la fiche, et les emplacements occupés. |
| `EquipToggles` | composant | 57 | Boutons Équiper / Harmoniser (3 objets harmonisés maximum par personnage). |

### `src/pages/sheet/FeatPicker.tsx` (66 lignes)

Choix d'un don (montée de niveau à la place de l'amélioration, ou don en plus de l'humain) : liste avec résumé, caractéristique +1 à choisir, compétences pour Doué.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `FeatPicker` | composant | 16 |  |
| `featChoiceReady` | fonction | 62 | Le choix est-il complet (caractéristique et compétences choisies si le don en demande) ? |

### `src/pages/sheet/FeaturesSection.tsx` (144 lignes)

Fiche : capacités à utilisations limitées (Rage, Second souffle…). Le MJ les crée ; le joueur les utilise.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `FeaturesSection` | composant | 12 |  |
| `FeatureDialog` | composant interne | 67 |  |

### `src/pages/sheet/HpDialog.tsx` (68 lignes)

Fenêtre PV : dégâts (PV temporaires d'abord), soins, PV temporaires. Utilisée par la fiche et la table MJ.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `HpDialog` | composant | 10 |  |

### `src/pages/sheet/IdentitySection.tsx` (132 lignes)

Fiche : en-tête (avatar, nom, résumé) et identité D&D (espèce, classe, historique…), dépliable. Niveau et XP : LevelBar / MJ.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `identityLine` | fonction | 12 | Résumé d'une ligne : « Elfe · Rôdeur 3 ». |
| `SheetHeader` | composant | 16 |  |
| `IdentitySection` | composant | 51 |  |

### `src/pages/sheet/LevelBar.tsx` (64 lignes)

Bandeau « Niveau » de la fiche. Le MJ accorde les niveaux (+1, ou XP dans l'onglet MJ) et peut revenir d'un niveau en arrière (fausse manip) ; le joueur choisit ensuite ses gains niveau par niveau (LevelUpDialog).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `LevelBar` | composant | 11 |  |

### `src/pages/sheet/LevelUpDialog.tsx` (159 lignes)

Montée de niveau (accordée par le MJ, choisie par le joueur) : PV (moyenne ou dé), sous-classe au niveau 3, nouveautés de la classe, amélioration de caractéristiques, expertise, nouveaux sorts (bibliothèque de sa classe). Calculs dans lib/dnd/levelup.ts.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `LevelUpDialog` | composant | 21 |  |

### `src/pages/sheet/SkillsSection.tsx` (52 lignes)

Fiche : les 18 compétences. Tap = jet ; en mode modifier, tap sur le rond = rien → maîtrise → expertise.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `SkillsSection` | composant | 10 |  |

### `src/pages/sheet/SpellBookDialog.tsx` (97 lignes)

Grimoire d'un perso : tous les sorts possibles (ajoutés par le MJ). Le joueur coche ceux qu'il prépare ; le MJ ajoute (bibliothèque ou sort maison), modifie, et fixe le nombre maximum de sorts préparés.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `SpellBookDialog` | composant | 13 |  |

### `src/pages/sheet/SpellDialog.tsx` (212 lignes)

Fenêtre d'un sort : lancer (emplacement, concentration, dégâts) ; le MJ peut aussi le créer ou le modifier.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `blankSpell` | constante | 17 | Sort vide pour la création par le MJ. |
| `SpellDialog` | composant | 19 |  |

### `src/pages/sheet/SpellLibraryDialog.tsx` (95 lignes)

Bibliothèque de sorts (MJ) : recherche par nom, niveau et classe, ajout en un tap sur la fiche du perso.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `SpellLibraryDialog` | composant | 13 |  |

### `src/pages/sheet/SpellPicker.tsx` (60 lignes)

Choix de sorts dans la bibliothèque de sa classe (création et montée de niveau) : sorts mineurs et sorts de niveau 1+ comptés séparément, jusqu'au niveau de sort accessible.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `countCantrips` | constante | 19 | Noms choisis → nombre de sorts mineurs parmi eux. |
| `SpellPicker` | composant | 21 |  |

### `src/pages/sheet/SpellsSection.tsx` (153 lignes)

Fiche, onglet Combat : carte « Sorts » (DD, attaque, concentration, emplacements, sorts prêts à lancer). Réglages d'incantation en mode ✏️ Modifier (MJ). Grimoire complet : SpellBookDialog.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `hasSpellcasting` | constante | 16 | Le perso a-t-il quelque chose à voir côté sorts ? |
| `SpellsSection` | composant | 19 |  |

### `src/pages/sheet/StatusSection.tsx` (147 lignes)

Fiche : états (conditions), épuisement, repos court (dés de vie) et repos long.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `StatusSection` | composant | 13 |  |
| `ShortRestDialog` | composant interne | 108 |  |

### `src/pages/sheet/VitalsSection.tsx` (146 lignes)

Fiche : PV, PV temporaires, CA, initiative, vitesse, perception passive, maîtrise, inspiration, jets contre la mort.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `VitalsSection` | composant | 11 |  |

### `src/pages/sheet/useSheet.ts` (110 lignes)

Hook de la fiche D&D : données normalisées, droits, enregistrement et jets (avec avantage/désavantage).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `ListKey` | type | 14 |  |
| `SheetCtx` | type | 16 |  |
| `useSheet` | fonction | 42 |  |

## src/pages/shop/

### `src/pages/shop/SellList.tsx` (67 lignes)

Joueur : vendre au marchand les objets de son sac (moitié de leur valeur : prix du marchand ou de la bibliothèque), ou les déposer dans un coffre (gratuit).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `SellList` | composant | 12 |  |

### `src/pages/shop/ShopEditor.tsx` (141 lignes)

MJ : préparer un marchand ou un coffre (nom, icône, description, objets avec prix et stock), depuis la bibliothèque d'objets (prix pré-remplis) ou en objet maison.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `ShopEditor` | composant | 22 |  |

### `src/pages/shop/ShopPage.tsx` (186 lignes)

Onglet Marché : marchands et coffres. MJ : les prépare à l'avance et les montre/cache aux joueurs. Joueur : voit les marchands visibles, achète avec la bourse de son perso (ou prend dans un coffre).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `ShopPage` | composant | 15 |  |
| `ShopCard` | composant interne | 110 |  |

## src/

### `src/router.ts` (42 lignes)

Routeur minimal par hash (#/c/<id>/des) : navigate() et useRoute().

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `readHash` | fonction interne | 8 |  |
| `navigate` | fonction | 13 |  |
| `back` | fonction | 24 |  |
| `useRoute` | fonction | 29 |  |

## src/styles/

### `src/styles/actions.css` (113 lignes)

Fiche D&D : attaques, capacités (compteurs), sorts, emplacements, concentration.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `compteurs (utilisations, emplacements)` | section | 27 |  |
| `sorts` | section | 42 |  |
| `bibliothèque de sorts` | section | 75 |  |
| `---------- Historique (tiroir à droite) ----------` | section | 88 |  |
| `Barre du haut : icônes Dés / Marché` | section | 109 |  |

### `src/styles/base.css` (192 lignes)

Grimoire : thème "table de nuit", ardoise bleutée + vert-de-gris.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `---------- layout ----------` | section | 103 |  |
| `Hors connexion` | section | 190 |  |

### `src/styles/combat.css` (213 lignes)

Onglet Combat : en-tête du round, ordre d'initiative, tour actif, état des monstres.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `carte de combat` | section | 41 |  |
| `ciblage dans l'ordre d'initiative` | section | 81 |  |
| `panneau des actions` | section | 89 |  |
| `v0.7 : plan, décor, zones d'effet, attaques d'opportunité` | section | 119 |  |
| `v0.9 : matériaux du décor (pierre = .wall, brique, bois, buisson, table)` | section | 140 |  |
| `v0.13 : portes (fermée, ouverte, verrouillée), table, objets et nouveaux murs` | section | 166 |  |
| `v0.15 : coffre et pièges dessinés (aussi dans la palette du MJ : .mat-ico)` | section | 191 |  |

### `src/styles/controles.css` (134 lignes)

Contrôles : boutons, puces, onglets segmentés, écrans connexion/accueil. ---------- boutons ----------

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `---------- boutons ----------` | section | 2 |  |
| `---------- login / home ----------` | section | 74 |  |
| `Règles simplifiées (accueil)` | section | 126 |  |

### `src/styles/dnd.css` (159 lignes)

Fiche D&D : barre d'outils, caractéristiques, compétences, PV, états, bourse, liste compacte des persos.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `les jauges en <span> doivent se comporter comme des blocs` | section | 3 |  |
| `barre d'outils et sous-onglets` | section | 6 |  |
| `caractéristiques` | section | 13 |  |
| `compétences` | section | 50 |  |
| `PV et valeurs de combat` | section | 70 |  |
| `états` | section | 117 |  |
| `bourse` | section | 123 |  |
| `liste compacte des persos (table MJ)` | section | 141 |  |

### `src/styles/fiche.css` (146 lignes)

Fiche de personnage : cartes, avatars, jauges, caractéristiques, inventaire. ---------- persos ----------

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `---------- persos ----------` | section | 2 |  |
| `jauges` | section | 34 |  |
| `fiche` | section | 69 |  |
| `inventaire` | section | 111 |  |
| `Assistant de création` | section | 121 |  |
| `v0.22 : emplacements des objets portés` | section | 141 |  |

### `src/styles/table.css` (157 lignes)

Table : dés, notes, panneau MJ, modales, notifications. dés

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `dés` | section | 2 |  |
| `notes` | section | 40 |  |
| `MJ` | section | 55 |  |
| `---------- modale & notifications ----------` | section | 75 |  |
| `Marché` | section | 140 |  |

## supabase/

### `supabase/installation_complete.sql` (2153 lignes)

Grimoire JDR : installation complète de la base (toutes les migrations, dans l’ordre). Fichier généré par scripts/sql-complet.mjs : ne pas modifier à la main. Base NEUVE : copie tout ce fichier dans Supabase → SQL Editor → New query → Run (une seule fois). Base déjà installée : exécute seulement les nouveaux fichiers de supabase/migrations/. Contient : 01_tables.sql → 09_combat.sql (9 fichiers).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `campaigns` | table | 21 | ---------------------------------------------------------------- tables |
| `members` | table | 31 |  |
| `characters` | table | 39 |  |
| `items` | table | 55 |  |
| `rolls` | table | 67 |  |
| `notes` | table | 82 |  |
| `campaign_secrets` | table | 147 | Données secrètes du MJ (PV, CA des monstres) : invisibles pour les joueurs. |
| `campaign_maps` | table | 177 | Image de fond de la carte (séparée de campaigns.combat pour ne pas la renvoyer à chaque déplacement). |
| `shops` | table | 196 | Marchands et coffres |
| `shop_items` | table | 209 |  |
| `is_member` | fonction SQL | 257 | ------------------------------------------------------- fonctions d'aide |
| `is_gm` | fonction SQL | 262 |  |
| `is_gm_of_char` | fonction SQL | 274 |  |
| `can_edit_inventory` | fonction SQL | 280 | MJ, ou propriétaire du perso si la campagne autorise les joueurs à gérer leur inventaire. |
| `can_edit_character` | fonction SQL | 290 |  |
| `can_edit_hp` | fonction SQL | 299 | MJ, ou propriétaire si la table autorise les joueurs à gérer leurs PV (réglage playersEditHp, non par défaut). |
| `guard_hp` | fonction SQL | 311 | Garde-fou : un joueur ne peut pas modifier les PV (colonne resources) par une mise à jour directe. Exception interne : death_save active « grimoire.allow_hp » le temps de sa mise à jour. |
| `guard_sheet` | fonction SQL | 331 | Fiche protégée : un joueur qui écrit directement dans la table (sans passer par une fonction de l'appli, qui elles tournent avec les droits du serveur) ne peut changer que nom, avatar, sous-titre et notes ; pas la fiche D&D. Volontairement sans « security definer » : current_user vaut alors « authenticated » pour un appel direct. |
| `guard_items` | fonction SQL | 348 | Le joueur ne peut pas modifier la formule de soin d'un objet (seul le MJ). |
| `campaigns_select` | règle d’accès | 366 |  |
| `campaigns_update` | règle d’accès | 369 |  |
| `campaigns_delete` | règle d’accès | 372 |  |
| `members_select` | règle d’accès | 375 |  |
| `members_delete` | règle d’accès | 378 |  |
| `characters_select` | règle d’accès | 382 |  |
| `characters_insert` | règle d’accès | 385 |  |
| `characters_update` | règle d’accès | 389 |  |
| `characters_delete` | règle d’accès | 394 |  |
| `items_select` | règle d’accès | 398 |  |
| `items_update` | règle d’accès | 401 |  |
| `items_delete` | règle d’accès | 405 |  |
| `rolls_select` | règle d’accès | 408 |  |
| `rolls_insert` | règle d’accès | 412 |  |
| `rolls_delete` | règle d’accès | 416 |  |
| `notes_insert` | règle d’accès | 419 |  |
| `notes_update` | règle d’accès | 423 |  |
| `notes_delete` | règle d’accès | 428 |  |
| `items_insert` | règle d’accès | 432 |  |
| `secrets_gm` | règle d’accès | 435 |  |
| `maps_gm` | règle d’accès | 439 |  |
| `shops_read` | règle d’accès | 442 |  |
| `shops_gm` | règle d’accès | 445 |  |
| `shop_items_read` | règle d’accès | 448 |  |
| `shop_items_gm` | règle d’accès | 452 |  |
| `notes_select` | règle d’accès | 455 |  |
| `maps_read` | règle d’accès | 461 |  |
| `create_campaign` | fonction SQL | 482 | ------------------------------------------------------------- fonctions RPC |
| `join_campaign` | fonction SQL | 507 |  |
| `adjust_resource` | fonction SQL | 523 | Ajuste une jauge sans écraser les modifications simultanées. Plafonnée à [0, max]. |
| `adjust_currency` | fonction SQL | 541 |  |
| `_apply_hp_internal` | fonction SQL | 551 | Interne : dégâts (< 0, PV temporaires d'abord) ou soins (> 0), sans contrôle de droits. Jamais appelée directement. |
| `apply_hp` | fonction SQL | 576 | apply_hp / set_temp_hp : mêmes calculs que 004, avec le droit « PV ». |
| `set_temp_hp` | fonction SQL | 601 |  |
| `death_save` | fonction SQL | 614 | Jet contre la mort (d20 naturel) : le joueur peut le faire lui-même. 20 = 1 PV, 1 = 2 échecs. |
| `adjust_coins` | fonction SQL | 642 | Pièces : le joueur peut seulement dépenser. |
| `use_feature` | fonction SQL | 658 | Actions « utiliser » autorisées au joueur : capacité, emplacement de sort, sort préparé. |
| `spend_slot` | fonction SQL | 678 |  |
| `set_prepared` | fonction SQL | 696 | Sorts préparés : le joueur respecte le maximum fixé par le MJ (spellcasting.preparedMax, 0 = libre). |
| `patch_sheet` | fonction SQL | 722 | ---------- Fiche : le joueur gère ses compagnons et sa vision dans le noir (= PLAYER_SHEET_KEYS). |
| `set_display_name` | fonction SQL | 751 | compte du joueur — changer son pseudo partout (nom affiché dans toutes ses campagnes). Le reste (mot de passe oublié, lien de connexion par email, nouveau mot de passe) est géré par Supabase Auth. |
| `_slots_for` | fonction SQL | 770 | Emplacements de sorts par classe et niveau (= suggestedSlots, src/lib/dnd/spells.ts). |
| `_feat_info` | fonction SQL | 790 | ---------- Dons (recopiés de src/lib/dnd/srd/feats.ts, généré par scripts/gen-dons-sql.ts ; test de parité). |
| `_has_conc_adv` | fonction SQL | 795 | Mage de guerre : avantage aux sauvegardes de concentration. |
| `_level_up_core` | fonction SQL | 803 | Monter d'un niveau (joueur propriétaire ou MJ). Mêmes vérifications que checkLevelUp (src/lib/dnd/levelup.ts) : +1 niveau, PV gagnés plausibles, amélioration de caractéristiques seulement aux bons niveaux (+2 au total, 20 max), expertise seulement sur des compétences maîtrisées, sorts anciens conservés. Emplacements recalculés ici. |
| `level_up` | fonction SQL | 887 | ---------- Montée de niveau : en plus, un don à la place de l'amélioration (= checkFeatLevelUp). |
| `level_down` | fonction SQL | 980 | ---------- MJ : −1 niveau (= levelDownPatch). Niveau accordé non pris → retiré ; sinon dernière montée annulée (fiche d'avant, PV gagnés retirés) ; sans historique, niveau −1 et emplacements recalculés. |
| `give_item` | fonction SQL | 1036 | Objets : seul le MJ en crée (give_item) ; le joueur peut réduire la quantité, équiper, jeter, donner. |
| `transfer_item` | fonction SQL | 1055 | transfer_item : le joueur peut donner un objet à un autre perso (fusion autorisée côté destinataire). |
| `use_item` | fonction SQL | 1078 | Objet de soin (potion) : −1 exemplaire et PV rendus au porteur ou à une cible de la campagne. |
| `_pay_coins` | fonction SQL | 1102 | Paie p_price (pc) avec une bourse {pp,po,pe,pa,pc} : garde les plus grosses pièces, rend la monnaie en po/pa/pc. = payCoins (src/lib/dnd/shop.ts). |
| `buy_item` | fonction SQL | 1127 | Achat (marchand) ou prise (coffre) : vérifie droits, visibilité et stock, paie, retire du stock, ajoute au sac. |
| `sell_item` | fonction SQL | 1161 | Vente : moitié de la valeur (prix du marchand pour le même objet, sinon bibliothèque) ; l'objet passe au marchand. = sellItem (src/data/localShopOps.ts), addCoins / resalePrice (src/lib/dnd/shop.ts). |
| `deposit_item` | fonction SQL | 1200 | ---------- Dépôt dans un coffre (joueur : coffre visible ; MJ : tout coffre), gratuit. |
| `_item_effects` | fonction SQL | 1231 | ---------- Bibliothèque d'objets (généré par scripts/gen-objets-sql.ts). |
| `_library_price` | fonction SQL | 1235 |  |
| `_apply_gear` | fonction SQL | 1329 | ---------- Recalcul de la fiche à partir des objets équipés (= applyGear, src/lib/dnd/gear.ts). |
| `items_gear` | fonction SQL | 1388 | Déclencheur : tout changement d'objet (équiper, retirer, donner, vendre, jeter…) recalcule la fiche concernée. |
| `_item_slot` | fonction SQL | 1403 | Emplacement d'un objet : armure/bouclier de la bibliothèque d'après leurs effets, sinon d'après le début du nom. |
| `_slot_label` | fonction SQL | 1426 |  |
| `_two_handed` | fonction SQL | 1435 |  |
| `_items_slot_check` | fonction SQL | 1439 |  |
| `_grid_pos` | fonction SQL | 1470 | Position d'un combattant sur la grille (anciennes « zones » converties comme posOf côté appli). |
| `_move_cost` | fonction SQL | 1477 | ---------- Carte : murs (glace, grille), terrain (eau, éboulis), porte verrouillée, objets. Remplace 013/014. |
| `_roll` | fonction SQL | 1526 | ---------- Dés côté serveur : « 2d10+3 », « 4d6 », « 1d8-1+2 » (= rollDice, sans les jets spéciaux). |
| `_combat_move_core` | fonction SQL | 1542 | ---------- Déplacement : vitesse et PV propres aux compagnons. |
| `combat_move` | fonction SQL | 1622 | ---------- Déplacement + pièges : un compagnon touché perd ses propres PV. |
| `toggle_door` | fonction SQL | 1706 |  |
| `set_initiative` | fonction SQL | 1753 | Initiative : le MJ pour tous, un joueur seulement pour son propre personnage. |
| `combat_dismiss` | fonction SQL | 1771 | Ignorer une attaque d'opportunité : MJ, ou propriétaire du perso qui pouvait attaquer. |
| `end_turn` | fonction SQL | 1792 | Finir le tour : le MJ pour tout le monde, un joueur seulement pendant le tour de son perso. Même calcul que nextTurn (src/lib/dnd/combat.ts) : on saute les monstres vaincus, le suivant récupère ses actions. |
| `_set_companion_hp` | fonction SQL | 1829 | ---------- Compagnons (= companions.ts) : PV sur le pion, venir près du maître, repartir. |
| `summon_companion` | fonction SQL | 1836 |  |
| `dismiss_companion` | fonction SQL | 1879 |  |
| `_roll_signed` | fonction SQL | 1906 | Dé signé : « 1d4 » ou « -1d4 ». |
| `_effects_active` | fonction SQL | 1912 | Effets encore actifs d'un combattant au round donné. |
| `_effects_ac` | fonction SQL | 1916 |  |
| `_effects_saves` | fonction SQL | 1920 |  |
| `_effects_resist` | fonction SQL | 1924 |  |
| `_drop_conc` | fonction SQL | 1929 | Fin de concentration d'un lanceur : ses effets de concentration disparaissent (= dropConcentration). |
| `_adjust_damage` | fonction SQL | 1937 | Dégâts après défenses (= adjustDamage) : immunité 0, résistance moitié, vulnérabilité ×2 (les deux s'annulent). |
| `_save_bonus` | fonction SQL | 1951 | Bonus de sauvegarde d'un perso (= saveBonus : mod + maîtrise + objets). |
| `combat_act` | fonction SQL | 1961 | ---------- Actions de combat : compagnons (CA, sauvegardes, PV propres) et Mage de guerre. |

## supabase/migrations/

### `supabase/migrations/01_tables.sql` (237 lignes)

01 : Tables, colonnes, index, temps réel (tout le schéma de données). Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `campaigns` | table | 14 | ---------------------------------------------------------------- tables |
| `members` | table | 24 |  |
| `characters` | table | 32 |  |
| `items` | table | 48 |  |
| `rolls` | table | 60 |  |
| `notes` | table | 75 |  |
| `campaign_secrets` | table | 140 | Données secrètes du MJ (PV, CA des monstres) : invisibles pour les joueurs. |
| `campaign_maps` | table | 170 | Image de fond de la carte (séparée de campaigns.combat pour ne pas la renvoyer à chaque déplacement). |
| `shops` | table | 189 | Marchands et coffres |
| `shop_items` | table | 202 |  |

### `supabase/migrations/02_acces.sql` (224 lignes)

02 : Droits : fonctions d’accès (MJ, membre, qui modifie quoi), règles RLS, garde-fous sur les PV, objets et fiches. Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `is_member` | fonction SQL | 12 | ------------------------------------------------------- fonctions d'aide |
| `is_gm` | fonction SQL | 17 |  |
| `is_gm_of_char` | fonction SQL | 29 |  |
| `can_edit_inventory` | fonction SQL | 35 | MJ, ou propriétaire du perso si la campagne autorise les joueurs à gérer leur inventaire. |
| `can_edit_character` | fonction SQL | 45 |  |
| `can_edit_hp` | fonction SQL | 54 | MJ, ou propriétaire si la table autorise les joueurs à gérer leurs PV (réglage playersEditHp, non par défaut). |
| `guard_hp` | fonction SQL | 66 | Garde-fou : un joueur ne peut pas modifier les PV (colonne resources) par une mise à jour directe. Exception interne : death_save active « grimoire.allow_hp » le temps de sa mise à jour. |
| `guard_sheet` | fonction SQL | 86 | Fiche protégée : un joueur qui écrit directement dans la table (sans passer par une fonction de l'appli, qui elles tournent avec les droits du serveur) ne peut changer que nom, avatar, sous-titre et notes ; pas la fiche D&D. Volontairement sans « security definer » : current_user vaut alors « authenticated » pour un appel direct. |
| `guard_items` | fonction SQL | 103 | Le joueur ne peut pas modifier la formule de soin d'un objet (seul le MJ). |
| `campaigns_select` | règle d’accès | 121 |  |
| `campaigns_update` | règle d’accès | 124 |  |
| `campaigns_delete` | règle d’accès | 127 |  |
| `members_select` | règle d’accès | 130 |  |
| `members_delete` | règle d’accès | 133 |  |
| `characters_select` | règle d’accès | 137 |  |
| `characters_insert` | règle d’accès | 140 |  |
| `characters_update` | règle d’accès | 144 |  |
| `characters_delete` | règle d’accès | 149 |  |
| `items_select` | règle d’accès | 153 |  |
| `items_update` | règle d’accès | 156 |  |
| `items_delete` | règle d’accès | 160 |  |
| `rolls_select` | règle d’accès | 163 |  |
| `rolls_insert` | règle d’accès | 167 |  |
| `rolls_delete` | règle d’accès | 171 |  |
| `notes_insert` | règle d’accès | 174 |  |
| `notes_update` | règle d’accès | 178 |  |
| `notes_delete` | règle d’accès | 183 |  |
| `items_insert` | règle d’accès | 187 |  |
| `secrets_gm` | règle d’accès | 190 |  |
| `maps_gm` | règle d’accès | 194 |  |
| `shops_read` | règle d’accès | 197 |  |
| `shops_gm` | règle d’accès | 200 |  |
| `shop_items_read` | règle d’accès | 203 |  |
| `shop_items_gm` | règle d’accès | 207 |  |
| `notes_select` | règle d’accès | 210 |  |
| `maps_read` | règle d’accès | 216 |  |

### `supabase/migrations/03_fiche.sql` (290 lignes)

03 : Campagne et fiche : créer / rejoindre, PV, pièces, capacités, emplacements, sorts préparés, modification de la fiche, pseudo. Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `create_campaign` | fonction SQL | 12 | ------------------------------------------------------------- fonctions RPC |
| `join_campaign` | fonction SQL | 37 |  |
| `adjust_resource` | fonction SQL | 53 | Ajuste une jauge sans écraser les modifications simultanées. Plafonnée à [0, max]. |
| `adjust_currency` | fonction SQL | 71 |  |
| `_apply_hp_internal` | fonction SQL | 81 | Interne : dégâts (< 0, PV temporaires d'abord) ou soins (> 0), sans contrôle de droits. Jamais appelée directement. |
| `apply_hp` | fonction SQL | 106 | apply_hp / set_temp_hp : mêmes calculs que 004, avec le droit « PV ». |
| `set_temp_hp` | fonction SQL | 131 |  |
| `death_save` | fonction SQL | 144 | Jet contre la mort (d20 naturel) : le joueur peut le faire lui-même. 20 = 1 PV, 1 = 2 échecs. |
| `adjust_coins` | fonction SQL | 172 | Pièces : le joueur peut seulement dépenser. |
| `use_feature` | fonction SQL | 188 | Actions « utiliser » autorisées au joueur : capacité, emplacement de sort, sort préparé. |
| `spend_slot` | fonction SQL | 208 |  |
| `set_prepared` | fonction SQL | 226 | Sorts préparés : le joueur respecte le maximum fixé par le MJ (spellcasting.preparedMax, 0 = libre). |
| `patch_sheet` | fonction SQL | 252 | ---------- Fiche : le joueur gère ses compagnons et sa vision dans le noir (= PLAYER_SHEET_KEYS). |
| `set_display_name` | fonction SQL | 281 | compte du joueur — changer son pseudo partout (nom affiché dans toutes ses campagnes). Le reste (mot de passe oublié, lien de connexion par email, nouveau mot de passe) est géré par Supabase Auth. |

### `supabase/migrations/04_niveaux_dons.sql` (268 lignes)

04 : Montée de niveau (emplacements, dons), annulation par le MJ. Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `_slots_for` | fonction SQL | 9 | Emplacements de sorts par classe et niveau (= suggestedSlots, src/lib/dnd/spells.ts). |
| `_feat_info` | fonction SQL | 29 | ---------- Dons (recopiés de src/lib/dnd/srd/feats.ts, généré par scripts/gen-dons-sql.ts ; test de parité). |
| `_has_conc_adv` | fonction SQL | 34 | Mage de guerre : avantage aux sauvegardes de concentration. |
| `_level_up_core` | fonction SQL | 42 | Monter d'un niveau (joueur propriétaire ou MJ). Mêmes vérifications que checkLevelUp (src/lib/dnd/levelup.ts) : +1 niveau, PV gagnés plausibles, amélioration de caractéristiques seulement aux bons niveaux (+2 au total, 20 max), expertise seulement sur des compétences maîtrisées, sorts anciens conservés. Emplacements recalculés ici. |
| `level_up` | fonction SQL | 126 | ---------- Montée de niveau : en plus, un don à la place de l'amélioration (= checkFeatLevelUp). |
| `level_down` | fonction SQL | 219 | ---------- MJ : −1 niveau (= levelDownPatch). Niveau accordé non pris → retiré ; sinon dernière montée annulée (fiche d'avant, PV gagnés retirés) ; sans historique, niveau −1 et emplacements recalculés. |

### `supabase/migrations/05_objets.sql` (194 lignes)

05 : Objets : donner, échanger, utiliser, acheter, vendre, déposer dans un coffre. Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `give_item` | fonction SQL | 6 | Objets : seul le MJ en crée (give_item) ; le joueur peut réduire la quantité, équiper, jeter, donner. |
| `transfer_item` | fonction SQL | 25 | transfer_item : le joueur peut donner un objet à un autre perso (fusion autorisée côté destinataire). |
| `use_item` | fonction SQL | 48 | Objet de soin (potion) : −1 exemplaire et PV rendus au porteur ou à une cible de la campagne. |
| `_pay_coins` | fonction SQL | 72 | Paie p_price (pc) avec une bourse {pp,po,pe,pa,pc} : garde les plus grosses pièces, rend la monnaie en po/pa/pc. = payCoins (src/lib/dnd/shop.ts). |
| `buy_item` | fonction SQL | 97 | Achat (marchand) ou prise (coffre) : vérifie droits, visibilité et stock, paie, retire du stock, ajoute au sac. |
| `sell_item` | fonction SQL | 131 | Vente : moitié de la valeur (prix du marchand pour le même objet, sinon bibliothèque) ; l'objet passe au marchand. = sellItem (src/data/localShopOps.ts), addCoins / resalePrice (src/lib/dnd/shop.ts). |
| `deposit_item` | fonction SQL | 170 | ---------- Dépôt dans un coffre (joueur : coffre visible ; MJ : tout coffre), gratuit. |

### `supabase/migrations/06_equipement.sql` (238 lignes)

06 : Équipement : effets des objets de la bibliothèque (CA, caracs, armes), prix, emplacements, deux mains. Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `_item_effects` | fonction SQL | 6 | ---------- Bibliothèque d'objets (généré par scripts/gen-objets-sql.ts). |
| `_library_price` | fonction SQL | 10 |  |
| `_apply_gear` | fonction SQL | 104 | ---------- Recalcul de la fiche à partir des objets équipés (= applyGear, src/lib/dnd/gear.ts). |
| `items_gear` | fonction SQL | 163 | Déclencheur : tout changement d'objet (équiper, retirer, donner, vendre, jeter…) recalcule la fiche concernée. |
| `_item_slot` | fonction SQL | 178 | Emplacement d'un objet : armure/bouclier de la bibliothèque d'après leurs effets, sinon d'après le début du nom. |
| `_slot_label` | fonction SQL | 201 |  |
| `_two_handed` | fonction SQL | 210 |  |
| `_items_slot_check` | fonction SQL | 214 |  |

### `supabase/migrations/07_carte.sql` (282 lignes)

07 : Carte : position, coût du déplacement, déplacement (et pièges), portes et torches. Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `_grid_pos` | fonction SQL | 6 | Position d'un combattant sur la grille (anciennes « zones » converties comme posOf côté appli). |
| `_move_cost` | fonction SQL | 13 | ---------- Carte : murs (glace, grille), terrain (eau, éboulis), porte verrouillée, objets. Remplace 013/014. |
| `_roll` | fonction SQL | 62 | ---------- Dés côté serveur : « 2d10+3 », « 4d6 », « 1d8-1+2 » (= rollDice, sans les jets spéciaux). |
| `_combat_move_core` | fonction SQL | 78 | ---------- Déplacement : vitesse et PV propres aux compagnons. |
| `combat_move` | fonction SQL | 158 | ---------- Déplacement + pièges : un compagnon touché perd ses propres PV. |
| `toggle_door` | fonction SQL | 242 |  |

### `supabase/migrations/08_tours_compagnons.sql` (148 lignes)

08 : Tours de combat : initiative, retrait, fin de tour ; compagnons et invocations. Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `set_initiative` | fonction SQL | 6 | Initiative : le MJ pour tous, un joueur seulement pour son propre personnage. |
| `combat_dismiss` | fonction SQL | 24 | Ignorer une attaque d'opportunité : MJ, ou propriétaire du perso qui pouvait attaquer. |
| `end_turn` | fonction SQL | 45 | Finir le tour : le MJ pour tout le monde, un joueur seulement pendant le tour de son perso. Même calcul que nextTurn (src/lib/dnd/combat.ts) : on saute les monstres vaincus, le suivant récupère ses actions. |
| `_set_companion_hp` | fonction SQL | 82 | ---------- Compagnons (= companions.ts) : PV sur le pion, venir près du maître, repartir. |
| `summon_companion` | fonction SQL | 89 |  |
| `dismiss_companion` | fonction SQL | 132 |  |

### `supabase/migrations/09_combat.sql` (257 lignes)

09 : Actions de combat : effets à durée, dégâts (résistances), concentration, résolution complète (combat_act). Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `_roll_signed` | fonction SQL | 10 | Dé signé : « 1d4 » ou « -1d4 ». |
| `_effects_active` | fonction SQL | 16 | Effets encore actifs d'un combattant au round donné. |
| `_effects_ac` | fonction SQL | 20 |  |
| `_effects_saves` | fonction SQL | 24 |  |
| `_effects_resist` | fonction SQL | 28 |  |
| `_drop_conc` | fonction SQL | 33 | Fin de concentration d'un lanceur : ses effets de concentration disparaissent (= dropConcentration). |
| `_adjust_damage` | fonction SQL | 41 | Dégâts après défenses (= adjustDamage) : immunité 0, résistance moitié, vulnérabilité ×2 (les deux s'annulent). |
| `_save_bonus` | fonction SQL | 55 | Bonus de sauvegarde d'un perso (= saveBonus : mod + maîtrise + objets). |
| `combat_act` | fonction SQL | 65 | ---------- Actions de combat : compagnons (CA, sauvegardes, PV propres) et Mage de guerre. |

## scripts/

### `scripts/build-offline.mjs` (89 lignes)

Build de secours SANS Vite ni npm install (utile quand le registre npm est inaccessible, ex. bac à sable de Claude). Utilise esbuild + react préinstallés. node scripts/build-offline.mjs            -> dist-offline/ (mode démo local) node scripts/build-offline.mjs --single   -> dist-offline/demo.html (un seul fichier, sans <html>/<head>, pour l'aperçu Artifact) Variables : MODULES_DIR (dossier node_modules contenant esbuild/react/react-dom), par défaut /opt/npm-tools/node_modules. Supabase est remplacé par un module vide : ce build ne fonctionne qu'en mode démo local. Le vrai build reste `npm run build`.

### `scripts/carte-du-code.mjs` (125 lignes)

Génère docs/CARTE_DU_CODE.md : pour chaque fichier, son rôle et ses fonctions (avec numéro de ligne et commentaire). Lancer après chaque modification : node scripts/carte-du-code.mjs Le test tests/carte-du-code.test.ts échoue si la carte n'est pas à jour.

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `OUTPUT` | constante | 11 |  |
| `walk` | fonction interne | 15 |  |
| `header` | fonction interne | 25 | Commentaire d'en-tête du fichier (premières lignes de commentaire). |
| `docAbove` | fonction interne | 39 | Commentaire juste au-dessus de la ligne i (// ou /** *\/ sur une ou plusieurs lignes). |
| `symbols` | fonction interne | 66 |  |
| `generate` | fonction | 90 |  |

### `scripts/gen-dons-sql.ts` (6 lignes)

Génère la liste des dons recopiée en SQL (04_niveaux_dons.sql, _feat_info) depuis src/lib/dnd/srd/feats.ts. Usage : node --import tsx scripts/gen-dons-sql.ts

### `scripts/gen-objets-sql.ts` (8 lignes)

Génère les données d’objets recopiées en SQL (effets et prix de la bibliothèque) pour une migration. Usage : node --import tsx scripts/gen-objets-sql.ts

### `scripts/sql-complet.mjs` (30 lignes)

Assemble toutes les migrations (supabase/migrations/NN_*.sql, dans l’ordre) en un seul fichier à exécuter en une fois dans Supabase pour une installation neuve : supabase/installation_complete.sql. Usage : node scripts/sql-complet.mjs (le test tests/sql-complet.test.ts vérifie qu'il est à jour).

| Élément | Type | Ligne | Description |
| --- | --- | --- | --- |
| `OUTPUT` | constante | 10 |  |
| `generate` | fonction | 13 | Contenu du fichier unique. |
