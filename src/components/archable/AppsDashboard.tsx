import { MoreHorizontal, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WORKSPACE_APPS, type WorkspaceAppId } from "./workspace-apps";

export function AppsDashboard({ onOpen }: { onOpen: (app: WorkspaceAppId) => void }) {
  return (
    <section aria-labelledby="apps-title" className="animate-fadeup">
      <div className="mb-8 flex items-center justify-between">
        <h1 id="apps-title" className="text-3xl font-semibold">Apps</h1>
        <span className="font-mono text-xs text-muted-foreground">06 / WORKSPACE</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        {WORKSPACE_APPS.map(({ id, title, icon: Icon, tone, description }) => (
          <article key={id} className="app-tile group relative min-w-0 rounded-2xl border bg-card transition-colors">
            <Button variant="ghost" onClick={() => onOpen(id)} aria-label={`Open ${title}`} className="h-auto min-h-[210px] w-full flex-col items-start justify-start whitespace-normal rounded-2xl p-7 text-left hover:bg-transparent sm:min-h-[224px] sm:p-8">
              <span className={`app-badge ${tone} mb-6 flex size-12 shrink-0 items-center justify-center rounded-full`}><Icon className="size-6" /></span>
              <span className="flex w-full items-center justify-between gap-2 text-lg font-semibold">{title}<ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" /></span>
              <span className="mt-2 max-w-[320px] text-sm font-normal leading-relaxed text-muted-foreground">{description}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label={`${title} options`} className="absolute right-4 top-4 size-10 rounded-xl text-muted-foreground"><MoreHorizontal /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onOpen(id)}>Open {title}</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </article>
        ))}
      </div>
    </section>
  );
}