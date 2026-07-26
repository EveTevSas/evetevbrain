import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

type ButtonVariant = "cta" | "primary" | "secondary" | "ghost" | "danger";

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
        "focus-ring inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50",
        variant === "cta" &&
          "bg-[var(--eve-coral)] text-white shadow-[0_8px_20px_rgba(238,61,34,.18)] hover:bg-[var(--eve-coral-hover)]",
        variant === "primary" &&
          "bg-[var(--eve-mezclado)] text-white shadow-[0_8px_20px_rgba(20,74,150,.16)] hover:bg-[var(--eve-azul-noche)]",
        variant === "secondary" &&
          "border border-[#D7E3F0] bg-white text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent-strong)]",
        variant === "ghost" && "text-[var(--muted)] hover:bg-[var(--wash)] hover:text-[var(--ink)]",
        variant === "danger" && "bg-[var(--eve-error)] text-white hover:bg-[var(--eve-azul-noche)]",
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
        "rounded-[14px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)] transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(10,37,64,.09)]",
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
        tone === "success" && "bg-[#F0FDF4] text-[var(--eve-exito)]",
        tone === "warning" && "bg-[#FFF7ED] text-[var(--eve-alerta)]",
        tone === "danger" && "bg-[#FEF2F2] text-[var(--eve-error)]",
        tone === "info" && "bg-[#EFF6FF] text-[var(--eve-mezclado)]",
        tone === "neutral" && "bg-[var(--eve-hielo)] text-[var(--eve-pizarra)]",
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
        className="h-full rounded-full bg-[var(--eve-mezclado)] transition-[width]"
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
    <div className="grid min-h-56 place-items-center rounded-[14px] border border-dashed border-[var(--line)] bg-[var(--wash)]/40 p-8 text-center">
      <div>
        <div className="mx-auto mb-3 grid size-11 place-items-center rounded-[var(--eve-radio-md)] bg-white text-[var(--accent)] shadow-sm">
          {icon}
        </div>
        <h3 className="font-bold text-[var(--ink)]">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">{description}</p>
      </div>
    </div>
  );
}
