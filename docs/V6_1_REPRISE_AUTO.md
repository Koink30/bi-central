# Cockpit Projets BI — V6.1 Reprise Auto

## Objectif

Supprimer le bazar des reprises manuelles entre versions.

La V6.1 met en place une logique de reprise automatique basée sur :

- une clé stable conservée entre versions ;
- une clé de version V6.1 ;
- un miroir vers V6 pour rollback ;
- une recherche automatique dans les anciennes clés ;
- des snapshots centralisés ;
- un journal local de reprise.

## Clé stable

```text
central_bi_project_manager_current
```

Cette clé devient la source principale à conserver entre les prochaines versions.

## Clés miroir

```text
central_bi_project_manager_v61
central_bi_project_manager_v6
```

Elles permettent d’avoir une trace de version et de garder une compatibilité avec V6.

## Clés anciennes reprises automatiquement

```text
central_bi_project_manager_v6
central_bi_project_manager_v5
central_bi_project_manager_v4
central_bi_project_manager_v1
```

Au chargement, le BI cherche le meilleur état disponible, puis le recopie automatiquement dans la clé stable.

## Snapshots

Nouvelle clé stable :

```text
central_bi_project_manager_snapshots
```

Anciennes clés fusionnées automatiquement :

```text
central_bi_project_manager_v6_snapshots
central_bi_project_manager_v5_snapshots
central_bi_project_manager_v4_snapshots
central_bi_project_manager_v1_snapshots
```

## Journal local

```text
bi_central_recovery_index
```

Ce journal garde les dernières actions de sauvegarde/reprise dans le navigateur.

## Ce que cela règle

- Remplacement V6 → V6.1 sur la même URL : reprise automatique.
- Retour V6.1 → V6 : miroir disponible.
- Passage futur V6.1 → V7 : on devra garder la même clé stable.
- Snapshots anciens visibles dans la nouvelle version.

## Ce que cela ne peut pas régler seul

La reprise automatique ne peut pas passer d’un navigateur à un autre sans export/import ou backend.

Cas nécessitant encore un JSON ou une vraie synchronisation :

- changement de PC ;
- changement de navigateur ;
- passage de `file://` à GitHub Pages ;
- cache/localStorage vidé ;
- données créées dans Drive Preview ;
- usage multi-utilisateur.

## Règle de développement future

Toutes les prochaines versions doivent conserver :

```text
central_bi_project_manager_current
```

et migrer depuis les anciennes clés, sans changer la source principale.
