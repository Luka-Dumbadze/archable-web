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
      <section className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-5 py-4" aria-labelledby="waiting-title">
        <h3 id="waiting-title" className="flex items-center gap-3 text-sm font-medium"><span className="size-2 shrink-0 rounded-full bg-primary" />{changes.length} {changes.length === 1 ? "change" : "changes"} ready for review</h3>
        <Button variant="outline" size="sm" onClick={() => setSelected(changes[0] ?? null)}>View rationale</Button>
      </section>
      <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="workspace-os w-full overflow-y-auto sm:max-w-lg" aria-describedby={undefined}>
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