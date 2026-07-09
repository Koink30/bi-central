# Déploiement Rapidocs

## 1. GitHub

Déposer les fichiers dans :

```text
bi-central/bi-simulateur-boursier/v2/
```

Puis, si GitHub Pages est activé, ouvrir :

```text
https://koink30.github.io/bi-central/bi-simulateur-boursier/v2/
```

## 2. Apps Script proxy

1. Aller dans Google Drive.
2. Créer un nouveau projet Apps Script.
3. Coller `apps_script_proxy_rapidocs.gs`.
4. Dans `Project Settings > Script Properties`, ajouter :
   - `PROVIDER` = `fmp` ou `alphavantage` ou `twelvedata`
   - `API_KEY` = votre clé
   - `CACHE_SECONDS` = `2`, `5` ou `10`
5. Déployer comme Web App.
6. Dans le BI : Mode données = `Proxy Apps Script / backend`, champ clé/proxy = URL de la Web App.

## 3. Drive

Créer un dossier Drive projet et y stocker :

```text
BI_SIMULATEUR_BOURSIER_V2_RAPIDOCS.zip
exports/session_bourse_*.json
notes/choix_api.md
```

## 4. Réglages réalistes

- 1 seconde : surtout crypto WebSocket ou API premium.
- 5 secondes : bon compromis pour démonstration.
- 30 secondes : plus sûr pour API gratuite ou quota faible.

## 5. V3 conseillée

- Sauvegarde automatique Google Sheets.
- Backtesting historique.
- Alertes stop-loss / take-profit.
- Simulateur de frais broker.
- Mode paper trading connecté à un broker sandbox si besoin.