# Protocole JSON / snapshots / reprise de données

## Pourquoi

Les BI HTML sont autonomes. Le code est publié sur GitHub Pages, mais les données saisies dans le navigateur sont stockées localement dans le navigateur via `localStorage`.

Cela signifie :

- changer le fichier HTML ne supprime pas forcément les données ;
- changer d’ordinateur ou de navigateur ne reprend pas les données automatiquement ;
- ouvrir le BI en local (`file://`) et l’ouvrir sur GitHub Pages ne partage pas le même stockage ;
- le JSON est la sauvegarde de sécurité entre versions.

## Règle d’or

Avant toute nouvelle version majeure :

```text
1. Export JSON depuis l’ancienne version.
2. Télécharger / conserver le snapshot.
3. Publier la nouvelle version HTML.
4. Ouvrir la nouvelle version.
5. Vérifier la migration automatique.
6. Si les données ne reviennent pas, importer le JSON.
```

## Reprise automatique

Le Cockpit Projets BI V6 utilise :

```text
central_bi_project_manager_v6
```

Il tente une migration automatique depuis :

```text
central_bi_project_manager_v5
central_bi_project_manager_v4
central_bi_project_manager_v1
```

La migration fonctionne si les anciennes données étaient stockées dans le même navigateur et sur la même origine web.

Exemple même origine :

```text
https://koink30.github.io/bi-central/gestion-projets-bi/
```

## Cas où la migration automatique ne suffit pas

L’import JSON est nécessaire si :

- les données étaient dans un fichier HTML ouvert localement ;
- les données étaient dans Google Drive Preview ;
- les données étaient dans un autre navigateur ;
- les données étaient sur un autre ordinateur ;
- la clé localStorage a changé sans migration prévue ;
- le cache navigateur a été vidé.

## Convention de nommage des snapshots

Format conseillé :

```text
SNAPSHOT_<BI>_<VERSION>_<YYYY-MM-DD>_<HHMM>.json
```

Exemples :

```text
SNAPSHOT_COCKPIT_PROJETS_BI_V6_2026-07-05_0815.json
SNAPSHOT_FEUILLE_ROUTE_DEV_V1_2026-07-05_0830.json
```

## Où stocker les snapshots

Drive :

```text
BI Central — Base de travail / 02_DONNEES_JSON_SNAPSHOTS
```

GitHub :

```text
data/snapshots/
```

## Règle public-safe

Le dépôt GitHub étant public, ne jamais publier dans `data/snapshots/` un JSON contenant :

- mails ;
- noms clients sensibles ;
- données financières réelles ;
- liens Drive privés critiques ;
- tokens ;
- clés API ;
- informations personnelles.

Pour GitHub public, publier seulement :

- manifests techniques ;
- snapshots de démonstration ;
- exports nettoyés ;
- structure sans données sensibles.

## Prochaine évolution BI souhaitée

Ajouter dans chaque BI un module `Sauvegarde & reprise` contenant :

- état de la clé localStorage active ;
- bouton Export JSON ;
- bouton Import JSON ;
- bouton Snapshot horodaté ;
- historique des 5 derniers snapshots ;
- alerte si aucune sauvegarde récente ;
- badge `données locales` ou `snapshot importé` ;
- notice claire avant changement de version.
