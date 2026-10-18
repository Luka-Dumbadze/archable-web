import { useState } from "react";
import { ArrowRight, Send, MessageSquare, Package, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Business, Order } from "@/lib/businesses";

export function BusinessAppViews({ b, view }: { b: Business; view: "contact" | "crm" | "operations" }) {
  return <div className="min-w-0 space-y-6">
    <p className="text-xs text-muted-foreground">Sample data</p>
    {view === "contact" ? <ContactInbox key={b.id} b={b} /> : view === "crm" ? <CustomerTable b={b} /> : <OperationsBoard key={b.id} b={b} />}
  </div>;
}

function ContactInbox({ b }: { b: Business }) {
  const [chats, setChats] = useState(b.chats ?? []);
  const [active, setActive] = useState(b.chats?.[0]?.id);
  const [draft, setDraft] = useState("");
  const chat = chats.find(c => c.id === active);
  const send = () => {
    const text = draft.trim();
    if (!text || !chat) return;
    setChats(cs => cs.map(c => c.id === active ? { ...c, messages: [...c.messages, { from: "agent", text }], last: text, unread: 0 } : c));
    setDraft("");
  };
  return <section aria-label="Inbox" className="grid min-h-[540px] min-w-0 overflow-hidden rounded-lg border bg-card md:h-[600px] md:grid-cols-[260px_minmax(0,1fr)]">
    <aside className="min-w-0 border-b md:overflow-y-auto md:border-b-0 md:border-r">
      <div className="flex items-center justify-between border-b px-5 py-5"><h2 className="text-sm font-semibold">Conversations</h2><span className="font-mono text-xs text-muted-foreground">{chats.length}</span></div>
      <div className="max-h-48 overflow-y-auto md:max-h-none">{chats.map(c => <Button key={c.id} variant="ghost" aria-pressed={active === c.id} onClick={() => { setActive(c.id); setChats(cs => cs.map(x => x.id === c.id ? { ...x, unread: 0 } : x)); }} className={`h-auto w-full justify-start whitespace-normal rounded-none border-b p-5 text-left ${active === c.id ? "bg-secondary" : ""}`}>
        <span className="block min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="break-words text-sm font-medium">{c.customer}</span>{c.unread > 0 && <span className="shrink-0 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{c.unread}</span>}</span><span className="mt-2 block truncate text-xs font-normal text-muted-foreground">{c.last}</span><span className="mt-3 block text-[10px] font-normal text-muted-foreground">{c.channel} · {c.time}</span></span>
      </Button>)}</div>
      {!chats.length && <p className="p-5 text-sm text-muted-foreground">No conversations yet.</p>}
    </aside>
    <div className="flex min-h-[400px] min-w-0 flex-col md:min-h-0">
      {chat ? <>
        <header className="flex items-center gap-3 border-b px-5 py-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium">{chat.customer.slice(0, 1)}</span><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{chat.customer}</h3><p className="mt-1 text-xs text-muted-foreground">{chat.channel}</p></div></header>
        <div role="log" aria-label="Conversation" className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-7">{chat.messages.map((m, i) => <div key={i} className={`w-fit max-w-[90%] whitespace-pre-wrap break-words rounded-xl px-4 py-3 text-sm leading-relaxed [overflow-wrap:anywhere] ${m.from === "agent" ? "ml-auto rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border bg-secondary"}`}>{m.text}</div>)}</div>
        <form className="flex gap-3 border-t p-4" onSubmit={e => { e.preventDefault(); send(); }}><input aria-label="Reply" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Reply…" className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-3 text-sm outline-none focus:border-primary" /><Button type="submit" size="icon" aria-label="Send reply" disabled={!draft.trim()} className="size-11 shrink-0 rounded-xl"><Send className="size-4" /></Button></form>
      </> : <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-muted-foreground"><MessageSquare className="size-7" /><p className="text-sm">No conversation selected.</p></div>}
    </div>
  </section>;
}

function CustomerTable({ b }: { b: Business }) {
  const customers = b.kind === "clinic" ? (b.patients ?? []).map(p => ({ id: p.id, name: p.name, contact: p.phone, detail: p.doctor, history: p.lastVisit, tag: p.status })) : (b.chats ?? []).map(c => ({ id: c.id, name: c.customer, contact: c.channel, detail: c.last, history: c.time, tag: c.customer.includes("Restaurant") ? "Business" : "Customer" }));
  return <section className="min-w-0 overflow-hidden rounded-lg border bg-card">
    <div className="flex items-center justify-between px-6 py-5"><h2 className="text-sm font-semibold">{b.kind === "clinic" ? "Patients" : "Customers"}</h2><span className="text-xs text-muted-foreground">{customers.length} records</span></div>
    <table className="app-data-table w-full table-fixed text-left text-sm"><thead><tr className="text-xs text-muted-foreground"><th className="w-[28%] px-6 py-4 font-normal">Name</th><th className="w-[40%] px-6 py-4 font-normal">{b.kind === "clinic" ? "Contact / doctor" : "Channel / latest message"}</th><th className="px-6 py-4 font-normal">Latest</th><th className="px-6 py-4 font-normal">Tags</th></tr></thead><tbody>{customers.map(c => <tr key={c.id} className="hover:bg-secondary/50"><td data-label="Name" className="px-6 py-6 font-medium">{c.name}</td><td data-label="Contact" className="px-6 py-6"><p className="text-muted-foreground">{c.contact}</p><p className="mt-1 text-xs text-muted-foreground">{c.detail}</p></td><td data-label="Latest" className="px-6 py-6 text-xs text-muted-foreground">{c.history}</td><td data-label="Tags" className="px-6 py-6"><span className="inline-flex rounded-full border bg-secondary px-2.5 py-1 text-[11px]">{c.tag}</span></td></tr>)}</tbody></table>
  </section>;
}

