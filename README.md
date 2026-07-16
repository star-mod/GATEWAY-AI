# GATEWAY-AI

AI command layer concept for FIFA World Cup 2026 stadiums — live wayfinding, crowd intelligence, multilingual assistant, accessible routing, dynamic ticket pricing, and a volunteer ops console.

**Live demo:** https://star-mod.github.io/GATEWAY-AI/
**Backend API:** https://gateway-ai.onrender.com

## Features

- **Match Center** — live bracket and countdown
- **Navigator** — AI-powered wayfinding
- **Crowd Intel** — real-time gate load monitoring
- **Lingo** — multilingual phrase translation
- **Access & Transit** — accessible and transit-optimized routing
- **Ticketing** — live dynamic ticket pricing
- **Ops Console** — volunteer incident triage
- **AI Assistant** — floating chat assistant for fans, volunteers, and organizers

## How it works

The frontend (`index.html`, `script.js`, `style.css`) is a static site with no build step. The "AI" features call a small Node/Express backend (`server.js`) that proxies requests to the real Anthropic Claude API, so the API key never reaches the browser.

If the backend is unreachable — for example, if only the static frontend is deployed with no `GATEWAY_API_BASE` set — every AI feature automatically falls back to a rule-based simulation in `logic.js`, so the demo still works end to end without a live backend. This fallback is what powers the site when running purely as a static page (GitHub Pages, Vercel, Netlify, etc. with no backend configured).

```
Browser (index.html + script.js)
    │
    ├─ window.GATEWAY_API_BASE set? ──► POST /api/assistant, /api/translate, /api/triage
    │                                        │
    │                                        ▼
    │                                   server.js (Express) ──► Anthropic API (Claude)
    │
    └─ backend unreachable / not configured ──► logic.js rule-based fallback
```

## Tech

- **Frontend:** Plain HTML, CSS, and JavaScript — no build step, no framework
- **Backend:** Node.js + Express, `@anthropic-ai/sdk`, rate-limited with `express-rate-limit`
- **Tests:** Jest, covering the rule-based fallback logic in `logic.js`

## Project structure

```
index.html        — page markup, sets window.GATEWAY_API_BASE
script.js          — UI logic; calls the backend, falls back to logic.js
logic.js            — pure rule-based fallback (wayfinding, triage, translation)
logic.test.js       — Jest tests for logic.js
style.css           — all styling
server.js           — Express backend proxying to the Anthropic API
package.json        — backend dependencies and scripts
.env.example        — local dev environment variable template
```

## Running the backend locally

```bash
npm install
cp .env.example .env   # then add your real ANTHROPIC_API_KEY
npm start               # or: npm run server
```

The server listens on `PORT` (defaults to `3001`) and exposes:

| Endpoint | Method | Body | Returns |
|---|---|---|---|
| `/api/health` | GET | — | `{ ok: true }` |
| `/api/assistant` | POST | `{ message, persona }` | `{ reply }` |
| `/api/translate` | POST | `{ text, lang }` | `{ translated, lang }` |
| `/api/triage` | POST | `{ text }` | `{ severity, team, dispatch }` |

`persona` is one of `fan`, `volunteer`, or `organizer`. `lang` is one of `es`, `fr`, `pt`, `ar`, `ja`, `de`.

## Deploying the backend

Deploy `server.js` anywhere that runs Node — Render, Railway, Fly.io, a VPS, or as serverless functions on Vercel/Netlify. On Render:

- **Root Directory:** blank (repo root)
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment Variable:** `ANTHROPIC_API_KEY` = your real key (set in the dashboard, never committed)

Make sure the Anthropic account behind that key has billing/credits set up — an empty balance produces a `400 invalid_request_error` at the `/api/*` endpoints even with a valid key.

## Connecting the frontend to the backend

In `index.html`, before `script.js` loads:

```html
<script>window.GATEWAY_API_BASE = "https://your-backend-url.onrender.com";</script>
```

Without this line (or if it's commented out), the site runs entirely on the local fallback logic in `logic.js` — useful for a pure static deploy, but it means no real AI calls are happening.

## Deploying the frontend

Static site, ready to deploy on GitHub Pages, Vercel, or Netlify — just upload and go. No build step required.

## Testing

```bash
npm test
```

Runs the Jest suite in `logic.test.js` against the fallback logic (XSS-safe HTML escaping, incident triage rules, wayfinding answers, translation phrase bank).

## Security notes

- The Anthropic API key lives only in the backend's environment variables — never in frontend code or committed to the repo (`.env` is git-ignored)
- User-submitted text (ops reports, chat messages) is HTML-escaped before rendering, to prevent stored XSS
- `/api/*` routes are rate-limited to 30 requests/minute per IP

## Disclaimer

This is a concept prototype. Match results, venue data, crowd metrics, ticket prices, and transit info are simulated for demonstration purposes. The AI Assistant, Lingo translator, and Ops Console triage are backed by a real Claude API call when the backend is configured and reachable; otherwise they run on local rule-based logic as a fallback.
