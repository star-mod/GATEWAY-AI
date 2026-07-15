/* =========================================================
   GATEWAY AI — prototype logic
   All "AI" here is a rule-based / templated simulation running
   entirely client-side, standing in for a generative model call
   (e.g. Claude) in a production deployment. Comments mark where
   a live LLM API call would plug in.
   ========================================================= */

/* ---------- DATA ---------- */
const VENUES = [
  {name:"MetLife Stadium", status:"clear", load:34},
  {name:"AT&T Stadium", status:"moderate", load:61},
  {name:"Estadio Azteca", status:"congested", load:88},
  {name:"BC Place", status:"clear", load:22},
  {name:"Hard Rock Stadium", status:"moderate", load:55},
];

const GATES = [
  {id:"A", label:"Gate A", angle:-100},
  {id:"B", label:"Gate B", angle:-55},
  {id:"C", label:"Gate C", angle:-15},
  {id:"D", label:"Gate D", angle:20},
  {id:"E", label:"Gate E", angle:55},
  {id:"F", label:"Gate F", angle:100},
  {id:"G", label:"Gate G", angle:140},
  {id:"H", label:"Gate H", angle:180},
  {id:"J", label:"Gate J", angle:220},
  {id:"K", label:"Gate K", angle:260},
];

const AMENITIES = {
  A:"West concourse, restrooms + accessible seating lift",
  B:"Premium entrance, guest services desk",
  C:"Main plaza entrance, largest queue capacity",
  D:"Family zone — nursing room + stroller check",
  E:"Media & broadcast entrance",
  F:"East concourse, food hall access",
  G:"Away supporters section entrance",
  H:"North plaza, first aid station",
  J:"Volunteer & staff entrance",
  K:"Accessible drop-off entrance",
};

let gateState = {}; // populated below

function randomStatus(){
  const r = Math.random();
  if(r < 0.45) return {status:"low", pct: 15 + Math.random()*25};
  if(r < 0.8) return {status:"mid", pct: 45 + Math.random()*25};
  return {status:"high", pct: 75 + Math.random()*20};
}

function initGateState(){
  GATES.forEach(g=>{
    gateState[g.id] = randomStatus();
  });
}
initGateState();

/* ---------- TICKER ---------- */
function buildTicker(){
  const items = [
    "Spain 2–0 France — Spain advance to the Final at MetLife Stadium",
    "Semifinal live now: England vs. Argentina, Atlanta Stadium",
    "GATE C queue at 88% — GATEWAY suggesting Gate F reroute",
    "Weather: 31°C, high UV — hydration stations flagged at Gates B, F, K",
    "Shuttle line 4 arriving every 6 min from Downtown Transit Hub",
    "Multilingual desk active: EN · ES · FR · PT · AR · JA · DE",
    "Accessible seating lift operational at Gates A and K",
    "Final tickets: dynamic pricing trending up as inventory tightens",
  ];
  const full = items.concat(items).map(i=>`◆ ${i}`).join("&nbsp;&nbsp;&nbsp;&nbsp;");
  document.getElementById("tickerTrack").innerHTML = full + "&nbsp;&nbsp;&nbsp;&nbsp;" + full;
}
buildTicker();

/* ---------- HERO SCOREBOARD ---------- */
function statusClass(s){
  return s === "clear" ? "status-clear" : s === "moderate" ? "status-moderate" : "status-congested";
}
function renderScoreboard(){
  const body = document.getElementById("scoreboardBody");
  body.innerHTML = VENUES.map(v=>`
    <div class="scoreboard-row">
      <span>${v.name}</span>
      <span class="status-pill ${statusClass(v.status)}">${v.status}</span>
      <span class="load-bar"><span class="load-fill" style="width:${v.load}%"></span></span>
    </div>`).join("");
}
renderScoreboard();
setInterval(()=>{
  VENUES.forEach(v=>{
    v.load = Math.max(10, Math.min(96, v.load + (Math.random()*14-7)));
    v.status = v.load < 45 ? "clear" : v.load < 75 ? "moderate" : "congested";
  });
  renderScoreboard();
}, 4000);

