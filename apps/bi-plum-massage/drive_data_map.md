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
