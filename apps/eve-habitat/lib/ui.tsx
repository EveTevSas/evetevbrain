import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-[var(--accent)] text-white shadow-[0_8px_20px_rgba(0,126,121,.18)] hover:bg-[var(--accent-strong)]",
        variant === "secondary" &&
          "border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent-strong)]",
        variant === "ghost" && "text-[var(--muted)] hover:bg-[var(--wash)] hover:text-[var(--ink)]",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-base",
        className
      )}
      type={type}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.35rem] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)]",
        className
      )}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
  className
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
        tone === "success" && "bg-emerald-50 text-emerald-700",
        tone === "warning" && "bg-amber-50 text-amber-700",
        tone === "danger" && "bg-red-50 text-red-700",
        tone === "info" && "bg-sky-50 text-sky-700",
        tone === "neutral" && "bg-slate-100 text-slate-600",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Progress({ value, label }: { value: number; label: string }) {
  const bounded = Math.min(100, Math.max(0, value));
  return (
    <div
      aria-label={label}
      className="h-2 overflow-hidden rounded-full bg-[var(--wash)]"
      role="progressbar"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={bounded}
    >
      <div
        className="h-full rounded-full bg-[var(--accent)] transition-[width]"
        style={{ width: `${bounded}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--wash)]/40 p-8 text-center">
      <div>
        <div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-white text-[var(--accent)] shadow-sm">
          {icon}
        </div>
        <h3 className="font-bold text-[var(--ink)]">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">{description}</p>
      </div>
    </div>
  );
}
