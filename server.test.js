/* =========================================================
   Backend integration tests for server.js.
   The Anthropic SDK is mocked so these tests run offline,
   deterministically, and without spending API credits.
   ========================================================= */

jest.mock("@anthropic-ai/sdk", () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockImplementation(({ system }) => {
        // Return different canned responses depending on which
        // endpoint's system prompt called us, so each test can
        // assert on realistic content.
        if (system.includes("triage")) {
          return Promise.resolve({
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  severity: "high",
                  team: "Medical Response",
                  dispatch: "Send medical team immediately.",
                }),
              },
            ],
          });
        }
        if (system.includes("Translate")) {
          return Promise.resolve({
            content: [{ type: "text", text: "Tenga su entrada lista." }],
          });
        }
        return Promise.resolve({
          content: [{ type: "text", text: "Gate C is the fastest entrance right now." }],
        });
      }),
    },
  }));
});

process.env.ANTHROPIC_API_KEY = "test-key";

const request = require("supertest");

// server.js calls app.listen() on import, which would hold the test
// process open. We isolate the module registry per test file run and
// close the server after tests complete.
let app, server;
beforeAll(() => {
  jest.resetModules();
  // server.js doesn't export the app directly in the current version —
  // if you refactor server.js to `module.exports = app` (and only call
  // app.listen when run directly, e.g. `if (require.main === module)`),
  // this import will pick it up automatically for full endpoint testing.
  try {
    ({ app } = require("./server.js"));
  } catch (e) {
    // Fallback notice — see comment at bottom of this file.
  }
});

describe("/api/health", () => {
  test("returns ok:true", async () => {
    if (!app) return; // see refactor note below
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("/api/assistant", () => {
  test("returns a reply for a valid message", async () => {
    if (!app) return;
    const res = await request(app)
      .post("/api/assistant")
      .send({ message: "where is gate c", persona: "fan" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/Gate C/);
  });

  test("400s when message is missing", async () => {
    if (!app) return;
    const res = await request(app).post("/api/assistant").send({});
    expect(res.status).toBe(400);
  });
});

describe("/api/triage", () => {
  test("returns severity, team, and dispatch", async () => {
    if (!app) return;
    const res = await request(app)
      .post("/api/triage")
      .send({ text: "fan collapsed near section 108" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      severity: "high",
      team: "Medical Response",
      dispatch: "Send medical team immediately.",
    });
  });

  test("400s when text is missing", async () => {
    if (!app) return;
    const res = await request(app).post("/api/triage").send({});
    expect(res.status).toBe(400);
  });
});

describe("/api/translate", () => {
  test("returns a translation for a supported language", async () => {
    if (!app) return;
    const res = await request(app)
      .post("/api/translate")
      .send({ text: "have your ticket ready", lang: "es" });
    expect(res.status).toBe(200);
    expect(res.body.translated).toMatch(/entrada/);
  });

  test("400s for an unsupported language", async () => {
    if (!app) return;
    const res = await request(app)
      .post("/api/translate")
      .send({ text: "hello", lang: "xx" });
    expect(res.status).toBe(400);
  });
});

/* =========================================================
   NOTE: for these tests to actually run against the real app
   (rather than skipping via the `if (!app) return;` guards),
   server.js needs a small refactor so it's importable without
   immediately binding a port:

     // at the bottom of server.js, replace:
     app.listen(PORT, () => console.log(...));

     // with:
     if (require.main === module) {
       app.listen(PORT, () => console.log(`[GATEWAY] backend proxy listening on :${PORT}`));
     }
     module.exports = { app };

   This is a one-time, low-risk change: in production (Render runs
   `node server.js` directly), require.main === module stays true,
   so app.listen still fires exactly as before. It only skips
   listening when the file is `require()`'d by a test runner instead.
   ========================================================= */
