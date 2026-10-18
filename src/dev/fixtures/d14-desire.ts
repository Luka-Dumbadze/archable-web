// src/dev/fixtures/d14-desire.ts: desire D-14 with its three linked chats, generated with archable's governance
// rationale.ts (plan §7.5) and the counting rules of public.desire_impact() (migration 20261018000000).
// Generated, do not edit by hand. Keys of CARDS/IMPACTS are the linked chats' last letters ("abc", "bc", …, "-").
import type { RationaleCard } from "@/contracts";
import type { DesireImpact, LinkedChat } from "../desires";

export const D14_DESIRE_ID = "dddddddd-0000-0000-0000-000000000014";

export const D14_CHATS: LinkedChat[] = [
  {
    "chapter_id": "c0000000-0000-0000-0000-00000000000a",
    "customer": "Nino K.",
    "opened_at": "2026-10-15T09:00:00Z",
    "last_quote_total": 6000,
    "ordered": false,
    "linked_by": "jev:desire.dedupe",
    "excerpt": "Can I pay the courier in cash? The card link doesn’t work for me."
  },
  {
    "chapter_id": "c0000000-0000-0000-0000-00000000000b",
    "customer": "Giorgi M.",
    "opened_at": "2026-10-16T13:00:00Z",
    "last_quote_total": 8000,
    "ordered": false,
    "linked_by": "jev:desire.dedupe",
    "excerpt": "Two bottles of Saperavi, but only if I can pay cash on delivery."
  },
  {
    "chapter_id": "c0000000-0000-0000-0000-00000000000c",
    "customer": "Ana T.",
    "opened_at": "2026-10-17T12:00:00Z",
    "last_quote_total": null,
    "ordered": false,
    "linked_by": "jev:desire.dedupe",
    "excerpt": "Do you take cash when the courier comes?"
  }
];

export const D14_IMPACTS: Record<string, DesireImpact> = {
  "-": {
    "chapters": 0,
    "customers": 0,
    "quoted": 0,
    "abandoned": 0,
    "abandoned_value": 0,
    "ordered": 0,
    "first_seen": null,
    "last_seen": null
  },
  "a": {
    "chapters": 1,
    "customers": 1,
    "quoted": 1,
    "abandoned": 1,
    "abandoned_value": 6000,
    "ordered": 0,
    "first_seen": "2026-10-15T09:00:00Z",
    "last_seen": "2026-10-15T09:20:00Z"
  },
  "b": {
    "chapters": 1,
    "customers": 1,
    "quoted": 1,
    "abandoned": 1,
    "abandoned_value": 8000,
    "ordered": 0,
    "first_seen": "2026-10-16T13:00:00Z",
    "last_seen": "2026-10-16T13:15:00Z"
  },
  "ab": {
    "chapters": 2,
    "customers": 2,
    "quoted": 2,
    "abandoned": 2,
    "abandoned_value": 14000,
    "ordered": 0,
    "first_seen": "2026-10-15T09:00:00Z",
    "last_seen": "2026-10-16T13:15:00Z"
  },
  "c": {
    "chapters": 1,
    "customers": 1,
    "quoted": 0,
    "abandoned": 0,
    "abandoned_value": 0,
    "ordered": 0,
    "first_seen": "2026-10-17T12:00:00Z",
    "last_seen": "2026-10-17T12:00:00Z"
  },
  "ac": {
    "chapters": 2,
    "customers": 2,
    "quoted": 1,
    "abandoned": 1,
    "abandoned_value": 6000,
    "ordered": 0,
    "first_seen": "2026-10-15T09:00:00Z",
    "last_seen": "2026-10-17T12:00:00Z"
  },
  "bc": {
    "chapters": 2,
    "customers": 2,
    "quoted": 1,
    "abandoned": 1,
    "abandoned_value": 8000,
    "ordered": 0,
    "first_seen": "2026-10-16T13:00:00Z",
    "last_seen": "2026-10-17T12:00:00Z"
  },
  "abc": {
    "chapters": 3,
    "customers": 3,
    "quoted": 2,
    "abandoned": 2,
    "abandoned_value": 14000,
    "ordered": 0,
    "first_seen": "2026-10-15T09:00:00Z",
    "last_seen": "2026-10-17T12:00:00Z"
  }
};