/* ---------- STADIUM MAP ---------- */
function statusColor(status){
  return status === "low" ? "#2E9E68" : status === "mid" ? "#FFB627" : "#E8483A";
}
function renderGates(){
  const layer = document.getElementById("gatesLayer");
  layer.innerHTML = GATES.map(g=>{
    const rad = g.angle * Math.PI/180;
    const rx = 245, ry = 165;
    const x = 300 + rx*Math.cos(rad);
    const y = 230 + ry*Math.sin(rad);
    const st = gateState[g.id];
    const ping = st.status === "high" ? `<circle r="12" fill="none" stroke="${statusColor(st.status)}" stroke-width="2" opacity="0.6">
        <animate attributeName="r" values="12;28" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.55;0" dur="1.6s" repeatCount="indefinite"/>
      </circle>` : "";
    return `<g class="gate-marker" data-gate="${g.id}" transform="translate(${x},${y})">
      ${ping}
      <circle r="12" fill="${statusColor(st.status)}"/>
      <text x="0" y="1">${g.id}</text>
    </g>`;
  }).join("");
  layer.querySelectorAll(".gate-marker").forEach(el=>{
    el.addEventListener("click", ()=> showGateDetail(el.dataset.gate));
  });
}
renderGates();

function showGateDetail(id){
  const g = GATES.find(x=>x.id===id);
  const st = gateState[id];
  const queue = Math.round(st.pct/5);
  const label = st.status === "low" ? "Clear" : st.status === "mid" ? "Moderate" : "Congested";
  let advice;
  if(st.status === "high"){
    const alt = GATES.filter(x=> gateState[x.id].status === "low")[0];
    advice = `GATEWAY recommends redirecting to ${alt ? alt.label : "the next available gate"} — estimated ${queue} min faster right now.`;
  } else if(st.status === "mid"){
    advice = `Moving at a normal pace. Expect roughly ${queue} minutes at security.`;
  } else {
    advice = `Fastest gate on the concourse right now — no rerouting needed.`;
  }
  document.getElementById("gateDetail").innerHTML = `
    <p class="eyebrow">${label} · Live briefing</p>
    <p class="gate-title">${g.label}</p>
    <div class="gate-meta">
      <span>QUEUE ≈ ${queue} min</span>
      <span>LOAD ${Math.round(st.pct)}%</span>
    </div>
    <p class="muted">${AMENITIES[id]}</p>
    <p>${advice}</p>
  `;
}
showGateDetail("C");

setInterval(()=>{
  const ids = Object.keys(gateState);
  const id = ids[Math.floor(Math.random()*ids.length)];
  gateState[id] = randomStatus();
  renderGates();
}, 3500);

/* ---------- WAYFINDING ASK ---------- */
// In production this input would be sent to an LLM (e.g. Claude via the
// Messages API) along with live occupancy + venue-map context. Here we
// simulate that response with a small intent-matching engine.
function answerWayfinding(q){
  const query = q.toLowerCase();
  if(query.includes("restroom") || query.includes("bathroom") || query.includes("toilet")){
    return "The nearest accessible restroom is on the West concourse, 40m past Gate A — no stairs, wide stalls, and a companion-care room attached.";
  }
  if(query.includes("first aid") || query.includes("medical") || query.includes("injur")){
    return "First aid is staffed at the North plaza near Gate H, with a second station behind Section 210. Both are marked with a red cross on concourse signage.";
  }
  if(query.includes("quiet")){
    const low = GATES.filter(g=> gateState[g.id].status==="low");
    const pick = low[0] || GATES[0];
    return `${pick.label} is currently the quietest entrance — load is under 30% with no queue at security.`;
  }
  if(query.match(/section|seat/)){
    return "Based on your section, the fastest path is through Gate D, up the East ramp, then follow the amber section markers — about 6 minutes from the plaza.";
  }
  if(query.includes("food") || query.includes("eat") || query.includes("drink")){
    return "The East concourse food hall near Gate F has the shortest lines right now, with three stands open and no wait over 4 minutes.";
  }
  if(query.includes("parking") || query.includes("car")){
    return "Lot C off the north access road has the most remaining capacity — about a 9 minute walk to Gate H, with a shuttle running every 8 minutes.";
  }
  return "Here's what GATEWAY found: the shortest path from your current concourse position is via the amber wayfinding markers toward the nearest low-congestion gate — tap a gate on the map for a live queue estimate.";
}

