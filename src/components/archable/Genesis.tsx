import { useEffect, useRef, useState } from "react";
import { Upload, Zap, Terminal, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESSES, inferBusiness, type Business } from "@/lib/businesses";
import { toast } from "sonner";

export function Genesis({ onLaunch }: { onLaunch: (b: Business) => void }) {
  const [prompt, setPrompt] = useState("");
  const [compiling, setCompiling] = useState<Business | null>(null);
  const [step, setStep] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const steps = compiling
    ? ["Analyzing intent via Jev System-1...", "Synthesizing dynamic objects...", "Generating A2A MCP tool contracts...", "Writing enterprise.spec.yaml to GitHub...", `Launching ${compiling.name} OS!`]
    : [];

  useEffect(() => {
    if (!compiling) return;
    if (step >= steps.length) {
      const t = setTimeout(() => onLaunch(compiling), 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 600);
    return () => clearTimeout(t);
  }, [compiling, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const compile = (b: Business, text?: string) => {
    if (text !== undefined) setPrompt(text);
    setStep(0);
    setCompiling(b);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 pt-24 pb-16">
        <span className="animate-fadeup rounded-full border border-primary/40 bg-accent px-3 py-1 font-mono text-xs text-accent-foreground">
          The AI-Native Enterprise Compiler (Lovable for Business)
        </span>
        <h1 className="animate-fadeup mt-6 text-6xl font-semibold tracking-tight md:text-7xl">
          Arch<span className="bg-gradient-primary bg-clip-text text-transparent">able</span>
        </h1>
        <p className="animate-fadeup mt-4 max-w-xl text-center text-lg text-muted-foreground">
          Prompt an entire living operating system for your business into existence in 60 seconds.
        </p>

        <div className="animate-fadeup mt-10 w-full rounded-xl border bg-card p-3 shadow-glow">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!!compiling}
            rows={5}
            placeholder="Describe your business, branches, logistics, and rules... (e.g. A dental clinic with 2 doctors, an omnichannel flower boutique, an electronics chain...)"
            className="w-full resize-none bg-transparent p-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between border-t pt-3">
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { toast.success(`Parsed ${f.name}`, { description: "Extracted catalog & pricing hints." }); setPrompt((p) => p + (p ? "\n" : "") + `[Attached: ${f.name}]`); }
            }} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={!!compiling}>
              <Upload /> Upload Flyer / Price List
            </Button>
            <Button size="sm" disabled={!prompt.trim() || !!compiling} onClick={() => compile(inferBusiness(prompt))} className="bg-gradient-primary">
              <Zap /> Compile Business OS
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {(["marani","flora","smilecare"].map((id) => BUSINESSES.find((x) => x.id === id)!)).map((b) => (
            <button key={b.id} disabled={!!compiling} onClick={() => compile(b, b.prompt)}
              className="rounded-full border bg-secondary px-3 py-1.5 text-sm transition hover:border-primary/60 hover:bg-accent disabled:opacity-50">
              {b.emoji} {b.id === "marani" ? "Wine Boutique" : b.id === "flora" ? "Flower Delivery" : "Dental Clinic"} <span className="text-muted-foreground">({b.name})</span>
            </button>
          ))}
        </div>

        {compiling && (
          <div className="animate-fadeup mt-10 w-full overflow-hidden rounded-xl border bg-sidebar font-mono text-sm">
            <div className="flex items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
              <Terminal className="size-3.5" /> archable compile --target {compiling.domain}
            </div>
            <div className="space-y-2 p-4">
              {steps.map((s, i) => i <= step && (
                <div key={s} className="animate-fadeup flex items-center gap-3">
                  {i < step ? <Check className="size-4 text-success" /> : <Loader2 className="size-4 animate-spin text-primary" />}
                  <span className={i < step ? "text-muted-foreground" : "text-foreground"}>{s}</span>
                </div>
              ))}
            </div>
            <div className="h-1 bg-muted">
              <div className="h-full bg-gradient-primary transition-all duration-500" style={{ width: `${(step / steps.length) * 100}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
