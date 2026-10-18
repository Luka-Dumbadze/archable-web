import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Moon, Sun, UserRound, LayoutGrid, ArrowLeft, Code2, MessageSquare } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BUSINESSES, type Business } from "@/lib/businesses";
import { OwnerMode } from "./OwnerMode";
import { DevMode } from "./DevMode";
import { useShell } from "@/shell/use-shell";
import { AppsDashboard } from "./AppsDashboard";
import { WORKSPACE_APPS, type WorkspaceAppId } from "./workspace-apps";
import { WorkspaceAppViews } from "./WorkspaceAppViews";
import { TryAsCustomer } from "./TryAsCustomer";

function Hint({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent className="bg-popover text-popover-foreground">{label}</TooltipContent></Tooltip>;
}

export function Workspace({ business, mode, view = "apps" }: { business: Business; mode: "owner" | "dev"; view?: string }) {
  const navigate = useNavigate();
  const [light, setLight] = useState(false);
  const [testing, setTesting] = useState(false);
  const { status, manifest, pendingEpoch } = useShell();
  const name = status === "ready" && manifest ? manifest.os_name : business.name;
  const app = WORKSPACE_APPS.find((item) => item.id === view);
  const openApp = (id: WorkspaceAppId) => navigate({ to: "/", search: { biz: business.id, view: id } });
  const appsVisible = mode === "owner" && view === "apps";
  const themeClass = light ? "workspace-light" : "";
  const dockApps = ["contact", "operations", "crm", "team"] as const;
  return <TooltipProvider delayDuration={250}>
    <div className={`workspace-os ${themeClass} min-h-screen bg-background text-foreground`}>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-4 sm:px-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-auto min-h-11 min-w-0 flex-1 justify-start gap-2 whitespace-normal rounded-xl px-0 text-left">
              <span className="min-w-0 break-words text-sm font-semibold [overflow-wrap:anywhere] sm:text-base">{name}<span className="ml-1.5 font-normal text-muted-foreground">OS</span></span><ChevronDown className="size-3 shrink-0 text-muted-foreground" />
            </Button></DropdownMenuTrigger>
            <DropdownMenuContent>{BUSINESSES.map((b) => <DropdownMenuItem key={b.id} asChild><Link to={mode === "dev" ? "/dev" : "/"} search={{ biz: b.id }}>{b.emoji} {b.name}</Link></DropdownMenuItem>)}</DropdownMenuContent>
          </DropdownMenu>
          {status === "ready" && <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-primary" />Live</span>}
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <Hint label="Try as customer"><Button variant="outline" aria-label="Try as customer" onClick={() => setTesting(true)} className="size-10 rounded-xl p-0 sm:w-auto sm:px-3"><MessageSquare className="size-4" /><span className="hidden sm:inline">Try as customer</span></Button></Hint>
            <Hint label={light ? "Use dark theme" : "Use light theme"}><Button size="icon" variant="ghost" aria-label={light ? "Use dark theme" : "Use light theme"} onClick={() => setLight(!light)} className="size-10 rounded-xl text-muted-foreground">{light ? <Moon /> : <Sun />}</Button></Hint>
            <Hint label="Profile"><Button asChild size="icon" variant="ghost" className="size-9 rounded-full border bg-secondary text-muted-foreground"><Link to="/signin" aria-label="Profile"><UserRound /></Link></Button></Hint>
          </div>
          {pendingEpoch !== null && <p className="w-full text-xs text-muted-foreground">Updated — changes appear when you open the next page</p>}
        </div>
      </header>
      <main key={business.id + mode + view} className="mx-auto min-w-0 max-w-6xl px-5 pb-32 pt-9 md:px-10 md:pt-12 lg:px-16">
        {!appsVisible && <div className="mb-7 flex flex-wrap items-center gap-3"><Button asChild variant="ghost" size="sm" className="rounded-xl text-muted-foreground"><Link to="/" search={{ biz: business.id }}><ArrowLeft />Apps</Link></Button><span className="text-lg font-semibold">{mode === "dev" ? "Developer" : app?.title ?? "Owner"}</span></div>}
        {mode === "dev" ? <DevMode b={business} /> : appsVisible ? <AppsDashboard onOpen={openApp} /> : view === "owner" ? <OwnerMode b={business} /> : view === "contact" || view === "crm" || view === "operations" ? <OwnerMode b={business} view={view} /> : view === "team" || view === "storage" || view === "analytics" ? <WorkspaceAppViews view={view} businessId={business.id} /> : null}
      </main>
      <nav aria-label="Quick launch" className="quick-dock fixed bottom-5 left-1/2 z-40 flex max-w-[calc(100%-16px)] -translate-x-1/2 items-center gap-0.5 rounded-2xl border bg-popover/95 p-1.5 backdrop-blur-xl sm:gap-2 sm:p-2.5">
        <Hint label="Apps"><Button size="icon" variant="ghost" asChild className={`dock-button shrink-0 rounded-xl ${appsVisible ? "bg-secondary" : "text-muted-foreground"}`}><Link to="/" search={{ biz: business.id }} aria-label="All apps"><LayoutGrid /></Link></Button></Hint>
        <Hint label="Try as customer"><Button size="icon" variant="ghost" aria-label="Try as customer" onClick={() => setTesting(true)} className="dock-button shrink-0 rounded-xl text-muted-foreground"><MessageSquare /></Button></Hint>
        {dockApps.map((id) => { const item = WORKSPACE_APPS.find(a => a.id === id); if (!item) return null; const Icon = item.icon; return <Hint key={id} label={item.title}><Button size="icon" variant="ghost" aria-label={`Launch ${item.title}`} onClick={() => openApp(id)} className={`app-badge ${item.tone} dock-button shrink-0 rounded-full ${mode === "owner" && view === id ? "ring-1 ring-foreground/30" : ""}`}><Icon className="size-4 sm:size-5" /></Button></Hint>; })}
        <Hint label="Owner"><Button size="icon" variant="ghost" asChild className={`dock-button shrink-0 rounded-xl ${mode === "owner" && view === "owner" ? "bg-secondary" : "text-muted-foreground"}`}><Link to="/" search={{ biz: business.id, view: "owner" }} aria-label="Owner Mode"><UserRound /></Link></Button></Hint>
        <Hint label="Developer"><Button size="icon" variant="ghost" asChild className={`dock-button shrink-0 rounded-xl ${mode === "dev" ? "bg-secondary" : "text-muted-foreground"}`}><Link to="/dev" search={{ biz: business.id }} aria-label="Developer Mode"><Code2 /></Link></Button></Hint>
      </nav>
      <Dialog open={testing} onOpenChange={setTesting}><DialogContent key={business.id} className={`workspace-os ${themeClass} max-w-[calc(100%-24px)] rounded-2xl border bg-background p-0 text-foreground sm:max-w-xl`} aria-labelledby="try-customer-title" aria-describedby={undefined}><TryAsCustomer className="h-[min(560px,75dvh)] border-0 pr-2" /></DialogContent></Dialog>
    </div>
  </TooltipProvider>;
}
