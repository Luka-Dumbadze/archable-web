import { useState } from "react";
import { Plus, Send, MessageSquare, Truck, Package, Users, CalendarDays, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Business, Order } from "@/lib/businesses";

function Panel({ title, icon: I, children, className = "" }: { title: string; icon: React.ElementType; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col rounded-xl border bg-card ${className}`}>
      <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-medium"><I className="size-4 text-primary" />{title}</div>
      <div className="flex-1 overflow-auto">{children}</div>
    </section>
  );
}

const tone: Record<string, string> = {
  Active: "text-success border-success/40", "Follow-up": "text-warning border-warning/40", New: "text-primary border-primary/40",
  Completed: "text-success border-success/40", Planned: "text-muted-foreground border-border", "In progress": "text-warning border-warning/40",
};
const Pill = ({ s }: { s: string }) => <span className={`rounded border px-1.5 py-0.5 font-mono text-[11px] ${tone[s] ?? ""}`}>{s}</span>;

export function OwnerMode({ b }: { b: Business }) {
  const [open, setOpen] = useState(false);
  const [req, setReq] = useState("");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{b.emoji} {b.name} OS</h2>
          <p className="text-sm text-muted-foreground">{b.tagline}</p>
        </div>
        <Button className="bg-gradient-primary" onClick={() => setOpen(true)}><Plus /> Add New Capability / Request Change</Button>
      </div>
      {b.kind === "retail" ? <Retail b={b} /> : <Clinic b={b} />}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a change to {b.name} OS</DialogTitle>
            <DialogDescription>Describe it in plain words. Archable will open a structured desire for review.</DialogDescription>
          </DialogHeader>
          <textarea rows={4} value={req} onChange={(e) => setReq(e.target.value)} placeholder="e.g. Send a loyalty discount after the 5th order"
            className="w-full rounded-md border bg-input/30 p-3 text-sm outline-none focus:border-primary" />
          <Button disabled={!req.trim()} onClick={() => { toast.success("Desire D-16 created", { description: "Queued for compilation in Epoch 2." }); setReq(""); setOpen(false); }}>Submit request</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Retail({ b }: { b: Business }) {
  const [active, setActive] = useState(b.chats![0]!.id);
  const [chats, setChats] = useState(b.chats!);
  const [draft, setDraft] = useState("");
  const [orders, setOrders] = useState<Order[]>(b.orders!);
  const chat = chats.find((c) => c.id === active)!;
  const cols: Order["status"][] = ["Orders", "In Transit", "Delivered"];
  const advance = (id: string) => setOrders((os) => os.map((o) => o.id !== id ? o : { ...o, status: o.status === "Orders" ? "In Transit" : "Delivered", courier: o.courier ?? "Auto-assigned" }));
  const send = () => {
    if (!draft.trim()) return;
    setChats((cs) => cs.map((c) => c.id === active ? { ...c, messages: [...c.messages, { from: "agent", text: draft }], unread: 0 } : c));
    setDraft("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Panel title="Customer Inbox" icon={MessageSquare} className="h-[460px] lg:col-span-2">
        <div className="grid h-full grid-cols-5">
          <div className="col-span-2 border-r">
            {chats.map((c) => (
              <button key={c.id} onClick={() => { setActive(c.id); setChats((cs) => cs.map((x) => x.id === c.id ? { ...x, unread: 0 } : x)); }}
                className={`block w-full border-b px-3 py-2.5 text-left text-sm ${c.id === active ? "bg-accent" : "hover:bg-secondary"}`}>
                <div className="flex justify-between"><span className="truncate font-medium">{c.customer}</span>{c.unread > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{c.unread}</span>}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{c.channel} · {c.time}</div>
              </button>
            ))}
          </div>
          <div className="col-span-3 flex flex-col">
            <div className="flex-1 space-y-2 overflow-auto p-3">
              {chat.messages.map((m, i) => (
                <div key={i} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.from === "agent" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary"}`}>{m.text}</div>
              ))}
            </div>
            <div className="flex gap-2 border-t p-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Reply…" className="flex-1 rounded-md border bg-input/30 px-2 text-sm outline-none" />
              <Button size="icon" onClick={send}><Send /></Button>
            </div>
          </div>
        </div>
      </Panel>
      <Panel title="Logistics Board" icon={Truck} className="h-[460px] lg:col-span-3">
        <div className="grid h-full grid-cols-3 gap-3 p-3">
          {cols.map((col) => (
            <div key={col} className="rounded-lg bg-secondary/50 p-2">
              <div className="mb-2 flex justify-between px-1 font-mono text-xs text-muted-foreground"><span>{col}</span><span>{orders.filter((o) => o.status === col).length}</span></div>
              <div className="space-y-2">
                {orders.filter((o) => o.status === col).map((o) => (
                  <div key={o.id} className="animate-fadeup rounded-md border bg-card p-2.5 text-sm">
                    <div className="flex justify-between font-mono text-xs"><span className="text-primary">{o.id}</span><span>{o.total} {b.currency}</span></div>
                    <div className="mt-1 font-medium">{o.customer}</div>
                    <div className="text-xs text-muted-foreground">{o.items}</div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{o.courier ? `🛵 ${o.courier}` : "Unassigned"} · {o.eta}</span>
                      {col !== "Delivered" && <button onClick={() => advance(o.id)} className="text-primary hover:underline">Advance →</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Catalog" icon={Package} className="lg:col-span-5">
        <table className="w-full text-sm">
          <thead className="font-mono text-xs text-muted-foreground"><tr className="border-b">{["SKU", "Name", "Category", "Price", "Stock"].map((h) => <th key={h} className="px-4 py-2 text-left font-normal">{h}</th>)}</tr></thead>
          <tbody>{b.catalog!.map((c) => (
            <tr key={c.sku} className="border-b last:border-0 hover:bg-secondary/50">
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{c.sku}</td><td className="px-4 py-2">{c.name}</td><td className="px-4 py-2 text-muted-foreground">{c.category}</td>
              <td className="px-4 py-2">{c.price} {b.currency}</td><td className={`px-4 py-2 font-mono ${c.stock < 5 ? "text-destructive" : ""}`}>{c.stock}</td>
            </tr>))}</tbody>
        </table>
      </Panel>
    </div>
  );
}

function Clinic({ b }: { b: Business }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 9 }, (_, i) => 9 + i);
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Panel title="Patients" icon={Users} className="lg:col-span-2">
        {b.patients!.map((p) => (
          <div key={p.id} className="flex items-center justify-between border-b px-4 py-3 last:border-0 hover:bg-secondary/50">
            <div>
              <div className="text-sm font-medium">{p.name} <span className="text-muted-foreground">· {p.age}</span></div>
              <div className="font-mono text-[11px] text-muted-foreground">{p.id} · {p.doctor} · last {p.lastVisit}</div>
            </div>
            <Pill s={p.status} />
          </div>
        ))}
      </Panel>
      <Panel title="Appointment Calendar · This week" icon={CalendarDays} className="lg:col-span-3">
        <div className="grid grid-cols-[48px_repeat(6,1fr)] text-xs">
          <div />
          {days.map((d) => <div key={d} className="border-b border-l py-2 text-center font-mono text-muted-foreground">{d}</div>)}
          {hours.map((h) => (
            <div key={h} className="contents">
              <div className="h-10 pr-2 text-right font-mono text-muted-foreground">{h}:00</div>
              {days.map((_, d) => {
                const a = b.appointments!.find((x) => x.day === d && x.hour === h);
                return (
                  <div key={d} className="relative h-10 border-b border-l">
                    {a && (
                      <button onClick={() => toast(`${a.patient} — ${a.type}`, { description: `Dr. ${a.doctor} · ${days[d]} ${h}:00` })}
                        className={`absolute inset-x-1 top-1 z-10 rounded border-l-2 px-1.5 py-1 text-left ${a.doctor === "Beridze" ? "border-primary bg-accent" : "border-success bg-success/15"}`}
                        style={{ height: `calc(${a.duration * 2.5}rem - 8px)` }}>
                        <div className="truncate font-medium">{a.patient}</div><div className="truncate text-[10px] text-muted-foreground">{a.type}</div>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Treatment Records" icon={FileText} className="lg:col-span-5">
        <table className="w-full text-sm">
          <thead className="font-mono text-xs text-muted-foreground"><tr className="border-b">{["ID", "Patient", "Procedure", "Tooth", "Date", "Cost", "Status"].map((h) => <th key={h} className="px-4 py-2 text-left font-normal">{h}</th>)}</tr></thead>
          <tbody>{b.treatments!.map((t) => (
            <tr key={t.id} className="border-b last:border-0 hover:bg-secondary/50">
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{t.id}</td><td className="px-4 py-2">{t.patient}</td><td className="px-4 py-2">{t.procedure}</td>
              <td className="px-4 py-2 font-mono text-xs">{t.tooth}</td><td className="px-4 py-2 text-muted-foreground">{t.date}</td><td className="px-4 py-2">{t.cost} {b.currency}</td><td className="px-4 py-2"><Pill s={t.status} /></td>
            </tr>))}</tbody>
        </table>
      </Panel>
    </div>
  );
}
