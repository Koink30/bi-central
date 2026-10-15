/* Configuration cloud — Réservation matériel.
   La publishable key est publique par conception. Aucune service_role ici. */
window.MERLET_CLOUD_CONFIG = {
  enabled: true,
  url: "https://snapiecoesgrfjscwfkq.supabase.co",
  publishableKey: "sb_publishable_Q9N9w0GrBMe0sAZjKkWkHQ_7RUCZRC1",
  stateTable: "material_reservation_state",
  stateId: "shared",
  pollMs: 12000
};
