import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, Boxes, MessageCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BUSINESSES, type Business } from "@/lib/businesses";
import { OwnerMode } from "./OwnerMode";
import { DevMode } from "./DevMode";
import { useShell } from "@/shell/use-shell";

export function Workspace({ business, mode }: { business: Business; mode: "owner" | "dev" }) {
  const here = mode === "owner" ? "/" : "/dev";
  const { status, manifest, pendingEpoch } = useShell();
  const name = status === "ready" && manifest ? manifest.os_name : business.name;
  return (
    <div className="animate-fadeup min-h-screen">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-4 border-b bg-background/90 px-6 py-3 backdrop-blur">
        <Link to="/" search={{ biz: "" }} className="flex items-center gap-2 font-semibold"><Boxes className="size-5 text-primary" />Archable</Link>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-secondary">
             {business.emoji} <span className="min-w-0 break-words">{name}</span> <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {BUSINESSES.map((b) => (
              <DropdownMenuItem key={b.id} asChild><Link to={here} search={{ biz: b.id }}>{b.emoji} {b.name}</Link></DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="hidden items-center gap-1.5 font-mono text-xs text-muted-foreground md:flex"><span className="size-1.5 animate-pulse rounded-full bg-primary" />Live</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5 text-sm">
            {([["/", "Owner"], ["/dev", "Developer"]] as const).map(([to, l]) => (
              <Link key={to} to={to} search={{ biz: business.id }}
                className={`rounded-md px-3 py-1.5 transition ${here === to ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</Link>
            ))}
          </div>
          <Link to="/chat" search={{ biz: business.id, embed: 0 }} aria-label="Customer chat" className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><MessageCircle className="size-4" /></Link>
          <Link to="/" search={{ biz: "" }} aria-label="New business" className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowLeft className="size-4" /></Link>
        </div>
        {pendingEpoch !== null && <p className="w-full text-xs text-muted-foreground">Updated — changes appear when you open the next page</p>}
      </header>
      <main key={business.id + mode} className="animate-fadeup mx-auto max-w-7xl p-6 md:p-8">
        {mode === "owner" ? <OwnerMode b={business} /> : <DevMode b={business} />}
      </main>
    </div>
  );
}
