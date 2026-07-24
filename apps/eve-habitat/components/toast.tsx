"use client";

import { cn } from "@/lib/ui";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useEffect } from "react";
import { useData } from "./data-provider";

export function Toast() {
  const { toast, dismissToast } = useData();
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(dismissToast, 5000);
    return () => window.clearTimeout(timeout);
  }, [dismissToast, toast]);
  if (!toast) return null;
  const Icon =
    toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? TriangleAlert : Info;
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="fixed bottom-20 right-4 z-[80] w-[calc(100%-2rem)] max-w-sm lg:bottom-6"
    >
      <div
        className={cn(
          "flex gap-3 rounded-2xl border bg-white p-4 shadow-2xl",
          toast.tone === "success" && "border-emerald-200",
          toast.tone === "error" && "border-red-200",
          toast.tone === "info" && "border-sky-200"
        )}
      >
        <Icon
          className={cn(
            "mt-0.5 shrink-0",
            toast.tone === "success" && "text-emerald-600",
            toast.tone === "error" && "text-red-600",
            toast.tone === "info" && "text-sky-600"
          )}
          size={20}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-[var(--ink)]">{toast.title}</p>
          <p className="mt-0.5 text-sm leading-5 text-[var(--muted)]">{toast.detail}</p>
        </div>
        <button
          aria-label="Cerrar notificación"
          className="focus-ring grid size-7 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--wash)]"
          onClick={dismissToast}
          type="button"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
