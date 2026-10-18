import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RationaleCard } from "@/shared/RationaleCard";
import { DEMO_CHANGES, type DemoChange } from "@/shared/fixtures/d14";

export function WaitingForYou({ businessId }: { businessId: string }) {
  const [selected, setSelected] = useState<DemoChange | null>(null);
  const changes = DEMO_CHANGES[businessId] ?? [];
  if (changes.length === 0) return null;
  return (
    <>
      <section className="min-w-0 rounded-lg border bg-card p-6" aria-labelledby="waiting-title">
        <h3 id="waiting-title" className="mb-4 text-sm font-medium">Waiting for you</h3>
        <ul className="space-y-4">
          {changes.map((change) => (
            <li key={change.id} className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 break-words text-sm [overflow-wrap:anywhere]">{change.title}</p>
              <Button variant="outline" size="sm" onClick={() => setSelected(change)}>View rationale</Button>
            </li>
          ))}
        </ul>
      </section>
      <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg" aria-describedby={undefined}>
          {selected && <>
            <SheetHeader className="mb-6 pr-6 text-left">
              <SheetTitle className="break-words [overflow-wrap:anywhere]">{selected.title}</SheetTitle>
            </SheetHeader>
            <RationaleCard card={selected.card} mode="owner" />
          </>}
        </SheetContent>
      </Sheet>
    </>
  );
}