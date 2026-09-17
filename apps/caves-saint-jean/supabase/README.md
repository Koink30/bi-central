# Synchronisation cloud

Cette migration transforme le stockage uniquement local de la PWA en stockage
privé partagé entre PC et iPhone.

Principes retenus :

- authentification Supabase obligatoire ;
- un compte privé commun à la cave sur PC et iPhone ;
- données métier synchronisées dans `cave_snapshots` ;
- photos privées dans Storage, indexées par `product_photos` ;
- conservation du stockage local comme cache hors ligne ;
- première connexion : choix explicite entre envoyer les données locales ou
  récupérer les données cloud, afin de ne rien écraser silencieusement.

Le fichier `schema.sql` ne contient aucune clé ni donnée client et peut rester
dans le dépôt public. Les identifiants de connexion publics du projet seront
injectés dans la PWA après création de la base. La clé d'administration ne doit
jamais être ajoutée au dépôt ni au navigateur. Une gestion de plusieurs comptes
pour la même cave pourra être ajoutée ensuite sans modifier les données métier.