export const D14_CARDS: Record<string, RationaleCard> = {"-":{"version":1,"subject":{"kind":"change","change_request_id":"cccccccc-0000-0000-0000-000000000058","desire":"D-14","head_sha":"4be1c2d"},"trigger":[{"text":"You asked for this on 17 Oct: “customers keep asking to pay the courier in cash, allow it up to 300 lari”","source":"desire D-14, owner message"}],"impact":[{"text":"No sales figure: no linked chat reached a price.","source":"desire_impact"}],"risk":[{"text":"The order total can't exceed 300 GEL when payment method is cash on delivery.","source":"policy payment.cod_limit"},{"text":"It reaches an outside company: payment method → courier booking.","source":"blast radius, rule external, T3"},{"text":"It touches money: payment method → courier payout → payout amount.","source":"blast radius, rule money, T3"}],"action":[{"text":"Customers can choose cash on delivery.","source":"typed ChangeSet"},{"text":"Cash on delivery is refused above 300 GEL.","source":"typed ChangeSet"},{"text":"Cellar Master mentions it when asked how to pay.","source":"typed ChangeSet"}],"verification":[{"text":"47 of 47 checks passed, 3 of them new.","source":"archable/verify on this version"},{"text":"What outside agents can call is unchanged.","source":"Elva contract drift"}],"computed_at":"2026-10-17T15:00:00Z"},"a":{"version":1,"subject":{"kind":"change","change_request_id":"cccccccc-0000-0000-0000-000000000058","desire":"D-14","head_sha":"4be1c2d"},"trigger":[{"text":"You asked for this on 17 Oct: “customers keep asking to pay the courier in cash, allow it up to 300 lari”","source":"desire D-14, owner message"},{"text":"1 customer chats from 1 customers between 15 Oct and 15 Oct were about this.","source":"desire_chapters: linked by Jev, unlinkable by owner or developer"}],"impact":[{"text":"1 of 1 customers who got a price did not order: 60 GEL in baskets.","source":"chapters.last_quote_total, no order 2 h after the quote"},{"text":"That is what those customers were quoted, not a forecast.","source":"rendering rule"}],"risk":[{"text":"The order total can't exceed 300 GEL when payment method is cash on delivery.","source":"policy payment.cod_limit"},{"text":"It reaches an outside company: payment method → courier booking.","source":"blast radius, rule external, T3"},{"text":"It touches money: payment method → courier payout → payout amount.","source":"blast radius, rule money, T3"}],"action":[{"text":"Customers can choose cash on delivery.","source":"typed ChangeSet"},{"text":"Cash on delivery is refused above 300 GEL.","source":"typed ChangeSet"},{"text":"Cellar Master mentions it when asked how to pay.","source":"typed ChangeSet"}],"verification":[{"text":"47 of 47 checks passed, 3 of them new.","source":"archable/verify on this version"},{"text":"What outside agents can call is unchanged.","source":"Elva contract drift"}],"computed_at":"2026-10-17T15:00:00Z"},"b":{"version":1,"subject":{"kind":"change","change_request_id":"cccccccc-0000-0000-0000-000000000058","desire":"D-14","head_sha":"4be1c2d"},"trigger":[{"text":"You asked for this on 17 Oct: “customers keep asking to pay the courier in cash, allow it up to 300 lari”","source":"desire D-14, owner message"},{"text":"1 customer chats from 1 customers between 16 Oct and 16 Oct were about this.","source":"desire_chapters: linked by Jev, unlinkable by owner or developer"}],"impact":[{"text":"1 of 1 customers who got a price did not order: 80 GEL in baskets.","source":"chapters.last_quote_total, no order 2 h after the quote"},{"text":"That is what those customers were quoted, not a forecast.","source":"rendering rule"}],"risk":[{"text":"The order total can't exceed 300 GEL when payment method is cash on delivery.","source":"policy payment.cod_limit"},{"text":"It reaches an outside company: payment method → courier booking.","source":"blast radius, rule external, T3"},{"text":"It touches money: payment method → courier payout → payout amount.","source":"blast radius, rule money, T3"}],"action":[{"text":"Customers can choose cash on delivery.","source":"typed ChangeSet"},{"text":"Cash on delivery is refused above 300 GEL.","source":"typed ChangeSet"},{"text":"Cellar Master mentions it when asked how to pay.","source":"typed ChangeSet"}],"verification":[{"text":"47 of 47 checks passed, 3 of them new.","source":"archable/verify on this version"},{"text":"What outside agents can call is unchanged.","source":"Elva contract drift"}],"computed_at":"2026-10-17T15:00:00Z"},"ab":{"version":1,"subject":{"kind":"change","change_request_id":"cccccccc-0000-0000-0000-000000000058","desire":"D-14","head_sha":"4be1c2d"},"trigger":[{"text":"You asked for this on 17 Oct: “customers keep asking to pay the courier in cash, allow it up to 300 lari”","source":"desire D-14, owner message"},{"text":"2 customer chats from 2 customers between 15 Oct and 16 Oct were about this.","source":"desire_chapters: linked by Jev, unlinkable by owner or developer"}],"impact":[{"text":"2 of 2 customers who got a price did not order: 140 GEL in baskets.","source":"chapters.last_quote_total, no order 2 h after the quote"},{"text":"That is what those customers were quoted, not a forecast.","source":"rendering rule"}],"risk":[{"text":"The order total can't exceed 300 GEL when payment method is cash on delivery.","source":"policy payment.cod_limit"},{"text":"It reaches an outside company: payment method → courier booking.","source":"blast radius, rule external, T3"},{"text":"It touches money: payment method → courier payout → payout amount.","source":"blast radius, rule money, T3"}],"action":[{"text":"Customers can choose cash on delivery.","source":"typed ChangeSet"},{"text":"Cash on delivery is refused above 300 GEL.","source":"typed ChangeSet"},{"text":"Cellar Master mentions it when asked how to pay.","source":"typed ChangeSet"}],"verification":[{"text":"47 of 47 checks passed, 3 of them new.","source":"archable/verify on this version"},{"text":"What outside agents can call is unchanged.","source":"Elva contract drift"}],"computed_at":"2026-10-17T15:00:00Z"},"c":{"version":1,"subject":{"kind":"change","change_request_id":"cccccccc-0000-0000-0000-000000000058","desire":"D-14","head_sha":"4be1c2d"},"trigger":[{"text":"You asked for this on 17 Oct: “customers keep asking to pay the courier in cash, allow it up to 300 lari”","source":"desire D-14, owner message"},{"text":"1 customer chats from 1 customers between 17 Oct and 17 Oct were about this.","source":"desire_chapters: linked by Jev, unlinkable by owner or developer"}],"impact":[{"text":"1 of the chats never reached a price, so it adds nothing to that figure.","source":"chapters without a quote"}],"risk":[{"text":"The order total can't exceed 300 GEL when payment method is cash on delivery.","source":"policy payment.cod_limit"},{"text":"It reaches an outside company: payment method → courier booking.","source":"blast radius, rule external, T3"},{"text":"It touches money: payment method → courier payout → payout amount.","source":"blast radius, rule money, T3"}],"action":[{"text":"Customers can choose cash on delivery.","source":"typed ChangeSet"},{"text":"Cash on delivery is refused above 300 GEL.","source":"typed ChangeSet"},{"text":"Cellar Master mentions it when asked how to pay.","source":"typed ChangeSet"}],"verification":[{"text":"47 of 47 checks passed, 3 of them new.","source":"archable/verify on this version"},{"text":"What outside agents can call is unchanged.","source":"Elva contract drift"}],"computed_at":"2026-10-17T15:00:00Z"},"ac":{"version":1,"subject":{"kind":"change","change_request_id":"cccccccc-0000-0000-0000-000000000058","desire":"D-14","head_sha":"4be1c2d"},"trigger":[{"text":"You asked for this on 17 Oct: “customers keep asking to pay the courier in cash, allow it up to 300 lari”","source":"desire D-14, owner message"},{"text":"2 customer chats from 2 customers between 15 Oct and 17 Oct were about this.","source":"desire_chapters: linked by Jev, unlinkable by owner or developer"}],"impact":[{"text":"1 of 1 customers who got a price did not order: 60 GEL in baskets.","source":"chapters.last_quote_total, no order 2 h after the quote"},{"text":"That is what those customers were quoted, not a forecast.","source":"rendering rule"},{"text":"1 of the chats never reached a price, so it adds nothing to that figure.","source":"chapters without a quote"}],"risk":[{"text":"The order total can't exceed 300 GEL when payment method is cash on delivery.","source":"policy payment.cod_limit"},{"text":"It reaches an outside company: payment method → courier booking.","source":"blast radius, rule external, T3"},{"text":"It touches money: payment method → courier payout → payout amount.","source":"blast radius, rule money, T3"}],"action":[{"text":"Customers can choose cash on delivery.","source":"typed ChangeSet"},{"text":"Cash on delivery is refused above 300 GEL.","source":"typed ChangeSet"},{"text":"Cellar Master mentions it when asked how to pay.","source":"typed ChangeSet"}],"verification":[{"text":"47 of 47 checks passed, 3 of them new.","source":"archable/verify on this version"},{"text":"What outside agents can call is unchanged.","source":"Elva contract drift"}],"computed_at":"2026-10-17T15:00:00Z"},"bc":{"version":1,"subject":{"kind":"change","change_request_id":"cccccccc-0000-0000-0000-000000000058","desire":"D-14","head_sha":"4be1c2d"},"trigger":[{"text":"You asked for this on 17 Oct: “customers keep asking to pay the courier in cash, allow it up to 300 lari”","source":"desire D-14, owner message"},{"text":"2 customer chats from 2 customers between 16 Oct and 17 Oct were about this.","source":"desire_chapters: linked by Jev, unlinkable by owner or developer"}],"impact":[{"text":"1 of 1 customers who got a price did not order: 80 GEL in baskets.","source":"chapters.last_quote_total, no order 2 h after the quote"},{"text":"That is what those customers were quoted, not a forecast.","source":"rendering rule"},{"text":"1 of the chats never reached a price, so it adds nothing to that figure.","source":"chapters without a quote"}],"risk":[{"text":"The order total can't exceed 300 GEL when payment method is cash on delivery.","source":"policy payment.cod_limit"},{"text":"It reaches an outside company: payment method → courier booking.","source":"blast radius, rule external, T3"},{"text":"It touches money: payment method → courier payout → payout amount.","source":"blast radius, rule money, T3"}],"action":[{"text":"Customers can choose cash on delivery.","source":"typed ChangeSet"},{"text":"Cash on delivery is refused above 300 GEL.","source":"typed ChangeSet"},{"text":"Cellar Master mentions it when asked how to pay.","source":"typed ChangeSet"}],"verification":[{"text":"47 of 47 checks passed, 3 of them new.","source":"archable/verify on this version"},{"text":"What outside agents can call is unchanged.","source":"Elva contract drift"}],"computed_at":"2026-10-17T15:00:00Z"},"abc":{"version":1,"subject":{"kind":"change","change_request_id":"cccccccc-0000-0000-0000-000000000058","desire":"D-14","head_sha":"4be1c2d"},"trigger":[{"text":"You asked for this on 17 Oct: “customers keep asking to pay the courier in cash, allow it up to 300 lari”","source":"desire D-14, owner message"},{"text":"3 customer chats from 3 customers between 15 Oct and 17 Oct were about this.","source":"desire_chapters: linked by Jev, unlinkable by owner or developer"}],"impact":[{"text":"2 of 2 customers who got a price did not order: 140 GEL in baskets.","source":"chapters.last_quote_total, no order 2 h after the quote"},{"text":"That is what those customers were quoted, not a forecast.","source":"rendering rule"},{"text":"1 of the chats never reached a price, so it adds nothing to that figure.","source":"chapters without a quote"}],"risk":[{"text":"The order total can't exceed 300 GEL when payment method is cash on delivery.","source":"policy payment.cod_limit"},{"text":"It reaches an outside company: payment method → courier booking.","source":"blast radius, rule external, T3"},{"text":"It touches money: payment method → courier payout → payout amount.","source":"blast radius, rule money, T3"}],"action":[{"text":"Customers can choose cash on delivery.","source":"typed ChangeSet"},{"text":"Cash on delivery is refused above 300 GEL.","source":"typed ChangeSet"},{"text":"Cellar Master mentions it when asked how to pay.","source":"typed ChangeSet"}],"verification":[{"text":"47 of 47 checks passed, 3 of them new.","source":"archable/verify on this version"},{"text":"What outside agents can call is unchanged.","source":"Elva contract drift"}],"computed_at":"2026-10-17T15:00:00Z"}};

/** The subset key for a set of linked chats: their ids' last characters, in order. */
export const subsetKey = (chats: readonly { chapter_id: string }[]) => chats.map((c) => c.chapter_id.slice(-1)).sort().join("") || "-";
