// src/dev/demo-desires.ts: the Desires Feed in demo mode (Lovable preview, localhost). Not a component.
// D-14 for Marani with its three linked chats (A: 60 GEL quoted, B: 80 GEL quoted, C: no price). Unlinking
// recomputes impact and card exactly as the server would: both come from the generated fixture (the plan's
// rationale.ts and desire_impact() rules). Unlinks are kept in this browser's localStorage, so a page refresh
// shows the same lower figure, as it would after a real unlink. Storage failures fall back to memory.
import type { DesireView } from "./desires";
import { D14_CARDS, D14_CHATS, D14_DESIRE_ID, D14_IMPACTS, subsetKey } from "./fixtures/d14-desire";

const KEY = (business: string) => `archable.demo.unlinked.${business}`;
const memory = new Map<string, string[]>();

function readUnlinked(business: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(business)) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return memory.get(business) ?? [];
  }
}
function writeUnlinked(business: string, ids: string[]) {
  memory.set(business, ids);
  try { localStorage.setItem(KEY(business), JSON.stringify(ids)); } catch { /* memory only */ }
}

export function demoDesires(business: string): DesireView[] {
  if (business !== "marani") return [];
  const unlinked = new Set(readUnlinked(business));
  const chats = D14_CHATS.filter((c) => !unlinked.has(c.chapter_id));
  const k = subsetKey(chats);
  return [{
    id: D14_DESIRE_ID, number: 14, statement: "Customers can pay cash on delivery up to 300 GEL", status: "Ready for you", tier: 3,
    impact: D14_IMPACTS[k]!, chats, rationale_card: D14_CARDS[k]!,
  }];
}

/** Unlinks one chat; returns the recomputed desire, or null when there's nothing to unlink. */
export function demoUnlink(business: string, desireId: string, chapterId: string): DesireView | null {
  if (business !== "marani" || desireId !== D14_DESIRE_ID || !D14_CHATS.some((c) => c.chapter_id === chapterId)) return null;
  const now = readUnlinked(business);
  if (!now.includes(chapterId)) writeUnlinked(business, [...now, chapterId]);
  return demoDesires(business)[0] ?? null;
}

/** Puts every chat back (a demo convenience; there's no relink in the product). */
export function resetDemoDesires(business: string) {
  writeUnlinked(business, []);
}
