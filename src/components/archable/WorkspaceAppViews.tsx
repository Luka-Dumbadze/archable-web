import { ArrowRight, Bot, Cloud, FileSpreadsheet, FileText, Code2, TrendingUp, ShoppingBag, Clock, Star } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const activity = [
  { from: "Contact Center Agent", to: "Operations Agent", text: "New order M-001 confirmed", time: "10:42", tone: "app-contact" },
  { from: "Operations Agent", to: "Storage", text: "Stock reserved", time: "10:42", tone: "app-operations" },
  { from: "Cedar", to: "Contact Center Agent", text: "Quote authorized", time: "10:43", tone: "app-team" },
];
const files = [
  { name: "Flyer_October.pdf", size: "1.2 MB", type: "PDF document", icon: FileText, tone: "app-storage" },
  { name: "Wine_Catalog.xlsx", size: "450 KB", type: "Spreadsheet", icon: FileSpreadsheet, tone: "app-analytics" },
  { name: "Price_List_2026.pdf", size: "820 KB", type: "PDF document", icon: FileText, tone: "app-storage" },
];
const metrics = [
  { label: "Today's Revenue", value: "₾1,240", icon: TrendingUp, tone: "app-analytics" },
  { label: "Active Orders", value: "18", icon: ShoppingBag, tone: "app-contact" },
  { label: "Avg Delivery Time", value: "34 min", icon: Clock, tone: "app-crm" },
  { label: "Customer Rating", value: "4.9/5", icon: Star, tone: "app-team" },
];
const sales = [{ day: "Mon", value: 720 }, { day: "Tue", value: 910 }, { day: "Wed", value: 680 }, { day: "Thu", value: 1120 }, { day: "Fri", value: 980 }, { day: "Sat", value: 1460 }, { day: "Sun", value: 1240 }];

export function WorkspaceAppViews({ view, businessId }: { view: "team" | "storage" | "analytics"; businessId: string }) {
  return <div className="min-w-0 space-y-8">
    <div className="flex items-center justify-between gap-3 border-b pb-4"><span className="text-sm text-muted-foreground">{view === "team" ? "Agent activity" : view === "storage" ? "Business files" : "Overview"}</span><span className="font-mono text-[11px] text-muted-foreground">Sample data</span></div>
    {view === "team" ? <>
      <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="app-badge app-team flex size-12 items-center justify-center rounded-full"><Bot className="size-6" /></span><h2 className="text-lg font-semibold">AI Team</h2></div><Button asChild className="h-auto whitespace-normal rounded-xl py-3"><Link to="/dev" search={{ biz: businessId }}><Code2 className="shrink-0" />Open Developer Mode (A2A Map)</Link></Button></div>
      <ol aria-label="Agent activity" className="divide-y divide-border">{activity.map((item, index) => <li key={item.text} className="flex min-w-0 gap-4 py-6"><span className={`app-badge ${item.tone} flex size-9 shrink-0 items-center justify-center rounded-full`}><Bot className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{item.from}</span><ArrowRight className="size-3" /><span>{item.to}</span></div><p className="mt-2 break-words text-sm">{item.text}</p></div><time className="hidden font-mono text-xs text-muted-foreground sm:block">{item.time}<span className="sr-only"> activity {index + 1}</span></time></li>)}</ol>
    </> : view === "storage" ? <div className="grid grid-cols-1 gap-5 md:grid-cols-3">{files.map(({ name, size, type, icon: Icon, tone }) => <article key={name} className="min-w-0 rounded-lg border bg-card p-6"><span className={`app-badge ${tone} mb-7 flex size-12 items-center justify-center rounded-full`}><Icon className="size-6" /></span><h2 className="break-words text-sm font-medium [overflow-wrap:anywhere]">{name}</h2><p className="mt-2 text-xs text-muted-foreground">{type}</p><p className="mt-5 font-mono text-xs text-muted-foreground">{size}</p></article>)}</div> : <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(({ label, value, icon: Icon, tone }) => <article key={label} className="min-w-0 rounded-lg border bg-card p-5"><div className="mb-5 flex items-start justify-between gap-2"><h2 className="text-xs text-muted-foreground">{label}</h2><span className={`app-badge ${tone} flex size-8 shrink-0 items-center justify-center rounded-full`}><Icon className="size-4" /></span></div><p className="font-mono text-2xl font-medium">{value}</p></article>)}</div>
      <section aria-labelledby="daily-sales-title" className="border-t pt-6"><div className="mb-8 flex items-center justify-between"><h2 id="daily-sales-title" className="text-sm font-medium">Daily sales</h2><span className="font-mono text-xs text-muted-foreground">GEL · This week</span></div><div className="sales-chart grid h-64 grid-cols-7 items-end gap-3 sm:gap-6" role="img" aria-label={`Daily sales in GEL: ${sales.map(s => `${s.day} ${s.value}`).join(", ")}`}>{sales.map(({ day, value }) => <div key={day} className="flex h-full min-w-0 flex-col justify-end gap-2"><span className="text-center font-mono text-[10px] text-muted-foreground">{value}</span><div className="sales-bar mx-auto w-full max-w-16 rounded-t-sm bg-primary" style={{ height: `${value / 1600 * 78}%` }} /><span className="text-center font-mono text-[11px] text-muted-foreground">{day}</span></div>)}</div></section>
    </>}
  </div>;
}