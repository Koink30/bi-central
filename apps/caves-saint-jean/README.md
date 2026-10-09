# Les Caves de Saint Jean — PWA

Application de gestion installable sur PC et iPhone, basée sur `BI_Caviste_Saint_Jean_V7.html`.

- Responsive PC / iPhone
- Installation PWA
- Fonctionnement hors connexion après la première ouverture
- Données conservées dans le stockage local du navigateur

URL GitHub Pages : `https://koink30.github.io/bi-central/apps/caves-saint-jean/`


## V24 — vente comptoir et fidélité

- Le bouton + du champ Client crée un client avec son nom (téléphone et courriel facultatifs), le sélectionne et conserve le panier.
- Les sélecteurs ouvrent leur liste au clic et au focus ; recherche, clavier et fermeture extérieure sont pris en charge.
- Réglages → Carte de fidélité : activation réservée aux administrateurs, nombre de tampons, récompense en %, minimum TTC, professionnels, cumul de remises et achat récompensé. Programme désactivé initialement ; proposition 10 achats / 10 %.
- Une vente au comptoir intégralement réglée ajoute un tampon. Un paiement différé attend le règlement complet. La création de sa facture ne double pas le tampon ; un avoir annule ses effets. Les ventes historiques ne sont pas créditées rétroactivement.
- Une récompense disponible s'utilise volontairement au comptoir et ajuste les lignes, le total, le règlement et la facture. Sans cumul, la meilleure remise s'applique ; une récompense sans gain est conservée.
- Vérification métier locale : `node apps/caves-saint-jean/tests/checkout.cjs`. `tests/checkout-preview.html` charge le moteur réel avec des données fictives en mémoire, sans connexion cloud ni écritures dans les données de production.