document.getElementById("wayfindForm").addEventListener("submit", e=>{
  e.preventDefault();
  const input = document.getElementById("wayfindInput");
  const q = input.value.trim();
  if(!q) return;
  const out = document.getElementById("wayfindAnswer");
  out.classList.add("show");
  out.textContent = "GATEWAY is checking live concourse data…";
  setTimeout(()=>{ out.textContent = answerWayfinding(q); }, 550);
});
document.querySelectorAll(".chip").forEach(chip=>{
  chip.addEventListener("click", ()=>{
    document.getElementById("wayfindInput").value = chip.dataset.q;
    document.getElementById("wayfindForm").dispatchEvent(new Event("submit"));
  });
});

/* ---------- CROWD INTELLIGENCE ---------- */
const CROWD_GATES = ["Gate A","Gate B","Gate C","Gate D","Gate F","Gate H"];
let crowdData = CROWD_GATES.map(()=> 20 + Math.random()*70);

function renderCrowd(){
  const el = document.getElementById("crowdBars");
  el.innerHTML = CROWD_GATES.map((name,i)=>{
    const v = crowdData[i];
    const color = v < 45 ? "#2E9E68" : v < 75 ? "#FFB627" : "#E8483A";
    return `<div class="crowd-row">
      <span>${name}</span>
      <span class="crowd-track"><span class="crowd-fill" style="width:${v}%;background:${color}"></span></span>
      <span>${Math.round(v)}%</span>
    </div>`;
  }).join("");
}
renderCrowd();

function generateCrowdRecommendation(){
  const max = crowdData.indexOf(Math.max(...crowdData));
  const min = crowdData.indexOf(Math.min(...crowdData));
  const busiest = CROWD_GATES[max];
  const quietest = CROWD_GATES[min];
  const pct = Math.round(crowdData[max]);
  const templates = [
    `${busiest} is running at ${pct}% capacity and trending upward. Suggest opening two additional lanes and pushing a push-notification nudge toward ${quietest}, currently the least congested entrance.`,
    `Arrival rate at ${busiest} has outpaced security throughput for the last 10 minutes. GATEWAY recommends a temporary signage redirect toward ${quietest} plus a staff radio call to concourse supervisors.`,
    `Forecast models put ${busiest} at critical density within the next 15–20 minutes if current trend holds. Draft alert ready to send to volunteers: "Direct arriving fans toward ${quietest} — shortest wait on site."`,
  ];
  return templates[Math.floor(Math.random()*templates.length)];
}

function refreshCrowd(){
  crowdData = crowdData.map(v=> Math.max(8, Math.min(97, v + (Math.random()*24-11))));
  renderCrowd();
  const rec = document.getElementById("crowdRecommendation");
  rec.textContent = "Drafting recommendation…";
  setTimeout(()=>{ rec.textContent = generateCrowdRecommendation(); }, 500);
  const eta = document.getElementById("peakEta");
  eta.textContent = `T‑${Math.floor(10+Math.random()*40)} min`;
}
refreshCrowd();
document.getElementById("regenRecBtn").addEventListener("click", refreshCrowd);
setInterval(refreshCrowd, 8000);

