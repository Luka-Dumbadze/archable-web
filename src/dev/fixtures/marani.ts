// src/dev/fixtures/marani.ts: Marani OS as compiled by archable packages/compiler from fixtures/marani
// (bundle sha256:6a157ec666d3ec18c819fab0be2240df659d5cb574ae8282c557d4a9f4a85a78). Generated, do not edit by hand: the graph and contracts are the compiler's output
// (plan §1.2: 4 nodes, 6 edges); the stats and calls below are illustrative, for demo mode and tests.
import type { A2AGraph, EdgeCall, EdgeDetail, JsonSchema } from "@/contracts";

export const MARANI_DIGEST = "sha256:6a157ec666d3ec18c819fab0be2240df659d5cb574ae8282c557d4a9f4a85a78";
export const MARANI_GIT_SHA = "4b1d2c9";

export const MARANI_A2A: A2AGraph = {
  "nodes": [
    {
      "id": "app:contact_center",
      "kind": "app",
      "title": "Contact Center",
      "template": "tpl.contact_center@3",
      "agent": "cellar_master",
      "tools": [
        "catalog.search",
        "customer.notify",
        "handoff.staff",
        "order.create",
        "order.quote"
      ]
    },
    {
      "id": "app:customer_center",
      "kind": "app",
      "title": "Customer Center",
      "template": "tpl.crm@2",
      "tools": [
        "customer.upsert"
      ]
    },
    {
      "id": "app:quickshipper",
      "kind": "app",
      "title": "Quickshipper",
      "template": "tpl.dispatch@2",
      "agent": "dispatch_node",
      "tools": [
        "delivery.dispatch",
        "delivery.status",
        "delivery.update",
        "payout.compute"
      ]
    },
    {
      "id": "conn:courier_api",
      "kind": "external",
      "title": "courier_api",
      "tools": []
    }
  ],
  "edges": [
    {
      "id": "connection:app:quickshipper->conn:courier_api:delivery.dispatch",
      "kind": "connection",
      "from": "app:quickshipper",
      "to": "conn:courier_api",
      "via": "delivery.dispatch",
      "label": "MCP: delivery.dispatch",
      "transport": "mcp",
      "effect": "external"
    },
    {
      "id": "event:app:contact_center->app:quickshipper:dispatch_on_confirm",
      "kind": "event",
      "from": "app:contact_center",
      "to": "app:quickshipper",
      "via": "dispatch_on_confirm",
      "label": "A2A event: order.status → confirmed",
      "transport": "in_process",
      "effect": "external"
    },
    {
      "id": "event:app:quickshipper->app:contact_center:notify_on_job_status",
      "kind": "event",
      "from": "app:quickshipper",
      "to": "app:contact_center",
      "via": "notify_on_job_status",
      "label": "A2A event: delivery_job.status → picked_up|delivered|failed",
      "transport": "in_process",
      "effect": "external"
    },
    {
      "id": "tool:app:contact_center->app:customer_center:customer.upsert",
      "kind": "tool",
      "from": "app:contact_center",
      "to": "app:customer_center",
      "via": "customer.upsert",
      "label": "A2A tool: customer.upsert",
      "transport": "in_process",
      "effect": "internal"
    },
    {
      "id": "tool:app:contact_center->app:quickshipper:delivery.status",
      "kind": "tool",
      "from": "app:contact_center",
      "to": "app:quickshipper",
      "via": "delivery.status",
      "label": "A2A tool: delivery.status",
      "transport": "in_process",
      "effect": "none"
    },
    {
      "id": "tool:app:quickshipper->app:contact_center:handoff.staff",
      "kind": "tool",
      "from": "app:quickshipper",
      "to": "app:contact_center",
      "via": "handoff.staff",
      "label": "A2A tool: handoff.staff",
      "transport": "in_process",
      "effect": "notify"
    }
  ]
};

