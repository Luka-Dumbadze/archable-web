import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Genesis } from "@/components/archable/Genesis";
import { Workspace } from "@/components/archable/Workspace";
import { Toaster } from "@/components/ui/sonner";
import type { Business } from "@/lib/businesses";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Archable — The AI-Native Enterprise Compiler" },
      { name: "description", content: "Prompt an entire living operating system for your business into existence in 60 seconds." },
      { property: "og:title", content: "Archable — The AI-Native Enterprise Compiler" },
      { property: "og:description", content: "Prompt an entire living operating system for your business into existence in 60 seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [biz, setBiz] = useState<Business | null>(null);
  return (
    <>
      {biz ? <Workspace business={biz} onSwitch={setBiz} onBack={() => setBiz(null)} /> : <Genesis onLaunch={setBiz} />}
      <Toaster theme="dark" />
    </>
  );
}
