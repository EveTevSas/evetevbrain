"use client";

import { BrandMark } from "@/components/brand-mark";
import { GradientBackground } from "@/components/ui/soft-pastel-blend";
import type { AssemblyTokenVoteItem, AssemblyTokenVoteState, VoteOption } from "@/lib/contracts";
import { Badge, Button, Card } from "@/lib/ui";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const statusLabels: Record<AssemblyTokenVoteItem["status"], string> = {
  not_started: "Todavía no se abre",
  open: "Abierta",
  closed: "Cerrada"
};

const optionLabels: Record<VoteOption, string> = {
  yes: "Sí",
  no: "No",
  abstain: "Abstención"
};

async function fetchState(token: string): Promise<AssemblyTokenVoteState> {
  const response = await fetch(`/api/v1/public/asamblea-voto?token=${encodeURIComponent(token)}`);
  const body = (await response.json().catch(() => null)) as
    | AssemblyTokenVoteState
    | { title?: string }
    | null;
  if (!response.ok) {
    throw new Error((body as { title?: string } | null)?.title ?? "El enlace no es válido.");
  }
  return body as AssemblyTokenVoteState;
}

function VoteItemCard({
  item,
  busy,
  onCast
}: {
  item: AssemblyTokenVoteItem;
  busy: boolean;
  onCast: (agendaItemId: string, option: VoteOption) => void;
}) {
  return (
    <Card className="p-4 hover:translate-y-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold">{item.title}</p>
        <Badge tone={item.status === "open" ? "warning" : item.status === "closed" ? "success" : "neutral"}>
          {statusLabels[item.status]}
        </Badge>
      </div>

      {item.myOption ? (
        <p className="mt-3 rounded-lg bg-[var(--wash)] p-3 text-sm font-semibold text-[var(--ink)]">
          Tu voto: {optionLabels[item.myOption]}
        </p>
      ) : null}

      {item.status === "open" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {(["yes", "no", "abstain"] as const).map((option) => (
            <Button
              disabled={busy}
              key={option}
              onClick={() => onCast(item.agendaItemId, option)}
              size="sm"
              variant={item.myOption === option ? "primary" : "secondary"}
            >
              {optionLabels[option]}
            </Button>
          ))}
        </div>
      ) : item.status === "closed" && !item.myOption ? (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Esta votación ya cerró y no alcanzaste a votar.
        </p>
      ) : item.status === "not_started" ? (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Espera a que la mesa abra este punto para poder votar.
        </p>
      ) : null}
    </Card>
  );
}

export default function VoteByLinkPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [state, setState] = useState<AssemblyTokenVoteState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setState(await fetchState(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "El enlace no es válido.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function castVote(agendaItemId: string, option: VoteOption) {
    setBusyItemId(agendaItemId);
    try {
      const response = await fetch("/api/v1/public/asamblea-voto", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, agendaItemId, option })
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { title?: string } | null;
        throw new Error(body?.title ?? "No fue posible registrar tu voto.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar tu voto.");
    } finally {
      setBusyItemId(null);
    }
  }

  return (
    <div className="relative min-h-screen w-full">
      <GradientBackground className="absolute inset-0" />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <BrandMark priority size={38} />
            <h1 className="text-xl font-extrabold text-[var(--ink)]">Votación de asamblea</h1>
          </div>

          {loading ? (
            <Card className="p-6 text-center hover:translate-y-0">
              <p className="text-sm text-[var(--muted)]">Cargando tu enlace de votación…</p>
            </Card>
          ) : error && !state ? (
            <Card className="p-6 text-center hover:translate-y-0">
              <p className="text-sm font-semibold text-[var(--eve-error)]" role="alert">
                {error}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Pídele a la administración un enlace nuevo si el que tienes ya no funciona.
              </p>
            </Card>
          ) : state ? (
            <div className="space-y-4">
              <Card className="p-5 hover:translate-y-0">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--accent)]">
                  {state.asambleaTitulo}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Votas por la unidad <strong>{state.unidadCodigo}</strong>
                  {state.representaNombre ? ` en representación de ${state.representaNombre}` : ""}.
                </p>
                {!state.asambleaEnCurso ? (
                  <p className="mt-3 rounded-lg bg-[var(--wash)] p-3 text-xs text-[var(--muted)]">
                    Esta asamblea no está en curso en este momento. Las votaciones abiertas
                    reaparecen aquí en cuanto la mesa las active.
                  </p>
                ) : null}
              </Card>

              {error ? (
                <p className="text-sm font-semibold text-[var(--eve-error)]" role="alert">
                  {error}
                </p>
              ) : null}

              {state.items.length ? (
                state.items.map((item) => (
                  <VoteItemCard
                    busy={busyItemId === item.agendaItemId}
                    item={item}
                    key={item.agendaItemId}
                    onCast={(agendaItemId, option) => void castVote(agendaItemId, option)}
                  />
                ))
              ) : (
                <Card className="p-6 text-center hover:translate-y-0">
                  <p className="text-sm text-[var(--muted)]">
                    Todavía no hay puntos por votar en esta asamblea.
                  </p>
                </Card>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
