# SETFLOW AI

Application DJ locale, sans abonnement et sans clé API. Next.js, TypeScript, Tailwind CSS, composants shadcn/ui (Button avec Radix et CVA), Lucide, Zustand, Recharts, IndexedDB et SQLite pour les comptes.

## Installer le projet depuis GitHub

Prérequis : **Node.js 22.16 minimum** et npm. Aucun compte payant ni clé API n’est nécessaire.

1. Téléchargez le projet avec **Code → Download ZIP**, puis décompressez-le, ou clonez le dépôt avec Git.
2. Ouvrez Terminal dans le dossier contenant `package.json`.
3. Installez les dépendances et démarrez l’application :

```sh
npm ci
npm run dev
```

4. Ouvrez **http://127.0.0.1:3002** dans votre navigateur.
5. Cliquez sur **Try demo** pour essayer les 50 morceaux fictifs, ou **Import Rekordbox XML** pour charger votre propre bibliothèque.

Pour arrêter : Ctrl+C dans Terminal. Pour rouvrir, lancez seulement `npm run dev` dans le dossier du projet. Sur Mac, vous pouvez également double-cliquer sur `Lancer SETFLOW.command`.

Pour une version de production :

```sh
npm run build
npm start
```

Le dépôt partage le **code**, pas les bibliothèques musicales ni les sets locaux : le mode invité conserve ses données dans IndexedDB ; les comptes enregistrent les bibliothèques et sets sur le serveur dans SQLite. Aucune base de comptes (`data/`), aucun XML réel, fichier audio, clé API ou fichier `.env` ne doit être ajouté au dépôt. Les données de démonstration sont entièrement fictives.

## Partager avec un proche

Pour un dépôt privé, le propriétaire ajoute le pseudo GitHub du proche dans **Settings → Collaborators → Add people**. Le destinataire doit accepter l’invitation avant de pouvoir voir ou cloner le code. Un dépôt public est visible par tous.

L’accès au code et le lien temporaire du tunnel sont indépendants : le dépôt reste disponible même lorsque le Mac qui héberge le tunnel est éteint.

## Utiliser votre studio

- **Music Library** : recherche, tri, filtre par genre et playlist, pagination de 50 titres. Le crayon édite uniquement la copie locale des métadonnées. BPM, tonalité et durée absents restent inconnus. Les durées se saisissent en secondes. Les notes Rekordbox 0–255 sont converties en étoiles 0–5.
- **Generate My Set** : sélection et ordre calculés depuis la bibliothèque active. Les profils et les cinq points du profil Custom modifient la cible d’énergie. Le champ de description reconnaît des règles simples (durée, genres usuels, plage/mariage/festival, progression et début calme) ; ce n’est pas un analyseur de langage universel.
- **Éditeur** : flèches pour réordonner, cadenas pour conserver un titre lors d’une régénération, remplacement et suppression. Le verrouillage garantit la présence, pas une position fixe. La régénération utilise les réglages actuellement affichés.
- **Assistant** : commandes locales en français et en anglais documentées dans son panneau (par exemple « Rends le début plus calme », « Augmente l’énergie après 45 minutes », « Remplace le morceau 8 »). Générez ou ouvrez d’abord un set depuis My Sets : le panneau indique le set ouvert, et explique directement tout prérequis manquant. Ce n’est pas un chatbot d’IA conversationnelle. Une commande inconnue ne modifie rien. Les titres verrouillés restent présents. « Add more Afro House » privilégie l’Afro House en sélectionnant ce genre pour le nouveau calcul.
- **My Sets** : ouverture, renommage dans l’éditeur, duplication et suppression. Les sets sont sauvegardés automatiquement.
- **Export** : CSV, TXT et JSON. JSON conserve toutes les métadonnées et les réglages. L’import d’un export JSON n’est pas fourni dans cette version. Aucun export Rekordbox non validé n’est présenté comme compatible.

## Ce que fait le moteur

Le score combine la distance à l’énergie cible (adaptée à la plage disponible dans les genres choisis), le BPM de la transition, la compatibilité Camelot (identique, relatif majeur/mineur, voisins de roue), la note, les préférences littérales d’artiste/genre et les répétitions d’artiste. Restaurant et Festival modulent légèrement l’énergie. Une faible variation aléatoire diversifie les scores proches. Les genres sont des filtres exacts, tels qu’importés ; « tous les genres » inclut les titres sans genre. Aucun morceau externe n’est inventé ou ajouté.

L’énergie **estimée** est une heuristique BPM, pas une mesure issue de l’audio. Sans BPM, une valeur de référence est utilisée pour cette estimation, sans remplir le champ BPM manquant. Entrez manuellement une énergie de 1 à 10 pour améliorer le résultat. Les informations démographiques sont des notes de contexte conservées avec le set, sans stéréotypes de sélection par âge ou taille du public.

