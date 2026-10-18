import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Boxes, Bell, Settings, SunMoon, Info, CreditCard, Scale, UserRound, LayoutGrid, ArrowLeft, Code2, CircleHelp } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BUSINESSES, type Business } from "@/lib/businesses";
import { OwnerMode } from "./OwnerMode";
import { DevMode } from "./DevMode";
import { useShell } from "@/shell/use-shell";
import { AppsDashboard } from "./AppsDashboard";
import { WORKSPACE_APPS, type WorkspaceAppId } from "./workspace-apps";

function Hint({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent className="bg-popover text-popover-foreground">{label}</TooltipContent></Tooltip>;
}

export function Workspace({ business, mode, view = "apps" }: { business: Business; mode: "owner" | "dev"; view?: string }) {
  const navigate = useNavigate();
  const [utility, setUtility] = useState<string | null>(null);
  const { status, manifest, pendingEpoch } = useShell();
  const name = status === "ready" && manifest ? manifest.os_name : business.name;
  const app = WORKSPACE_APPS.find((item) => item.id === view);
  const openApp = (id: WorkspaceAppId) => navigate({ to: "/", search: { biz: business.id, view: id } });
  const appsVisible = mode === "owner" && view === "apps";
  return (
    <TooltipProvider delayDuration={250}>
    <div className="workspace-os min-h-screen bg-background">
      <aside aria-label="System navigation" className="fixed bottom-6 left-4 top-6 z-40 hidden w-[60px] flex-col items-center rounded-2xl border bg-card py-3 md:flex">
        <Hint label="Archable"><Button asChild size="icon" variant="ghost" className="mb-8 size-11 rounded-xl"><Link to="/" search={{ biz: "" }} aria-label="Archable"><Boxes className="size-6 text-foreground" /></Link></Button></Hint>
        <Hint label="Apps"><Button asChild size="icon" variant="ghost" className={`mb-5 size-11 rounded-xl ${appsVisible ? "bg-secondary text-foreground" : "text-muted-foreground"}`}><Link to="/" search={{ biz: business.id }} aria-label="Apps"><LayoutGrid /></Link></Button></Hint>
        <div className="space-y-3">{([{ label: "About", icon: Info }, { label: "Billing", icon: CreditCard }, { label: "Governance", icon: Scale }, { label: "Settings", icon: Settings }]).map(({ label, icon: Icon }) => <Hint key={label} label={label}><Button size="icon" variant="ghost" aria-label={label} onClick={() => setUtility(label)} className="size-11 rounded-xl text-muted-foreground"><Icon /></Button></Hint>)}</div>
        <Hint label="Profile"><Button size="icon" variant="ghost" aria-label="Profile" onClick={() => setUtility("Profile")} className="mt-auto size-10 rounded-full border bg-secondary text-muted-foreground"><UserRound /></Button></Hint>
      </aside>
      <div className="md:ml-[96px]">
      <header className="sticky top-0 z-30 flex min-h-20 flex-wrap items-center gap-2 border-b bg-background/95 px-5 py-4 backdrop-blur md:px-8">
        <Link to="/" search={{ biz: business.id }} aria-label="Apps" className="mr-1 md:hidden"><Boxes className="size-5" /></Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-auto min-h-11 min-w-0 max-w-full flex-1 justify-start gap-2 whitespace-normal rounded-xl px-0 text-left md:flex-none">
             <span className="min-w-0 break-words text-sm font-semibold [overflow-wrap:anywhere] md:text-base">{name}<span className="ml-1.5 font-normal text-muted-foreground">OS</span></span><ChevronDown className="size-3 shrink-0 text-muted-foreground" />
           </Button></DropdownMenuTrigger>
          <DropdownMenuContent>
            {BUSINESSES.map((b) => (
               <DropdownMenuItem key={b.id} asChild><Link to={mode === "dev" ? "/dev" : "/"} search={{ biz: b.id }}>{b.emoji} {b.name}</Link></DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
         {status === "ready" && <span className="ml-3 hidden items-center gap-2 text-xs text-muted-foreground lg:flex"><span className="size-1.5 rounded-full bg-primary" />Live</span>}
         <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
           <Hint label="Appearance"><Button size="icon" variant="ghost" aria-label="Appearance" onClick={() => setUtility("Appearance")} className="hidden size-10 rounded-xl text-muted-foreground sm:inline-flex"><SunMoon /></Button></Hint>
           <Hint label="Settings"><Button size="icon" variant="ghost" aria-label="Workspace settings" onClick={() => setUtility("Settings")} className="size-10 rounded-xl text-muted-foreground"><Settings /></Button></Hint>
           <Hint label="Notifications"><Button size="icon" variant="ghost" aria-label="Notifications" onClick={() => setUtility("Notifications")} className="size-10 rounded-xl text-muted-foreground"><Bell /></Button></Hint>
           <Hint label="Profile"><Button size="icon" variant="ghost" aria-label="Your profile" onClick={() => setUtility("Profile")} className="ml-1 size-9 rounded-full border bg-secondary text-muted-foreground"><UserRound /></Button></Hint>
        </div>
        {pendingEpoch !== null && <p className="w-full text-xs text-muted-foreground">Updated — changes appear when you open the next page</p>}
      </header>
       <main key={business.id + mode + view} className="mx-auto min-w-0 max-w-[1120px] px-5 pb-32 pt-9 md:px-10 md:pt-12 lg:px-16">
         {!appsVisible && <div className="mb-7 flex flex-wrap items-center gap-3"><Button asChild variant="ghost" size="sm" className="rounded-xl text-muted-foreground"><Link to="/" search={{ biz: business.id }}><ArrowLeft />Apps</Link></Button><span className="text-lg font-semibold">{mode === "dev" ? "Developer" : app?.title ?? "Owner"}</span></div>}
         {mode === "dev" ? <DevMode b={business} /> : appsVisible ? <AppsDashboard onOpen={openApp} /> : view === "owner" ? <OwnerMode b={business} /> : view === "contact" || view === "crm" || view === "operations" ? <OwnerMode b={business} view={view} /> : <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center"><CircleHelp className="size-7 text-muted-foreground" /><p className="text-sm text-muted-foreground">{app?.title} isn’t connected yet.</p>{view === "team" && <Button asChild variant="outline"><Link to="/dev" search={{ biz: business.id }}>Open Developer Mode</Link></Button>}</div>}
      </main>
       <nav aria-label="Quick launch" className="quick-dock fixed bottom-5 left-1/2 z-40 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-1 rounded-2xl border bg-popover/95 p-2 backdrop-blur-xl md:left-[calc(50%+48px)] sm:gap-2 sm:p-2.5">
         <Hint label="Apps"><Button size="icon" variant="ghost" asChild className={`size-11 shrink-0 rounded-xl ${appsVisible ? "bg-secondary" : "text-muted-foreground"}`}><Link to="/" search={{ biz: business.id }} aria-label="All apps"><LayoutGrid /></Link></Button></Hint>
         <span className="mx-1 h-7 w-px bg-border" />
         {WORKSPACE_APPS.filter((item) => ["contact", "crm", "operations"].includes(item.id)).map(({ id, title, icon: Icon, tone }) => <Hint key={id} label={title}><Button size="icon" variant="ghost" aria-label={`Launch ${title}`} onClick={() => openApp(id)} className={`app-badge ${tone} size-11 shrink-0 rounded-full ${view === id ? "ring-1 ring-foreground/30" : ""}`}><Icon className="size-5" /></Button></Hint>)}
         <span className="mx-1 h-7 w-px bg-border" />
         <Hint label="Owner"><Button size="icon" variant="ghost" asChild className="size-11 shrink-0 rounded-xl text-muted-foreground"><Link to="/" search={{ biz: business.id, view: "owner" }} aria-label="Owner Mode"><UserRound /></Link></Button></Hint>
         <Hint label="Developer"><Button size="icon" variant="ghost" asChild className="hidden size-11 shrink-0 rounded-xl text-muted-foreground sm:inline-flex"><Link to="/dev" search={{ biz: business.id }} aria-label="Developer Mode"><Code2 /></Link></Button></Hint>
       </nav>
       </div>
       <Dialog open={utility !== null} onOpenChange={(open) => !open && setUtility(null)}><DialogContent className="max-w-[calc(100%-32px)] rounded-2xl sm:max-w-md" aria-describedby={undefined}><DialogHeader><DialogTitle>{utility}</DialogTitle></DialogHeader>
         {utility === "About" ? <div className="space-y-2"><p className="font-medium">{name} OS</p><p className="break-all font-mono text-xs text-muted-foreground">{business.domain}</p><p className="text-sm text-muted-foreground">Archable</p></div> : utility === "Profile" ? <Button asChild><Link to="/signin">Sign in with Telegram</Link></Button> : utility === "Governance" ? <Button asChild variant="outline"><Link to="/" search={{ biz: business.id, view: "owner" }}>Open Owner Mode</Link></Button> : utility === "Settings" ? <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setUtility("Appearance")}><SunMoon />Appearance</Button><Button asChild variant="outline"><Link to="/dev" search={{ biz: business.id }}><Code2 />Developer Mode</Link></Button></div> : <p className="text-sm text-muted-foreground">{utility === "Appearance" ? "Dark" : utility === "Notifications" ? "Notifications aren’t connected yet." : "Billing isn’t connected yet."}</p>}
       </DialogContent></Dialog>
    </div>
     </TooltipProvider>
  );
}
