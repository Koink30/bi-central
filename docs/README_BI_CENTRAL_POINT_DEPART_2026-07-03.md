# BI Central — Point de départ — 03/07/2026

## Objectif
Créer une base de travail Drive propre pour les deux BI de départ :
1. **BI Feuille de Route Dev — Pilotage Central**
2. **Cockpit Projets BI · V4 synthèse fiche**

Drive devient la base actualisée tant que GitHub est en cours de mise en place.

## Rôles des deux BI
- **BI_FEUILLE_DE_ROUTE_DEV_V1.html** : vision feuille de route, KPI, étapes, connexions, assistants IA, alertes et journal versions.
- **BI_GESTION_PROJETS_BI_V4_SYNTHESE_FICHE.html** : portefeuille de projets, catégories Perso/Boulot/Clients, fiches, notes, versions, liens IA/Drive, options et synthèse par fiche.

## Arborescence Drive
- `00_POINT_DEPART_README` : synthèse, règles, conventions.
- `01_BI_HTML_MAITRES` : HTML maîtres utilisables.
- `02_DONNEES_JSON_SNAPSHOTS` : manifest, exports JSON, snapshots.
- `03_DOCS_NOTES_SPECS` : spécifications, décisions, arbitrages.
- `04_EXPORTS_PDF_IMAGES` : PDF, captures, visuels.
- `05_GITHUB_SYNC_EN_COURS` : zone de transition vers GitHub.
- `06_ARCHIVES_VERSIONS` : versions datées avant remplacement.

## Convention de version
Format conseillé :
`NOM_BI_Vxx_YYYY-MM-DD.html`

Exemple :
`BI_GESTION_PROJETS_BI_V5_2026-07-03.html`

## Règle de travail
1. On modifie un BI en local.
2. On exporte le JSON/snapshot du BI.
3. On archive l’ancienne version HTML dans `06_ARCHIVES_VERSIONS`.
4. On place la nouvelle version dans `01_BI_HTML_MAITRES`.
5. On met à jour le manifest dans `02_DONNEES_JSON_SNAPSHOTS`.
6. Quand GitHub est prêt, on pousse une version propre : `apps/`, `data/`, `docs/`, `exports/`, `archive/`.

## Pont GitHub prévu
Structure GitHub recommandée :
```text
bi-central/
  apps/
    feuille-route-dev/
    gestion-projets-bi/
  data/
    snapshots/
    manifest/
  docs/
    specs/
    decisions/
  exports/
  archive/
```

## Prochaine étape prioritaire
Faire évoluer le Cockpit Projets BI pour qu’il référence réellement :
- le lien Drive du fichier HTML maître,
- le dernier snapshot JSON,
- le statut GitHub,
- les notes et étapes réalisées par projet.
