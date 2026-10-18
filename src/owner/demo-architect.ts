// src/owner/demo-architect.ts: a stand-in Architect for demo mode (Lovable preview, localhost). Not a component.
// It speaks the same OwnerReply data as POST /v1/owner/messages, so the chat runs the plan §8.6 step 5 flow
// without an API: "allow cash on delivery up to 300 lari" → normalized statement with Draft it / Not this →
// a change card with View rationale (the generated D-14 card) and Approve in Telegram. Marani only.
import type { OwnerReply, RationaleCard } from "@/contracts";
import { DEMO_CHANGES } from "@/shared/fixtures/d14";

export const BOT_USERNAME = (import.meta.env["VITE_ARCHABLE_BOT_USERNAME"] as string | undefined) ?? "archable_prod_bot";
const D14 = DEMO_CHANGES["marani"]![0]!;

export function createDemoArchitect(business: string) {
  const open = new Set<string>();
  const statement = "Customers can pay the courier in cash, for orders up to 300 GEL.";
  return {
    async message(text: string): Promise<OwnerReply> {
      if (business === "marani" && /\b(cash|courier|cod)\b/i.test(text)) {
        open.add("draft"); open.add("dismiss");
        return {
          text: `Here's what I understood:\n\n“${statement}”\n\nShall I draft this change?`,
          buttons: [
            { label: "Draft it", action: "post", path: "/v1/owner/desires/d-14/draft", body: { ref: "demo-draft-d14" } },
            { label: "Not this", action: "post", path: "/v1/owner/desires/d-14/dismiss", body: { ref: "demo-dismiss-d14" } },
          ],
        };
      }
      return { text: "In the live app I answer this from your business data. To see a change being drafted, try: “allow cash on delivery up to 300 lari”.", buttons: [] };
    },

    async press(path: string): Promise<OwnerReply | null> {
      const which = path.endsWith("/draft") ? "draft" : path.endsWith("/dismiss") ? "dismiss" : null;
      if (!which || !open.has(which)) return null;                       // one answer per question
      open.clear();
      if (which === "dismiss") return { text: "OK, I've dropped it. Tell me again in other words if I got it wrong.", buttons: [] };
      return {
        text: `Ready for you: ${D14.title}.\n\nYour developer has checked it. Approving happens in Telegram, where you confirm with a code.`,
        buttons: [
          { label: "View rationale", action: "post", path: `/v1/owner/changes/${D14.id}/rationale`, body: {} },
          { label: "Approve in Telegram", action: "url", url: `https://t.me/${BOT_USERNAME}?start=cr_${D14.id.replace(/-/g, "").slice(0, 22)}` },
        ],
      };
    },

    async rationale(changeId: string): Promise<RationaleCard | null> {
      return DEMO_CHANGES[business]?.find((c) => c.id === changeId)?.card ?? null;
    },
  };
}
