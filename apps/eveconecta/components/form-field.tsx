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
        "focus-ring h-11 w-full rounded-[9px] border border-[#DCE7F2] bg-white px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--eve-muted)]",
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
        "focus-ring h-11 w-full rounded-[9px] border border-[#DCE7F2] bg-white px-3.5 text-sm text-[var(--ink)]",
        props.className
      )}
    />
  );
}
