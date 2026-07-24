import { cn } from "@/lib/ui";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-bold text-[var(--ink)]">
      {label}
      <span className="mt-2 block">{children}</span>
      {hint ? (
        <span className="mt-1.5 block text-xs font-normal text-[var(--muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "focus-ring h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] placeholder:text-slate-400",
        props.className
      )}
    />
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "focus-ring h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]",
        props.className
      )}
    />
  );
}
