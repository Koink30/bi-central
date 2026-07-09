# BI Simulateur Boursier V2 Rapidocs

Version orientée flux rapide : rafraîchissement automatique, WebSocket crypto, ordres virtuels market/limit, portefeuille, P&L, journal et stress test.

## Fichiers

- `index.html` : BI autonome.
- `apps_script_proxy_rapidocs.gs` : proxy Google Apps Script pour cacher les clés API.
- `DEPLOIEMENT_RAPIDOCS.md` : procédure de déploiement Drive + GitHub.

## Modes de données

1. `Démo ticks rapides` : aucun compte, utile pour tester.
2. `Binance WebSocket crypto` : flux crypto rapide sans clé pour BTCUSDT, ETHUSDT, etc.
3. `Proxy Apps Script / backend` : recommandé pour actions, car la clé API reste côté serveur.
4. `FMP direct`, `Alpha Vantage direct`, `Twelve Data direct` : utiles en local, à éviter dans un GitHub public.

## Réglage recommandé

- Crypto : `Binance WebSocket crypto`, symbole `BTCUSDT` ou `ETHUSDT`.
- Actions US / Europe : `Proxy`, intervalle 5 à 30 secondes selon quota API.
- Démo commerciale : mode Démo + 5 secondes.

## Sécurité

Ne jamais commiter une clé API dans un repo public. Le fichier HTML accepte une clé en local, mais le mode propre est le proxy.

## Avertissement

Outil pédagogique uniquement. Ce BI ne fournit pas de conseil financier et ne passe aucun ordre réel.