import { useRef, useState } from "react";
import { FileSpreadsheet, FileText, Image, Upload, TrendingUp, ShoppingBag, Clock, Star, ArrowUpRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const files = [
  { name: "Flyer_October.pdf", size: "1.2 MB", type: "PDF document", date: "12 Oct 2026", icon: FileText, tone: "app-storage" },
  { name: "Wine_Catalog.xlsx", size: "450 KB", type: "Spreadsheet", date: "10 Oct 2026", icon: FileSpreadsheet, tone: "app-analytics" },
  { name: "Price_List_2026.pdf", size: "820 KB", type: "PDF document", date: "08 Oct 2026", icon: FileText, tone: "app-storage" },
];
const metrics = [
  { label: "Today's Revenue", value: "₾1,240", trend: "+14%", icon: TrendingUp, tone: "app-analytics" },
  { label: "Active Orders", value: "18", trend: "+3", icon: ShoppingBag, tone: "app-contact" },
  { label: "Avg Delivery Time", value: "34 min", trend: "−6 min", icon: Clock, tone: "app-crm" },
  { label: "Customer Rating", value: "4.9/5", trend: "+0.2", icon: Star, tone: "app-team" },
];
const sales = [{ day: "Mon", value: 720 }, { day: "Tue", value: 910 }, { day: "Wed", value: 680 }, { day: "Thu", value: 1120 }, { day: "Fri", value: 980 }, { day: "Sat", value: 1460 }, { day: "Sun", value: 1240 }];

export function WorkspaceAppViews({ view }: { view: "storage" | "analytics" }) {
  const picker = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File[]>([]);
  return <div className="min-w-0 space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-5"><div><h2 className="text-sm font-medium">{view === "storage" ? "Business files" : "Performance overview"}</h2><p className="mt-1.5 text-xs text-muted-foreground">Sample data{view === "storage" ? " · Uploads not connected" : " · This week"}</p></div>{view === "storage" && <><input ref={picker} type="file" multiple accept=".pdf,.xlsx,.xls,.csv,image/*" className="hidden" aria-label="Select documents" onChange={e => { setSelected(Array.from(e.target.files ?? [])); e.target.value = ""; }} /><Button variant="outline" onClick={() => picker.current?.click()}><Upload />Upload Document</Button></>}</div>
    {view === "storage" ? <>
      {selected.length > 0 && <section aria-label="Selected documents" className="space-y-3 border-b pb-5"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-medium">Selected locally</h3><p className="mt-1 text-xs text-muted-foreground">Not uploaded or saved</p></div><Button variant="ghost" size="icon" aria-label="Clear selected documents" title="Clear selected documents" onClick={() => setSelected([])}><X /></Button></div>{selected.map((file, index) => <div key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-3 text-sm"><span className={`app-badge ${file.type.startsWith("image/") ? "app-operations" : file.name.endsWith(".pdf") ? "app-storage" : "app-analytics"} flex size-8 shrink-0 items-center justify-center rounded-lg`}>{file.type.startsWith("image/") ? <Image className="size-4" /> : <FileText className="size-4" />}</span><span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{file.name}</span><span className="shrink-0 font-mono text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span></div>)}</section>}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">{files.map(({ name, size, type, date, icon: Icon, tone }) => <article key={name} className="surface-interactive min-w-0 rounded-2xl border bg-card p-6"><div className="mb-7 flex items-center justify-between gap-3"><span className={`app-badge ${tone} flex size-12 items-center justify-center rounded-xl`}><Icon className="size-6" /></span><span className="pill border text-muted-foreground">{name.split(".").pop()?.toUpperCase()}</span></div><h3 className="break-words text-sm font-semibold [overflow-wrap:anywhere]">{name}</h3><p className="mt-2 text-xs text-muted-foreground">{type}</p><div className="mt-7 flex flex-wrap justify-between gap-2 border-t pt-4"><span className="font-mono text-xs text-muted-foreground">{size}</span><time className="text-xs text-muted-foreground">{date}</time></div></article>)}</div>
    </> : <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(({ label, value, trend, icon: Icon, tone }) => <article key={label} className="surface-interactive min-w-0 rounded-2xl border bg-card p-5"><div className="mb-6 flex items-start justify-between gap-2"><h3 className="text-xs leading-relaxed text-muted-foreground">{label}</h3><span className={`app-badge ${tone} flex size-8 shrink-0 items-center justify-center rounded-full`}><Icon className="size-4" /></span></div><p className="font-mono text-3xl font-bold">{value}</p><div className="mt-5 flex flex-wrap items-center gap-2"><span className="pill bg-success/10 text-success"><ArrowUpRight className="size-3" />{trend}</span><span className="text-[10px] text-muted-foreground">vs. last week</span></div></article>)}</div>
      <section aria-labelledby="daily-sales-title" className="border-y py-6 sm:py-8"><div className="mb-8 flex flex-wrap items-center justify-between gap-3"><div><h2 id="daily-sales-title" className="text-base font-semibold">Daily sales</h2><p className="mt-1 text-xs text-muted-foreground">This week</p></div><span className="pill border font-mono text-muted-foreground">GEL</span></div><div className="sales-chart grid h-64 grid-cols-7 items-end gap-3 sm:gap-6" role="img" aria-label={`Daily sales in GEL: ${sales.map(s => `${s.day} ${s.value}`).join(", ")}`}>{sales.map(({ day, value }) => <div key={day} className="flex h-full min-w-0 flex-col justify-end gap-3"><span className="text-center font-mono text-[10px] text-muted-foreground">{value}</span><div className="sales-bar mx-auto w-full max-w-16" style={{ height: `${value / 1600 * 78}%` }} /><span className="text-center font-mono text-[11px] text-muted-foreground">{day}</span></div>)}</div></section>
    </>}
  </div>;
}
