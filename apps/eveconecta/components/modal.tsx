"use client";

import { Button, cn } from "@/lib/ui";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md"
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-[rgba(10,37,64,.35)] backdrop-blur-sm data-[state=open]:animate-in" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[91] max-h-[90vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--eve-radio-lg)] border border-[var(--line)] bg-white shadow-[0_12px_28px_rgba(10,37,64,.14)]",
            size === "md" && "max-w-xl",
            size === "lg" && "max-w-3xl",
            size === "xl" && "max-w-6xl"
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5 sm:p-6">
            <div>
              <Dialog.Title className="font-brand text-xl font-semibold tracking-[-0.025em] text-[var(--ink)]">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm leading-5 text-[var(--muted)]">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Cerrar" className="shrink-0" size="sm" variant="ghost">
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>
          <div className="p-5 sm:p-6">{children}</div>
          {footer ? (
            <div className="flex justify-end gap-2 border-t border-[var(--line)] bg-[var(--wash)]/50 p-4 sm:px-6">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
