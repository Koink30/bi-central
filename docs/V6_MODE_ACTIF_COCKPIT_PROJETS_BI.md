# Cockpit Projets BI — V6 Mode Actif

## Statut

Version générée le 2026-07-05.

Fichier local : `BI_GESTION_PROJETS_BI_V6_MODE_ACTIF.html`

Chemin GitHub cible :

```text
apps/gestion-projets-bi/index.html
```

URL publique cible :

```text
https://koink30.github.io/bi-central/gestion-projets-bi/
```

## Évolutions V6

- Nouvel onglet `Mode actif`.
- Santé active moyenne du portefeuille.
- Détection GitHub Pages / GitHub / Drive / snapshot par projet.
- Score de maturité par projet.
- Accueil public et repo GitHub pré-renseignés.
- Export CSV portefeuille.
- Manifest global depuis le mode actif.
- Migration localStorage V5 vers V6.
- Règles public-safe visibles.

## LocalStorage

Clé principale :

```text
central_bi_project_manager_v6
```

Snapshots :

```text
central_bi_project_manager_v6_snapshots
```

Migration automatique depuis :

```text
central_bi_project_manager_v5
central_bi_project_manager_v4
central_bi_project_manager_v1
```

## Déploiement

Remplacer le fichier :

```text
apps/gestion-projets-bi/index.html
```

par le contenu de :

```text
BI_GESTION_PROJETS_BI_V6_MODE_ACTIF.html
```

Puis vérifier le workflow `Deploy BI Central Pages` dans GitHub Actions.
