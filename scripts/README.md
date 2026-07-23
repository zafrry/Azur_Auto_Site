# Scripts de maintenance

## `sync-partials.js` — header & footer partagés

Le `<header>` et le `<footer>` sont **identiques sur toutes les pages** (à la
classe `.is-active` et au préfixe de chemin près). Plutôt que de les dupliquer
à la main dans les 10 fichiers HTML — ce qui avait déjà laissé des pages
désynchronisées (page Care obsolète, lien « Blog » manquant sur
`mentions-legales.html`) — ils sont maintenus depuis une **source unique** :

- `partials/header.html`
- `partials/footer.html`

### Pourquoi un script plutôt qu'un chargement `fetch()` côté client ?

Le site est **statique**, servi tel quel par GitHub Pages (dossier `site/`),
sans étape de build. Garder le header/footer **inline dans le HTML** :

- reste indexable par les moteurs (le contenu est dans le HTML servi, pas
  injecté après coup par JS) ;
- évite toute latence réseau et tout clignotement (FOUC) au chargement.

Le script joue donc le rôle de « build » minimal, à lancer manuellement.

### Usage

Après avoir modifié `partials/header.html` ou `partials/footer.html` :

```sh
node scripts/sync-partials.js
```

Le script régénère le bloc header (entre `<!-- HEADER -->` et `</header>`) et le
bloc footer (entre `<!-- FOOTER -->` et `</footer>`) dans les 10 pages, en
appliquant par page :

- le préfixe de chemin (`./` pour les pages racine, `../` pour les pages du blog) ;
- la classe `.is-active` sur le lien de nav de la page courante ;
- le lien de bas de footer (« Mentions légales », ou « Retour à l'accueil » sur
  la page `mentions-legales.html` elle-même).

La configuration page par page (préfixe, lien actif, lien de bas de footer) est
en tête de `scripts/sync-partials.js`. **Ne pas éditer les blocs header/footer
directement dans les fichiers HTML** : ils seraient écrasés au prochain `sync`.

### À lancer avant chaque commit touchant le header ou le footer

Le script est idempotent : le relancer sans changement n'altère rien
(`= fichier (déjà à jour)`). Après l'avoir lancé, vérifier le `git diff` puis
commiter les fichiers `site/*.html` régénérés en même temps que la modification
du partial.
