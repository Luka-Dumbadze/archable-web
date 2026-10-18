type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: unknown[];
  description?: string;
};

const isSchema = (v: unknown): v is JsonSchema => v !== null && typeof v === "object";

function typeOf(s: JsonSchema): string {
  if (Array.isArray(s.enum) && s.enum.length) return `enum: ${s.enum.map((v) => String(v)).join(" | ")}`;
  if (s.type === "array" && isSchema(s.items)) {
    const inner = s.items.type === "object" ? "object" : (s.items.type ?? "any");
    return `${inner}[]`;
  }
  return s.type ?? "any";
}

function Fields({ schema, open }: { schema: JsonSchema; open: boolean }) {
  const props = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const entries = Object.entries(props);
  if (!entries.length) return <p className="py-1 font-mono text-xs text-muted-foreground">No fields.</p>;
  return (
    <div className="min-w-0 space-y-1">
      {entries.map(([name, child]) => {
        const nested = child.type === "object" || (child.type === "array" && child.items?.type === "object");
        const nestedSchema = child.type === "array" ? (child.items ?? {}) : child;
        if (nested) {
          return (
            <details key={name} open={open} className="min-w-0 border-l border-border pl-3">
              <summary className="cursor-pointer break-words py-1 font-mono text-xs text-foreground">
                {name} <span className="text-muted-foreground">{typeOf(child)}</span>
                {required.has(name) && <span className="ml-2 rounded-full border border-warning/40 px-1 py-px text-[10px] text-warning">required</span>}
              </summary>
              <Fields schema={nestedSchema} open={false} />
            </details>
          );
        }
        return (
          <div key={name} className="flex flex-wrap items-baseline gap-x-2 py-1 font-mono text-xs [overflow-wrap:anywhere]">
            <span>{name}</span>
            <span className="text-muted-foreground">{typeOf(child)}</span>
            {required.has(name) && <span className="rounded-full border border-warning/40 px-1 py-px text-[10px] text-warning">required</span>}
          </div>
        );
      })}
    </div>
  );
}

export function SchemaTree({ label, value, open = false }: { label: string; value: unknown; open?: boolean }) {
  return (
    <section className="min-w-0">
      <h4 className="py-1 font-mono text-xs text-muted-foreground">{label}</h4>
      {isSchema(value) ? <Fields schema={value} open={open} /> : <p className="py-1 font-mono text-xs text-muted-foreground">No fields.</p>}
    </section>
  );
}
