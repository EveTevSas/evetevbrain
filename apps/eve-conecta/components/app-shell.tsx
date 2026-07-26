"use client";

import { Badge, Button, cn } from "@/lib/ui";
import {
  Bell,
  BookOpenCheck,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  FileClock,
  FileText,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquareText,
  Search,
  ShieldCheck,
  Users,
  Wrench,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { canSeeNavigation } from "@/lib/auth/permissions";
import { useAuthUser } from "./auth-user-provider";
import { BrandMark } from "./brand-mark";
import { useData } from "./data-provider";
import { Toast } from "./toast";

const navigation = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/finanzas", label: "Finanzas", icon: CircleDollarSign },
  { href: "/presupuesto", label: "Presupuesto", icon: Gauge },
  { href: "/comunidad", label: "Comunidad", icon: Users },
  { href: "/comunicaciones", label: "Comunicaciones", icon: MessageSquareText },
  { href: "/pqrs", label: "PQRS e incidencias", icon: LifeBuoy },
  { href: "/reservas", label: "Reservas", icon: CalendarDays },
  { href: "/porteria", label: "Portería", icon: ShieldCheck },
  { href: "/mantenimiento", label: "Mantenimiento", icon: Wrench },
  { href: "/asambleas", label: "Asambleas", icon: BookOpenCheck },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/auditoria", label: "Auditoría", icon: FileClock }
] as const;

function Brand() {
  return (
    <Link className="flex items-center gap-3 rounded-xl" href="/" aria-label="EveConecta, inicio">
      <span className="grid size-10 place-items-center">
        <BrandMark priority size={38} />
      </span>
      <span>
        <span className="font-brand block text-[1.1rem] font-semibold tracking-[-0.02em] text-[var(--ink)]">
          EveConecta
        </span>
        <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Una vertical de Evetev
        </span>
      </span>
    </Link>
  );
}

function ConnectionBadge() {
  const { connection } = useData();
  const label = {
    loading: "Conectando",
    online: "En línea",
    cached: "Datos locales",
    offline: "Sin conexión"
  }[connection];
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
      <span
        className={cn(
          "size-2 rounded-full",
          connection === "online" && "bg-[var(--eve-exito)]",
          connection === "loading" && "animate-pulse bg-[var(--eve-alerta)]",
          connection === "cached" && "bg-[var(--eve-electrico)]",
          connection === "offline" && "bg-[var(--eve-error)]"
        )}
      />
      {label}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { snapshot } = useData();
  const { conjuntoName, user } = useAuthUser();
  const [open, setOpen] = useState(false);
  const visibleNavigation = navigation.filter((item) => canSeeNavigation(user.role, item.href));

  return (
    <div className="min-h-screen">
      <a
        className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-bold text-white focus:translate-y-0"
        href="#main-content"
      >
        Saltar al contenido
      </a>

      {open ? (
        <button
          aria-label="Cerrar navegación"
          className="fixed inset-0 z-40 bg-[rgba(10,37,64,.35)] backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        aria-label="Navegación principal"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col border-r border-[var(--line)] bg-white/95 px-4 py-5 backdrop-blur-xl transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-2">
          <Brand />
          <Button
            className="lg:hidden"
            size="sm"
            variant="ghost"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          >
            <X size={19} />
          </Button>
        </div>

        <div className="mt-7 rounded-[var(--eve-radio-lg)] border border-[var(--line)] bg-[var(--wash)] p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-[var(--ink)]">
                {conjuntoName}
              </p>
              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                {snapshot.tenant.units} unidades · {snapshot.tenant.city}
              </p>
            </div>
            <ChevronDown
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-[var(--muted)]"
              size={15}
            />
          </div>
          <div className="mt-3 border-t border-[var(--line)] pt-2.5">
            <ConnectionBadge />
          </div>
        </div>

        <nav className="scrollbar-subtle mt-5 flex-1 space-y-1 overflow-y-auto pr-1">
          {visibleNavigation.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-h-11 items-center gap-3 rounded-[var(--eve-radio-md)] px-3 text-sm font-semibold transition duration-150 ease-out",
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--eve-mezclado)]"
                    : "text-[var(--muted)] hover:bg-[var(--wash)] hover:text-[var(--ink)]"
                )}
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={active ? 2.4 : 1.9} />
                {item.label}
                {item.href === "/pqrs" ? (
                  <Badge className="ml-auto" tone="warning">
                    3
                  </Badge>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 flex items-center gap-3 rounded-[var(--eve-radio-lg)] border border-[var(--line)] p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-sm font-extrabold text-white">
            {user.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[var(--ink)]">
              {user.name}
            </p>
            <p className="truncate text-xs text-[var(--muted)]">{user.roleLabel}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              aria-label="Cerrar sesión"
              className="focus-ring grid size-8 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--wash)] hover:text-[var(--ink)]"
              title="Cerrar sesión"
              type="submit"
            >
              <LogOut aria-hidden="true" size={16} />
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-[17.5rem]">
        <header className="no-print sticky top-0 z-30 flex h-[4.6rem] items-center justify-between border-b border-[var(--line)] bg-[var(--canvas)]/88 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <Button
              className="lg:hidden"
              size="sm"
              variant="secondary"
              aria-label="Abrir menú"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </Button>
            <div className="hidden items-center gap-2.5 text-sm text-[var(--muted)] sm:flex">
              <BrandMark size={24} />
              <span className="max-w-48 truncate font-medium">{conjuntoName}</span>
            </div>
          </div>
          <Link
            aria-label="EveConecta, inicio"
            className="absolute left-1/2 grid -translate-x-1/2 place-items-center sm:hidden"
            href="/"
          >
            <BrandMark size={29} />
          </Link>
          <div className="flex items-center gap-2">
            <button
              className="focus-ring hidden h-10 items-center gap-2 rounded-full border border-[#D7E3F0] bg-white px-4 text-sm text-[var(--muted)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--ink)] sm:flex"
              type="button"
            >
              <Search aria-hidden="true" size={16} />
              Buscar
              <kbd className="ml-3 rounded-md bg-[var(--wash)] px-1.5 py-0.5 text-[0.65rem] font-bold text-[var(--ink)]">
                ⌘ K
              </kbd>
            </button>
            <button
              className="focus-ring relative grid size-10 place-items-center rounded-full border border-[#D7E3F0] bg-white text-[var(--muted)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
              type="button"
              aria-label="Notificaciones, 2 pendientes"
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-[var(--eve-alerta)] ring-2 ring-white" />
            </button>
            <span className="hidden sm:inline-flex">
              <ConnectionBadge />
            </span>
          </div>
        </header>

        <main
          className="mx-auto w-full max-w-[72.5rem] px-5 pb-28 pt-6 sm:px-7 lg:px-8 lg:pb-12 lg:pt-8"
          id="main-content"
        >
          {children}
        </main>
      </div>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--line)] bg-white/95 px-1 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl lg:hidden"
        aria-label="Navegación móvil"
      >
        {visibleNavigation.slice(0, 4).map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[0.66rem] font-bold",
                active ? "text-[var(--accent)]" : "text-[var(--muted)]"
              )}
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden="true" size={19} />
              {item.label}
            </Link>
          );
        })}
        <button
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[0.66rem] font-bold text-[var(--muted)]"
          onClick={() => setOpen(true)}
          type="button"
        >
          <ClipboardCheck aria-hidden="true" size={19} />
          Más
        </button>
      </nav>
      <Toast />
    </div>
  );
}
