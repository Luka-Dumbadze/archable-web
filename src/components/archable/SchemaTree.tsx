export function SchemaTree({ label, value, open = false }: { label: string; value: unknown; open?: boolean }) {
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    return <details open={open} className="min-w-0 border-l border-border pl-3">
      <summary className="cursor-pointer break-words py-1 font-mono text-xs text-foreground">{label} <span className="text-muted-foreground">{Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`}</span></summary>
      <div className="space-y-1">{entries.map(([key, child]) => <SchemaTree key={key} label={key} value={child} />)}</div>
    </details>;
  }
  return <div className="py-1 font-mono text-xs [overflow-wrap:anywhere]"><span className="text-muted-foreground">{label}: </span>{JSON.stringify(value) ?? "—"}</div>;
}