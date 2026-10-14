/**
 * Les Caves de Saint-Jean — reset de mot de passe par l'administrateur.
 * Uniquement côté Supabase Edge Function. AUCUN secret dans la PWA / GitHub.
 * Aucune notification, invitation, confirmation ou modification d'e-mail.
 * Aucun changement de données métier.
 */
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const allowedOrigin = "https://koink30.github.io";
const url = Deno.env.get("SUPABASE_URL") || "";
let secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
if (!secretKey) {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    secretKey = keys.default || "";
  } catch { /* no key */ }
}
const admin = url && secretKey
  ? createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

function respond(status, data, origin = "") {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "Vary": "Origin",
  };
  if (origin === allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
    headers["Access-Control-Allow-Headers"] = "authorization, apikey, content-type, x-client-info";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  }
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers });
}

function temporaryPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(24)); // 192 bits
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  if (origin && origin !== allowedOrigin) return respond(403, { error: "Origine non autorisée." }, origin);
  if (request.method === "OPTIONS") return respond(204, null, origin);
  if (request.method !== "POST") return respond(405, { error: "Méthode non autorisée." }, origin);
  if (!admin) return respond(503, { error: "Service administrateur non configuré." }, origin);

  const authorization = request.headers.get("authorization") || "";
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  if (!match) return respond(401, { error: "Connexion requise." }, origin);

  try {
    // Vérifie le JWT de l'appelant sur Supabase Auth, indépendamment du client.
    const { data: userData, error: authError } = await admin.auth.getUser(match[1]);
    if (authError || !userData?.user?.id)
      return respond(401, { error: "Session invalide ou expirée. Reconnectez-vous." }, origin);

    let body;
    try { body = await request.json(); } catch { return respond(400, { error: "Demande invalide." }, origin); }
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return respond(400, { error: "Adresse e-mail invalide." }, origin);

    // Autorisation calculée sur les vraies tables et non sur un rôle envoyé par le navigateur.
    const { data: actor, error: actorError } = await admin.from("cave_members")
      .select("user_id,owner_id,role").eq("user_id", userData.user.id).maybeSingle();
    if (actorError) return respond(503, { error: "Vérification des droits indisponible." }, origin);
    if (!actor || actor.role !== "admin" || actor.user_id !== actor.owner_id)
      return respond(403, { error: "Administrateur propriétaire requis." }, origin);

    // Isolation : seules les personnes déjà autorisées dans la même cave sont éligibles.
    const { data: target, error: targetError } = await admin.from("cave_members")
      .select("user_id,owner_id,role,email")
      .eq("owner_id", actor.owner_id).ilike("email", email).maybeSingle();
    if (targetError) return respond(503, { error: "Recherche utilisateur indisponible." }, origin);
    if (!target) return respond(404, { error: "Utilisateur non autorisé. Ajoutez d'abord son compte dans Gestion des accès." }, origin);
    if (target.role !== "user" || target.user_id === actor.user_id)
      return respond(403, { error: "Le mot de passe d'un administrateur ne peut pas être réinitialisé ici." }, origin);

    const password = temporaryPassword();
    // La mise à jour directe de mot de passe Supabase ne déclenche aucun e-mail.
    const { error: updateError } = await admin.auth.admin.updateUserById(target.user_id, { password });
    if (updateError) return respond(502, { error: "Réinitialisation impossible. Réessayez plus tard." }, origin);

    // Ce secret n'est JAMAIS loggé, stocké, ni envoyé par e-mail.
    return respond(200, { temporaryPassword: password, email: target.email }, origin);
  } catch {
    return respond(500, { error: "Erreur serveur. Aucune réinitialisation confirmée." }, origin);
  }
});