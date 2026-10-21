# My IRC

Un petit chat en temps réel façon IRC, avec une interface rose en pixel art.
Construit avec **React** (client) et **Node.js + Socket.IO** (serveur).

## Fonctionnalités

- Connexion avec un pseudo **unique** (insensible à la casse, 20 caractères max)
- Plusieurs channels : création et changement au clic
- Historique des messages d'un channel à l'arrivée dedans
- Liste des utilisateurs **en ligne** par channel
- Indicateur « est en train d'écrire… »
- Tes messages à droite, ceux des autres à gauche
- Reconnexion automatique après une coupure ou un redémarrage du serveur

## Structure du projet

```
myr-irc/
├── client/my-irc/        # Application React
│   └── src/
│       ├── index.js
│       ├── App.js        # Écrans de connexion + création du socket
│       ├── Chat.js       # Interface du chat
│       └── App.css       # Thème rose pixel
└── server/
    └── server.js         # Serveur Express + Socket.IO
```

Le client et le serveur sont **deux programmes séparés**, avec chacun leurs
dépendances. Ne mets pas `express` ou `socket.io` dans le client.

## Prérequis

- [Node.js](https://nodejs.org/) 18 ou plus récent
- npm

## Installation

**Serveur**

```bash
cd server
npm init -y
npm install express cors socket.io
```

**Client**

```bash
cd client/my-irc
npm install
npm install socket.io-client
```

## Lancer l'application

Il faut deux terminaux.

```bash
# Terminal 1 : serveur (port 3000)
cd server
node server.js

# Terminal 2 : client
cd client/my-irc
npm start
```

Le serveur écoute sur le port **3000**. Comme ce port est pris, React te propose
généralement le port **3001** : accepte. Ouvre ensuite `http://localhost:3001`.

> Le port du client doit correspondre à l'option `origin` du `cors` dans
> `server.js` (`http://localhost:3001` par défaut).

## Utilisation

1. Saisis un pseudo, puis valide (bouton ou touche Entrée).
2. Saisis le nom du salon à rejoindre, par exemple `general`. Il est créé s'il
   n'existe pas.
3. Clique sur un channel dans la liste de gauche pour y aller.
4. Écris ton message et appuie sur Entrée.

Pour simuler plusieurs utilisateurs sur une seule machine, ouvre un onglet de
navigation privée avec un autre pseudo.

## Événements Socket.IO

**Client vers serveur**

| Événement | Données | Rôle |
|---|---|---|
| `register` | `pseudo`, callback | Enregistre le pseudo. Répond `{ ok, username }` ou `{ ok: false, error }` |
| `get_channels` | — | Demande la liste des channels |
| `add_channel` | `nom` | Crée un channel |
| `join_channel` | `nom` | Rejoint un channel (le crée si besoin) et reçoit son historique |
| `send_message` | `{ room, message }` | Envoie un message dans un channel |
| `typing` | `{ channel, isTyping }` | Signale qu'on écrit ou qu'on a arrêté |

**Serveur vers client**

| Événement | Données | Rôle |
|---|---|---|
| `channels` | `[noms]` | Liste des channels |
| `message_history` | `[messages]` | Historique du channel rejoint |
| `receive_msg` | `message` | Nouveau message d'un autre utilisateur |
| `user_list` | `{ channel, users }` | Utilisateurs en ligne dans le channel |
| `user_typing` | `{ channel, username, isTyping }` | Indicateur de saisie |

## Personnaliser le thème

Les couleurs se changent dans les variables en haut de `App.css` :

```css
:root {
  --bg: #ffe3ec;
  --panel: #ffc2d9;
  --pink: #ff6fa5;
  --pink-dark: #c2306f;
  --ink: #4a1230;
  --paper: #fff7fa;
}
```

Les polices viennent de Google Fonts (« Press Start 2P » et « VT323 ») : une
connexion internet est nécessaire pour les afficher.

## Dépannage

| Problème | Piste |
|---|---|
| `Can't resolve 'http'`, `'path'`, `'zlib'`… au démarrage du client | Le code serveur est dans le projet React. Mets `server.js` dans `server/` et remets un `index.js` React standard |
| `Can't resolve './index.css'` | Supprime la ligne `import './index.css';` de `index.js` |
| Erreur CORS dans la console du navigateur | Vérifie que `origin` dans `server.js` correspond au port du client |
| La liste « En ligne » reste vide | Redémarre le serveur, recharge la page, et regarde le terminal du serveur : `User registered` puis `join_channel` doivent apparaître |
| « Ce pseudo est déjà pris » | Le pseudo est utilisé par un autre onglet connecté. Il est libéré à la déconnexion |
| Bandeau « Connexion perdue » | Le serveur est arrêté ou injoignable. La reconnexion est automatique |

## Limites actuelles

- Les channels et l'historique sont gardés **en mémoire** : tout disparaît au
  redémarrage du serveur.
- Il n'y a pas de mot de passe : n'importe qui peut prendre un pseudo libre.
- Pas encore de messages privés, de suppression de channel ni d'envoi d'images.

## Idées d'améliorations
- Comptes avec mot de passe et jeton JWT
- Messages privés et mentions `@pseudo`
- Compteur de messages non lus par channel
- Défilement automatique vers le dernier message