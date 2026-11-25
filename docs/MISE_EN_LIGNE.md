# Mettre l'appli en ligne (gratuit, ≈ 15 min, une seule fois)

Résultat : une adresse du type `https://<ton-pseudo>.github.io/appli-jdr/` que tes joueurs ouvrent sur leur téléphone et installent comme une appli. Chaque modification poussée sur GitHub est publiée automatiquement en 1 à 2 minutes.

Il te faut : un navigateur et **GitHub Desktop** (gratuit, étape 2). Commence par créer ton compte GitHub (étape 2.1) : il sert aussi à te connecter à Supabase.

---

## Étape 1 : la base de données (Supabase)

1. Va sur <https://supabase.com> → **Start your project** → connecte-toi (avec GitHub, c'est le plus simple).
2. **New project** : nom `grimoire`, mot de passe de base de données (note-le quelque part), région **Europe (Frankfurt ou Paris)** → **Create**. Attends ~2 min.
3. Menu de gauche **SQL Editor** → **New query** → colle **tout** le contenu de `supabase/installation_complete.sql` → **Run** (« Success. No rows returned »). C'est toute la base en une fois.
   (Ce fichier rassemble les 9 fichiers `supabase/migrations/01_…` à `09_…`. Il ne sert qu'une fois, sur une base neuve. Dis à Claude quand c'est fait : les changements suivants arriveront dans de nouveaux petits fichiers.)
4. Menu **Authentication** → **Sign In / Providers** → **Email** : désactive **Confirm email** puis **Save**.
   (Sinon chaque joueur doit cliquer un lien reçu par mail avant de se connecter. Tu peux le laisser activé si tu préfères.)
5. Menu **Project Settings** → **API** (ou **Data API** / **API Keys**) : note
   - **Project URL** (ex. `https://abcd1234.supabase.co`)
   - **anon public key** (longue chaîne commençant par `eyJ…`, ou `sb_publishable_…`)

   La clé « anon/publishable » est faite pour être publique : la sécurité est assurée par les règles d'accès créées à l'étape 1.3. Ne partage jamais la clé `service_role` / `secret`.

## Étape 2 : le code sur GitHub (avec GitHub Desktop)

1. Crée un compte sur <https://github.com> (**Sign up**), note ton pseudo.
2. Installe **GitHub Desktop** (<https://desktop.github.com>) et connecte-toi avec ce compte.
3. **File → Add local repository…** → choisis le dossier `Appli_JDR`. Message « this directory does not appear to be a Git repository » → clique **create a repository**. Nom : `appli-jdr`, laisse le reste (Git ignore : None, License : None) → **Create repository**.
4. En haut : **Publish repository** → **décoche « Keep this code private »** (GitHub Pages gratuit exige un dépôt public) → **Publish repository**.
   Le robot de publication (`.github/workflows/deploy.yml`) part avec le reste. Il se lance tout de suite et échoue (rouge) : normal, l'étape 3 n'est pas encore faite.

## Étape 3 : relier les deux et publier

1. Dans le dépôt : **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, deux fois :
   - `VITE_SUPABASE_URL` = la Project URL
   - `VITE_SUPABASE_ANON_KEY` = la clé anon
2. **Settings** → **Pages** → Source : **GitHub Actions**.
3. Onglet **Actions** → workflow **Déploiement** → **Run workflow**. Attends la coche verte (~2 min).
4. L'adresse s'affiche dans **Settings → Pages** (et dans le résumé du workflow).
5. Retour dans Supabase : **Authentication** → **URL Configuration** → **Site URL** = cette adresse (ex. `https://<ton-pseudo>.github.io/appli-jdr/`), et ajoute-la aussi dans **Redirect URLs** → **Save**.
   Sans ça, les emails « lien de connexion » et « mot de passe oublié » renverraient vers une mauvaise adresse.

## Étape 4 : installer sur les téléphones

- **Android (Chrome)** : ouvre l'adresse → bouton « Installer l'appli » sur l'accueil, ou menu ⋮ → **Ajouter à l'écran d'accueil**.
- **iPhone (Safari obligatoirement)** : ouvre l'adresse → bouton **Partager** → **Sur l'écran d'accueil**.

---

## Mettre à jour l'appli plus tard

Quand Claude modifie le code dans ton dossier `Appli_JDR` : GitHub Desktop → écris un petit résumé en bas à gauche → **Commit to main** → **Push origin**. Le déploiement se relance tout seul (~2 min).

Une fois la base installée, si une mise à jour ajoute un fichier `supabase/migrations/10_*.sql` (puis `11_…`), exécute-le dans le SQL Editor (Claude te le signalera). Ne relance jamais `installation_complete.sql` sur une base déjà installée.

## En cas de problème

| Symptôme | Solution |
| --- | --- |
| L'appli affiche « Mode démo » en ligne | Les secrets GitHub sont absents ou mal nommés → corrige et relance le workflow |
| « Email ou mot de passe incorrect » à l'inscription | Vérifie l'étape 1.4 (confirmation email) |
| Le lien reçu par email ouvre une page introuvable | Vérifie l'étape 3.5 (Site URL et Redirect URLs) |
| Le workflow est rouge | Ouvre-le, copie le message d'erreur et donne-le à Claude |
| Les changements n'apparaissent pas sur le téléphone | Ferme complètement l'appli et rouvre-la (le cache se met à jour au 2ᵉ lancement) |
| « Action non autorisée » | Règle de la table (onglet MJ) ou script SQL pas exécuté |
