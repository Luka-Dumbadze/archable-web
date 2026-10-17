import { z } from "zod";
import { fallback } from "@tanstack/zod-adapter";

export const bizSearch = z.object({
  biz: fallback(z.string(), "").default(""),
});

export const chatSearch = z.object({
  biz: fallback(z.string(), "flora").default("flora"),
  embed: fallback(z.number(), 0).default(0),
});
