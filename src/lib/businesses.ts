export type Kind = "retail" | "clinic";

export interface Chat { id: string; customer: string; channel: string; last: string; time: string; unread: number; messages: { from: "customer" | "agent"; text: string }[] }
export interface Order { id: string; customer: string; items: string; total: number; status: "Orders" | "In Transit" | "Delivered"; eta: string; courier?: string }
export interface CatalogItem { sku: string; name: string; category: string; price: number; stock: number }
export interface Patient { id: string; name: string; age: number; phone: string; lastVisit: string; doctor: string; status: "Active" | "Follow-up" | "New" }
export interface Appointment { id: string; patient: string; doctor: string; day: number; hour: number; duration: number; type: string }
export interface Treatment { id: string; patient: string; procedure: string; tooth: string; date: string; cost: number; status: "Completed" | "Planned" | "In progress" }
export interface Edge { id: string; from: string; to: string; tool: string; latency: number; input: Record<string, unknown>; output: Record<string, unknown> }
export interface Desire { id: string; title: string; status: string; tier: string; witness: string[]; observation: string; lostRevenue: string; riskCap: string; pr: string }

export interface Business {
  id: string; name: string; emoji: string; kind: Kind; domain: string; tagline: string; currency: string; prompt: string;
  nodes: { id: string; label: string; sub: string }[];
  edges: Edge[];
  desires: Desire[];
  chats?: Chat[]; orders?: Order[]; catalog?: CatalogItem[];
  patients?: Patient[]; appointments?: Appointment[]; treatments?: Treatment[];
}

const retailNodes = (logi: string) => [
  { id: "contact", label: "Contact Center", sub: "omnichannel.agent" },
  { id: "logistics", label: logi, sub: "dispatch.agent" },
  { id: "crm", label: "Customer CRM", sub: "crm.agent" },
];

