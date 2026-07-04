# BI Central

Base GitHub prête pour les BI internes.

## Applications

- `apps/gestion-projets-bi/index.html` : Cockpit Projets BI V5, suivi Drive / GitHub / snapshots / étapes.
- `apps/feuille-route-dev/index.html` : BI Feuille de Route Dev V1.

## Organisation

```text
bi-central/
  apps/
    gestion-projets-bi/
    feuille-route-dev/
  data/
    manifest/
    snapshots/
  docs/
    specs/
    decisions/
  exports/
  archive/
  scripts/
```

## Flux de travail recommandé

1. Modifier un BI localement.
2. Exporter le JSON/snapshot depuis le BI.
3. Mettre à jour `data/manifest`.
4. Archiver les anciennes versions dans `archive/`.
5. Commit Git avec message clair.
6. Si GitHub Pages est activé, publier depuis la branche `main`.

## GitHub Pages

Le workflow `.github/workflows/pages.yml` publie le dossier `apps/` comme site statique.

URLs attendues après activation Pages :

- `/gestion-projets-bi/`
- `/feuille-route-dev/`
