import { Button } from "@/lib/ui";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  secondaryAction
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: { label: string; icon: LucideIcon; onClick: () => void };
  secondaryAction?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[clamp(1.9rem,4.6vw,2.6rem)] font-semibold leading-[1.16] tracking-[-0.035em] text-[var(--ink)]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-[0.95rem]">
          {description}
        </p>
      </div>
      {action || secondaryAction ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          {secondaryAction}
          {action ? (
            <Button variant="cta" onClick={action.onClick}>
              <action.icon aria-hidden="true" size={17} />
              {action.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