/* ---------- MULTILINGUAL ---------- */
// Simulated generative translation via small phrase-template dictionary,
// standing in for a live multilingual LLM completion.
const PHRASE_BANK = {
  es: {
    "ticket":"Ten tu entrada e identificación listas en esta puerta.",
    "restroom":"Los baños accesibles están a 40 metros de esta puerta.",
    "delay":"El ingreso está tardando más de lo normal, gracias por tu paciencia.",
    "default":(s)=>`[ES] Por favor, tenga su entrada e identificación listas en esta puerta. Siga las indicaciones del personal de GATEWAY.`
  },
  fr: {default:(s)=>`[FR] Merci de préparer votre billet et votre pièce d'identité à cette porte. Suivez les indications du personnel GATEWAY.`},
  pt: {default:(s)=>`[PT] Tenha seu ingresso e documento de identidade prontos neste portão. Siga as orientações da equipe GATEWAY.`},
  ar: {default:(s)=>`[AR] يرجى تجهيز تذكرتك وهويتك عند هذه البوابة. اتبعوا إرشادات فريق GATEWAY.`},
  ja: {default:(s)=>`[JA] このゲートではチケットと身分証明書をご準備ください。GATEWAYスタッフの案内に従ってください。`},
  de: {default:(s)=>`[DE] Bitte halten Sie Ihr Ticket und Ihren Ausweis an diesem Tor bereit. Folgen Sie den Hinweisen des GATEWAY-Personals.`},
};
const LANG_NAMES = {es:"Español",fr:"Français",pt:"Português",ar:"العربية",ja:"日本語",de:"Deutsch"};

function translate(text, lang){
  const bank = PHRASE_BANK[lang] || {};
  const lower = text.toLowerCase();
  if(bank.ticket && lower.includes("ticket")) return bank.ticket;
  if(bank.restroom && (lower.includes("restroom")||lower.includes("bathroom"))) return bank.restroom;
  if(bank.delay && (lower.includes("delay")||lower.includes("wait")||lower.includes("longer"))) return bank.delay;
  return bank.default(text);
}
document.getElementById("lingoBtn").addEventListener("click", ()=>{
  const text = document.getElementById("lingoInput").value.trim() || "Please have your ticket and ID ready at this gate.";
  const lang = document.getElementById("lingoLang").value;
  const out = document.getElementById("lingoOutput");
  out.innerHTML = `<span class="lang-tag">${LANG_NAMES[lang]} · generating…</span>`;
  setTimeout(()=>{
    out.innerHTML = `<span class="lang-tag">${LANG_NAMES[lang]}</span>${translate(text, lang)}`;
  }, 450);
});

/* ---------- ACCESSIBILITY ---------- */
document.getElementById("accessBtn").addEventListener("click", ()=>{
  const checked = Array.from(document.querySelectorAll("#accessOptions input:checked")).map(c=>c.value);
  const out = document.getElementById("accessOutput");
  if(checked.length===0){
    out.textContent = "Select at least one need and GATEWAY will build a route around it.";
    return;
  }
  out.textContent = "Building route…";
  const notes = {
    wheelchair:"routes you via the Gate A and Gate K ramps (no stairs), with the lift confirmed operational",
    sensory:"avoids the main plaza during entry peaks and routes through the quieter North concourse",
    stroller:"keeps you on level concourse paths and flags the stroller-check point near Gate D",
    hearing:"places you in hearing-loop-equipped seating blocks and notes the nearest interpreter station",
  };
  setTimeout(()=>{
    const parts = checked.map(c=>notes[c]);
    out.textContent = `Route ready: GATEWAY ${parts.join("; also ")}. Estimated concourse time: ${6+checked.length*2} minutes.`;
  }, 600);
});

/* ---------- TRANSPORT + SUSTAINABILITY ---------- */
const TRANSIT_OPTIONS = {
  downtown:{mode:"Light rail — Green Line", time:"22 min", co2:"2.1 kg CO₂ saved vs. driving"},
  airport:{mode:"Express shuttle + rail transfer", time:"48 min", co2:"6.4 kg CO₂ saved vs. rideshare"},
  suburb:{mode:"Park & ride shuttle", time:"35 min", co2:"3.8 kg CO₂ saved vs. driving direct"},
  hotel:{mode:"Walk + tram (12 min walk)", time:"19 min", co2:"1.6 kg CO₂ saved vs. taxi"},
};
let co2Total = 41.2;
document.getElementById("transitBtn").addEventListener("click", ()=>{
  const from = document.getElementById("transitFrom").value;
  const opt = TRANSIT_OPTIONS[from];
  const out = document.getElementById("transitOutput");
  out.textContent = "Checking live transit load…";
  setTimeout(()=>{
    out.textContent = `Best option: ${opt.mode}, about ${opt.time} to the gate. Current occupancy is manageable — no transfer delays reported. ${opt.co2}.`;
    co2Total += parseFloat(opt.co2);
    updateCo2();
  }, 550);
});
function updateCo2(){
  const pct = Math.min(100, co2Total/1.2);
  document.getElementById("co2Fill").style.width = pct+"%";
  document.getElementById("co2Label").textContent = `Tournament-wide CO₂ avoided by transit-first routing today: ${co2Total.toFixed(1)} kg and climbing.`;
}
updateCo2();

