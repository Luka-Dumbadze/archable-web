import { describe, expect, it } from "vitest";
import { D14_CARD, D14_TELEGRAM_TEXT, demoRationale } from "./fixtures/d14";
import { RATIONALE_SECTIONS, rationaleSections, rationaleText } from "./rationale";

describe("rationale card shape", () => {
  it("renders D-14 exactly as Telegram's View rationale does (plan §1.3)", () => {
    expect(rationaleText(D14_CARD)).toBe(D14_TELEGRAM_TEXT);
  });

  it("has the five fixed titles in order", () => {
    expect(RATIONALE_SECTIONS.map((s) => s.title)).toEqual(["What happened", "What it costs", "What limits the risk", "What changes", "How it was checked"]);
    expect(rationaleSections(D14_CARD).map((s) => [s.title, s.facts.length])).toEqual([
      ["What happened", 2], ["What it costs", 3], ["What limits the risk", 3], ["What changes", 3], ["How it was checked", 2],
    ]);
  });

  it("hides empty sections", () => {
    const card = { ...D14_CARD, impact: [], verification: [] };
    expect(rationaleSections(card).map((s) => s.title)).toEqual(["What happened", "What limits the risk", "What changes"]);
    expect(rationaleText(card)).not.toContain("What it costs");
  });

  it("every D-14 sentence has a source (shown in Developer Mode)", () => {
    for (const s of rationaleSections(D14_CARD)) for (const f of s.facts) expect(f.source.length).toBeGreaterThan(0);
    expect(D14_CARD.risk.map((f) => f.source)).toEqual(["policy payment.cod_limit", "blast radius, rule external, T3", "blast radius, rule money, T3"]);
  });

  it("demo lookup finds D-14 for Marani only", () => {
    expect(demoRationale("marani", "D-14")).toBe(D14_CARD);
    expect(demoRationale("flora", "D-14")).toBeNull();
    expect(demoRationale("marani", "D-07")).toBeNull();
  });
});
