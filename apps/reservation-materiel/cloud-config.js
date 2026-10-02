/* Configuration cloud — complétée quand le projet Supabase dédié sera créé.
   La publishable key est conçue pour être exposée côté navigateur.
   Ne jamais mettre une service_role dans ce fichier. */
window.MERLET_CLOUD_CONFIG = {
  enabled: false,
  url: "",
  publishableKey: "",
  stateTable: "material_reservation_state",
  stateId: "shared",
  pollMs: 12000
};
