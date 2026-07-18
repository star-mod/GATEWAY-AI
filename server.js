/* =========================================================
   GATEWAY AI — backend proxy
   Talks to the real Claude API. Never call the API directly
   from the browser: that would expose your API key to every
   visitor. This tiny server holds the key server-side and the
   front end calls these endpoints instead.

   Run: npm install && cp .env.example .env  (add your key)
        npm run server
   Deploy anywhere that runs Node: Render, Railway, Fly.io,
   a VPS, or as serverless functions on Vercel/Netlify.
   ========================================================= */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10kb" }));

// Basic abuse protection — 30 requests/min per IP across all AI endpoints.
app.use(
  "/api/",
  rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false })
);

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "[GATEWAY] ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key before deploying."
  );
}
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";

function badRequest(res, msg) {
  return res.status(400).json({ error: msg });
}

/* ---------- ASSISTANT (fan / volunteer / organizer) ---------- */
const PERSONA_PROMPTS = {
  fan: "You are the GATEWAY AI assistant helping a fan at a FIFA World Cup 2026 venue. Answer questions about gates, seating, restrooms, food, transit, and accessibility in 1-3 concise sentences. Stay in character as a live stadium assistant; invent plausible, specific-sounding venue details (gate letters, walk times) consistent with a large modern stadium.",
  volunteer: "You are the GATEWAY AI assistant helping a tournament volunteer. Answer with operational detail: incident routing, gate staffing, shift logistics. Keep it to 1-3 sentences.",
  organizer: "You are the GATEWAY AI assistant helping a venue organizer. Answer with venue-wide operational intelligence: load, staffing gaps, arrival forecasts. Keep it to 1-3 sentences.",
};

app.post("/api/assistant", async (req, res) => {
  const { message, persona = "fan" } = req.body || {};
  if (!message || typeof message !== "string") return badRequest(res, "message is required");
  const system = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.fan;
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system,
      messages: [{ role: "user", content: message.slice(0, 500) }],
    });
    const text = resp.content.find((b) => b.type === "text")?.text || "";
    res.json({ reply: text });
  } catch (err) {
    console.error("assistant error:", err.message);
    res.status(502).json({ error: "AI service unavailable" });
  }
});

/* ---------- INCIDENT TRIAGE ---------- */
app.post("/api/triage", async (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== "string") return badRequest(res, "text is required");
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system:
        'You triage incident reports at a stadium. Given a free-text report, respond with ONLY a JSON object: {"severity": "low"|"medium"|"high", "team": string, "dispatch": string}. team should be one of: Medical Response, Security, Crowd Management, Facilities, Guest Services / Security, Concourse Volunteers. dispatch is a one-sentence instruction to staff. No prose, no markdown fences, JSON only.',
      messages: [{ role: "user", content: text.slice(0, 500) }],
    });
    const raw = resp.content.find((b) => b.type === "text")?.text || "{}";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(parsed);
  } catch (err) {
    console.error("triage error:", err.message);
    res.status(502).json({ error: "AI service unavailable" });
  }
});

/* ---------- TRANSLATION ---------- */
const LANG_NAMES = { es: "Spanish", fr: "French", pt: "Portuguese", ar: "Arabic", ja: "Japanese", de: "German" };
app.post("/api/translate", async (req, res) => {
  const { text, lang } = req.body || {};
  if (!text || !LANG_NAMES[lang]) return badRequest(res, "text and a supported lang are required");
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: `Translate the user's stadium-announcement text into ${LANG_NAMES[lang]}. Respond with ONLY the translation, no explanation.`,
      messages: [{ role: "user", content: text.slice(0, 300) }],
    });
    const translated = resp.content.find((b) => b.type === "text")?.text || "";
    res.json({ translated, lang });
  } catch (err) {
    console.error("translate error:", err.message);
    res.status(502).json({ error: "AI service unavailable" });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;

// Only bind to a port when this file is run directly (e.g. `node server.js`
// or Render's `npm start`). When it's require()'d by a test runner instead
// (see server.test.js), we skip listening and just export the app so
// supertest can drive requests against it in-process.
if (require.main === module) {
  app.listen(PORT, () => console.log(`[GATEWAY] backend proxy listening on :${PORT}`));
}
module.exports = { app };
