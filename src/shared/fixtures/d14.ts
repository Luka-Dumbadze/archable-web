// src/shared/fixtures/d14.ts: the D-14 change rationale (cash on delivery up to 300 GEL), generated with archable's
// packages/governance rationale.ts (plan §7.5) from the plan §9.3 D-14 inputs. Generated, do not edit by hand.
// D14_TELEGRAM_TEXT is renderRationale(D14_CARD): what Telegram's "ℹ️ View rationale" sends (plan §1.3).
import type { RationaleCard } from "@/contracts";

export const D14_CARD: RationaleCard = {
  "version": 1,
  "subject": {
    "kind": "change",
    "change_request_id": "cccccccc-0000-0000-0000-000000000058",
    "desire": "D-14",
    "head_sha": "4be1c2d"
  },
  "trigger": [
    {
      "text": "You asked for this on 17 Oct: “customers keep asking to pay the courier in cash, allow it up to 300 lari”",
      "source": "desire D-14, owner message"
    },
    {
      "text": "3 customer chats from 3 customers between 15 Oct and 17 Oct were about this.",
      "source": "desire_chapters: linked by Jev, unlinkable by owner or developer"
    }
  ],
  "impact": [
    {
      "text": "2 of 2 customers who got a price did not order: 140 GEL in baskets.",
      "source": "chapters.last_quote_total, no order 2 h after the quote"
    },
    {
      "text": "That is what those customers were quoted, not a forecast.",
      "source": "rendering rule"
    },
    {
      "text": "1 of the chats never reached a price, so it adds nothing to that figure.",
      "source": "chapters without a quote"
    }
  ],
  "risk": [
    {
      "text": "The order total can't exceed 300 GEL when payment method is cash on delivery.",
      "source": "policy payment.cod_limit"
    },
    {
      "text": "It reaches an outside company: payment method → courier booking.",
      "source": "blast radius, rule external, T3"
    },
    {
      "text": "It touches money: payment method → courier payout → payout amount.",
      "source": "blast radius, rule money, T3"
    }
  ],
  "action": [
    {
      "text": "Customers can choose cash on delivery.",
      "source": "typed ChangeSet"
    },
    {
      "text": "Cash on delivery is refused above 300 GEL.",
      "source": "typed ChangeSet"
    },
    {
      "text": "Cellar Master mentions it when asked how to pay.",
      "source": "typed ChangeSet"
    }
  ],
  "verification": [
    {
      "text": "47 of 47 checks passed, 3 of them new.",
      "source": "archable/verify on this version"
    },
    {
      "text": "What outside agents can call is unchanged.",
      "source": "Elva contract drift"
    }
  ],
  "computed_at": "2026-10-17T15:00:00Z"
};

export const D14_TELEGRAM_TEXT = "What happened\n· You asked for this on 17 Oct: “customers keep asking to pay the courier in cash, allow it up to 300 lari”\n· 3 customer chats from 3 customers between 15 Oct and 17 Oct were about this.\n\nWhat it costs\n· 2 of 2 customers who got a price did not order: 140 GEL in baskets.\n· That is what those customers were quoted, not a forecast.\n· 1 of the chats never reached a price, so it adds nothing to that figure.\n\nWhat limits the risk\n· The order total can't exceed 300 GEL when payment method is cash on delivery.\n· It reaches an outside company: payment method → courier booking.\n· It touches money: payment method → courier payout → payout amount.\n\nWhat changes\n· Customers can choose cash on delivery.\n· Cash on delivery is refused above 300 GEL.\n· Cellar Master mentions it when asked how to pay.\n\nHow it was checked\n· 47 of 47 checks passed, 3 of them new.\n· What outside agents can call is unchanged.";

export const D14_DIGEST = "sha256:c5b7409057153236ec0ccc058f53162b4b4901ee0321455ea51da05522c605e7";

/** A change waiting for the owner, for demo mode until GET /v1/owner/changes (P5.D1.5) is live. */
export interface DemoChange { id: string; desire: string; title: string; tier: "T1" | "T2" | "T3" | "T4"; card: RationaleCard }

export const DEMO_CHANGES: Record<string, DemoChange[]> = {
  marani: [{ id: "cccccccc-0000-0000-0000-000000000058", desire: "D-14", title: "Customers can pay cash on delivery up to 300 GEL", tier: "T3", card: D14_CARD }],
};

/** The rationale for a desire in demo mode, if there is one. */
export const demoRationale = (business: string, desire: string): RationaleCard | null =>
  DEMO_CHANGES[business]?.find((c) => c.desire === desire)?.card ?? null;
