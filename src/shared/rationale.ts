// src/shared/rationale.ts: the shape of a Decision Rationale Card on screen (archable plan §1.3, §8.4). Not a
// component. Five sections, always in this order and with these titles, the same as Telegram's
// "ℹ️ View rationale" (governance renderRationale), so the web card reads word for word like the message.
// Empty sections are hidden. Sources are for Developer Mode only; Owner Mode never shows them.
import type { RationaleCard, RationaleFact } from "@/contracts";

export type RationaleSectionKey = "trigger" | "impact" | "risk" | "action" | "verification";

export const RATIONALE_SECTIONS: readonly { key: RationaleSectionKey; title: string }[] = [
  { key: "trigger", title: "What happened" },
  { key: "impact", title: "What it costs" },
  { key: "risk", title: "What limits the risk" },
  { key: "action", title: "What changes" },
  { key: "verification", title: "How it was checked" },
];

/** The non-empty sections, in order, with their facts. */
export function rationaleSections(card: RationaleCard): { key: RationaleSectionKey; title: string; facts: RationaleFact[] }[] {
  return RATIONALE_SECTIONS.map((s) => ({ ...s, facts: card[s.key] })).filter((s) => s.facts.length > 0);
}

/** The card as Telegram sends it: title, then "· sentence" lines; sections separated by a blank line. */
export function rationaleText(card: RationaleCard): string {
  return rationaleSections(card).map((s) => `${s.title}\n${s.facts.map((f) => `· ${f.text}`).join("\n")}`).join("\n\n");
}