export const BUSINESSES: Business[] = [
  {
    id: "flora", name: "Flora", emoji: "🌸", kind: "retail", domain: "flora.archable.run", currency: "GEL",
    tagline: "Omnichannel flower boutique • 3 couriers • Tbilisi",
    prompt: "An omnichannel flower boutique in Tbilisi. We take orders via Instagram, WhatsApp and the website, have 3 couriers, same-day delivery before 18:00, and a catalog of bouquets, plants and gift boxes.",
    nodes: retailNodes("Logistics"),
    edges: [
      { id: "e1", from: "contact", to: "logistics", tool: "dispatch.lookup", latency: 18, input: { order_id: "string", district: "string", window: "ISO8601 interval" }, output: { courier_id: "string", eta_minutes: "number", route_load: "0..1" } },
      { id: "e2", from: "contact", to: "crm", tool: "crm.extract", latency: 14, input: { conversation_id: "string", fields: ["name", "phone", "occasion"] }, output: { customer_id: "string", lifetime_value: "number", tags: "string[]" } },
      { id: "e3", from: "logistics", to: "crm", tool: "crm.notify_delivered", latency: 22, input: { customer_id: "string", order_id: "string", photo_url: "url" }, output: { ack: "boolean", followup_scheduled: "ISO8601" } },
    ],
    desires: [{ id: "D-14", title: "Enable Cash on Delivery up to 300 GEL", status: "In Review", tier: "T3", witness: ["contact.inbox", "crm.extract", "checkout.policy", "ledger.cod"], observation: "27 conversations in 14 days ended with “can I pay the courier?” after the payment link was sent.", lostRevenue: "≈ 4,860 GEL / month", riskCap: "permit(action == cod.accept) when { order.total <= 300 && customer.orders >= 1 }", pr: "#218" },
      { id: "D-15", title: "Auto-reassign courier when ETA slips > 25 min", status: "Shadow testing", tier: "T2", witness: ["dispatch.lookup", "courier.gps"], observation: "9 late deliveries on Valentine's peak.", lostRevenue: "≈ 1,200 GEL / month", riskCap: "permit(action == dispatch.reassign) when { delay_min > 25 }", pr: "#221" }],
    chats: [
      { id: "c1", customer: "Nino K.", channel: "Instagram", last: "Can it arrive before 6pm in Vake?", time: "2m", unread: 2, messages: [{ from: "customer", text: "Hi! I want the Peony Cloud bouquet for my mom 💐" }, { from: "agent", text: "Lovely choice! Peony Cloud is 145 GEL. Where should we deliver?" }, { from: "customer", text: "Can it arrive before 6pm in Vake?" }] },
      { id: "c2", customer: "Giorgi B.", channel: "WhatsApp", last: "Add a card: “Happy anniversary”", time: "11m", unread: 1, messages: [{ from: "customer", text: "Order #F-1043 — add a card: “Happy anniversary”" }] },
      { id: "c3", customer: "Ana M.", channel: "Web", last: "Thank you, beautiful flowers!", time: "1h", unread: 0, messages: [{ from: "customer", text: "Thank you, beautiful flowers!" }, { from: "agent", text: "So happy you loved them, Ana! 🌷" }] },
      { id: "c4", customer: "Luka D.", channel: "Instagram", last: "Do you have white orchids?", time: "2h", unread: 0, messages: [{ from: "customer", text: "Do you have white orchids?" }] },
    ],
    orders: [
      { id: "F-1048", customer: "Nino K.", items: "Peony Cloud ×1", total: 145, status: "Orders", eta: "17:30" },
      { id: "F-1047", customer: "Tamar S.", items: "Red Roses 51 ×1", total: 320, status: "Orders", eta: "16:00" },
      { id: "F-1045", customer: "Davit L.", items: "Monstera + Pot", total: 95, status: "In Transit", eta: "14:20", courier: "Levan" },
      { id: "F-1043", customer: "Giorgi B.", items: "Tulip Box ×1", total: 120, status: "In Transit", eta: "15:05", courier: "Saba" },
      { id: "F-1040", customer: "Ana M.", items: "Spring Mix ×2", total: 180, status: "Delivered", eta: "12:10", courier: "Levan" },
      { id: "F-1039", customer: "Mariam G.", items: "Orchid White", total: 110, status: "Delivered", eta: "11:45", courier: "Irakli" },
    ],
    catalog: [
      { sku: "FL-PEO-01", name: "Peony Cloud", category: "Bouquet", price: 145, stock: 12 },
      { sku: "FL-ROS-51", name: "Red Roses 51", category: "Bouquet", price: 320, stock: 6 },
      { sku: "FL-TUL-BX", name: "Tulip Box", category: "Gift box", price: 120, stock: 18 },
      { sku: "PL-MON-01", name: "Monstera Deliciosa", category: "Plant", price: 95, stock: 9 },
      { sku: "PL-ORC-WH", name: "Orchid White", category: "Plant", price: 110, stock: 3 },
    ],
  },
  {
    id: "marani", name: "Marani", emoji: "🍷", kind: "retail", domain: "marani.archable.run", currency: "GEL",
    tagline: "Georgian wine boutique • Qvevri cellar • 2 branches",
    prompt: "A Georgian wine boutique with 2 branches (Old Tbilisi and Saburtalo), a qvevri cellar, tastings on weekends, B2B supply to restaurants, and delivery across Tbilisi. Age verification required.",
    nodes: retailNodes("Cellar & Dispatch"),
    edges: [
      { id: "e1", from: "contact", to: "logistics", tool: "cellar.reserve", latency: 19, input: { sku: "string", qty: "number", branch: "old_tbilisi | saburtalo" }, output: { reservation_id: "string", vintage: "number", expires_at: "ISO8601" } },
      { id: "e2", from: "contact", to: "crm", tool: "crm.verify_age", latency: 31, input: { customer_id: "string", id_document: "image" }, output: { verified: "boolean", dob: "date" } },
      { id: "e3", from: "logistics", to: "crm", tool: "crm.b2b_invoice", latency: 24, input: { account_id: "string", lines: "Line[]" }, output: { invoice_no: "string", due: "date" } },
    ],
    desires: [{ id: "D-07", title: "Bundle tasting tickets with 3+ bottle orders", status: "In Review", tier: "T2", witness: ["catalog.bundle", "events.tickets", "checkout.policy"], observation: "41% of tasting guests buy 3+ bottles within 7 days.", lostRevenue: "≈ 6,300 GEL / month", riskCap: "permit(action == bundle.apply) when { cart.bottles >= 3 }", pr: "#97" }],
    chats: [
      { id: "c1", customer: "Restaurant Barbarestan", channel: "Email", last: "Need 24× Saperavi 2019 for Friday", time: "5m", unread: 1, messages: [{ from: "customer", text: "Need 24× Saperavi 2019 for Friday, standard B2B terms." }] },
      { id: "c2", customer: "Emma W.", channel: "WhatsApp", last: "Is the Saturday tasting in English?", time: "20m", unread: 1, messages: [{ from: "customer", text: "Is the Saturday tasting in English?" }, { from: "agent", text: "Yes! 15:00 at Old Tbilisi, 60 GEL incl. 6 wines." }] },
      { id: "c3", customer: "Irakli T.", channel: "Web", last: "Shipping ID uploaded", time: "1h", unread: 0, messages: [{ from: "customer", text: "Shipping ID uploaded" }] },
    ],
    orders: [
      { id: "M-311", customer: "Barbarestan (B2B)", items: "Saperavi 2019 ×24", total: 1080, status: "Orders", eta: "Fri" },
      { id: "M-309", customer: "Emma W.", items: "Rkatsiteli Qvevri ×3", total: 165, status: "In Transit", eta: "16:40", courier: "Nika" },
      { id: "M-305", customer: "Irakli T.", items: "Kisi Amber ×2", total: 130, status: "Delivered", eta: "Yesterday", courier: "Nika" },
    ],
    catalog: [
      { sku: "WN-SAP-19", name: "Saperavi Reserve 2019", category: "Red", price: 45, stock: 140 },
      { sku: "WN-RKA-QV", name: "Rkatsiteli Qvevri 2021", category: "Amber", price: 55, stock: 62 },
      { sku: "WN-KIS-AM", name: "Kisi Amber 2020", category: "Amber", price: 65, stock: 28 },
      { sku: "WN-MTS-22", name: "Mtsvane 2022", category: "White", price: 38, stock: 90 },
      { sku: "EV-TST-SA", name: "Saturday Tasting", category: "Event", price: 60, stock: 14 },
    ],
  },
  {
    id: "smilecare", name: "SmileCare", emoji: "🦷", kind: "clinic", domain: "smilecare.archable.run", currency: "GEL",
    tagline: "Dental clinic • 2 doctors • 4 chairs",
    prompt: "A dental clinic with 2 doctors (Dr. Beridze — general, Dr. Kapanadze — orthodontics), 4 chairs, open Mon–Sat 9–19. Patients book by phone and Facebook. We need reminders, treatment plans and records.",
    nodes: [
      { id: "contact", label: "Contact Center", sub: "reception.agent" },
      { id: "logistics", label: "Schedule", sub: "calendar.agent" },
      { id: "crm", label: "Patient CRM", sub: "records.agent" },
    ],
    edges: [
      { id: "e1", from: "contact", to: "logistics", tool: "schedule.find_slot", latency: 17, input: { doctor: "string", procedure: "string", preferred: "ISO8601[]" }, output: { slot: "ISO8601", chair: "number" } },
      { id: "e2", from: "contact", to: "crm", tool: "records.lookup", latency: 12, input: { phone: "E.164" }, output: { patient_id: "string", allergies: "string[]", open_plan: "Plan | null" } },
      { id: "e3", from: "logistics", to: "crm", tool: "records.remind", latency: 26, input: { patient_id: "string", appointment_id: "string" }, output: { sent_via: "sms | messenger", confirmed: "boolean" } },
    ],
    desires: [{ id: "D-03", title: "Overbook 1 slot/day for chronic no-show hours", status: "In Review", tier: "T3", witness: ["schedule.history", "records.remind", "policy.overbook"], observation: "Tue/Thu 9:00 slots have a 34% no-show rate over 8 weeks.", lostRevenue: "≈ 3,900 GEL / month", riskCap: "permit(action == schedule.overbook) when { slot.noshow_rate > 0.3 && daily_overbooks < 1 }", pr: "#42" }],
    patients: [
      { id: "P-201", name: "Mariam Gelashvili", age: 34, phone: "+995 555 12 34 56", lastVisit: "Oct 12", doctor: "Dr. Beridze", status: "Follow-up" },
      { id: "P-198", name: "Davit Lomidze", age: 16, phone: "+995 599 22 11 00", lastVisit: "Oct 10", doctor: "Dr. Kapanadze", status: "Active" },
      { id: "P-210", name: "Sophie Chen", age: 29, phone: "+995 577 45 67 89", lastVisit: "—", doctor: "Dr. Beridze", status: "New" },
      { id: "P-176", name: "Giorgi Abashidze", age: 52, phone: "+995 551 98 76 54", lastVisit: "Sep 28", doctor: "Dr. Beridze", status: "Active" },
      { id: "P-189", name: "Elene Tsiklauri", age: 22, phone: "+995 593 33 44 55", lastVisit: "Oct 03", doctor: "Dr. Kapanadze", status: "Active" },
    ],
    appointments: [
      { id: "A1", patient: "Mariam G.", doctor: "Beridze", day: 0, hour: 9, duration: 1, type: "Filling" },
      { id: "A2", patient: "Davit L.", doctor: "Kapanadze", day: 0, hour: 11, duration: 1, type: "Braces adj." },
      { id: "A3", patient: "Sophie C.", doctor: "Beridze", day: 1, hour: 10, duration: 1, type: "Consult" },
      { id: "A4", patient: "Giorgi A.", doctor: "Beridze", day: 2, hour: 13, duration: 2, type: "Root canal" },
      { id: "A5", patient: "Elene T.", doctor: "Kapanadze", day: 3, hour: 15, duration: 1, type: "Aligners" },
      { id: "A6", patient: "Nika P.", doctor: "Beridze", day: 4, hour: 9, duration: 1, type: "Cleaning" },
      { id: "A7", patient: "Tamar S.", doctor: "Kapanadze", day: 4, hour: 12, duration: 1, type: "Consult" },
    ],
    treatments: [
      { id: "T-88", patient: "Giorgi Abashidze", procedure: "Root canal", tooth: "#36", date: "Oct 19", cost: 450, status: "Planned" },
      { id: "T-87", patient: "Davit Lomidze", procedure: "Orthodontic braces", tooth: "Full arch", date: "Jun 02", cost: 3200, status: "In progress" },
      { id: "T-85", patient: "Mariam Gelashvili", procedure: "Composite filling", tooth: "#14", date: "Oct 12", cost: 120, status: "Completed" },
      { id: "T-82", patient: "Elene Tsiklauri", procedure: "Clear aligners", tooth: "Full arch", date: "Aug 15", cost: 4100, status: "In progress" },
    ],
  },
];

export function inferBusiness(prompt: string): Business {
  const p = prompt.toLowerCase();
  if (/(dent|clinic|doctor|patient|medic|salon|appointment)/.test(p)) return BUSINESSES[2];
  if (/(wine|marani|cellar|bar|liquor)/.test(p)) return BUSINESSES[1];
  return BUSINESSES[0];
}
