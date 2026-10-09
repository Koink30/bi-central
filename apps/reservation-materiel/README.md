# Réservation matériel — V22 pré-multiutilisateur

Préparation du BI pour GitHub Pages + Supabase, sur le même principe que l’application des Caves de Saint-Jean, mais dans un dossier et un futur projet Supabase séparés.

## État
- `index.html` : la V22 complète est préparée localement ; elle sera posée ici au raccordement final.
- `manifest.webmanifest` + `sw.js` : installation PWA / fonctionnement hors ligne de la coque.
- `cloud-sync.js` : connexion, état partagé, polling, verrou optimiste par révision et écran de conflit.
- `cloud-config.js` : désactivé tant qu’un projet Supabase dédié n’est pas créé.
- `supabase/schema.sql` : schéma préparé avec RLS et liste blanche `team_members`.

## URL prévue après fusion sur main
https://koink30.github.io/bi-central/apps/reservation-materiel/

## Mise en service cloud
1. Créer un projet Supabase dédié au Merlet.
2. Exécuter `supabase/schema.sql`.
3. Ajouter les adresses autorisées dans `public.team_members`.
4. Créer les comptes Auth correspondants ; l’inscription publique n’est pas utilisée par l’interface.
5. Renseigner l’URL du projet et la **publishable key** dans `cloud-config.js`, puis `enabled: true`.
6. Tester PC + mobile et un conflit de modification simultanée.

Aucune `service_role` ne doit être placée dans le dépôt public.
