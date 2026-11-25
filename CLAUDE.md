# Consignes pour Claude : projet Grimoire JDR

Jo (le propriétaire) ne code pas : il teste et donne des consignes. Claude fait tout le reste en autonomie (code, tests, doc, livraison). Répondre en français, tutoyer, réponses courtes, proposer des pistes annexes quand il y en a.

## Où vit le projet

- Dossier de Jo : `C:\Users\joshu\Documents\0_Documents\Appli_JDR` (connecté à la session Cowork). C'est la **source de vérité** : toujours partir de cette version (Jo a pu la modifier ou la pousser sur GitHub).
- Le workflow CI est dans `.github/workflows/deploy.yml` (créé dans le dossier de Jo avec `device_bash`, car l'archive de synchro l'exclut) ; copie visible dans `github-workflow/deploy.yml` : garder les deux identiques, et si le workflow change, le recopier avec `device_bash` (`cp github-workflow/deploy.yml .github/workflows/`).
- En ligne (une fois configuré par Jo, voir docs/MISE_EN_LIGNE.md) : GitHub Pages + Supabase. Le workflow `.github/workflows/deploy.yml` construit et publie à chaque push sur `main`.
- Démo de test : Artifact claude.ai « Grimoire JDR » https://claude.ai/artifact/X4Y25VtioyPw28rVL5U1uU (mode démo local, un seul fichier), republié à chaque version en passant cette URL comme `url`.

## Cycle de travail pour chaque consigne

1. Lire ce fichier, `docs/ARCHITECTURE.md`, `ROADMAP.md`, et les fichiers concernés.
2. Si la consigne est ambiguë : une question courte (AskUserQuestion), sinon foncer.
3. Coder. Garder la parité **LocalStore / SupabaseStore** : toute nouvelle opération est ajoutée à l'interface `Store` et aux deux implémentations.
4. Schéma de base modifié : la base est en 9 fichiers `supabase/migrations/01_…` à `09_…` (fusionnés en v1.0). **Tant que Jo n'a pas dit avoir installé la base**, modifier directement le bon fichier. **Ensuite**, ne plus les toucher : nouveau fichier `10_<sujet>.sql`, `11_…`. Puis `src/lib/types.ts` si besoin et `node scripts/sql-complet.mjs` (fichier d'installation unique `installation_complete.sql`).
5. Vérifier :
   - `npm test` (ou, sans accès npm : `NODE_PATH=/opt/npm-tools/node_modules node --import /opt/npm-tools/node_modules/tsx/dist/esm/index.mjs --test tests/*.test.ts`)
   - `node scripts/build-offline.mjs` puis `python3 -m http.server 4173 -d dist-offline &` et `node tests/e2e-demo.mjs http://localhost:4173 <dossier-captures> [scénario]` (partie, objets, messages ; tous par défaut) ; regarder les captures. Nouveau parcours indépendant : un fichier `tests/e2e-<sujet>.mjs` ajouté à `SCENARIOS`.
   - SQL modifié : `bash scripts/test-sql.sh` (Postgres local jetable, exécute toutes les migrations puis `tests/sql/test_*.sql`) ; ajouter un test SQL pour toute nouvelle fonction.
   - Ajouter un test unitaire pour toute logique pure (dés, calculs) et étendre l'e2e pour tout nouveau parcours.
6. Mettre à jour `CHANGELOG.md` (version + date), `ROADMAP.md`, la doc utilisateur si l'usage change. Incrémenter `version` dans package.json.
7. Republier la démo : `node scripts/build-offline.mjs --single` → publier `dist-offline/demo.html` sur l'Artifact existant (même URL).
8. Copier dans le dossier de Jo : archive `tar czf` du projet (sans node_modules, dist-offline, .github) → `device_commit_files` vers `Appli_JDR\_sync.tar.gz` → `device_bash` : `ls -la _sync.tar.gz` (vérifier la taille : un fichier tout juste écrit peut être lu dans son ancienne version, recommencer le commit si besoin) puis `tar xzf _sync.tar.gz --overwrite` (la suppression de fichiers dans le dossier de Jo n'est pas autorisée : l'archive reste, Jo la supprime). Puis lui dire en 2-3 lignes : ce qui a changé, quoi tester, et les fichiers à renvoyer sur GitHub (ou « Commit + Push » s'il utilise GitHub Desktop).

## Contraintes de l'environnement Claude

- Le registre npm peut être bloqué dans le bac à sable : d'où `scripts/build-offline.mjs` (esbuild + React préinstallés dans `/opt/npm-tools/node_modules`, Supabase remplacé par un module vide). Le vrai build (`vite build`) tourne dans GitHub Actions.
- `@types/react` peut manquer localement : la vérification de types complète se fait en CI (`npm run typecheck`, non bloquante). Écrire du TypeScript prudent et explicite.
- L'Artifact claude.ai interdit `alert/confirm/prompt`, service workers et requêtes externes : ne jamais utiliser `confirm()` (→ `ConfirmButton`), et garder l'appli fonctionnelle sans service worker.

## Conventions

- **300 lignes max par fichier de code** (demande de Jo, vérifié par un test). Découper par responsabilité.
- Commentaire d'une ligne en tête de chaque fichier + `/** */` sur chaque fonction exportée.
- Après chaque modif : `node scripts/carte-du-code.mjs` pour régénérer `docs/CARTE_DU_CODE.md`. Commencer chaque tâche en lisant ARCHITECTURE.md (« Où modifier quoi ») puis la carte.

- Interface 100 % en français, ton simple. Pas de jargon technique dans l'UI.
- Mobile d'abord : cibles tactiles ≥ 40 px, tout utilisable à une main, onglets en bas.
- Couleurs uniquement via les tokens CSS de `src/styles/base.css` (thème sombre par défaut + clair).
- Pas de nouvelle dépendance sans vraie nécessité (chaque dépendance doit aussi marcher dans le build hors-ligne).
- Toute action destructive passe par `ConfirmButton` (double appui).
- Les champs texte d'une fiche s'enregistrent à la sortie du champ (`LazyInput`), pas à chaque lettre.
