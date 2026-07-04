# Étape suivante — GitHub Pages + HTML complets

## Statut actuel

Le dépôt `Koink30/bi-central` est initialisé.

Éléments déjà en place :

- `README.md`
- `.gitignore`
- `apps/index.html`
- `apps/gestion-projets-bi/index.html`
- `apps/feuille-route-dev/index.html`
- `data/manifest/`
- `docs/`
- `scripts/`
- `.github/workflows/pages.yml`

Les deux routes d’application existent déjà, mais les fichiers `index.html` sont encore des placeholders.

## Étape 1 — Activer GitHub Pages

Dans GitHub :

1. Ouvrir le dépôt `Koink30/bi-central`.
2. Aller dans `Settings`.
3. Aller dans `Pages`.
4. Dans `Build and deployment`, choisir `GitHub Actions`.
5. Sauvegarder si GitHub le demande.
6. Aller dans l’onglet `Actions` pour vérifier le workflow `Deploy BI Central Pages`.

## Étape 2 — Remplacer les placeholders par les HTML complets

À remplacer :

- `apps/gestion-projets-bi/index.html` par `BI_GESTION_PROJETS_BI_V5_DRIVE_GITHUB.html`
- `apps/feuille-route-dev/index.html` par `BI_FEUILLE_DE_ROUTE_DEV_V1.html`

## Étape 3 — Contrôler les URLs

URLs attendues après publication :

- `https://koink30.github.io/bi-central/`
- `https://koink30.github.io/bi-central/gestion-projets-bi/`
- `https://koink30.github.io/bi-central/feuille-route-dev/`

## Note technique

Le connecteur GitHub ChatGPT écrit correctement les fichiers texte et markdown, mais les très gros HTML autonomes doivent être poussés soit par remplacement direct dans GitHub, soit via un push local Git.

Script préparé :

```powershell
scripts/push_full_pack_from_zip.ps1
```