/* ---------- OPS CONSOLE ---------- */
// Simulated triage classifier — in production this maps to an LLM call
// that reads the free-text report and returns {severity, team, note}.
function classifyIncident(text){
  const t = text.toLowerCase();
  let severity = "low", team = "Concourse Volunteers";
  if(t.match(/medical|injur|collapse|chest pain|unconscious/)){ severity="high"; team="Medical Response"; }
  else if(t.match(/fight|altercation|aggressive|threat|weapon/)){ severity="high"; team="Security"; }
  else if(t.match(/queue|crowd|congest|frustrat|long line/)){ severity="medium"; team="Crowd Management"; }
  else if(t.match(/closed|stall|equipment|broken|spill/)){ severity="medium"; team="Facilities"; }
  else if(t.match(/lost child|missing/)){ severity="high"; team="Guest Services / Security"; }

  const dispatch = severity==="high"
    ? `Priority dispatch to ${team}: immediate response requested. Nearest unit being notified.`
    : severity==="medium"
    ? `Routed to ${team}. Added to the next patrol sweep — response expected within 10 minutes.`
    : `Logged for ${team}. No immediate dispatch required; monitoring for escalation.`;
  return {severity, team, dispatch};
}

function addOpsEntry(text, result){
  const wrap = document.getElementById("opsEntries");
  const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  const entry = document.createElement("div");
  entry.className = `ops-entry sev-${result.severity}`;
  entry.innerHTML = `
    <span class="sev-tag">${result.severity} priority · ${result.team}</span>
    <p>${text}</p>
    <p class="ops-meta">${time} — ${result.dispatch}</p>
  `;
  wrap.prepend(entry);
}

document.getElementById("opsForm").addEventListener("submit", e=>{
  e.preventDefault();
  const input = document.getElementById("opsInput");
  const text = input.value.trim();
  if(!text) return;
  const result = classifyIncident(text);
  addOpsEntry(text, result);
  input.value = "";
});
// seed a couple of example entries
addOpsEntry("Two food stalls closed near Gate F, queue backing into the concourse", classifyIncident("Two food stalls closed near Gate F, queue backing into the concourse"));
addOpsEntry("Fan reporting dizziness near Section 108, requesting medical", classifyIncident("Fan reporting dizziness near Section 108, requesting medical"));

/* ---------- FLOATING ASSISTANT ---------- */
const assistantPanel = document.getElementById("assistantPanel");
const assistantMessages = document.getElementById("assistantMessages");
let currentPersona = "fan";

function openAssistant(){
  assistantPanel.classList.add("open");
  if(assistantMessages.children.length === 0){
    pushMessage("bot", greetingFor(currentPersona));
  }
}
document.getElementById("assistantLauncher").addEventListener("click", openAssistant);
document.getElementById("heroTryBtn").addEventListener("click", openAssistant);
document.getElementById("assistantToggleBtn").addEventListener("click", openAssistant);
document.getElementById("assistantClose").addEventListener("click", ()=> assistantPanel.classList.remove("open"));

document.querySelectorAll(".persona-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".persona-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    currentPersona = btn.dataset.persona;
    pushMessage("bot", greetingFor(currentPersona));
  });
});

