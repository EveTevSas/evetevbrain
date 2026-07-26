"use client";

import { cn } from "@/lib/ui";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useEffect } from "react";
import { useData } from "./data-provider";

export function Toast() {
  const { toast, dismissToast } = useData();
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(dismissToast, 3200);
    return () => window.clearTimeout(timeout);
  }, [dismissToast, toast]);
  if (!toast) return null;
  const Icon =
    toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? TriangleAlert : Info;
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 lg:bottom-6"
    >
      <div
        className={cn(
          "flex gap-3 rounded-[var(--eve-radio-pill)] border border-white/10 bg-[var(--eve-azul-noche)] px-5 py-3.5 text-white shadow-[0_12px_28px_rgba(10,37,64,.22)]"
        )}
      >
        <Icon
          className={cn(
            "mt-0.5 shrink-0",
            toast.tone === "success" && "text-green-400",
            toast.tone === "error" && "text-red-300",
            toast.tone === "info" && "text-[var(--eve-cian)]"
          )}
          size={20}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{toast.title}</p>
          <p className="mt-0.5 text-sm leading-5 text-[#B9CCE0]">{toast.detail}</p>
        </div>
        <button
          aria-label="Cerrar notificación"
          className="focus-ring grid size-7 place-items-center rounded-full text-[#B9CCE0] hover:bg-white/10 hover:text-white"
          onClick={dismissToast}
          type="button"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
