# BI Simulateur Boursier V3 Cockpit

Correctif après test terrain : la V2 bougeait avec Binance, mais manquait de repères de lecture et de vraie navigation marché.

## Nouveautés

- Liste de valeurs intégrée : Crypto, US Tech, CAC 40, ETF.
- Recherche et catégories.
- Graphique avec axe temps, axe prix, grille, curseur et tooltip au survol.
- Fenêtre visible : 1 min, 5 min, 15 min, 1 h ou tout.
- Diagnostic de flux : source, ticks reçus, dernier tick, fraîcheur.
- WebSocket Binance crypto conservé.
- Proxy/API conservés pour actions.

## Usage rapide

- Crypto : choisir `Binance WebSocket crypto`, puis `BTCUSDT`, `ETHUSDT` ou `SOLUSDT`.
- Actions : choisir `Proxy Apps Script / backend`, puis `AAPL`, `NVDA`, `MC.PA`, etc.
- Sans API : choisir `Démo rapide`.

## Attention

Pour les actions, ne jamais mettre une clé API dans GitHub Pages. Utiliser le proxy Apps Script.