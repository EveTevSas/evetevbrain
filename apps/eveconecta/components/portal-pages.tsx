"use client";

import { formatCop, type CaseItem, type FeeItem } from "@/lib/contracts";
import { Badge, Button, Card, EmptyState, Progress, cn } from "@/lib/ui";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Building,
  CalendarCheck,
  CalendarDays,
  Car,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CloudOff,
  Download,
  FileCheck2,
  FileClock,
  FileText,
  Filter,
  Fingerprint,
  Gauge,
  History,
  Inbox,
  KeyRound,
  Landmark,
  ListFilter,
  MailCheck,
  MessageCircleQuestion,
  MoreHorizontal,
  PackageCheck,
  PawPrint,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Vote,
  WalletCards,
  Wrench
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import Link from "next/link";
import { useAuthUser } from "./auth-user-provider";
import { useData } from "./data-provider";
import { Field, SelectInput, TextInput } from "./form-field";
import { Modal } from "./modal";
import { PageHeader } from "./page-header";
import { StatusBadge } from "./status-badge";

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric"
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit"
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

function formValue(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function SectionTitle({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[clamp(1.15rem,2.2vw,1.35rem)] font-semibold tracking-[-0.015em] text-[var(--ink)]">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function IconButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      className="focus-ring grid size-9 place-items-center rounded-full border border-[#D7E3F0] bg-white text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
      type="button"
    >
      {children}
    </button>
  );
}

function SearchBox({ placeholder = "Buscar" }: { placeholder?: string }) {
  return (
    <label className="relative block min-w-0 flex-1 sm:max-w-xs">
      <span className="sr-only">{placeholder}</span>
      <Search
        aria-hidden="true"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
        size={16}
      />
      <input
        className="focus-ring h-10 w-full rounded-[9px] border border-[#DCE7F2] bg-white pl-9 pr-3 text-sm"
        placeholder={placeholder}
      />
    </label>
  );
}

function TableShell({ children }: { children: ReactNode }) {
  return <div className="scrollbar-subtle overflow-x-auto">{children}</div>;
}

function MetricCard({
  label,
  value,
  detail,
  trend,
  index
}: {
  label: string;
  value: string;
  detail: string;
  trend: "up" | "down" | "neutral";
  index: number;
}) {
  const icons = [Banknote, TrendingDown, MessageCircleQuestion, Gauge];
  const Icon = icons[index] ?? BarChart3;
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--muted)]">{label}</p>
          <p className="font-brand mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--ink)]">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "grid size-10 place-items-center rounded-xl",
            index === 1
              ? "bg-[var(--warm-soft)] text-[var(--warm)]"
              : "bg-[var(--accent-soft)] text-[var(--accent)]"
          )}
        >
          <Icon aria-hidden="true" size={19} />
        </span>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
        {trend === "up" ? (
          <TrendingUp className="text-emerald-600" size={14} />
        ) : trend === "down" ? (
          <TrendingDown className="text-emerald-600" size={14} />
        ) : (
          <span className="size-1.5 rounded-full bg-slate-400" />
        )}
        {detail}
      </p>
    </Card>
  );
}

