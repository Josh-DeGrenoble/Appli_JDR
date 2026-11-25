# Architecture

Lire avec [CARTE_DU_CODE.md](CARTE_DU_CODE.md) (généré : chaque fonction, sa ligne, son rôle).

## Règles du projet

- **300 lignes max par fichier de code** (vérifié par `tests/taille-fichiers.test.ts`). Au-delà : découper par responsabilité.
- Chaque fichier commence par un commentaire d'une ligne qui dit son rôle ; chaque fonction exportée a un `/** commentaire */`.
- Après toute modification : `node scripts/carte-du-code.mjs` (sinon `tests/carte-du-code.test.ts` échoue).

## Pile technique

- **React 19 + TypeScript**, build **Vite**. Pas de librairie d'UI : CSS maison dans `src/styles/`.
- **PWA** : `public/manifest.webmanifest` + `public/sw.js`.
- **Supabase** (Postgres + Auth + Realtime) en ligne ; **LocalStore** (navigateur) en mode démo.
- Routage par hash (`#/c/<id>/des`), compatible GitHub Pages.

## Couches

```
pages/  (écrans React)  ──►  data/useCampaign, useRoller, actions  ──►  data/store.ts (interface Store)
                                                                          ├─ localStore.ts (+ localDb, localGameOps)
                                                                          └─ supabaseStore.ts (+ supabaseGameOps, supabaseUtils) ──► supabase/migrations/*.sql
lib/  (logique pure, sans React ni réseau : types, dés, modèles)
components/  (briques d'interface réutilisables)
```

- Les **pages** ne parlent jamais directement à Supabase ou au localStorage : toujours via `useSession().store`.
- La **logique de règles** (dés, calculs D&D) va dans `lib/` et est testée unitairement.

## Où modifier quoi

