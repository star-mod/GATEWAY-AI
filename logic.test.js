const {
  escapeHtml,
  answerWayfinding,
  classifyIncident,
  translate,
} = require("./logic.js");
describe("escapeHtml", () => {
  test("neutralizes script tags (XSS regression guard)", () => {
    const dirty = "<img src=x onerror=alert(1)>";
    const clean = escapeHtml(dirty);
    expect(clean).not.toContain("<img");
    expect(clean).toBe("&lt;img src=x onerror=alert(1)&gt;");
  });
  test("escapes quotes and ampersands", () => {
    expect(escapeHtml(`O'Brien & "Sons"`)).toBe("O&#39;Brien &amp; &quot;Sons&quot;");
  });
  test("passes through plain text untouched", () => {
    expect(escapeHtml("Gate F queue is long")).toBe("Gate F queue is long");
  });
});
describe("classifyIncident", () => {
  test("routes medical language to Medical Response as high severity", () => {
    const r = classifyIncident("Fan reporting chest pain near Section 108");
    expect(r.severity).toBe("high");
    expect(r.team).toBe("Medical Response");
  });
  test("routes violence language to Security as high severity", () => {
    const r = classifyIncident("Altercation breaking out near Gate G, aggressive fans");
    expect(r.severity).toBe("high");
    expect(r.team).toBe("Security");
  });
  test("routes a missing child report to Guest Services / Security", () => {
    const r = classifyIncident("Lost child near the merchandise stand, 6 years old");
    expect(r.severity).toBe("high");
    expect(r.team).toBe("Guest Services / Security");
  });
  test("routes queue/crowd language to medium severity", () => {
    const r = classifyIncident("Long queue building at Gate F, fans getting frustrated");
    expect(r.severity).toBe("medium");
    expect(r.team).toBe("Crowd Management");
  });
  test("routes facilities language to medium severity", () => {
    const r = classifyIncident("Two food stalls closed, spill near the concourse");
    expect(r.severity).toBe("medium");
    expect(r.team).toBe("Facilities");
  });
  test("defaults unmatched reports to low severity", () => {
    const r = classifyIncident("Fans asking about merch stand hours");
    expect(r.severity).toBe("low");
    expect(r.team).toBe("Concourse Volunteers");
  });
  test("dispatch note mentions immediate response for high severity", () => {
    const r = classifyIncident("Unconscious fan near Gate H");
    expect(r.dispatch).toMatch(/immediate response/i);
  });
  test("handles empty input without throwing", () => {
    expect(() => classifyIncident("")).not.toThrow();
    expect(classifyIncident("").severity).toBe("low");
  });
});
describe("answerWayfinding", () => {
  test("answers restroom queries", () => {
    expect(answerWayfinding("where is the nearest bathroom")).toMatch(/restroom/i);
  });
  test("answers first aid queries", () => {
    expect(answerWayfinding("someone is injured, need medical help")).toMatch(/first aid/i);
  });
  test("answers quietest-gate queries using live gate state", () => {
    const state = { A: { status: "high" }, B: { status: "low" }, C: { status: "mid" } };
    const answer = answerWayfinding("what's the quietest way in", state);
    expect(answer).toMatch(/Gate B/);
  });
  test("falls back to a generic answer for unmatched queries", () => {
    expect(answerWayfinding("what time does the match start")).toMatch(/GATEWAY found/i);
  });
});
describe("translate", () => {
  test("returns a Spanish default phrase for generic text", () => {
    expect(translate("Please have your ticket ready", "es")).toMatch(/entrada e identificación/);
  });
  test("matches restroom phrase bank entry for Spanish", () => {
    expect(translate("Where is the restroom?", "es")).toMatch(/baños/);
  });
  test("falls back gracefully for a language with only a default phrase", () => {
    expect(translate("hello", "fr")).toMatch(/\[FR\]/);
  });
});