function LoadingPanel() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Cargando indicadores"
      role="status"
    >
      {[0, 1, 2, 3].map((index) => (
        <div
          className="h-40 animate-pulse rounded-[14px] border border-[var(--line)] bg-white"
          key={index}
        />
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { snapshot, connection } = useData();
  const { user } = useAuthUser();

  if (user.role === "residente") {
    return (
      <RoleDashboard
        connection={connection}
        description="Consulta tus obligaciones y los servicios habilitados para tu unidad. EveConecta no muestra aquí información financiera de otros residentes."
        eyebrow="Mi copropiedad"
        links={[
          { href: "/finanzas", icon: CircleDollarSign, label: "Mis finanzas" },
          { href: "/pqrs", icon: MessageCircleQuestion, label: "Mis solicitudes" },
          { href: "/reservas", icon: CalendarDays, label: "Reservas" },
          { href: "/documentos", icon: FileText, label: "Documentos" }
        ]}
        name={user.name}
      />
    );
  }

  if (user.role === "consejo") {
    return (
      <RoleDashboard
        connection={connection}
        description="Revisa información de gobierno y operación sin exponer datos personales ni cartera identificada de residentes."
        eyebrow="Consejo de administración"
        links={[
          { href: "/presupuesto", icon: Gauge, label: "Presupuesto" },
          { href: "/asambleas", icon: Vote, label: "Asambleas" },
          { href: "/mantenimiento", icon: Wrench, label: "Mantenimiento" },
          { href: "/documentos", icon: FileText, label: "Documentos" }
        ]}
        name={user.name}
      />
    );
  }

  const attentionCases = snapshot.cases.filter((item) => item.status !== "resolved").slice(0, 3);
  const pendingExpenses = snapshot.expenses.filter(
    (item) => item.status === "pending_approval"
  ).length;
  const openWork = snapshot.workOrders.filter((item) => item.status !== "completed").length;
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Resumen operacional"
        title={`Buenas tardes, ${user.name.split(" ")[0] ?? "Usuario"}`}
        description={`Todo lo importante de ${snapshot.tenant.name}, con trazabilidad desde el recaudo hasta la operación diaria.`}
        secondaryAction={
          <Badge tone={connection === "online" ? "success" : "warning"}>
            {connection === "online" ? "Datos en vivo" : "Modo contingencia"}
          </Badge>
        }
      />

      {snapshot.metrics.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {snapshot.metrics.map((metric, index) => (
            <MetricCard {...metric} index={index} key={metric.label} />
          ))}
        </div>
      ) : (
        <LoadingPanel />
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card className="min-w-0 p-5 sm:p-6">
          <SectionTitle
            title="Recaudo frente a facturación"
            description="Últimos seis ciclos · millones de pesos"
            action={<Badge tone="success">88,9% este mes</Badge>}
          />
          <div className="h-72" aria-label="Gráfica de recaudo y facturación" role="img">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={snapshot.portfolio}
                margin={{ left: -20, right: 8, top: 12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="collected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E6FEB" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#1E6FEB" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#EDF3FA" strokeDasharray="4 4" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 12 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    borderColor: "#EDF3FA",
                    boxShadow: "0 12px 28px rgba(10,37,64,.12)"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="billed"
                  stroke="#bdc8c4"
                  strokeWidth={2}
                  fill="transparent"
                  name="Facturado"
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  stroke="#1E6FEB"
                  strokeWidth={3}
                  fill="url(#collected)"
                  name="Recaudado"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-5 text-xs font-semibold text-[var(--muted)]">
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-5 bg-[var(--accent)]" /> Recaudado
            </span>
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-5 bg-slate-300" /> Facturado
            </span>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <SectionTitle title="Requiere tu atención" description="Acciones ordenadas por impacto" />
          <div className="space-y-3">
            <AttentionItem
              icon={CircleDollarSign}
              tone="warm"
              title={`${pendingExpenses} gastos pendientes de aprobación`}
              detail="El más antiguo vence hoy"
              href="/presupuesto"
            />
            <AttentionItem
              icon={Clock3}
              tone="danger"
              title={`${attentionCases.length} casos próximos a vencer SLA`}
              detail="PQRS-0261 tiene prioridad alta"
              href="/pqrs"
            />
            <AttentionItem
              icon={Wrench}
              tone="teal"
              title={`${openWork} órdenes de trabajo abiertas`}
              detail="1 intervención crítica programada"
              href="/mantenimiento"
            />
          </div>
          <div className="mt-5 rounded-2xl bg-[var(--accent-soft)] p-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--accent-strong)]">
              <Sparkles size={16} /> Señal de confianza
            </div>
            <p className="mt-2 text-sm leading-5 text-[var(--accent-strong)]">
              No hay discrepancias abiertas en la última conciliación de EvePay.
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Card className="p-5 sm:p-6">
          <SectionTitle
            title="Cartera reciente"
            description="Obligaciones con saldo o movimiento reciente"
            action={
              <Button size="sm" variant="ghost">
                Ver cartera <ArrowRight size={15} />
              </Button>
            }
          />
          <TableShell>
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="pb-3 font-bold">Unidad</th>
                  <th className="pb-3 font-bold">Residente</th>
                  <th className="pb-3 font-bold">Saldo</th>
                  <th className="pb-3 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.fees.slice(0, 4).map((fee) => (
                  <tr className="border-b border-[var(--line)] last:border-0" key={fee.id}>
                    <td className="py-4 font-extrabold">{fee.unit}</td>
                    <td className="py-4 text-[var(--muted)]">{fee.resident}</td>
                    <td className="py-4 font-bold">{formatCop(fee.balanceMinor)}</td>
                    <td className="py-4">
                      <StatusBadge status={fee.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </Card>
        <Card className="p-5 sm:p-6">
          <SectionTitle title="Próximos hitos" description="Comunidad y operación" />
          <div className="space-y-4">
            <TimelineItem
              date="20 JUL"
              title="Reservas de fin de semana"
              detail="2 zonas comunes ocupadas"
            />
            <TimelineItem
              date="21 JUL"
              title="Mantenimiento hidráulico"
              detail="Bomba de presión #2 · 8:00 a. m."
            />
            <TimelineItem
              date="06 AGO"
              title="Asamblea extraordinaria"
              detail="Quórum anticipado: 41,67%"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function RoleDashboard({
  connection,
  description,
  eyebrow,
  links,
  name
}: {
  connection: "loading" | "online" | "cached" | "offline";
  description: string;
  eyebrow: string;
  links: Array<{ href: string; icon: typeof CircleDollarSign; label: string }>;
  name: string;
}) {
  return (
    <div className="page-enter">
      <PageHeader
        description={description}
        eyebrow={eyebrow}
        secondaryAction={
          <Badge tone={connection === "online" ? "success" : "warning"}>
            {connection === "online" ? "Datos en vivo" : "Modo contingencia"}
          </Badge>
        }
        title={`Buenas tardes, ${name.split(" ")[0] ?? "Usuario"}`}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map(({ href, icon: Icon, label }) => (
          <Link
            className="focus-ring group flex min-h-32 items-center gap-4 rounded-[14px] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]"
            href={href}
            key={href}
          >
            <span className="grid size-11 place-items-center rounded-[var(--eve-radio-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
              <Icon aria-hidden="true" size={20} />
            </span>
            <span className="font-bold text-[var(--ink)]">{label}</span>
            <ArrowRight
              aria-hidden="true"
              className="ml-auto text-[var(--muted)] transition group-hover:translate-x-1"
              size={17}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

function AttentionItem({
  icon: Icon,
  tone,
  title,
  detail,
  href
}: {
  icon: typeof Wrench;
  tone: "warm" | "danger" | "teal";
  title: string;
  detail: string;
  href: string;
}) {
  return (
    <a
      className="group flex items-center gap-3 rounded-[14px] border border-[var(--line)] p-3.5 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(10,37,64,.08)]"
      href={href}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          tone === "warm" && "bg-[var(--warm-soft)] text-[var(--warm)]",
          tone === "danger" && "bg-[#FEF2F2] text-[var(--eve-error)]",
          tone === "teal" && "bg-[var(--accent-soft)] text-[var(--accent)]"
        )}
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-[var(--ink)]">{title}</span>
        <span className="mt-0.5 block text-xs text-[var(--muted)]">{detail}</span>
      </span>
      <ArrowRight
        className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-[var(--accent)]"
        size={17}
      />
    </a>
  );
}

function TimelineItem({ date, title, detail }: { date: string; title: string; detail: string }) {
  return (
    <div className="flex gap-3">
      <span className="grid h-11 w-12 shrink-0 place-items-center rounded-xl bg-[var(--wash)] text-center text-[0.65rem] font-extrabold leading-3 text-[var(--accent-strong)]">
        {date}
      </span>
      <div className="pt-0.5">
        <p className="text-sm font-extrabold text-[var(--ink)]">{title}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
      </div>
    </div>
  );
}

export function FinancesPage() {
  const { snapshot, payFee, reconcile, busy } = useData();
  const { user } = useAuthUser();
  const [tab, setTab] = useState<"portfolio" | "payments" | "reconciliation">("portfolio");
  const outstanding = snapshot.fees.reduce((sum, fee) => sum + fee.balanceMinor, 0);
  const isResident = user.role === "residente";
  const paidFees = snapshot.fees.filter((fee) => fee.status === "paid").length;
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="EvePay integrado"
        title="Finanzas y cartera"
        description={
          isResident
            ? "Consulta tus obligaciones, pagos aplicados y saldos de forma segura."
            : "Liquida, recauda, aplica y concilia cada peso con una historia verificable."
        }
        secondaryAction={
          isResident ? undefined : (
            <Button
              variant="secondary"
              onClick={() => void reconcile()}
              disabled={busy === "reconcile"}
            >
              <RefreshCw className={cn(busy === "reconcile" && "animate-spin")} size={16} />{" "}
              Conciliar ahora
            </Button>
          )
        }
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={WalletCards}
          label="Cartera total"
          value={formatCop(outstanding)}
          detail={`${snapshot.fees.length} obligaciones visibles`}
        />
        <SummaryCard
          icon={BadgeCheck}
          label={isResident ? "Estado de cuenta" : "Recaudo identificado"}
          value={isResident ? (outstanding > 0 ? "Saldo pendiente" : "Al día") : "99,2%"}
          detail={isResident ? "Información exclusiva de tu unidad" : "Sin pagos huérfanos"}
          tone="teal"
        />
        <SummaryCard
          icon={Landmark}
          label={isResident ? "Pagos aplicados" : "Última conciliación"}
          value={isResident ? String(paidFees) : "Sin diferencias"}
          detail={isResident ? "Confirmados en tu estado de cuenta" : "Hoy, 11:34 a. m."}
          tone="teal"
        />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex gap-1 overflow-x-auto rounded-full bg-[var(--wash)] p-1">
            <TabButton active={tab === "portfolio"} onClick={() => setTab("portfolio")}>
              Cartera
            </TabButton>
            <TabButton active={tab === "payments"} onClick={() => setTab("payments")}>
              Pagos
            </TabButton>
            {isResident ? null : (
              <TabButton active={tab === "reconciliation"} onClick={() => setTab("reconciliation")}>
                Conciliación
              </TabButton>
            )}
          </div>
          <div className="flex gap-2">
            <SearchBox placeholder="Buscar unidad o residente" />
            <IconButton label="Filtrar">
              <ListFilter size={17} />
            </IconButton>
            <IconButton label="Exportar">
              <Download size={17} />
            </IconButton>
          </div>
        </div>
        {tab === "portfolio" ? (
          <FeesTable fees={snapshot.fees} busy={busy} onPay={payFee} />
        ) : tab === "payments" ? (
          <PaymentsPanel fees={snapshot.fees} />
        ) : (
          <ReconciliationPanel />
        )}
      </Card>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={cn(
        "focus-ring h-9 shrink-0 rounded-full px-4 text-sm font-semibold",
        active ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--muted)]"
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function FeesTable({
  fees,
  busy,
  onPay
}: {
  fees: FeeItem[];
  busy: string | null;
  onPay: (fee: FeeItem) => Promise<unknown>;
}) {
  if (!fees.length)
    return (
      <div className="p-6">
        <EmptyState
          icon={<Inbox size={20} />}
          title="No hay obligaciones"
          description="Las cuotas liquidadas aparecerán en este espacio."
        />
      </div>
    );
  return (
    <TableShell>
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead>
          <tr className="bg-[var(--wash)]/50 text-xs uppercase tracking-wide text-[var(--muted)]">
            <th className="px-5 py-3.5 font-bold">Unidad</th>
            <th className="px-4 py-3.5 font-bold">Residente / concepto</th>
            <th className="px-4 py-3.5 font-bold">Vencimiento</th>
            <th className="px-4 py-3.5 text-right font-bold">Saldo</th>
            <th className="px-4 py-3.5 font-bold">Estado</th>
            <th className="px-5 py-3.5 text-right font-bold">Acción</th>
          </tr>
        </thead>
        <tbody>
          {fees.map((fee) => (
            <tr className="border-t border-[var(--line)]" key={fee.id}>
              <td className="px-5 py-4 font-extrabold">{fee.unit}</td>
              <td className="px-4 py-4">
                <p className="font-bold">{fee.resident}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">{fee.concept}</p>
              </td>
              <td className="px-4 py-4 text-[var(--muted)]">{formatDate(fee.dueDate)}</td>
              <td className="px-4 py-4 text-right font-extrabold">{formatCop(fee.balanceMinor)}</td>
              <td className="px-4 py-4">
                <StatusBadge status={fee.status} />
              </td>
              <td className="px-5 py-4 text-right">
                {fee.balanceMinor > 0 ? (
                  <Button
                    size="sm"
                    onClick={() => void onPay(fee)}
                    disabled={busy === `fee-${fee.id}`}
                  >
                    <CircleDollarSign size={15} />{" "}
                    {busy === `fee-${fee.id}` ? "Procesando" : "Pagar sandbox"}
                  </Button>
                ) : (
                  <span className="text-xs font-bold text-emerald-700">Aplicado</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function PaymentsPanel({ fees }: { fees: FeeItem[] }) {
  const paid = fees.filter((fee) => fee.status === "paid");
  return (
    <div className="p-5 sm:p-6">
      <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="font-extrabold">Checkout hospedado</p>
        <p className="mt-1">
          EveConecta nunca recibe datos de tarjeta. El proveedor confirma por webhook firmado.
        </p>
      </div>
      <div className="space-y-3">
        {paid.map((fee) => (
          <div
            className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--line)] p-4 sm:flex-row sm:items-center"
            key={fee.id}
          >
            <div>
              <p className="font-extrabold">
                {fee.unit} · {fee.resident}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">Referencia {fee.id.slice(0, 12)}…</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-extrabold">{formatCop(fee.amountMinor)}</p>
              <StatusBadge status="approved" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReconciliationPanel() {
  return (
    <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="rounded-2xl bg-[var(--accent-soft)] p-5">
        <ShieldCheck className="text-[var(--accent)]" size={26} />
        <h3 className="mt-4 text-lg font-extrabold">Conciliación al día</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          EvePay comparó proveedor, pagos y ledger. No hay diferencias sin explicación.
        </p>
        <div className="mt-5">
          <Progress label="Pagos conciliados" value={100} />
        </div>
      </div>
      <div className="space-y-3">
        <ReconciliationRow label="Pagos revisados" value="142" />
        <ReconciliationRow label="Monto conciliado" value="$72,4 M" />
        <ReconciliationRow label="Discrepancias abiertas" value="0" success />
        <ReconciliationRow label="Cuenta transitoria" value="$0" success />
      </div>
    </div>
  );
}

function ReconciliationRow({
  label,
  value,
  success
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[var(--line)] p-4">
      <span className="text-sm font-semibold text-[var(--muted)]">{label}</span>
      <span className={cn("font-extrabold", success && "text-emerald-700")}>{value}</span>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "warm"
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  detail: string;
  tone?: "warm" | "teal";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-xl",
            tone === "teal"
              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
              : "bg-[var(--warm-soft)] text-[var(--warm)]"
          )}
        >
          <Icon size={19} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{label}</p>
          <p className="mt-1 text-xl font-extrabold tracking-[-0.03em]">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">{detail}</p>
    </Card>
  );
}

export function BudgetPage() {
  const { snapshot, approveExpense, busy } = useData();
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Control y segregación"
        title="Presupuesto y gastos"
        description="Ejecución visible, soportes completos y aprobaciones según la matriz de autoridad."
        action={{ label: "Registrar gasto", icon: Plus, onClick: () => undefined }}
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_1.6fr]">
        <Card className="p-5 sm:p-6">
          <SectionTitle title="Ejecución por rubro" description="$438 M ejecutados de $800 M" />
          <div className="space-y-5">
            <BudgetLine label="Servicios generales" used={78} value="$124 M / $159 M" />
            <BudgetLine label="Mantenimiento" used={61} value="$146 M / $240 M" />
            <BudgetLine label="Seguridad" used={48} value="$96 M / $200 M" />
            <BudgetLine label="Imprevistos" used={18} value="$18 M / $100 M" />
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-5">
            <SectionTitle
              title="Solicitudes de gasto"
              description="La aprobación no ejecuta el pago"
            />
            <IconButton label="Filtrar gastos">
              <Filter size={17} />
            </IconButton>
          </div>
          <TableShell>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="bg-[var(--wash)]/60 text-xs uppercase text-[var(--muted)]">
                  <th className="px-5 py-3 font-bold">Concepto</th>
                  <th className="px-4 py-3 font-bold">Rubro</th>
                  <th className="px-4 py-3 text-right font-bold">Valor</th>
                  <th className="px-4 py-3 font-bold">Aprobaciones</th>
                  <th className="px-5 py-3 text-right font-bold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.expenses.map((expense) => (
                  <tr className="border-t border-[var(--line)]" key={expense.id}>
                    <td className="px-5 py-4">
                      <p className="font-extrabold">{expense.concept}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{expense.provider}</p>
                    </td>
                    <td className="px-4 py-4 text-[var(--muted)]">{expense.budgetLine}</td>
                    <td className="px-4 py-4 text-right font-extrabold">
                      {formatCop(expense.amountMinor)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="w-28">
                        <Progress
                          label={`${expense.approvals} de ${expense.approvalsRequired} aprobaciones`}
                          value={(expense.approvals / expense.approvalsRequired) * 100}
                        />
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {expense.approvals} de {expense.approvalsRequired}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {expense.status === "pending_approval" ? (
                        <Button
                          size="sm"
                          onClick={() => void approveExpense(expense.id)}
                          disabled={busy === `expense-${expense.id}`}
                        >
                          <FileCheck2 size={15} /> Aprobar
                        </Button>
                      ) : (
                        <StatusBadge status={expense.status} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </Card>
      </div>
    </div>
  );
}

function BudgetLine({ label, used, value }: { label: string; used: number; value: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-bold">{label}</span>
        <span className="text-xs font-semibold text-[var(--muted)]">{value}</span>
      </div>
      <Progress label={`Ejecución de ${label}`} value={used} />
    </div>
  );
}

export function CommunityPage() {
  const { snapshot } = useData();
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Censo vivo"
        title="Comunidad"
        description="Personas, ocupaciones, vehículos y mascotas vinculados a su unidad y vigencia."
        action={{ label: "Invitar residente", icon: UserCheck, onClick: () => undefined }}
        secondaryAction={
          <Button variant="secondary">
            <Download size={16} /> Importar CSV
          </Button>
        }
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={Building}
          label="Ocupación"
          value={`${snapshot.tenant.occupancyPercent}%`}
          detail={`${snapshot.tenant.units} unidades registradas`}
          tone="teal"
        />
        <SummaryCard
          icon={Car}
          label="Vehículos"
          value="126"
          detail="8 cupos de visitante disponibles"
        />
        <SummaryCard
          icon={PawPrint}
          label="Mascotas"
          value="74"
          detail="96% con registro vigente"
        />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle
            title="Personas y ocupaciones"
            description={`${snapshot.people.length} registros en esta vista`}
          />
          <div className="flex gap-2">
            <SearchBox placeholder="Nombre, unidad o contacto" />
            <IconButton label="Filtrar">
              <Filter size={17} />
            </IconButton>
          </div>
        </div>
        <TableShell>
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead>
              <tr className="bg-[var(--wash)]/60 text-xs uppercase text-[var(--muted)]">
                <th className="px-5 py-3 font-bold">Persona</th>
                <th className="px-4 py-3 font-bold">Unidad</th>
                <th className="px-4 py-3 font-bold">Relación</th>
                <th className="px-4 py-3 font-bold">Activos</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {snapshot.people.map((person) => (
                <tr className="border-t border-[var(--line)]" key={person.id}>
                  <td className="px-5 py-4">
                    <p className="font-extrabold">{person.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{person.contact}</p>
                  </td>
                  <td className="px-4 py-4 font-bold">{person.unit}</td>
                  <td className="px-4 py-4 capitalize text-[var(--muted)]">
                    {person.kind === "owner"
                      ? "Propietario"
                      : person.kind === "tenant"
                        ? "Arrendatario"
                        : "Residente"}
                  </td>
                  <td className="px-4 py-4">
                    <span className="mr-3 inline-flex items-center gap-1 text-xs">
                      <Car size={14} /> {person.vehicles}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs">
                      <PawPrint size={14} /> {person.pets}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={person.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <IconButton label={`Opciones para ${person.name}`}>
                      <MoreHorizontal size={17} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </Card>
    </div>
  );
}

export function CommunicationsPage() {
  const { snapshot } = useData();
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Entrega verificable"
        title="Comunicaciones"
        description="Publica una vez, entrega por varios canales y conserva evidencia de cada envío."
        action={{ label: "Nuevo comunicado", icon: Plus, onClick: () => undefined }}
      />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5 sm:p-6">
          <SectionTitle
            title="Comunicados recientes"
            description="Entrega y audiencia por publicación"
          />
          <div className="space-y-3">
            {snapshot.announcements.map((item) => (
              <div className="rounded-2xl border border-[var(--line)] p-4" key={item.id}>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold">{item.title}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {item.audience} · {item.channel}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    {formatDate(item.publishedAt)}
                  </span>
                </div>
                {item.status === "published" ? (
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs font-bold text-[var(--muted)]">
                      <span>Entrega confirmada</span>
                      <span>{item.deliveryRate}%</span>
                    </div>
                    <Progress label={`Entrega de ${item.title}`} value={item.deliveryRate} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <MailCheck size={19} />
            </span>
            <p className="mt-4 text-2xl font-extrabold">97,1%</p>
            <p className="mt-1 text-sm text-[var(--muted)]">entrega promedio en 30 días</p>
          </Card>
          <Card className="p-5">
            <SectionTitle title="Canales" />
            <div className="space-y-3 text-sm">
              <Channel label="Email" value="99,1%" />
              <Channel label="Push PWA" value="94,8%" />
              <Channel label="WhatsApp" value="97,5%" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Channel({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[var(--wash)] p-3">
      <span className="font-bold">{label}</span>
      <span className="font-extrabold text-[var(--accent)]">{value}</span>
    </div>
  );
}

export function CasesPage() {
  const { snapshot, createCase, busy } = useData();
  const [open, setOpen] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await createCase({
      title: formValue(form, "title"),
      category: formValue(form, "category"),
      requester: formValue(form, "requester"),
      unit: formValue(form, "unit"),
      priority: formValue(form, "priority") as "low" | "medium" | "high"
    });
    if (result) setOpen(false);
  }
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Atención con SLA"
        title="PQRS e incidencias"
        description="Cada solicitud conserva responsable, plazo, evidencias e historial hasta su resolución."
        action={{ label: "Crear caso", icon: Plus, onClick: () => setOpen(true) }}
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={Inbox}
          label="Casos abiertos"
          value={String(snapshot.cases.filter((item) => item.status !== "resolved").length)}
          detail="2 creados en las últimas 24 h"
        />
        <SummaryCard
          icon={Clock3}
          label="Dentro de SLA"
          value="92%"
          detail="Meta mensual: 95%"
          tone="teal"
        />
        <SummaryCard
          icon={BadgeCheck}
          label="Satisfacción"
          value="4,6 / 5"
          detail="18 encuestas respondidas"
          tone="teal"
        />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle
            title="Bandeja de casos"
            description="Ordenada por riesgo de incumplimiento"
          />
          <div className="flex gap-2">
            <SearchBox placeholder="Código, título o unidad" />
            <IconButton label="Filtrar">
              <Filter size={17} />
            </IconButton>
          </div>
        </div>
        <div className="grid gap-3 border-t border-[var(--line)] p-4 sm:p-5">
          {snapshot.cases.map((item) => (
            <CaseRow item={item} key={item.id} />
          ))}
        </div>
      </Card>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Nuevo caso"
        description="El SLA se asignará según la prioridad y quedará visible para el solicitante."
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <Field label="Asunto">
            <TextInput
              name="title"
              required
              minLength={5}
              placeholder="Describe brevemente la solicitud"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoría">
              <SelectInput name="category">
                <option>Mantenimiento</option>
                <option>Financiero</option>
                <option>Convivencia</option>
                <option>Administrativo</option>
              </SelectInput>
            </Field>
            <Field label="Prioridad">
              <SelectInput name="priority">
                <option value="low">Baja · 72 horas</option>
                <option value="medium">Media · 48 horas</option>
                <option value="high">Alta · 24 horas</option>
              </SelectInput>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Solicitante">
              <TextInput name="requester" defaultValue="Camila Herrera" required />
            </Field>
            <Field label="Unidad">
              <TextInput name="unit" placeholder="T1 · 301" required />
            </Field>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy === "case"}>
              {busy === "case" ? "Creando…" : "Crear caso"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function CaseRow({ item }: { item: CaseItem }) {
  const progress = Math.min(100, (item.elapsedHours / item.slaHours) * 100);
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] p-4 lg:flex-row lg:items-center">
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl",
          item.priority === "high"
            ? "bg-red-50 text-red-600"
            : "bg-[var(--wash)] text-[var(--accent)]"
        )}
      >
        <MessageCircleQuestion size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold text-[var(--accent)]">{item.code}</span>
          <StatusBadge status={item.priority} />
          <StatusBadge status={item.status} />
        </div>
        <p className="mt-1.5 font-extrabold">{item.title}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {item.requester} · {item.unit} · {item.category}
        </p>
      </div>
      <div className="w-full lg:w-44">
        <div className="mb-1.5 flex justify-between text-xs font-bold text-[var(--muted)]">
          <span>SLA</span>
          <span>
            {item.elapsedHours} h de {item.slaHours} h
          </span>
        </div>
        <Progress label={`SLA de ${item.code}`} value={progress} />
      </div>
      <IconButton label={`Abrir ${item.code}`}>
        <ArrowRight size={17} />
      </IconButton>
    </div>
  );
}

export function ReservationsPage() {
  const { snapshot, createReservation, busy } = useData();
  const [open, setOpen] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await createReservation({
      amenity: formValue(form, "amenity"),
      date: formValue(form, "date"),
      time: formValue(form, "time"),
      resident: formValue(form, "resident"),
      unit: formValue(form, "unit")
    });
    if (result) setOpen(false);
  }
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Zonas comunes"
        title="Reservas"
        description="Disponibilidad, reglas, depósitos y cobros en un solo recorrido sin traslapes."
        action={{ label: "Nueva reserva", icon: Plus, onClick: () => setOpen(true) }}
      />
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <AmenityCard
          icon={Building}
          title="Salón social Arrayán"
          detail="60 personas · $180.000"
          availability="Próximo libre: 26 jul"
        />
        <AmenityCard
          icon={CalendarCheck}
          title="Cancha múltiple"
          detail="20 personas · Sin costo"
          availability="Disponible hoy 18:00"
        />
        <AmenityCard
          icon={Sparkles}
          title="BBQ terraza"
          detail="15 personas · $120.000"
          availability="Próximo libre: 27 jul"
        />
      </div>
      <Card className="overflow-hidden">
        <div className="p-5">
          <SectionTitle
            title="Agenda de reservas"
            description="Próximas reservas y estado del cobro"
          />
        </div>
        <TableShell>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="bg-[var(--wash)]/60 text-xs uppercase text-[var(--muted)]">
                <th className="px-5 py-3 font-bold">Zona</th>
                <th className="px-4 py-3 font-bold">Fecha y hora</th>
                <th className="px-4 py-3 font-bold">Residente</th>
                <th className="px-4 py-3 text-right font-bold">Cobro</th>
                <th className="px-5 py-3 font-bold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.reservations.map((item) => (
                <tr className="border-t border-[var(--line)]" key={item.id}>
                  <td className="px-5 py-4 font-extrabold">{item.amenity}</td>
                  <td className="px-4 py-4">
                    <p className="font-bold">{formatDate(item.date)}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{item.time}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p>{item.resident}</p>
                    <p className="text-xs text-[var(--muted)]">{item.unit}</p>
                  </td>
                  <td className="px-4 py-4 text-right font-extrabold">
                    {formatCop(item.amountMinor)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </Card>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Reservar zona común"
        description="La disponibilidad se vuelve a verificar al confirmar."
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <Field label="Zona">
            <SelectInput name="amenity">
              <option>Salón social Arrayán</option>
              <option>Cancha múltiple</option>
              <option>BBQ terraza</option>
            </SelectInput>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha">
              <TextInput
                name="date"
                type="date"
                min="2026-07-19"
                defaultValue="2026-07-26"
                required
              />
            </Field>
            <Field label="Hora">
              <TextInput name="time" type="time" defaultValue="15:00" required />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Residente">
              <TextInput name="resident" defaultValue="Laura Mendoza" required />
            </Field>
            <Field label="Unidad">
              <TextInput name="unit" defaultValue="T1 · 301" required />
            </Field>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy === "reservation"}>
              {busy === "reservation" ? "Verificando…" : "Confirmar reserva"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function AmenityCard({
  icon: Icon,
  title,
  detail,
  availability
}: {
  icon: typeof Building;
  title: string;
  detail: string;
  availability: string;
}) {
  return (
    <Card className="p-5">
      <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon size={19} />
      </span>
      <h3 className="mt-4 font-extrabold">{title}</h3>
      <p className="mt-1.5 text-sm text-[var(--muted)]">{detail}</p>
      <p className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-700">
        <CheckCircle2 size={14} />
        {availability}
      </p>
    </Card>
  );
}

export function GatehousePage() {
  const { snapshot, createVisitor, syncGatehouse, busy, connection } = useData();
  const [open, setOpen] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const from = new Date(formValue(form, "from")).toISOString();
    const until = new Date(formValue(form, "until")).toISOString();
    const plate = formValue(form, "plate");
    const result = await createVisitor({
      name: formValue(form, "name"),
      documentSuffix: formValue(form, "documentSuffix"),
      unit: formValue(form, "unit"),
      vehiclePlate: plate ? plate.toUpperCase() : null,
      validFrom: from,
      validUntil: until
    });
    if (result) setOpen(false);
  }
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Operación resiliente"
        title="Portería"
        description="Visitantes, accesos y turnos siguen funcionando con conectividad intermitente."
        action={{ label: "Autorizar visitante", icon: Plus, onClick: () => setOpen(true) }}
        secondaryAction={
          <Button
            variant={offlineMode ? "primary" : "secondary"}
            onClick={() => setOfflineMode((value) => !value)}
          >
            <CloudOff size={16} />
            {offlineMode ? "Contingencia activa" : "Probar modo offline"}
          </Button>
        }
      />
      <div
        className={cn(
          "mb-5 flex flex-col justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center",
          offlineMode || connection !== "online"
            ? "border-amber-200 bg-amber-50"
            : "border-emerald-200 bg-emerald-50"
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-10 place-items-center rounded-xl",
              offlineMode ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
            )}
          >
            <Smartphone size={19} />
          </span>
          <div>
            <p className="text-sm font-extrabold">
              PORTERÍA-01 · {offlineMode ? "modo contingencia" : "sincronizada"}
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {offlineMode
                ? "1 evento pendiente en cola cifrada"
                : "Última sincronización hace 2 minutos"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void syncGatehouse()}
          disabled={busy === "gatehouse-sync"}
        >
          <RefreshCw className={cn(busy === "gatehouse-sync" && "animate-spin")} size={15} />{" "}
          Sincronizar
        </Button>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle title="Visitantes de hoy" description="Solo datos mínimos y vigentes" />
            <SearchBox placeholder="Nombre, placa o unidad" />
          </div>
          <div className="grid gap-3 border-t border-[var(--line)] p-4 sm:p-5">
            {snapshot.visitors.map((visitor) => (
              <div
                className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] p-4 sm:flex-row sm:items-center"
                key={visitor.id}
              >
                <span className="grid size-11 place-items-center rounded-xl bg-[var(--wash)] text-[var(--accent)]">
                  <KeyRound size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-extrabold">{visitor.name}</p>
                    <StatusBadge status={visitor.status} />
                    {visitor.offlineCreated ? <Badge tone="info">Offline</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Doc. •••• {visitor.documentSuffix} · {visitor.unit}{" "}
                    {visitor.vehiclePlate ? `· ${visitor.vehiclePlate}` : ""}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-mono text-lg font-extrabold tracking-widest">
                    {visitor.accessCode}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    hasta {formatDateTime(visitor.validUntil)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="p-5">
            <SectionTitle title="Turno actual" />
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-[var(--ink)] font-bold text-white">
                JR
              </span>
              <div>
                <p className="font-extrabold">Jorge Ramírez</p>
                <p className="text-xs text-[var(--muted)]">14:00–22:00 · Principal</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniValue label="Ingresos" value="38" />
              <MiniValue label="Correspondencia" value="12" />
            </div>
          </Card>
          <Card className="p-5">
            <SectionTitle title="Privacidad offline" />
            <ul className="space-y-3 text-sm text-[var(--muted)]">
              <li className="flex gap-2">
                <ShieldCheck className="shrink-0 text-[var(--accent)]" size={16} />
                Autorizaciones vigentes, no el censo completo.
              </li>
              <li className="flex gap-2">
                <Fingerprint className="shrink-0 text-[var(--accent)]" size={16} />
                Eventos con ID determinístico y deduplicación.
              </li>
              <li className="flex gap-2">
                <Clock3 className="shrink-0 text-[var(--accent)]" size={16} />
                Borrado local por vencimiento.
              </li>
            </ul>
          </Card>
        </div>
      </div>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Autorizar visitante"
        description="Solo se comparte con portería la información mínima necesaria."
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <Field label="Nombre completo">
            <TextInput name="name" required minLength={3} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Últimos 4 dígitos del documento">
              <TextInput
                name="documentSuffix"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                required
              />
            </Field>
            <Field label="Unidad destino">
              <TextInput name="unit" defaultValue="T1 · 301" required />
            </Field>
          </div>
          <Field label="Placa (opcional)">
            <TextInput name="plate" maxLength={8} placeholder="ABC123" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Desde">
              <TextInput
                name="from"
                type="datetime-local"
                defaultValue="2026-07-19T14:00"
                required
              />
            </Field>
            <Field label="Hasta">
              <TextInput
                name="until"
                type="datetime-local"
                defaultValue="2026-07-19T20:00"
                required
              />
            </Field>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy === "visitor"}>
              {busy === "visitor" ? "Generando…" : "Generar autorización"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function MiniValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--wash)] p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-extrabold">{value}</p>
    </div>
  );
}

export function MaintenancePage() {
  const { snapshot, createWorkOrder, busy } = useData();
  const [open, setOpen] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await createWorkOrder({
      asset: formValue(form, "asset"),
      title: formValue(form, "title"),
      provider: formValue(form, "provider"),
      scheduledDate: formValue(form, "date"),
      estimatedMinor: Math.round(Number(formValue(form, "amount")) * 100),
      priority: formValue(form, "priority") as "routine" | "important" | "critical"
    });
    if (result) setOpen(false);
  }
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Activos conectados"
        title="Mantenimiento"
        description="Planes, órdenes, proveedores, evidencias y presupuesto conectados al mismo activo."
        action={{ label: "Nueva orden", icon: Plus, onClick: () => setOpen(true) }}
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={Wrench}
          label="Órdenes abiertas"
          value={String(snapshot.workOrders.filter((item) => item.status !== "completed").length)}
          detail="1 de prioridad crítica"
        />
        <SummaryCard
          icon={BadgeCheck}
          label="Preventivo al día"
          value="94%"
          detail="Meta: 95%"
          tone="teal"
        />
        <SummaryCard
          icon={Banknote}
          label="Costo del mes"
          value="$27,5 M"
          detail="8% bajo presupuesto"
          tone="teal"
        />
      </div>
      <Card className="p-5 sm:p-6">
        <SectionTitle
          title="Órdenes de trabajo"
          description="Priorizadas por criticidad y fecha"
          action={
            <div className="flex gap-2">
              <SearchBox placeholder="Orden, activo o proveedor" />
              <IconButton label="Filtrar">
                <Filter size={17} />
              </IconButton>
            </div>
          }
        />
        <div className="grid gap-3">
          {snapshot.workOrders.map((order) => (
            <div
              className="grid gap-4 rounded-2xl border border-[var(--line)] p-4 lg:grid-cols-[auto_1fr_auto_auto] lg:items-center"
              key={order.id}
            >
              <span
                className={cn(
                  "grid size-11 place-items-center rounded-xl",
                  order.priority === "critical"
                    ? "bg-red-50 text-red-600"
                    : "bg-[var(--accent-soft)] text-[var(--accent)]"
                )}
              >
                <Wrench size={19} />
              </span>
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-extrabold text-[var(--accent)]">{order.code}</span>
                  <StatusBadge status={order.priority} />
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1.5 font-extrabold">{order.title}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {order.asset} · {order.provider}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Programada</p>
                <p className="mt-1 text-sm font-bold">{formatDate(order.scheduledDate)}</p>
              </div>
              <div className="text-left lg:text-right">
                <p className="text-xs text-[var(--muted)]">Estimado</p>
                <p className="mt-1 font-extrabold">{formatCop(order.estimatedMinor)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Nueva orden de trabajo"
        description="Vincula activo, proveedor, fecha y costo estimado desde el inicio."
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <Field label="Activo">
            <TextInput name="asset" placeholder="Ej. Ascensor Torre 2" required />
          </Field>
          <Field label="Trabajo requerido">
            <TextInput name="title" required minLength={5} />
          </Field>
          <Field label="Proveedor">
            <TextInput name="provider" required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Fecha">
              <TextInput name="date" type="date" defaultValue="2026-07-28" required />
            </Field>
            <Field label="Estimado COP">
              <TextInput
                name="amount"
                type="number"
                min="0"
                step="1000"
                defaultValue="450000"
                required
              />
            </Field>
            <Field label="Prioridad">
              <SelectInput name="priority">
                <option value="routine">Rutina</option>
                <option value="important">Importante</option>
                <option value="critical">Crítica</option>
              </SelectInput>
            </Field>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy === "work-order"}>
              {busy === "work-order" ? "Creando…" : "Crear orden"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function AssembliesPage() {
  const { snapshot } = useData();
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Gobierno reproducible"
        title="Asambleas"
        description="Convocatorias, poderes, quórum por coeficiente, votaciones y actas verificables."
        action={{ label: "Programar asamblea", icon: Plus, onClick: () => undefined }}
      />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {snapshot.assemblies.map((assembly) => (
            <Card className="p-5 sm:p-6" key={assembly.id}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={assembly.status} />
                    <Badge tone="info">{assembly.mode}</Badge>
                  </div>
                  <h2 className="mt-3 text-lg font-extrabold">{assembly.title}</h2>
                  <p className="mt-1.5 flex items-center gap-2 text-sm text-[var(--muted)]">
                    <CalendarDays size={15} />
                    {formatDateTime(assembly.date)}
                  </p>
                </div>
                <Button size="sm" variant="secondary">
                  Abrir expediente <ArrowRight size={15} />
                </Button>
              </div>
              <div className="mt-5 grid gap-4 border-t border-[var(--line)] pt-5 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-bold uppercase text-[var(--muted)]">Quórum</p>
                  <p className="mt-1 text-xl font-extrabold">{assembly.quorumPercent}%</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-[var(--muted)]">Representación</p>
                  <p className="mt-1 text-xl font-extrabold">
                    {assembly.representedUnits} / {assembly.totalUnits}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-[var(--muted)]">
                    Votaciones abiertas
                  </p>
                  <p className="mt-1 text-xl font-extrabold">{assembly.openVotes}</p>
                </div>
              </div>
              <div className="mt-4">
                <Progress label={`Quórum de ${assembly.title}`} value={assembly.quorumPercent} />
              </div>
            </Card>
          ))}
        </div>
        <div className="space-y-5">
          <Card className="p-5">
            <SectionTitle title="Integridad de decisión" />
            <div className="space-y-4">
              <TrustItem
                icon={Fingerprint}
                title="Un voto por unidad"
                detail="Coeficiente versionado al momento del voto."
              />
              <TrustItem
                icon={History}
                title="Historia inmutable"
                detail="Poderes, quórum y decisiones como eventos."
              />
              <TrustItem
                icon={FileCheck2}
                title="Acta reproducible"
                detail="Resultado reconstruible desde la evidencia."
              />
            </div>
          </Card>
          <Card className="bg-[var(--ink)] p-5 text-white">
            <Vote size={24} className="text-[var(--eve-cian)]" />
            <h3 className="mt-4 font-extrabold">Próxima convocatoria</h3>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Faltan 98 unidades por confirmar para la asamblea extraordinaria.
            </p>
            <Button
              className="mt-4 bg-white text-[var(--ink)] hover:bg-[var(--eve-hielo)]"
              size="sm"
            >
              Revisar entregas
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TrustItem({
  icon: Icon,
  title,
  detail
}: {
  icon: typeof Fingerprint;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon size={17} />
      </span>
      <div>
        <p className="text-sm font-extrabold">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</p>
      </div>
    </div>
  );
}

export function DocumentsPage() {
  const { snapshot } = useData();
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Biblioteca versionada"
        title="Documentos"
        description="Una fuente vigente, permisos por audiencia y retención trazable."
        action={{ label: "Subir documento", icon: Plus, onClick: () => undefined }}
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={FileText}
          label="Documentos"
          value={String(snapshot.documents.length)}
          detail="12 categorías"
        />
        <SummaryCard
          icon={FileClock}
          label="Por vencer"
          value={String(snapshot.documents.filter((item) => item.status === "expiring").length)}
          detail="Próximo en 43 días"
        />
        <SummaryCard
          icon={ShieldCheck}
          label="Con acceso restringido"
          value="8"
          detail="Consejo o administración"
          tone="teal"
        />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle title="Biblioteca" description="Versiones vigentes y archivo histórico" />
          <div className="flex gap-2">
            <SearchBox placeholder="Buscar documento" />
            <IconButton label="Filtrar">
              <Filter size={17} />
            </IconButton>
          </div>
        </div>
        <TableShell>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="bg-[var(--wash)]/60 text-xs uppercase text-[var(--muted)]">
                <th className="px-5 py-3 font-bold">Documento</th>
                <th className="px-4 py-3 font-bold">Categoría</th>
                <th className="px-4 py-3 font-bold">Versión</th>
                <th className="px-4 py-3 font-bold">Audiencia</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {snapshot.documents.map((document) => (
                <tr className="border-t border-[var(--line)]" key={document.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-red-50 text-red-600">
                        <FileText size={18} />
                      </span>
                      <div>
                        <p className="font-extrabold">{document.name}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Actualizado {formatDate(document.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[var(--muted)]">{document.category}</td>
                  <td className="px-4 py-4 font-bold">v{document.version}</td>
                  <td className="px-4 py-4 capitalize text-[var(--muted)]">
                    {document.visibility === "residents"
                      ? "Residentes"
                      : document.visibility === "council"
                        ? "Consejo"
                        : "Administración"}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={document.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <IconButton label={`Descargar ${document.name}`}>
                      <Download size={17} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </Card>
    </div>
  );
}

export function AuditPage() {
  const { snapshot } = useData();
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Confianza legible"
        title="Auditoría"
        description="Quién hizo qué, cuándo, sobre qué recurso y con qué resultado; sin editar la historia."
        secondaryAction={
          <Button variant="secondary">
            <Download size={16} /> Exportar evidencia
          </Button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle
              title="Eventos recientes"
              description="Actividad del tenant, ordenada por fecha"
            />
            <div className="flex gap-2">
              <SearchBox placeholder="Actor, acción o recurso" />
              <IconButton label="Filtrar">
                <Filter size={17} />
              </IconButton>
            </div>
          </div>
          <div className="mt-4 space-y-1">
            {snapshot.audit.map((event, index) => (
              <div className="relative flex gap-4 pb-6" key={event.id}>
                {index < snapshot.audit.length - 1 ? (
                  <span className="absolute left-[1.18rem] top-10 h-[calc(100%-1rem)] w-px bg-[var(--line)]" />
                ) : null}
                <span
                  className={cn(
                    "z-10 grid size-10 shrink-0 place-items-center rounded-full border-4 border-white",
                    event.result === "denied"
                      ? "bg-red-100 text-red-600"
                      : "bg-[var(--accent-soft)] text-[var(--accent)]"
                  )}
                >
                  {event.result === "denied" ? (
                    <AlertCircle size={17} />
                  ) : (
                    <CheckCircle2 size={17} />
                  )}
                </span>
                <div className="min-w-0 flex-1 rounded-2xl border border-[var(--line)] p-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row">
                    <div>
                      <p className="text-sm font-extrabold">{event.action}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {event.actor} · {event.resource}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-[var(--muted)]">
                      {formatDateTime(event.occurredAt)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-5 text-[var(--muted)]">{event.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="p-5">
            <SectionTitle title="Cobertura" />
            <div className="space-y-3">
              <ReconciliationRow label="Eventos últimos 30 días" value="12.481" />
              <ReconciliationRow label="Accesos denegados" value="7" />
              <ReconciliationRow label="Eventos sin actor" value="0" success />
            </div>
          </Card>
          <Card className="p-5">
            <PackageCheck className="text-[var(--accent)]" size={24} />
            <h3 className="mt-4 font-extrabold">Exportación íntegra</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Descarga datos, adjuntos, versiones y manifiesto de integridad en un formato legible
              fuera de EveConecta.
            </p>
            <Button className="mt-4" size="sm" variant="secondary">
              Preparar paquete
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
