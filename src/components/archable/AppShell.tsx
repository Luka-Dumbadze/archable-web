import { useEffect, type ReactNode } from "react";
import { useShellBoot } from "@/shell/use-shell";

export function AppShell({ children }: { children: ReactNode }) {
  const { status, manifest } = useShellBoot();
  const brand = status === "ready" ? manifest?.branding.brand : undefined;

  useEffect(() => {
    if (!brand) return;
    const root = document.documentElement;
    const previous = root.style.getPropertyValue("--primary");
    const priority = root.style.getPropertyPriority("--primary");
    root.style.setProperty("--primary", brand);
    return () => {
      if (previous) root.style.setProperty("--primary", previous, priority);
      else root.style.removeProperty("--primary");
    };
  }, [brand]);

  return children;
}