function greetingFor(persona){
  if(persona==="volunteer") return "Switched to Volunteer mode. Ask me about assignments, incident routing, or gate status — I'll answer with operational detail.";
  if(persona==="organizer") return "Organizer mode active. Ask about venue-wide load, staffing gaps, or forecasted pinch points.";
  return "Hi, I'm the GATEWAY assistant for this venue. Ask me anything about gates, seating, transit, or accessibility.";
}

function pushMessage(who, text){
  const div = document.createElement("div");
  div.className = `msg msg-${who}`;
  div.textContent = text;
  assistantMessages.appendChild(div);
  assistantMessages.scrollTop = assistantMessages.scrollHeight;
}

// Rule-based response engine per persona — a stand-in for a system-prompted
// LLM call (persona instructions + live venue context as tool results).
function assistantReply(q, persona){
  const t = q.toLowerCase();
  if(persona === "volunteer"){
    if(t.match(/incident|report|dispatch/)) return "Log it through the Ops Console below and I'll classify severity automatically — high priority items page Security or Medical directly.";
    if(t.match(/gate|busy|congest/)) return `Gate C is currently the busiest on this venue's map. Recommend directing arriving volunteers to reinforce that lane for the next 20 minutes.`;
    if(t.match(/break|shift/)) return "Your next scheduled break rotation is in 45 minutes — Facilities will cover your post at Gate D.";
    return "As a volunteer, I can help with incident routing, gate staffing status, and shift logistics — try asking about a specific gate.";
  }
  if(persona === "organizer"){
    if(t.match(/load|capacity|venue/)) return "Venue-wide concourse load is at 58% and trending up 3%/10min. Two venues in the network are at 'moderate', one at 'congested' — see the live scoreboard above.";
    if(t.match(/staff|volunteer/)) return "Staffing is at 92% of planned coverage. The gap is concentrated at Gate H — recommend a 15-minute radio call for reinforcement.";
    if(t.match(/forecast|predict/)) return "Forecast shows a secondary arrival wave 40 minutes before kickoff, driven by two shuttle lines arriving simultaneously. Recommend opening Gate G early.";
    return "As an organizer, ask me about venue-wide load, staffing gaps, or arrival forecasts — I read across every gate in real time.";
  }
  // fan
  if(t.match(/restroom|bathroom|toilet/)) return answerWayfinding("restroom");
  if(t.match(/first aid|medical|hurt/)) return answerWayfinding("first aid");
  if(t.match(/food|eat|drink|hungry/)) return answerWayfinding("food");
  if(t.match(/quiet|less busy|shortest/)) return answerWayfinding("quietest gate right now");
  if(t.match(/parking|car/)) return answerWayfinding("parking");
  if(t.match(/language|translat/)) return "I can respond in Spanish, French, Portuguese, Arabic, Japanese, and German — try the Lingo section below, or just ask me in your language.";
  if(t.match(/accessib|wheelchair|stroller/)) return "Head to the Access & Transit section below — tell me your needs and I'll build a step-free route with the nearest supported gate.";
  if(t.match(/score|match|semi|final|argentina|england|spain|france/)) return "Spain beat France 2-0 and are through to Sunday's Final at MetLife Stadium. England and Argentina are live now in Atlanta for the second semifinal spot — check the Match Center below for the live score.";
  if(t.match(/ticket|price|buy/)) return "Ticket prices move with demand. Head to the Ticketing section below, pick your match and tier, and I'll pull the current live price and remaining inventory.";
  if(t.match(/hi|hello|hey/)) return greetingFor("fan");
  return "Here's what I found: check the live gate map above for real-time queue status, or ask me something specific — restrooms, food, transit, or accessibility.";
}

document.getElementById("assistantForm").addEventListener("submit", e=>{
  e.preventDefault();
  const input = document.getElementById("assistantInput");
  const q = input.value.trim();
  if(!q) return;
  pushMessage("user", q);
  input.value = "";
  const typing = document.createElement("div");
  typing.className = "msg msg-bot";
  typing.textContent = "…";
  assistantMessages.appendChild(typing);
  assistantMessages.scrollTop = assistantMessages.scrollHeight;
  setTimeout(()=>{
    typing.remove();
    pushMessage("bot", assistantReply(q, currentPersona));
  }, 600);
});

