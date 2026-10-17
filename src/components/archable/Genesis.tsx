import { useEffect, useRef, useState } from "react";
import { Upload, Zap, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESSES, inferBusiness, type Business } from "@/lib/businesses";
import { toast } from "sonner";

export function Genesis({ onLaunch }: { onLaunch: (b: Business) => void }) {
  const [prompt, setPrompt] = useState("");
  const [compiling, setCompiling] = useState<Business | null>(null);
  const [step, setStep] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const steps = compiling
    ? ["Understanding your business...", "Building your data...", "Connecting your agents...", "Saving your business blueprint...", `Launching ${compiling.name}`]
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
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center px-6 pt-28 pb-16">
      <h1 className="animate-fadeup text-5xl font-semibold tracking-tight">Archable</h1>
      <p className="animate-fadeup mt-3 text-muted-foreground">Describe your business. Get its OS.</p>

      <div className="animate-fadeup mt-10 w-full rounded-xl border bg-card p-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={!!compiling}
          rows={4}
          placeholder="A dental clinic with 2 doctors…"
          className="w-full resize-none bg-transparent p-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between pt-3">
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { toast.success(`Added ${f.name}`); setPrompt((p) => p + (p ? "\n" : "") + `[Attached: ${f.name}]`); }
          }} />
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={!!compiling} aria-label="Upload price list">
            <Upload /> Upload
          </Button>
          <Button size="sm" disabled={!prompt.trim() || !!compiling} onClick={() => compile(inferBusiness(prompt))}>
            <Zap /> Build
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {["marani", "flora", "smilecare"].map((id) => BUSINESSES.find((x) => x.id === id)!).map((b) => (
          <button key={b.id} disabled={!!compiling} onClick={() => compile(b, b.prompt)}
            className="rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground disabled:opacity-50">
            {b.emoji} {b.name}
          </button>
        ))}
      </div>

      {compiling && (
        <div className="animate-fadeup mt-10 w-full space-y-2.5 rounded-xl border bg-card p-6 text-sm">
          {steps.map((s, i) => i <= step && (
            <div key={s} className="animate-fadeup flex items-center gap-3">
              {i < step ? <Check className="size-4 text-muted-foreground" /> : <Loader2 className="size-4 animate-spin text-primary" />}
              <span className={i < step ? "text-muted-foreground" : ""}>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
