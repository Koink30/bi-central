CONTEXTE BI CENTRAL
Projet affiché : BI Plum' Massage
Projet parent : BI Plum' Massage
Type : BI métier
Espace : Pro Clients
Client / réseau : Praticienne massage Cévennes
Offre client : —
Statut : Validé · Phase : Maquette · Avancement manuel : 58%

FICHE IDENTITÉ
Descriptif court : Agenda, clients, prestations, frise horaire et ambiance visuelle artistique.
Description longue : —
Problème traité : —
Utilisateur final : Praticienne massage Cévennes
Objectif du BI : Renseigner les prestations réelles et simplifier la prise de rendez-vous.
Livrables attendus : —
Périmètre inclus : client, agenda, bien-être
Périmètre exclu : —
Données nécessaires : —

PÉRIMÈTRES LIÉS
- client [À cadrer]
- agenda [À cadrer]
- bien-être [À cadrer]

Modules liés au parent : aucun sous-module déclaré
Chemins : GitHub=apps/bi-plum-massage/ | Pages=https://koink30.github.io/bi-central/apps/bi-plum-massage/ | Drive=—

Consigne IA : Préserver l’existant, distinguer projet parent et sous-modules, proposer des évolutions progressives.

---
DEPLOIEMENT V6.10A
BI_BI-PLUM-MASSAGE/
  00_ADMIN/
    fiche_identite.json
    manifest.json
    README.md
  01_BRIEF_PROJET/
    descriptif.md
    contexte_ia.md
    perimetres_lies.json
  02_DONNEES/                         ← Google Drive data hub
    00_SCHEMA/
      data_schema.json
      dictionnaire_champs.md
    01_SOURCES_DRIVE/
      Google_Sheets/                  ← tables de saisie / base vivante
      Google_Forms/                   ← formulaires d'entrée terrain
      PDF_imports/                    ← PDF / listes client à traiter
    02_IMPORTS/
      a_traiter/
      traites/
      erreurs/
    03_EXPORTS/
      csv/
      json/
      pdf/
    04_CURRENT/
      CURRENT_data.json
      CURRENT_state.json
    05_SNAPSHOTS/
      YYYY-MM-DD_snapshot_data.json
    99_ARCHIVES/
  03_HTML_BI/
    index.html
    assets/
      modules/
  04_ROADMAP/
    roadmap.json
    versions.json
  05_LIVRABLES/
    zip_client/
    pdf/
    liens_publics.md
  06_ARCHIVES/
  99_NOTES_DEV/

Google Drive data :
  Racine données : BI_BI-PLUM-MASSAGE/02_DONNEES
  Mode : Drive + JSON local
  Sync : Drive → BI puis export BI → Drive
  Google Sheet : à renseigner
  Google Form : à renseigner
  Apps Script : https://script.google.com/macros/s/AKfycbz6WOuFQsHIu1q_UeJpMkvczmoT7wfEifv9HgUsalr320aqW61oou3FR_xgio34yT_A/exec

GitHub :
bi-central/
  apps/bi-plum-massage/
    index.html
    manifest.json
    roadmap.json
    data-demo.json
    data_sources.json
    README.md

URL cible :
https://koink30.github.io/bi-central/apps/bi-plum-massage/

---
GOOGLE DRIVE DATA
# Google Drive data map — BI Plum' Massage

## Racine données
BI_BI-PLUM-MASSAGE/02_DONNEES

## Principe
- Drive reste le lieu de stockage lisible pour le client et les fichiers terrain.
- Le BI consomme une version propre des données : CURRENT_data.json.
- Les imports bruts restent séparés des exports et snapshots.
- Apps Script pourra ensuite synchroniser Google Sheets / Drive / JSON avec le BI.

## Sources
- Google Sheet : à renseigner
- Google Form : à renseigner
- Apps Script : https://script.google.com/macros/s/AKfycbz6WOuFQsHIu1q_UeJpMkvczmoT7wfEifv9HgUsalr320aqW61oou3FR_xgio34yT_A/exec

## Arborescence données
- 00_SCHEMA : schéma, dictionnaire de champs, règles de validation.
- 01_SOURCES_DRIVE : Sheets, Forms, PDF/imports client.
- 02_IMPORTS : fichiers entrants à traiter, traités, erreurs.
- 03_EXPORTS : CSV, JSON, PDF produits par le BI.
- 04_CURRENT : état courant exploité par le BI.
- 05_SNAPSHOTS : historiques datés.
- 99_ARCHIVES : anciens formats / livraisons passées.