/* ---------- MATCH CENTER ---------- */
// Knockout-stage results reflect the real FIFA World Cup 2026 schedule.
// The England–Argentina semifinal is presented as a live, ticking simulation
// standing in for a real-time scores feed (e.g. a sports-data API call).
const MATCHES = [
  {round:"Semifinal · Dallas Stadium · Jul 14", home:"France", away:"Spain", homeScore:0, awayScore:2, status:"ft"},
  {round:"Semifinal · Atlanta Stadium · Jul 15–16", home:"England", away:"Argentina", homeScore:0, awayScore:0, status:"live", minute:41},
  {round:"Bronze Final · Miami Stadium · Jul 18, 9:00 PM ET", home:"France", away:"Runner-up ENG/ARG", status:"upcoming"},
  {round:"Final · MetLife Stadium · Jul 19, 3:00 PM ET", home:"Spain", away:"Winner ENG/ARG", status:"upcoming"},
];

function renderMatchList(){
  const el = document.getElementById("matchList");
  if(!el) return;
  el.innerHTML = MATCHES.map(m=>{
    let scoreHtml, statusHtml;
    if(m.status === "ft"){
      scoreHtml = `<span class="match-score">${m.homeScore} – ${m.awayScore}</span>`;
      statusHtml = `<span class="match-status status-ft">Full time</span>`;
    } else if(m.status === "live"){
      scoreHtml = `<span class="match-score">${m.homeScore} – ${m.awayScore}</span>`;
      statusHtml = `<span class="match-status status-live">Live · ${m.minute}'</span>`;
    } else {
      scoreHtml = `<span class="match-score muted">—</span>`;
      statusHtml = `<span class="match-status status-upcoming">Upcoming</span>`;
    }
    return `<div class="match-row">
      <span class="match-round">${m.round}</span>
      <span class="match-teams">${m.home} <span class="t-vs">vs</span> ${m.away}</span>
      ${scoreHtml}
      ${statusHtml}
    </div>`;
  }).join("");
}
renderMatchList();

// Simulate the live semifinal ticking forward — standing in for a live
// sports-data feed polling every few seconds.
setInterval(()=>{
  const live = MATCHES.find(m=> m.status === "live");
  if(!live) return;
  if(live.minute < 90){
    live.minute += 1;
    if(Math.random() < 0.05){
      if(Math.random() < 0.5) live.homeScore += 1; else live.awayScore += 1;
    }
  }
  renderMatchList();
}, 5000);

/* ---------- FINAL COUNTDOWN ---------- */
function updateCountdown(){
  const target = new Date("2026-07-19T19:00:00Z").getTime(); // 3:00 PM ET
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const set = (id, val)=>{ const n = document.getElementById(id); if(n) n.textContent = String(val).padStart(2,"0"); };
  set("cdDays", days); set("cdHours", hours); set("cdMins", mins); set("cdSecs", secs);
}
updateCountdown();
setInterval(updateCountdown, 1000);

/* ---------- TICKETING ---------- */
// Simulated dynamic-pricing feed — in production this maps to FIFA's live
// ticketing/inventory API rather than a client-side random walk.
const TICKET_BASE = {
  bronze:{category3:145, category2:260, category1:420, hospitality:1350},
  final:{category3:950, category2:1850, category1:3400, hospitality:6730},
};
const TICKET_LABELS = {
  bronze:"Bronze Final — France vs. Runner-up · Miami",
  final:"Final — Spain vs. Winner ENG/ARG · New York/New Jersey",
};
const TIER_LABELS = {
  category3:"Category 3 — upper level", category2:"Category 2 — lower level",
  category1:"Category 1 — sideline", hospitality:"Hospitality suite",
};

