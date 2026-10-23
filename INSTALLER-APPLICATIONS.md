# SETFLOW en application

## Sur ce Mac (Apple Silicon)

Sur ce Mac, ouvrez `~/Applications/SETFLOW AI.app`. Pour un autre Mac, décompressez le ZIP fourni dans le dossier `release/`, puis glissez `SETFLOW AI.app` dans Applications. Elle ouvre sa propre fenêtre et démarre son serveur local automatiquement. Node.js, Terminal et les tunnels ne sont pas nécessaires pour l’utiliser sur ce Mac.

Une seule instance de l’application est autorisée. Le serveur embarqué écoute uniquement sur `127.0.0.1:39102`. Fermer la dernière fenêtre laisse l’application dans le Dock sur Mac ; Cmd+Q arrête l’application et son serveur.

Les comptes et bibliothèques sont dans :

```text
~/Library/Application Support/SETFLOW AI/data/
```

Le menu **Données → Ouvrir le dossier privé SETFLOW** ouvre cet emplacement. La copie initiale des données du projet peut être effectuée avec `node scripts/migrate-desktop-data.mjs` : elle préserve la base source et ne remplace jamais une base déjà présente dans l’application. Lorsque cette base partagée existe sur Mac, le site local du même Mac l’utilise également à son prochain démarrage. `SETFLOW_DATA_DIR` permet de choisir explicitement une autre base.

Le ZIP et le paquet `.app` ne contiennent **aucun compte, mot de passe, bibliothèque réelle ou fichier audio**. Votre cousin démarre avec un espace vide et peut importer son propre XML ou les titres fictifs de démonstration.

Le menu **Données → Importer une base SETFLOW existante** est prévu uniquement pour une application sans compte : il copie une base `.sqlite` choisie, conserve la source et n’écrase pas une bibliothèque déjà liée à un compte. Pour une sauvegarde complète, quittez les instances SETFLOW puis copiez tout le dossier `data` dans un emplacement privé.

Cette première version est signée localement (ad hoc), **non notariée par Apple**. Elle n’est pas distribuée sur le Mac App Store. Un autre Mac peut refuser son ouverture : les éventuelles alertes de sécurité doivent être traitées par son utilisateur, sans désactiver globalement les protections de macOS. La version fournie cible Apple Silicon (`arm64`) ; un Mac Intel nécessite une fabrication `x64` séparée.

## Sur iPhone

1. Ouvrez l’adresse **HTTPS** du serveur SETFLOW dans **Safari**.
2. Touchez **Partager**.
3. Choisissez **Sur l’écran d’accueil**, puis **Ajouter**.
4. Lancez SETFLOW depuis son icône et connectez-vous à votre compte.

## Sur Android

1. Ouvrez l’adresse **HTTPS** dans Chrome.
2. Ouvrez le menu puis **Installer l’application** ou **Ajouter à l’écran d’accueil**.
3. Lancez SETFLOW depuis son icône.

Dans SETFLOW, le menu **Installer l’application** donne ces instructions et propose un bouton d’installation quand le navigateur le permet.

## Important pour le téléphone

La version mobile est une **application web installable (PWA)**, pas une application publiée sur l’App Store ou Google Play. Elle utilise le serveur de l’adresse depuis laquelle elle est installée.

- Le téléphone doit pouvoir joindre ce serveur via HTTPS. `127.0.0.1` sur votre téléphone désigne le téléphone lui-même et ne peut pas joindre votre Mac.
- Si vous utilisez un tunnel gratuit et que son adresse change, l’icône installée conserve l’ancienne adresse. Elle peut donc cesser de fonctionner. **Un hébergement HTTPS stable reste nécessaire pour une installation mobile durable.**
- Le Mac ou le serveur qui héberge SETFLOW doit rester allumé. Pour partager les comptes de l’application Mac, l’adresse mobile doit pointer vers le serveur de l’application ou vers un serveur qui utilise la même base privée. Les comptes de deux installations sur deux ordinateurs distincts ne se synchronisent pas automatiquement.
- En cas de déconnexion, une page explicative s’affiche. Les réponses des API de comptes et les bibliothèques ne sont jamais mises en cache par le service worker. Le mode mobile n’est pas annoncé comme un mode complet hors connexion.

## Reconstruire depuis le code

Prérequis : Node.js 22.16 ou plus, npm, macOS pour fabriquer l’application Mac.

```sh
npm ci
npm test
npm run desktop:package
```

Les résultats sont dans `release/<date>/`. Ce dossier est exclu de Git ; le code source de l’application est dans `desktop/`, `scripts/` et les fichiers PWA de `app/` et `public/`.

Pour le développement :

```sh
npm run build
npm run desktop:prepare
npm run desktop:dev
```

Les icônes sont des fichiers SVG/PNG générés à partir du même dessin. `npm run icons` les recrée ; `iconutil -c icns desktop/icon.iconset -o desktop/icon.icns` recrée l’icône Mac.