const columns: { status: Order["status"]; label: string; tone: string }[] = [{ status: "Orders", label: "Queued", tone: "text-warning bg-warning/10" }, { status: "In Transit", label: "Assigned", tone: "text-primary-glow bg-primary/15" }, { status: "Delivered", label: "Delivered", tone: "text-success bg-success/10" }];

function OperationsBoard({ b }: { b: Business }) {
  const [orders, setOrders] = useState(b.orders ?? []);
  const advance = (id: string) => setOrders(os => os.map(o => o.id !== id ? o : { ...o, status: o.status === "Orders" ? "In Transit" : "Delivered", courier: o.courier ?? "Auto-assigned" }));
  if (b.kind === "clinic") return <div className="space-y-6"><section className="space-y-4"><h2 className="text-sm font-semibold">Appointments</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{b.appointments?.map(a => <article key={a.id} className="min-w-0 rounded-lg border bg-card p-5"><div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][a.day]} · {a.hour}:00</span><span className="rounded-full bg-success/10 px-2 py-1 text-[10px] text-success">Scheduled</span></div><h3 className="mt-4 break-words font-medium">{a.patient}</h3><p className="mt-1 text-sm text-muted-foreground">{a.type}</p><p className="mt-4 text-xs text-muted-foreground">Dr. {a.doctor}</p></article>)}</div></section><section className="min-w-0 rounded-lg border bg-card"><h2 className="px-6 py-5 text-sm font-semibold">Treatments</h2><table className="app-data-table w-full table-fixed text-left text-sm"><thead><tr className="text-xs text-muted-foreground">{["Patient", "Procedure", "Cost", "Status"].map(h => <th key={h} className="px-6 py-4 font-normal">{h}</th>)}</tr></thead><tbody>{b.treatments?.map(t => <tr key={t.id} className="hover:bg-secondary/50"><td data-label="Patient" className="px-6 py-5">{t.patient}</td><td data-label="Procedure" className="px-6 py-5"><p>{t.procedure}</p><p className="mt-1 text-xs text-muted-foreground">{t.tooth} · {t.date}</p></td><td data-label="Cost" className="px-6 py-5 font-mono text-xs">{t.cost} ₾</td><td data-label="Status" className="px-6 py-5"><span className="rounded-full border px-2 py-1 text-[11px]">{t.status}</span></td></tr>)}</tbody></table></section></div>;
  return <div className="space-y-8"><section aria-label="Deliveries" className="grid min-w-0 gap-5 lg:grid-cols-3">{columns.map(col => <div key={col.status} className="min-w-0 rounded-lg border bg-card p-4"><header className="mb-5 flex items-center justify-between"><h2 className={`rounded-full px-3 py-1.5 text-xs font-medium ${col.tone}`}>{col.label}</h2><span className="font-mono text-xs text-muted-foreground">{orders.filter(o => o.status === col.status).length}</span></header><div className="space-y-3">{orders.filter(o => o.status === col.status).map(o => <article key={o.id} aria-label={`Order ${o.id}`} className="min-w-0 rounded-lg border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-[11px] text-muted-foreground">{o.id}</span><span className="font-mono text-xs">{o.total} ₾</span></div><h3 className="mt-4 break-words text-sm font-medium">{o.customer}</h3><p className="mt-2 break-words text-xs text-muted-foreground">{o.items}</p><div className="mt-5 flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Clock className="size-3" />{o.courier ?? "Unassigned"} · {o.eta}</span>{col.status !== "Delivered" && <Button size="icon" variant="ghost" aria-label={`Advance ${o.id}`} title="Move to next status" className="size-7 rounded-lg" onClick={() => advance(o.id)}><ArrowRight className="size-3.5" /></Button>}</div></article>)}</div></div>)}</section>
    <section className="min-w-0 overflow-hidden rounded-lg border bg-card"><h2 className="flex items-center gap-2 px-6 py-5 text-sm font-semibold"><Package className="size-4 text-muted-foreground" />Catalog</h2><table className="app-data-table w-full table-fixed text-left text-sm"><thead><tr className="text-xs text-muted-foreground">{["Product", "Category", "Price", "Stock"].map(h => <th key={h} className="px-6 py-4 font-normal">{h}</th>)}</tr></thead><tbody>{b.catalog?.map(c => <tr key={c.sku} className="hover:bg-secondary/50"><td data-label="Product" className="px-6 py-5"><p>{c.name}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{c.sku}</p></td><td data-label="Category" className="px-6 py-5 text-xs text-muted-foreground">{c.category}</td><td data-label="Price" className="px-6 py-5 font-mono text-xs">{c.price} ₾</td><td data-label="Stock" className={`px-6 py-5 font-mono text-xs ${c.stock < 5 ? "text-destructive" : "text-muted-foreground"}`}>{c.stock}</td></tr>)}</tbody></table></section>
  </div>;
}