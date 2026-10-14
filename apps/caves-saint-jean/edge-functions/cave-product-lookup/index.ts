/** Caves Saint-Jean — Recherche publique QR/EAN. Aucune modification des données commerciales. */
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const ORIGIN = "https://koink30.github.io";
const URL = Deno.env.get("SUPABASE_URL") || "";
let ADMIN_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
if (!ADMIN_KEY) {
  try { ADMIN_KEY = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || ""; } catch { /* no key */ }
}
const admin = URL && ADMIN_KEY ? createClient(URL, ADMIN_KEY, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
const respond = (code: number, data: unknown, origin: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Vary": "Origin",
  };
  if (origin === ORIGIN) {
    headers["Access-Control-Allow-Origin"] = ORIGIN;
    headers["Access-Control-Allow-Headers"] = "authorization, apikey, content-type, x-client-info";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  }
  return new Response(code === 204 ? null : JSON.stringify(data), { status: code, headers });
};
function publicURL(value: string): URL | null {
  try {
    if (value.length > 1500) return null;
    const u = new URL(value), host = u.hostname.toLowerCase().replace(/\.$/, "");
    // Les e-étiquettes de vin utilisent parfois encore HTTP ; elles doivent rester lisibles.
    // Une passerelle publique lit la page ; ce service ne contacte jamais directement l’hôte du QR.
    if (!["https:", "http:"].includes(u.protocol) || u.username || u.password) return null;
    if (u.port && !["80", "443"].includes(u.port)) return null;
    if (!/^[a-z0-9.-]+$/.test(host) || !host.includes(".") || host.includes("..") ||
        host.length > 180 || /^\d+(?:\.\d+)*$/.test(host) ||
        /(?:^|\.)(?:localhost|local|internal|example|test|invalid)$/.test(host)) return null;
    return u;
  } catch { return null; }
}
function eanValid(code: string): boolean {
  if (!/^(?:\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = [...code].map(Number), check = digits.pop();
  let sum = 0;
  for (let i = digits.length - 1, j = 0; i >= 0; i--, j++) sum += digits[i] * (j % 2 === 0 ? 3 : 1);
  return (10 - sum % 10) % 10 === check;
}
const sameEAN = (a: unknown, b: string) => String(a || "").replace(/^0+/, "") === b.replace(/^0+/, "");
const short = (v: unknown, n = 140) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
function qty(v: unknown) {
  const m = String(v ?? "").match(/(\d+(?:[.,]\d+)?)\s*(ml|cl|l)\b/i);
  if (!m) return "";
  const number = Number(m[1].replace(",", ".")), unit = m[2].toLowerCase();
  return unit === "ml" && number % 10 === 0 ? (number / 10) + " cl"
    : unit === "cl" ? number + " cl" : unit === "l" ? number + " L" : number + " ml";
}
async function readJson(url: string, ms = 9500) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}
async function lookEAN(code: string) {
  const sources: string[] = [], unavailable: string[] = [];
  try {
    sources.push("Open Food Facts");
    const fields = "code,product_name,product_name_fr,generic_name,brands,quantity,categories,categories_tags";
    const res = await readJson("https://world.openfoodfacts.org/api/v2/product/" + encodeURIComponent(code) + ".json?fields=" + encodeURIComponent(fields));
    const p = res?.status === 1 ? res?.product : null;
    if (p && sameEAN(p.code ?? code, code)) {
      const name = short(p.product_name_fr || p.product_name || p.generic_name);
      if (name) {
        const cat = short(p.categories || (p.categories_tags || []).join(" "));
        return { found: true, type: "ean", code, source: "Open Food Facts", confidence: "source",
          fields: { name, domain: short(p.brands), volume: qty(p.quantity),
            vintage: (name.match(/\b(?:19|20)\d{2}\b/) || [])[0] || "",
            family: /bi[eè]re|beer/i.test(cat) ? "Bière" : /champagne/i.test(cat) ? "Champagne" : /vin|wine/i.test(cat) ? "Vin" : "Autre" },
          sources };
      }
    }
  } catch { unavailable.push("Open Food Facts"); }
  try {
    sources.push("UPCitemdb");
    const res = await readJson("https://api.upcitemdb.com/prod/trial/lookup?upc=" + encodeURIComponent(code), 6500);
    const item = (Array.isArray(res?.items) ? res.items : []).find((p: Record<string, unknown>) =>
      [p.ean, p.upc, p.gtin].some(v => sameEAN(v, code)));
    if (item && short(item.title)) {
      return { found: true, type: "ean", code, source: "UPCitemdb", confidence: "source",
        fields: { name: short(item.title), domain: short(item.brand), volume: qty(item.dimension),
          vintage: "", family: "Autre" }, sources };
    }
  } catch { unavailable.push("UPCitemdb"); }
  return { found: false, type: "ean", code, sources, unavailable, error: unavailable.length === sources.length
    ? "Les bases de produits ne répondent pas."
    : "Référence absente des bases interrogées." };
}
function extractMarkdown(content: string) {
  const text = String(content || "").slice(0, 130000);
  const lines = text.split(/\r?\n/).map(v => v.trim()).filter(Boolean).slice(0, 750);
  const fields: Record<string, string> = {}, evidence: Record<string, string> = {};
  const patterns: [string, RegExp][] = [
    ["name", /^(?:nom (?:de la cuv[eé]e|du vin|du produit)|cuv[eé]e|wine name|product name|nom commercial)\s*[:：\-]\s*(.{2,100})$/i],
    ["domain", /^(?:domaine|producteur|vigneron|ch[aâ]teau|winery|producer|fabricant)\s*[:：\-]\s*(.{2,100})$/i],
    ["vintage", /^(?:mill[eé]sime|vintage|ann[eé]e)\s*[:：\-]\s*((?:19|20)\d{2})\s*$/i],
    ["volume", /^(?:contenance|volume net|volume)\s*[:：\-]\s*(.{2,70})$/i],
    ["appellation", /^(?:appellation|aoc|aop|igp)\s*[:：\-]\s*(.{2,100})$/i],
    ["color", /^(?:couleur|type de vin)\s*[:：\-]\s*(.{2,60})$/i],
  ];
  const clean = (s: string) => short(s.replace(/^#+\s*/, "").replace(/^\*+\s*/, "").replace(/\*+$/, "").replace(/\[(.+)\]\([^)]+\)/g, "$1"), 100);
  for (let i = 0; i < lines.length; i++) {
    const line = clean(lines[i]), next = clean(lines[i+1] || "");
    for (const [key, pattern] of patterns) {
      const m = pattern.exec(line) || (next ? pattern.exec(line.replace(/[:：-]$/, "") + ": " + next) : null);
      if (m && !fields[key]) {
        fields[key] = clean(m[1]); evidence[key] = "Champ explicite de la page";
      }
    }
  }
  // Pages e-label: titre et première rubrique peuvent contenir le nom du vin, mais
  // ne deviennent qu'une suggestion de faible confiance (jamais une certitude).
  const ignore = /(ingr[eé]dient|nutrition|nutritionnel|sulfite|allerg[eè]ne|mentions? l[eé]gales?|politique de confidentialit[eé]|contact|accueil|fiche technique|fiche produit|r[eé]sultat|vin de france|d[eé]claration|information produit|wine information|wine label|wine details|e-label)/i;
  if (!fields.name) {
    const headers = lines.filter(v => /^#{1,3}\s+/.test(v)).map(clean)
      .filter(v => v.length >= 5 && v.length <= 90 && !ignore.test(v) && /[a-zà-ÿ]/i.test(v));
    // Heading guess only when page has wine-related context, not unrelated web pages.
    if (headers.length && /(vin|wine|cuv[eé]e|mill[eé]sime|vigneron|bouteille|sulfites|cépage|appellation)/i.test(text)) {
      fields.name = headers[0]; evidence.name = "Titre de la page — à confirmer";
    }
  }
  if (!fields.domain) {
    const m = text.match(/\b(?:Domaine|Ch[aâ]teau|Maison|Clos|Cave)\s+(?:d['’]|de |des |du |la |le |les )?[\p{L}][\p{L}'’\- ]{3,70}/iu);
    if (m) { fields.domain = clean(m[0]); evidence.domain = "Nom repéré dans la page — à confirmer"; }
  }
  if (fields.volume) fields.volume = qty(fields.volume);
  if (fields.vintage && !/^(?:19|20)\d{2}$/.test(fields.vintage)) fields.vintage = "";
  if (fields.color) fields.color = /ros[eé]/i.test(fields.color) ? "Rosé" : /blanc|white/i.test(fields.color) ? "Blanc" : /rouge|red/i.test(fields.color) ? "Rouge" : "";
  return { fields, evidence, preview: lines.slice(0, 12).join(" ").slice(0, 420) };
}
async function lookQR(link: string) {
  const url = publicURL(link);
  if (!url) return { found: false, type: "qr", error: "Ce QR ne contient pas une adresse web publique reconnue.", url: link };
  // The reader's URL fetch is done externally. No direct request to user-provided host.
  const endpoint = "https://r.jina.ai/" + url.href;
  let body = "";
  try {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 14000);
    try {
      const r = await fetch(endpoint, { signal: ctl.signal,
        headers: { Accept: "text/plain", "X-Return-Format": "markdown" } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const raw = await r.text();
      body = raw.slice(0, 130000);
    } finally { clearTimeout(timer); }
  } catch {
    return { found: false, type: "qr", url: url.href,
      error: "La page du QR code n'a pas pu être lue automatiquement. Ouvrez la page du producteur." };
  }
  const { fields, evidence, preview } = extractMarkdown(body);
  const found = Object.values(fields).some(Boolean);
  return { found, type: "qr", url: url.href, source: "Page du producteur (lecture Web)",
    confidence: Object.values(evidence).some(v => v.includes("à confirmer")) ? "suggestion" : "source",
    fields, evidence, preview, error: found ? "" : "QR lu, mais cette page ne contient pas de champ produit exploitable." };
}
Deno.serve(async req => {
  const origin = req.headers.get("origin") || "";
  if (origin && origin !== ORIGIN) return respond(403, { error: "Origine non autorisée." }, origin);
  if (req.method === "OPTIONS") return respond(204, null, origin);
  if (req.method !== "POST") return respond(405, { error: "Méthode non autorisée." }, origin);
  if (!admin) return respond(503, { error: "Service non configuré." }, origin);
  const match = /^Bearer\s+([^\s]+)$/i.exec(req.headers.get("authorization") || "");
  if (!match) return respond(401, { error: "Connexion au cloud requise." }, origin);
  try {
    const { data: auth, error: authError } = await admin.auth.getUser(match[1]);
    if (authError || !auth?.user?.id) return respond(401, { error: "Session invalide." }, origin);
    const { data: member, error: memberError } = await admin.from("cave_members")
      .select("user_id,role").eq("user_id", auth.user.id).maybeSingle();
    if (memberError || !member || !["admin","user"].includes(member.role))
      return respond(403, { error: "Accès à la cave non autorisé." }, origin);
    let body: unknown;
    try { body = await req.json(); } catch { return respond(400, { error: "Demande invalide." }, origin); }
    if (!body || typeof body !== "object") return respond(400, { error: "Demande invalide." }, origin);
    const command = body as Record<string, unknown>;
    if (command.type === "ean" && typeof command.code === "string" && eanValid(command.code))
      return respond(200, await lookEAN(command.code), origin);
    if (command.type === "qr" && typeof command.url === "string")
      return respond(200, await lookQR(command.url), origin);
    return respond(400, { error: "Type QR/EAN ou données invalides." }, origin);
  } catch {
    return respond(503, { error: "Service temporairement indisponible." }, origin);
  }
});
