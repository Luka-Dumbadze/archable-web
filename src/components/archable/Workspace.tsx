import { useState } from "react";
import { ArrowLeft, ChevronDown, Briefcase, Wrench, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BUSINESSES, type Business } from "@/lib/businesses";
import { OwnerMode } from "./OwnerMode";
import { DevMode } from "./DevMode";

export function Workspace({ business, onSwitch, onBack }: { business: Business; onSwitch: (b: Business) => void; onBack: () => void }) {
  const [mode, setMode] = useState<"owner" | "dev">("owner");
  return (
    <div className="animate-fadeup min-h-screen">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b bg-background/85 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2 font-semibold">
          <Boxes className="size-5 text-primary" /> Archable
        </div>
        <span className="text-muted-foreground">/</span>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-2 py-1 font-medium hover:bg-secondary">
            {business.emoji} {business.name} OS <ChevronDown className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {BUSINESSES.map((b) => (
              <DropdownMenuItem key={b.id} onClick={() => onSwitch(b)}>{b.emoji} {b.name} OS</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="hidden items-center gap-3 font-mono text-xs md:flex">
          <span className="flex items-center gap-1.5 text-success"><span className="size-2 animate-pulse rounded-full bg-success" />Epoch 1 • Active</span>
          <span className="rounded border px-1.5 py-0.5 text-muted-foreground">{business.domain}</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex rounded-lg border bg-secondary p-0.5 text-sm">
            {([["owner", "Owner Mode", Briefcase], ["dev", "Developer Mode", Wrench]] as const).map(([k, l, I]) => (
              <button key={k} onClick={() => setMode(k)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${mode === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <I className="size-4" /> {l}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft /> New Business</Button>
        </div>
      </header>
      <main key={business.id + mode} className="animate-fadeup p-5">
        {mode === "owner" ? <OwnerMode b={business} /> : <DevMode b={business} />}
      </main>
    </div>
  );
}