export const MARANI_TOOLS: Record<string, { description: string; input: JsonSchema; output: JsonSchema | null; operation_id: string }> = {
  "customer.upsert": {
    "description": "Create or update a customer by phone number.",
    "input": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "phone": {
          "type": "string",
          "x-archable": {
            "semantics": "phone",
            "pii": true
          }
        },
        "name": {
          "type": "string",
          "maxLength": 120
        },
        "address": {
          "type": "string",
          "x-archable": {
            "pii": true
          }
        },
        "birthdate": {
          "type": "string",
          "format": "date",
          "x-archable": {
            "pii": true
          }
        }
      },
      "required": [
        "phone"
      ]
    },
    "output": null,
    "operation_id": "customer_upsert"
  },
  "handoff.staff": {
    "description": "Hand the conversation to a person and tell the customer when to expect a reply.",
    "input": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "reason": {
          "type": "string"
        },
        "urgency": {
          "type": "string",
          "enum": [
            "normal",
            "urgent"
          ]
        }
      },
      "required": [
        "reason",
        "urgency"
      ]
    },
    "output": null,
    "operation_id": "handoff_staff"
  },
  "delivery.dispatch": {
    "description": "Book a courier for a confirmed order.",
    "input": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "order": {
          "type": "string",
          "x-archable": {
            "ref": {
              "object": "order"
            }
          }
        }
      },
      "required": [
        "order"
      ]
    },
    "output": null,
    "operation_id": "delivery_dispatch"
  },
  "delivery.status": {
    "description": "Where is my order? Needs the order number and the customer's phone.",
    "input": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "order": {
          "type": "string",
          "readOnly": true,
          "x-archable": {
            "generated": "M-{seq:5}"
          }
        },
        "phone": {
          "type": "string",
          "x-archable": {
            "semantics": "phone",
            "pii": true
          }
        }
      },
      "required": [
        "order",
        "phone"
      ]
    },
    "output": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "status": {
          "type": "string",
          "enum": [
            "queued",
            "assigned",
            "picked_up",
            "delivered",
            "failed"
          ]
        },
        "eta": {
          "type": "string",
          "format": "date-time"
        }
      },
      "required": [
        "status"
      ]
    },
    "operation_id": "delivery_status"
  }
};

export const MARANI_AGENTS: Record<string, { app: string }> = {"cellar_master":{"app":"contact_center"},"dispatch_node":{"app":"quickshipper"}};

// Illustrative 24 h numbers per edge (calls, denied, errors, p50, p95).
const STATS: Record<string, [number, number, number, number | null, number | null]> = {
  "tool:app:contact_center->app:quickshipper:delivery.status": [142, 9, 1, 18, 61],
  "tool:app:contact_center->app:customer_center:customer.upsert": [57, 0, 0, 11, 29],
  "tool:app:quickshipper->app:contact_center:handoff.staff": [6, 0, 0, 24, 40],
  "connection:app:quickshipper->conn:courier_api:delivery.dispatch": [31, 2, 3, 240, 910],
  "event:app:contact_center->app:quickshipper:dispatch_on_confirm": [31, 0, 0, null, null],
  "event:app:quickshipper->app:contact_center:notify_on_job_status": [88, 0, 0, null, null],
};

function callerOf(edgeId: string): string {
  const e = MARANI_A2A.edges.find((x) => x.id === edgeId)!;
  if (e.kind === "event") return `trigger:${e.via}`;
  const agent = Object.entries(MARANI_AGENTS).find(([, a]) => `app:${a.app}` === e.from)?.[0];
  return agent ? `agent:${agent}` : e.from;
}

/** EdgeDetail for one edge, shaped like GET /v1/dev/a2a/edges/:id (plan §8.3). */
export function maraniEdgeDetail(edgeId: string, playgroundBase = "https://elva.example/playground/marani"): EdgeDetail | null {
  const edge = MARANI_A2A.edges.find((e) => e.id === edgeId);
  if (!edge) return null;
  const tool = edge.kind === "event" ? null : edge.via;
  const t = tool ? MARANI_TOOLS[tool] : undefined;
  const [calls, denied, errors, p50, p95] = STATS[edgeId] ?? [0, 0, 0, null, null];
  const recent: EdgeCall[] = Array.from({ length: Math.min(calls, 20) }, (_, i) => {
    const deny = i < denied, error = !deny && i < denied + errors;
    return {
      id: 9000 - i, at: new Date(Date.UTC(2026, 9, 18, 9, 0, 0) - i * 7 * 60_000).toISOString(), caller: callerOf(edgeId),
      tool: tool ?? edge.via, decision: deny ? "deny" : "allow", status: deny ? "denied" : error ? "error" : edge.kind === "connection" ? "simulated" : "ok",
      latency_ms: p50 === null ? null : p50 + ((i * 37) % 40), policies: deny ? ["privacy.status_needs_phone"] : [], turn_id: `turn-${1000 + i}`,
    };
  });
  return {
    edge,
    contract: tool && t ? { tool, ...t, git_sha: MARANI_GIT_SHA } : null,
    elva: { playground_url: tool ? `${playgroundBase}/${encodeURIComponent(tool)}` : null, sync: edge.kind === "connection" ? "drift" : tool ? "in_sync" : "unknown" },
    stats: { window: "24h", calls, denied, errors, p50_ms: p50, p95_ms: p95 },
    recent,
  };
}