document.getElementById("ticketForm").addEventListener("submit", e=>{
  e.preventDefault();
  const match = document.getElementById("ticketMatch").value;
  const tier = document.getElementById("ticketTier").value;
  const out = document.getElementById("ticketResult");
  out.innerHTML = `<p class="eyebrow eyebrow-gold">Live quote</p><p class="muted">Checking current demand…</p>`;
  setTimeout(()=>{
    const base = TICKET_BASE[match][tier];
    const surge = 0.9 + Math.random()*0.35;
    const price = Math.round(base * surge);
    const remaining = Math.round(4 + Math.random()*88);
    const trend = surge > 1.1 ? "rising fast" : surge > 1.0 ? "trending up" : "holding steady";
    out.innerHTML = `
      <p class="eyebrow eyebrow-gold">Live quote · updates continuously</p>
      <p class="muted">${TICKET_LABELS[match]}</p>
      <p class="ticket-price">$${price.toLocaleString()}</p>
      <p class="muted">${TIER_LABELS[tier]} — price is ${trend} with demand.</p>
      <div class="ticket-availability">
        <div class="avail-bar"><div class="avail-fill" style="width:${100-remaining}%"></div></div>
      </div>
      <div class="ticket-meta">
        <span><strong>${remaining}%</strong>inventory remaining</span>
        <span><strong>Dynamic</strong>FIFA pricing model</span>
        <span><strong>Official</strong>channel only</span>
      </div>
    `;
  }, 500);
});

/* ---------- SPLASH INTRO (3s animated logo) ---------- */
(function(){
  const splash = document.getElementById("splash");
  const skipBtn = document.getElementById("splashSkip");
  let dismissed = false;
  function dismiss(){
    if(dismissed) return;
    dismissed = true;
    splash.classList.add("hide");
    document.body.classList.remove("pre-splash");
    setTimeout(()=>{ splash.style.display = "none"; }, 600);
  }
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const autoDelay = reduceMotion ? 300 : 3000;
  setTimeout(dismiss, autoDelay);
  skipBtn.addEventListener("click", dismiss);
  splash.addEventListener("click", (e)=>{ if(e.target === splash) dismiss(); });
})();

/* ---------- SECTION QUICK-JUMP SCROLLSPY ---------- */
(function(){
  const dots = document.querySelectorAll("#sectionDots button");
  if(!dots.length || !("IntersectionObserver" in window)) return;
  const targets = Array.from(dots).map(d=> document.getElementById(d.dataset.target)).filter(Boolean);
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      const dot = document.querySelector(`#sectionDots button[data-target="${entry.target.id}"]`);
      if(!dot) return;
      if(entry.isIntersecting) dot.classList.add("active");
      else dot.classList.remove("active");
    });
  }, {rootMargin:"-45% 0px -45% 0px", threshold:0});
  targets.forEach(t=> io.observe(t));
})();

/* ---------- IN-PAGE SECTION NAVIGATION ---------- */
// Handles all [data-scroll] buttons (nav, hero CTA, footer, dot-nav) with a
// JS scroll. Plain <a href="#..."> links are avoided here because some
// embedded/sandboxed preview contexts intercept anchor clicks and treat
// them as external-navigation attempts before this script can run.
document.addEventListener("click", (e)=>{
  const trigger = e.target.closest("[data-scroll]");
  if(!trigger) return;
  const id = trigger.dataset.scroll;
  const target = id === "top" ? document.body : document.getElementById(id);
  if(!target) return;
  target.scrollIntoView({behavior:"smooth", block:"start"});
});

/* ---------- MOBILE NAV ---------- */
(function(){
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");
  if(!toggle || !nav) return;
  function closeNav(){
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
  toggle.addEventListener("click", ()=>{
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
  nav.querySelectorAll("button").forEach(b=> b.addEventListener("click", closeNav));
  document.addEventListener("keydown", e=>{ if(e.key === "Escape") closeNav(); });
})();

/* ---------- SCROLL REVEAL ---------- */
(function(){
  const items = document.querySelectorAll(".reveal");
  if(!("IntersectionObserver" in window)){
    items.forEach(el=> el.classList.add("in-view"));
    return;
  }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      }
    });
  }, {threshold:0.15, rootMargin:"0px 0px -60px 0px"});
  items.forEach(el=> io.observe(el));
})();
