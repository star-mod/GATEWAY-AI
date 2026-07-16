/* =========================================================
   GATEWAY AI — pure logic module
   Deliberately free of DOM/window calls so every function here
   can be unit tested with Jest under Node, and reused by the
   browser as a client-side FALLBACK when the GenAI backend
   (server/server.js) is unreachable (e.g. static-only hosting).
   ========================================================= */

const WAYFIND_GATES = [
  { id: "A", label: "Gate A" }, { id: "B", label: "Gate B" },
  { id: "C", label: "Gate C" }, { id: "D", label: "Gate D" },
  { id: "E", label: "Gate E" }, { id: "F", label: "Gate F" },
  { id: "G", label: "Gate G" }, { id: "H", label: "Gate H" },
  { id: "J", label: "Gate J" }, { id: "K", label: "Gate K" },
];

/** Escapes HTML special characters so user-submitted text can never
 * be interpreted as markup when inserted via innerHTML. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Rule-based wayfinding fallback (used only if the GenAI backend is down). */
function answerWayfinding(q, gateStateSnapshot) {
  const query = (q || "").toLowerCase();
  if (query.includes("restroom") || query.includes("bathroom") || query.includes("toilet")) {
    return "The nearest accessible restroom is on the West concourse, 40m past Gate A — no stairs, wide stalls, and a companion-care room attached.";
  }
  if (query.includes("first aid") || query.includes("medical") || query.includes("injur")) {
    return "First aid is staffed at the North plaza near Gate H, with a second station behind Section 210. Both are marked with a red cross on concourse signage.";
  }
  if (query.includes("quiet")) {
    const state = gateStateSnapshot || {};
    const low = WAYFIND_GATES.filter((g) => state[g.id] && state[g.id].status === "low");
    const pick = low[0] || WAYFIND_GATES[0];
    return `${pick.label} is currently the quietest entrance — load is under 30% with no queue at security.`;
  }
  if (query.match(/section|seat/)) {
    return "Based on your section, the fastest path is through Gate D, up the East ramp, then follow the amber section markers — about 6 minutes from the plaza.";
  }
  if (query.includes("food") || query.includes("eat") || query.includes("drink")) {
    return "The East concourse food hall near Gate F has the shortest lines right now, with three stands open and no wait over 4 minutes.";
  }
  if (query.includes("parking") || query.includes("car")) {
    return "Lot C off the north access road has the most remaining capacity — about a 9 minute walk to Gate H, with a shuttle running every 8 minutes.";
  }
  return "Here's what GATEWAY found: the shortest path from your current concourse position is via the amber wayfinding markers toward the nearest low-congestion gate — tap a gate on the map for a live queue estimate.";
}

/** Rule-based incident triage fallback (used only if the GenAI backend is down). */
function classifyIncident(text) {
  const t = (text || "").toLowerCase();
  let severity = "low", team = "Concourse Volunteers";
  if (t.match(/medical|injur|collapse|chest pain|unconscious/)) { severity = "high"; team = "Medical Response"; }
  else if (t.match(/fight|altercation|aggressive|threat|weapon/)) { severity = "high"; team = "Security"; }
  else if (t.match(/lost child|missing/)) { severity = "high"; team = "Guest Services / Security"; }
  else if (t.match(/queue|crowd|congest|frustrat|long line/)) { severity = "medium"; team = "Crowd Management"; }
  else if (t.match(/closed|stall|equipment|broken|spill/)) { severity = "medium"; team = "Facilities"; }

  const dispatch = severity === "high"
    ? `Priority dispatch to ${team}: immediate response requested. Nearest unit being notified.`
    : severity === "medium"
    ? `Routed to ${team}. Added to the next patrol sweep — response expected within 10 minutes.`
    : `Logged for ${team}. No immediate dispatch required; monitoring for escalation.`;
  return { severity, team, dispatch };
}

/** Rule-based translation fallback (used only if the GenAI backend is down). */
const PHRASE_BANK = {
  es: {
    ticket: "Ten tu entrada e identificación listas en esta puerta.",
    restroom: "Los baños accesibles están a 40 metros de esta puerta.",
    delay: "El ingreso está tardando más de lo normal, gracias por tu paciencia.",
    default: () => "[ES] Por favor, tenga su entrada e identificación listas en esta puerta. Siga las indicaciones del personal de GATEWAY.",
  },
  fr: { default: () => "[FR] Merci de préparer votre billet et votre pièce d'identité à cette porte. Suivez les indications du personnel GATEWAY." },
  pt: { default: () => "[PT] Tenha seu ingresso e documento de identidade prontos neste portão. Siga as orientações da equipe GATEWAY." },
  ar: { default: () => "[AR] يرجى تجهيز تذكرتك وهويتك عند هذه البوابة. اتبعوا إرشادات فريق GATEWAY." },
  ja: { default: () => "[JA] このゲートではチケットと身分証明書をご準備ください。GATEWAYスタッフの案内に従ってください。" },
  de: { default: () => "[DE] Bitte halten Sie Ihr Ticket und Ihren Ausweis an diesem Tor bereit. Folgen Sie den Hinweisen des GATEWAY-Personals." },
};
const LANG_NAMES = { es: "Español", fr: "Français", pt: "Português", ar: "العربية", ja: "日本語", de: "Deutsch" };

function translate(text, lang) {
  const bank = PHRASE_BANK[lang] || {};
  const lower = (text || "").toLowerCase();
  if (bank.ticket && lower.includes("ticket")) return bank.ticket;
  if (bank.restroom && (lower.includes("restroom") || lower.includes("bathroom"))) return bank.restroom;
  if (bank.delay && (lower.includes("delay") || lower.includes("wait") || lower.includes("longer"))) return bank.delay;
  return bank.default ? bank.default(text) : text;
}

const api = { escapeHtml, answerWayfinding, classifyIncident, translate, WAYFIND_GATES, LANG_NAMES };

// Export for Node/Jest ...
if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
// ...and attach to window for the browser.
if (typeof window !== "undefined") {
  window.GatewayLogic = api;
}
