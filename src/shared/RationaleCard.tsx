import { useState } from "react";
import type { RationaleCard as Card, RationaleFact } from "@/contracts";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { rationaleSections } from "./rationale";

function Source({ fact }: { fact: RationaleFact }) {
  const [hovered, setHovered] = useState(false);
  const [opened, setOpened] = useState(false);
  return (
    <Popover open={hovered || opened} onOpenChange={setOpened}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Source"
          onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
          className="ml-1 inline-flex size-6 align-middle text-muted-foreground">ⓘ</Button>
      </PopoverTrigger>
      <PopoverContent onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        className="max-w-[calc(100vw-32px)] break-words p-3 text-xs [overflow-wrap:anywhere]">
        {fact.source}
      </PopoverContent>
    </Popover>
  );
}

export function RationaleCard({ card, mode }: { card: Card; mode: "owner" | "developer" }) {
  return (
    <div className="min-w-0 space-y-6 text-sm">
      {rationaleSections(card).map((section) => (
        <section key={section.key} className="min-w-0">
          <h3 className="mb-2 text-sm font-medium">{section.title}</h3>
          <ul className="space-y-2">
            {section.facts.map((fact, index) => (
              <li key={index} className="break-words leading-relaxed [overflow-wrap:anywhere]">
                {fact.text}{mode === "developer" && <Source fact={fact} />}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}