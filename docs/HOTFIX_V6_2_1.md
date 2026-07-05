# Hotfix Cockpit Projets BI — V6.2.1

## Problème constaté

La V6.2 ajoutant les boutons GPT / Drive / GitHub pouvait afficher un cockpit vide :

- aucun projet rendu ;
- import JSON sans réaction visible ;
- boutons du haut restant sur `#` et rouvrant la page.

## Cause

Initialisation JavaScript trop précoce dans le header des constantes de reprise. Le script pouvait se bloquer avant le rendu des projets et avant l’initialisation des liens rapides.

## Correction V6.2.1

- démarrage JS corrigé ;
- liens GPT / Drive / GitHub intégrés en dur ;
- reprise automatique conservée ;
- seed anti-vide conservé ;
- clé stable conservée :

```text
central_bi_project_manager_current
```

## Liens intégrés

```text
GPT: https://chatgpt.com/g/g-p-6a4792bb9ac48191a6eee34ab4ba8c53-bi-projet-bi-central/project
Drive: https://drive.google.com/drive/u/0/my-drive
GitHub: https://github.com/Koink30
```
