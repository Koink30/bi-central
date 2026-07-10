# BI Simulateur Boursier V4 — Trading Chart

Cette version corrige le principal défaut de la V3 : le graphique artisanal recalculait son minimum et son maximum à chaque tick, ce qui faisait danser la courbe.

## Corrections

- moteur TradingView Lightweight Charts ;
- chargement de 500 bougies historiques Binance ;
- WebSocket Binance Kline ;
- intervalles 1m, 5m, 15m, 1h, 4h, 1j, 1 semaine ;
- affichage bougies ou ligne ;
- mise à jour de la dernière bougie avec `update()` ;
- aucune commande `fitContent()` à chaque tick ;
- échelle de prix verrouillable ;
- zoom, déplacement et curseur natifs.

## Limite actuelle

La connexion complète historique + bougies temps réel est active pour les cryptos Binance. Les actions restent affichables en mode démo tant que le proxy actions ne fournit pas encore des données OHLC historiques.