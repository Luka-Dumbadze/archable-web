import { createFileRoute } from "@tanstack/react-router";
import { OwnerSignIn } from "@/components/archable/OwnerSignIn";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Owner sign-in — Archable" },
      { name: "description", content: "Sign in to Archable Owner Mode with your one-time Telegram link." },
      { property: "og:title", content: "Owner sign-in — Archable" },
      { property: "og:description", content: "Sign in to Archable Owner Mode with your one-time Telegram link." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OwnerSignIn,
});