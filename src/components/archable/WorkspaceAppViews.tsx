import { FileSpreadsheet, FileText, TrendingUp, ShoppingBag, Clock, Star } from "lucide-react";
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

export function WorkspaceAppViews({ view }: { view: "storage" | "analytics" }) {
  return <div className="min-w-0 space-y-8">
    <div className="flex items-center justify-between gap-3 border-b pb-4"><span className="text-sm text-muted-foreground">{view === "storage" ? "Business files" : "Overview"}</span>{<span className="font-mono text-[11px] text-muted-foreground">Sample data</span>}</div>
    {view === "storage" ? <div className="grid grid-cols-1 gap-5 md:grid-cols-3">{files.map(({ name, size, type, icon: Icon, tone }) => <article key={name} className="min-w-0 rounded-lg border bg-card p-6"><span className={`app-badge ${tone} mb-7 flex size-12 items-center justify-center rounded-full`}><Icon className="size-6" /></span><h2 className="break-words text-sm font-medium [overflow-wrap:anywhere]">{name}</h2><p className="mt-2 text-xs text-muted-foreground">{type}</p><p className="mt-5 font-mono text-xs text-muted-foreground">{size}</p></article>)}</div> : <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(({ label, value, icon: Icon, tone }) => <article key={label} className="min-w-0 rounded-lg border bg-card p-5"><div className="mb-5 flex items-start justify-between gap-2"><h2 className="text-xs text-muted-foreground">{label}</h2><span className={`app-badge ${tone} flex size-8 shrink-0 items-center justify-center rounded-full`}><Icon className="size-4" /></span></div><p className="font-mono text-2xl font-medium">{value}</p></article>)}</div>
      <section aria-labelledby="daily-sales-title" className="rounded-lg border bg-card p-5 sm:p-6"><div className="mb-8 flex items-center justify-between"><h2 id="daily-sales-title" className="text-sm font-medium">Daily sales</h2><span className="font-mono text-xs text-muted-foreground">GEL · This week</span></div><div className="sales-chart grid h-64 grid-cols-7 items-end gap-3 sm:gap-6" role="img" aria-label={`Daily sales in GEL: ${sales.map(s => `${s.day} ${s.value}`).join(", ")}`}>{sales.map(({ day, value }) => <div key={day} className="flex h-full min-w-0 flex-col justify-end gap-2"><span className="text-center font-mono text-[10px] text-muted-foreground">{value}</span><div className="sales-bar mx-auto w-full max-w-16 rounded-t-sm bg-primary" style={{ height: `${value / 1600 * 78}%` }} /><span className="text-center font-mono text-[11px] text-muted-foreground">{day}</span></div>)}</div></section>
    </>}
  </div>;
}