La durée est la somme des fichiers complets : un dernier titre peut dépasser la cible. Elle ne soustrait pas les chevauchements de mix. Si le stock est insuffisant, le set est plus court et un avertissement est affiché. Les compatibilités et techniques de transition restent des suggestions ; un champ absent rend l’évaluation incertaine. Un remplacement ou une suppression modifie la durée : vérifiez le total affiché.

## Protection et stockage

Le navigateur lit seulement le fichier XML sélectionné. Aucun accès en écriture aux fichiers audio ou à Rekordbox n’est implémenté. Le champ `Location` est conservé comme métadonnée ; aucun audio n’est lu ni mixé. Changer la bibliothèque remplace la copie active dans SETFLOW, sans effacer les sets sauvegardés, qui conservent un instantané de leurs métadonnées.

En **mode invité**, IndexedDB conserve la bibliothèque et les sets dans le navigateur, pour une adresse donnée. Un nouveau domaine de tunnel est un espace distinct : les données invitées n’y apparaissent pas automatiquement.

Avec un **compte SETFLOW**, les métadonnées et les sets sont sauvegardés sur le serveur. Cliquez sur « Créer mon compte », saisissez une adresse e-mail et choisissez un mot de passe (12 à 128 caractères), puis cochez « Se souvenir de moi » pour une session de 30 jours. À la création, une option permet de rattacher les données déjà présentes dans ce navigateur. Si le lien change, reconnectez-vous : vous récupérerez la bibliothèque du compte, sans réimporter le XML. Les fichiers audio et le XML original ne sont jamais envoyés : seules les métadonnées parsées, dont les chemins de fichiers, sont enregistrées.

Les données privées sont dans `data/setflow.sqlite` (avec les éventuels fichiers `-wal` et `-shm`). Le dossier `data/` est exclu de Git. Sauvegardez ce dossier en arrêtant les serveurs avant copie ; ne le publiez jamais sur GitHub. Vous pouvez configurer un autre disque persistant avec `SETFLOW_DATA_DIR`. Les mots de passe sont hachés avec scrypt, les jetons de session sont aléatoires et stockés sous forme hachée ; le cookie est HttpOnly, SameSite=Lax et Secure sous HTTPS. Les écritures exigent la même origine et les tentatives de connexion sont limitées.

Les comptes dépendent du serveur de ce Mac. Un autre clone GitHub possède sa propre base ; un hébergement sans disque persistant perdrait ces données. La connexion utilise l’adresse e-mail et le mot de passe SETFLOW, distinct du mot de passe de votre messagerie. L’adresse n’est pas vérifiée et aucun e-mail de validation ou de récupération n’est envoyé dans cette version. Les anciens identifiants restent acceptés à la connexion ; depuis « Mon compte », vous pouvez associer une adresse e-mail en confirmant votre mot de passe actuel. Cette association conserve le même compte, les mêmes morceaux et les mêmes sets. Aucune API d’authentification payante ou télémétrie applicative n’est utilisée.

## Architecture et extensions

- `lib/xml.ts` : lecture de COLLECTION et des références de playlists XML.
- `lib/engine.ts` : score, construction, courbes, Camelot, transitions et commandes. `interpret()` renvoie une union structurée : un futur adaptateur conversationnel pourra produire ces mêmes commandes avant validation par le moteur.
- `lib/store.ts` : état Zustand, cache IndexedDB invité/compte séparé et synchronisation avec le serveur.
- `lib/server/accounts.ts` et `app/api/` : comptes, sessions et stockage SQLite privé.
- `components/account-panel.tsx` : création de compte, connexion et rattachement de la bibliothèque invitée.
- `lib/export.ts` : adaptateurs CSV/TXT/JSON. Un futur adaptateur Rekordbox devra être validé sur un format et une version réels.
- `tests/engine.test.ts` : tests des règles, du XML, des verrous, des exports et, si configuré explicitement, d’un vrai XML en lecture seule.

```sh
npm test
npm run build
```

Pour tester un XML réel, définissez `SETFLOW_TEST_XML` avec son chemin avant `npm test`. Sans cette variable, ce test est ignoré ; les autres tests utilisent des données fictives.

## Connexion Google et Apple

Ces fournisseurs ne sont pas activés : aucun bouton factice n’est affiché. Google nécessite un client OAuth configuré dans Google Cloud avec une adresse de retour autorisée. Apple nécessite une configuration Sign in with Apple, notamment un App ID principal, un Services ID et une clé privée. Une adresse HTTPS stable évite de reconfigurer les retours à chaque changement de tunnel. Ne publiez jamais les secrets de ces fournisseurs dans le dépôt. Une future intégration devra vérifier les jetons du fournisseur et ne devra pas fusionner automatiquement un compte sur la seule base d’une adresse e-mail locale non vérifiée.