| Je veux… | Fichier(s) |
| --- | --- |
| Changer couleurs, polices, thème clair/sombre | `src/styles/base.css` (tokens `:root`) |
| Style des boutons, puces, accueil | `src/styles/controles.css` |
| Style fiche, jauges, inventaire | `src/styles/fiche.css` |
| Style dés, notes, panneau MJ, modales, notifications | `src/styles/table.css` |
| Style fiche D&D, table MJ compacte | `src/styles/dnd.css` |
| Style attaques, capacités, sorts, compteurs | `src/styles/actions.css` |
| Style de l'onglet Combat | `src/styles/combat.css` |
| Règles D&D (calculs, bonus, PV, repos) | `src/lib/dnd/rules.ts` + `tests/dndRules.test.ts` |
| Listes D&D (compétences, classes, états, pièces) | `src/lib/dnd/data.ts` |
| Champs de la fiche D&D (structure, valeurs par défaut) | `src/lib/dnd/sheet.ts` (`DndSheet`, `normalizeSheet`) |
| Une section de la fiche | `src/pages/sheet/*Section.tsx` (Vitals, Status, Abilities, Skills, Identity, Coins) |
| Fenêtre PV (dégâts/soins/temp) | `src/pages/sheet/HpDialog.tsx` |
| Jets depuis la fiche, mode avantage, listes (attaques, sorts, capacités) | `src/pages/sheet/useSheet.ts` (`saveIn`, `removeIn`) |
| Attaques, capacités, effets des repos (calculs) | `src/lib/dnd/actions.ts` + `tests/dndActions.test.ts` |
| Sorts : DD, attaque, emplacements par classe | `src/lib/dnd/spells.ts` |
| Écrans attaques / capacités | `src/pages/sheet/AttacksSection.tsx`, `FeaturesSection.tsx` |
| Objets équipés / harmonisés | `src/pages/Inventory.tsx` (`EquipToggles`) |
| Ce qu'un joueur peut modifier seul (champs de fiche autorisés, utiliser capacité/emplacement) | `src/lib/dnd/permissions.ts` + `tests/permissions.test.ts` ; démo : `localSheetOps.ts` ; en ligne : `03_fiche.sql` (même liste de champs !) |
| Bibliothèque de sorts (données, recherche) | `src/lib/dnd/srd/spellsLow.ts`, `spellsHigh.ts`, `library.ts` ; écran : `src/pages/sheet/SpellLibraryDialog.tsx` |
| Combat : ordre d'initiative, tours, état des monstres (calculs) | `src/lib/dnd/combat.ts` + `tests/combat.test.ts` |
| Combat : écran, ajout, détail d'un combattant | `src/pages/combat/CombatPage.tsx`, `CombatSetupDialog.tsx`, `CombatantDialog.tsx` |
| Combat : actions (relisent l'état en base avant d'écrire) | `src/pages/combat/useCombat.ts` (`mutate`) |
| Combat : initiative du joueur, secrets MJ | démo `localCombatOps.ts` ; en ligne `08_tours_compagnons.sql` (`set_initiative`, table `campaign_secrets`) |
| Carte, distances | `src/lib/dnd/grid.ts` (`distance`, `inRange`, `movementLeft`, `freeCell`) ; écran : `src/pages/combat/BattleMap.tsx`, outils MJ `MapTools.tsx` |
| Déplacements, chemins (murs, terrain difficile), attaques d'opportunité | `src/lib/dnd/movement.ts` (`moveCosts`, `applyMove`, `opportunities`) + `tests/map.test.ts` = SQL `_move_cost`, `combat_move` (`09_combat.sql`) + `tests/sql/test_010_carte.sql` : **garder identiques** |
| Zones d'effet (sphère, cube, cône, ligne) | `src/lib/dnd/area.ts` ; données sorts `SPELL_SHAPES` (`srd/spellMeta.ts`) ; choix `src/components/ShapeSelect.tsx` |
| Ligne de vue, brouillard, pions cachés | `src/lib/dnd/sight.ts` (`canSee`, `playerView`, `visibleTokens`) ; filtrage dans `CombatPage.tsx` ; option `MapTools.tsx` |
| Bestiaire (monstres pré-remplis) | `src/lib/dnd/srd/monsters.ts` ; choix dans `CombatSetupDialog.tsx` |
| Plans enregistrés | `src/pages/combat/useScenes.ts`, `ScenesPanel.tsx` (secrets `scenes`, images par clé `store.saveMapImage(…, key)`) |
| Matériaux du décor (vue, passage, terrain difficile) | `src/lib/dnd/terrain.ts` (`blocksMove`, `blocksSight`, `isSlow`, `MATERIALS`) = SQL `_move_cost` / `combat_move` (`05_objets.sql`) ; palette `MapTools.tsx`, textures `combat.css` |
| Revente | `src/pages/shop/SellList.tsx` ; `itemValue`, `resalePrice`, `addCoins` (`shop.ts`) ; démo `localShopOps.sellItem` ; SQL `sell_item`, `_library_price` (généré depuis `srd/items.ts`) |
| Messages secrets | notes cachées envoyées à des joueurs choisis : `src/pages/Notes.tsx` (`reader_ids`) |
| Barre du haut / onglets | `src/pages/Campaign.tsx` (onglets en bas, icônes 🎲 🏪 ✉️ 🕘) ; volets de l'onglet MJ : `src/pages/gm/GmPanel.tsx` |
| Opérations de table des stores | `src/data/localTableStore.ts`, `supabaseTableStore.ts` (classes de base de LocalStore / SupabaseStore) |
| Portes, pièces fermées | `terrain.ts` (`isDoor`, `closesRoom`), `sight.ts` (`openArea`, `playerView`), `movement.ts` (`toggleDoor`) = SQL `toggle_door` (`07_carte.sql`) |
| Plans préparés à l'avance | `src/pages/combat/useSceneDraft.ts` (contexte `MapCtx` écrit dans `secrets.scenes`), `ScenePrep.tsx` ; la carte (`BattleMap`, `MapTools`) prend un `MapCtx` |
| Notes préparées / révélées | `src/pages/Notes.tsx` (`RevealNote`, `isPrepared`) ; `notes.reader_ids` (`07_carte.sql`) |
| Avantage / désavantage automatiques | `src/lib/dnd/advantage.ts` (`autoMode`, `modeTag`) + `tests/advantage.test.ts` ; fiche `useSheet.rollD20(label, bonus, kind, ability)` ; combat `CombatPage.modeFor` ; MJ : `sheet.grant` (`GrantButton` dans `Characters.tsx`, barre de la fiche) |
| Perso à 0 PV, finir son tour | `DownPanel.tsx`, `resolve.ts` (refus), `localCombatOps.endTurn/combatMove` = SQL `combat_act`, `combat_move`, `end_turn` (`08_tours_compagnons.sql`) |
| Bestiaire du MJ | `src/pages/gm/BestiaryPage.tsx` (`secrets.bestiary`) ; choix dans `CombatSetupDialog.tsx` (« Mes monstres ») |
| Règles simplifiées (accueil) | `src/pages/RulesDialog.tsx` |
| Niveaux accordés, XP, annulation | `src/lib/dnd/levels.ts` (`XP_THRESHOLDS`, `allowedLevelOf`, `xpPatch`, `pushHistory`, `levelDownPatch`) ; écran `src/pages/sheet/LevelBar.tsx`, `gm/Distribute.tsx` ; démo `localSheetOps.levelDown` = SQL `level_down` (`04_niveaux_dons.sql`) ; `tests/levels.test.ts` |
| Sous-classes | `src/lib/dnd/srd/subclasses.ts` (`subclassesOf`, `subclassFeaturesAt`) utilisé par `featuresAt` (progression.ts) ; choix dans `LevelUpDialog.tsx` et `CreationWizard.tsx` |
| Objets équipables | effets dans `src/lib/dnd/srd/items.ts` (`effects`), calcul `src/lib/dnd/gear.ts` (`applyGear`, `sheet.gear`) ; démo : `localGear.ts` appelé à chaque `LocalDb.write` = SQL `_apply_gear` + déclencheur `items_gear` (`06_equipement.sql`) ; parité `tests/gear.test.ts` (régénérer avec `scripts/gen-objets-sql.ts`) |
| Dépôt dans un coffre | `localShopOps.depositItem` = SQL `deposit_item` (`06_equipement.sql`) ; écrans `pages/ItemGive.tsx`, `shop/SellList.tsx` |
| Effets à durée, concentration | `src/lib/dnd/effects.ts` (`EFFECT_PRESETS`, `addEffect`, `dropConcentration`, `concentrationDc`) ; appliqués dans `resolve.ts` = SQL `combat_act` (`09_combat.sql`) ; écran `combat/EffectsEditor.tsx` ; rappel MJ `data/actions.concentrationReminder` |
| Types de dégâts, défenses | `src/lib/dnd/damage.ts` (`damageTypeOf`, `adjustDamage`, `cycleDefense`) ; écran `components/DefensesEditor.tsx` ; défenses SRD dans `srd/monsters.ts` |
| Test demandé au groupe | `src/lib/dnd/requests.ts` (`settings.request`, réponses = jets marqués ⟦demande:perso⟧) ; MJ `gm/GroupCheck.tsx`, joueur `pages/RequestBanner.tsx` |
| Suggestion monstres | `src/lib/dnd/monsterAi.ts` (`suggestMonster`), bouton dans `combat/CombatPage.tsx` |
| SQL en un fichier | `scripts/sql-complet.mjs` → `supabase/installation_complete.sql` (test `tests/sql-complet.test.ts`, `bash scripts/test-sql.sh complet`) |
| Emplacements d'équipement | `src/lib/dnd/slots.ts` (`SLOTS`, `slotOf`, `slotConflicts`) ; écran `sheet/Equipment.tsx` (`WornPanel`, `EquipToggles`, `SlotTag`) ; démo `localGameOps.updateItem` = SQL `_item_slot` + déclencheur `items_slot` (`06_equipement.sql`) |
| Torches, sorts de lumière | `movement.toggleDoor` (torche ↔ torche éteinte) = SQL `toggle_door` (`07_carte.sql`) ; `effects.ts` (`light`, `effectsLight`) utilisé par `sight.darkView` |
| Pages chargées à la demande | `pages/Campaign.tsx`, `Characters.tsx` (`React.lazy`) |
| Chargement en ligne par morceaux, réseau coupé | `src/data/supabaseCache.ts` (`CampaignCache` : tables marquées par le temps réel, jets ajoutés sans requête, suppressions d'autres campagnes ignorées), `network.ts` (renvoi après coupure), `components/OfflineBadge.tsx` ; `tests/cache.test.ts` |
| Tests de bout en bout | `tests/e2e-demo.mjs` (lanceur, un navigateur neuf par scénario), `e2e-outils.mjs` (table de départ, `onglet` qui réappuie si besoin), scénarios `e2e-partie.mjs` (+ modules), `e2e-objets.mjs`, `e2e-messages.mjs` |
| Dons | liste `src/lib/dnd/srd/feats.ts`, effets `src/lib/dnd/feats.ts` (`featPatch`, `checkFeatLevelUp`) ; création `creation.ts` + `pages/creation/OriginFeats.tsx` ; montée `levelup.ts` + `sheet/FeatPicker.tsx` = SQL `level_up` (`04_niveaux_dons.sql`, `_feat_info` régénéré par `scripts/gen-dons-sql.ts`, parité `tests/dons.test.ts`) |
| Compagnons, invocations | `src/lib/dnd/companions.ts` (modèles, `summonCompanion`) ; fiche `sheet/CompanionsSection.tsx`, carte `combat/CompanionsPanel.tsx` ; démo `localCombatOps` = SQL `summon_companion`, `dismiss_companion` (`08_tours_compagnons.sql`), `combat_act` (`09_combat.sql`) |
| Obscurité, vision dans le noir | `src/lib/dnd/sight.ts` (`darkView`), `vision.ts` (`partyVision`, torche/lanterne) ; bouton `combat/MapTools.tsx` (`map.dark`) |
| Message secret (note à certains joueurs) | `src/pages/Notes.tsx` (`reader_ids` choisis à l'écriture) |
| Écran du MJ | `pages/gm/GmScreen.tsx` (onglet Persos du MJ : combat, `Characters`, `Distribute`) |
| Zoom de la carte | `pages/combat/useMapZoom.ts` (niveaux, pincement, recentrage) utilisé par `BattleMap.tsx` ; tailles via `--zoom` dans `combat.css` |
| Comptes | `pages/Login.tsx` (connexion, lien email, mot de passe oublié), `pages/Account.tsx` (Mon compte, nouveau mot de passe), `App.tsx` (route `/compte`) ; Store : `resetPassword`, `sendLoginLink`, `updatePassword`, `updateName`, `onPasswordRecovery` ; SQL `set_display_name` (`03_fiche.sql`) |
| Cartes passées | `src/lib/dnd/pastMaps.ts` (`campaign.settings.maps`) ; archivage dans `combat/useScenes.ts` (open/save/remove/share) ; écran joueur `combat/PastMaps.tsx` ; images : politique `maps_read` (`03_fiche.sql`) |
| Vrais dés | `settings.realDice` ; `sheet/useSheet.ts` (`rollD20`, `roll`, `realDice`) ; sorts journalisés dans `sheet/SpellDialog.tsx` |
| Lieux | `src/lib/dnd/places.ts` (secrets.places, `settings.place`) ; `pages/places/` (`usePlaces`, `PlacesPage`, `PlaceTitle`) ; favoris dans `ScenesPanel`, `CombatSetupDialog`, `Notes` |
| Pièges | `src/lib/dnd/traps.ts` (`springTrap`, `trapsArmed`) appelé par `localCombatOps.combatMove` = SQL `combat_move` (`07_carte.sql`) ; réglages `secrets.traps`, écran `combat/TrapDialog.tsx` |
| Montée de niveau | données `src/lib/dnd/srd/progression.ts` (aptitudes, sorts préparés, mineurs, améliorations, expertise, attaques, utilisations) ; calculs `src/lib/dnd/levelup.ts` (+ `tests/levelup.test.ts`) ; écran `src/pages/sheet/LevelUpDialog.tsx`, `SpellPicker.tsx` ; démo `localSheetOps.levelUp` = SQL `level_up`, `_slots_for` (`07_carte.sql`) |
| Éléments de carte (murs, terrain, portes, objets, piège) | `src/lib/dnd/terrain.ts` (`MATERIALS`, `blocksMove`, `blocksSight`, `isSlow`, `closesRoom`, `playerKind`) = SQL `_move_cost`, `combat_move`, `toggle_door` (`07_carte.sql`) ; icônes dans `combat.css` |
| Règles expliquées | contenu `src/pages/rulesContent.ts`, écran `src/pages/RulesDialog.tsx` |
| Assistant de création | données `src/lib/dnd/srd/creation.ts`, calculs `src/lib/dnd/creation.ts` (+ `tests/creation.test.ts`), écrans `src/pages/creation/CreationWizard.tsx`, `AbilitiesStep.tsx` |
| Esquiver / Aider | `resolve.ts` (`used.dodge`, `combatant.helped`), `advantage.ts` (`helped`, `targetDodging`) = SQL `combat_act` (`09_combat.sql`) |
| Jet contre la mort automatique | `src/pages/combat/DownPanel.tsx` (une fois par round et par appareil) |
| Marchands et coffres | écrans `src/pages/shop/ShopPage.tsx`, `ShopEditor.tsx` ; démo `src/data/localShopOps.ts` ; en ligne `supabaseShopOps.ts` + SQL `05_objets.sql` (`buy_item`) |
| Prix, paiement, rendu de monnaie | `src/lib/dnd/shop.ts` (`payCoins`) = SQL `_pay_coins` + `tests/shop.test.ts`, `tests/sql/test_011_marchands.sql` |
| Bibliothèque d'objets (prix, potions) | `src/lib/dnd/srd/items.ts` ; inventaire (suggestions, 🧪 Boire) `src/pages/Inventory.tsx` |
| Image de fond de la carte | `store.saveMapImage/loadMapImage` (démo : clé localStorage à part ; en ligne : table `campaign_maps`), `useMapImage.ts`, compression `src/lib/image.ts` |
| Attaques d'opportunité (écran) | `src/pages/combat/OpportunityPanel.tsx`, `store.combatDismiss` |
| Attaques des monstres (dont souffles à sauvegarde) | `MonsterSecret.attacks` (`combat.ts`), `monsterActions` (`combatActions.ts`), saisie `MonsterAttacks.tsx` |
| Sorts à niveau supérieur | `atSlot` / `scaleFormula` (`combatActions.ts`), `SPELL_UPCAST` (`srd/spellMeta.ts`) |
| Historique (tiroir 🕘) | `src/components/HistoryDrawer.tsx` ; entrées = `rolls` avec `kind: 'event'` via `logEvent` (`src/data/actions.ts`) |
| Liste des actions de combat d'un perso, coûts, économie | `src/lib/dnd/combatActions.ts` + `tests/resolve.test.ts` |
| Résolution (touché/raté, sauvegardes, PV) | `src/lib/dnd/resolve.ts` (démo) = `combat_act` dans `09_combat.sql` (en ligne) : **garder les deux identiques** |
| Données de combat des sorts de la bibliothèque | `src/lib/dnd/srd/spellMeta.ts` |
| Panneau « Mes actions », ciblage, lancement | `src/pages/combat/ActionsPanel.tsx`, `CombatRow.tsx`, `useCombatActions.ts` |
| Objet de soin (potion) | `store.useItem` → `localCombatOps.useItem` / SQL `use_item` |
| Notification « c'est ton tour » | `src/data/useCampaign.ts` (`notifyChanges`) |
| Sorts dans la fiche (carte, grimoire, lancer) | `src/pages/sheet/SpellsSection.tsx`, `SpellBookDialog.tsx`, `SpellDialog.tsx` |
| Qui peut modifier les PV | réglage `playersEditHp` : `useCampaign.can('resources')`, `localGameOps.requireHpRight`, SQL `can_edit_hp` + trigger `guard_hp` (`03_fiche.sql`) |
| Repos long, états, PV max | `src/data/actions.ts` |
| Ajouter un champ en base | nouveau `supabase/migrations/00X_*.sql` + `src/lib/types.ts` + les 2 stores |
| Ajouter une opération (ex. « vendre un objet ») | `data/store.ts` (interface) → `localGameOps.ts` + `localStore.ts` → `supabaseStore.ts` (+ fonction SQL si atomique) |
| Règles d'accès (qui voit/modifie quoi) | `supabase/migrations/002_regles_acces.sql` (en ligne) + `localStore.loadCampaign` (démo) + `useCampaign.can` (interface) |
| Moteur de dés / nouvelle syntaxe | `src/lib/dice.ts` + `tests/dice.test.ts` |
| Notifications « tu as reçu… » | `src/data/useCampaign.ts` (`notifyChanges`) |
| Onglets d'une campagne (Persos, Combat, Dés, Notes, MJ) | `src/pages/Campaign.tsx` (`TABS`, `Body`) |
| Écran de fiche (sous-onglets) | `src/pages/sheet/CharacterSheet.tsx`, inventaire : `src/pages/Inventory.tsx` |
| Liste des persos / table MJ, création de perso | `src/pages/Characters.tsx` |
| Outils MJ | `src/pages/gm/GmPanel.tsx`, distribution : `src/pages/gm/Distribute.tsx` |
| Composants génériques (modale, jauge, confirmation…) | `src/components/ui.tsx` |
| Routes / navigation | `src/router.ts`, `src/App.tsx` |
| Choix démo / en ligne | `src/data/store.ts` (`getStore`) |
| Publication en ligne | `.github/workflows/deploy.yml` (copie : `github-workflow/deploy.yml`) |
| Build sans npm (démo Artifact) | `scripts/build-offline.mjs` |

## Flux de données

1. `useCampaign(id)` charge toute la campagne (persos, objets, 100 derniers jets, notes).
2. `store.subscribe` déclenche un rechargement (120 ms de délai groupé) à chaque changement : Supabase Realtime ou BroadcastChannel (démo). Rechargement aussi au retour au premier plan.
3. Les ajustements concurrents sont atomiques côté serveur : PV (`apply_hp`, `set_temp_hp`), pièces (`adjust_coins`), fiche (`patch_sheet` fusionne seulement les champs envoyés), objets (`give_item`, `transfer_item`).

## Fiche D&D

- Stockée dans `characters.sheet` (JSON, type `DndSheet`), **toujours lue via `normalizeSheet`** (complète les champs manquants).
- Les PV restent dans `characters.resources` (`pv` et `pvtemp`) pour les mises à jour atomiques.
- Les valeurs dérivées (modificateurs, bonus, perception passive…) ne sont **jamais stockées** : calculées par `lib/dnd/rules.ts`.
4. `notifyChanges` compare avant/après pour mes persos et affiche des notifications, sauf si l'appareil vient lui-même d'écrire (< 1 s).

## Règle d'or des droits

**Le MJ donne, le joueur utilise.** Un joueur ne peut jamais augmenter seul ses PV, sorts, emplacements, capacités, objets, pièces ou son inspiration.
Chaque règle existe en 3 endroits à garder alignés : interface (`gm`/`can` dans `useSheet`, `view.isGM`), mode démo (`localSheetOps.ts`, `localGameOps.ts`), serveur (`02_acces.sql`, `03_fiche.sql`).

## Sécurité (Row Level Security, `02_acces.sql`)

| Table | Lecture | Écriture |
| --- | --- | --- |
| campaigns | membres | MJ (création via `create_campaign`) |
| members | membres | via `join_campaign` ; suppression : soi-même ou MJ |
| characters | membres | propriétaire ou MJ |
| items | membres | MJ, ou propriétaire si `playersEditInventory` |
| rolls | membres ; jets `secret` : auteur + MJ | auteur ; suppression MJ |
| notes | `all` membres, `gm` auteur+MJ, `private` auteur | auteur ; MJ sauf notes privées |

Fiche protégée côté serveur : un joueur ne modifie sa fiche que par les fonctions de l'appli (`guard_sheet`) ; règle « les joueurs modifient leur fiche » appliquée par `patch_sheet`.

## Base de données : fichiers SQL

`supabase/migrations/` : la base complète en 9 fichiers par thème, à exécuter dans l'ordre (ou `supabase/installation_complete.sql`, généré par `scripts/sql-complet.mjs`, qui les rassemble). Historique fusionné en v1.0 (avant toute installation) : chaque fonction n'y est écrite qu'une fois, dans sa version finale.

**Tant que Jo n'a pas installé la base** : modifier directement ces fichiers. **Une fois installée** : ne plus les modifier ; ajouter `10_<sujet>.sql`, `11_…` (nouvelle version des fonctions concernées), le noter dans `CHANGELOG.md` et prévenir Jo.

| Fichier | Contenu |
| --- | --- |
| `01_tables.sql` | tables, colonnes, index, RLS activée, temps réel |
| `02_acces.sql` | `is_member`, `is_gm`, `is_gm_of_char`, `can_edit_*` ; gardes `guard_hp` (PV), `guard_items` (objets), `guard_sheet` (fiche : pas d'écriture directe par un joueur) ; toutes les règles RLS |
| `03_fiche.sql` | `create_campaign`, `join_campaign`, PV (`apply_hp`, `_apply_hp_internal`, `set_temp_hp`, `death_save`), pièces, `use_feature`, `spend_slot`, `set_prepared`, `patch_sheet` (liste blanche + règle `playersEditStats`), `set_display_name` |
| `04_niveaux_dons.sql` | `_slots_for`, `_feat_info`, `_has_conc_adv`, `_level_up_core`, `level_up` (niveau accordé, sous-classe, dons, historique léger), `level_down` |
| `05_objets.sql` | `give_item`, `transfer_item`, `use_item`, `_pay_coins`, `buy_item`, `sell_item`, `deposit_item` |
| `06_equipement.sql` | `_item_effects`, `_library_price` (générés par `scripts/gen-objets-sql.ts`), `_apply_gear` + déclencheur `items_gear`, `_item_slot`, `_two_handed`, déclencheur `items_slot` |
| `07_carte.sql` | `_grid_pos`, `_move_cost`, `_roll`, `_combat_move_core`, `combat_move` (pièges, compagnons), `toggle_door` (portes, torches) |
| `08_tours_compagnons.sql` | `set_initiative`, `combat_dismiss`, `end_turn`, `_set_companion_hp`, `summon_companion`, `dismiss_companion` |
| `09_combat.sql` | effets (`_effects_*`, `_drop_conc`), `_adjust_damage`, `_save_bonus`, `combat_act` (résolution complète) |

Tests : `tests/sql/test_*.sql` (noms hérités des anciennes migrations), dont `test_030_securite.sql` (fiche protégée, règle de la table, historique léger).
