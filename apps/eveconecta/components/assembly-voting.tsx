"use client";

import type {
  AssemblyAgendaItem,
  AssemblyAgendaVoting,
  AssemblyCapabilities,
  AssemblyOwnAccreditation,
  CastSelfServiceVote,
  CastVote,
  VoteOption
} from "@/lib/contracts";
import { Badge, Button, Card, EmptyState } from "@/lib/ui";
import { CircleSlash, Lock, Vote } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Field, SelectInput, TextInput } from "./form-field";

const votingRuleLabels: Record<AssemblyAgendaItem["votingRule"], string> = {
  none: "Sin votación",
  unit: "Un voto por unidad",
  coefficient: "Por coeficiente representado",
  qualified_coefficient: "Mayoría calificada · total de coeficientes"
};

const voteOptionLabels: Record<VoteOption, string> = {
  yes: "Sí",
  no: "No",
  abstain: "Abstención"
};

const statusLabels: Record<AssemblyAgendaVoting["status"], string> = {
  not_started: "Sin iniciar",
  open: "Abierta",
  closed: "Cerrada"
};

function statusTone(status: AssemblyAgendaVoting["status"]): "success" | "warning" | "neutral" {
  if (status === "closed") return "success";
  if (status === "open") return "warning";
  return "neutral";
}

function capabilityFor(
  rule: AssemblyAgendaItem["votingRule"],
  capabilities: AssemblyCapabilities
): boolean {
  if (rule === "unit") return capabilities.unit_voting;
  if (rule === "coefficient") return capabilities.coefficient_voting;
  if (rule === "qualified_coefficient") return capabilities.qualified_majorities;
  return false;
}

function VoteCastForm({
  itemId,
  busy,
  onCastVote
}: {
  itemId: string;
  busy: string | null;
  onCastVote: (itemId: string, input: CastVote) => Promise<unknown>;
}) {
  const [unidadCodigo, setUnidadCodigo] = useState("");
  const [option, setOption] = useState<VoteOption>("yes");
  const [error, setError] = useState<string | null>(null);
  const busyKey = `assembly-voting-cast-${itemId}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const result = await onCastVote(itemId, { unidadCodigo: unidadCodigo.trim(), option });
    if (result) setUnidadCodigo("");
    else setError("No fue posible registrar el voto; verifica la unidad y su acreditación.");
  }

  return (
    <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => void submit(event)}>
      <Field label="Unidad">
        <TextInput
          maxLength={20}
          minLength={1}
          onChange={(event) => setUnidadCodigo(event.target.value)}
          placeholder="Ej. 101"
          required
          value={unidadCodigo}
        />
      </Field>
      <Field label="Voto">
        <SelectInput
          onChange={(event) => setOption(event.target.value as VoteOption)}
          value={option}
        >
          {Object.entries(voteOptionLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </SelectInput>
      </Field>
      <div className="flex items-end">
        <Button className="w-full sm:w-auto" disabled={busy === busyKey} type="submit">
          {busy === busyKey ? "Registrando…" : "Registrar voto"}
        </Button>
      </div>
      {error ? (
        <p className="sm:col-span-3 text-sm font-semibold text-[var(--eve-error)]" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

// Aparece solo cuando el usuario autenticado tiene, entre sus propias
// acreditaciones (la suya y las que representa como apoderado), al menos una
// sin voto todavía en este punto — independiente del formulario de mesa de
// arriba, que sigue existiendo tal cual para canManage.
function SelfServiceVoteBlock({
  itemId,
  busy,
  accreditations,
  onCastSelfServiceVote
}: {
  itemId: string;
  busy: string | null;
  accreditations: AssemblyOwnAccreditation[];
  onCastSelfServiceVote: (itemId: string, input: CastSelfServiceVote) => Promise<unknown>;
}) {
  const pending = accreditations.filter(
    (accreditation) => !accreditation.votes.some((vote) => vote.agendaItemId === itemId)
  );
  if (!pending.length) return null;
  const busyKey = `assembly-voting-cast-self-${itemId}`;

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-3">
      <p className="text-xs font-bold text-[var(--accent)]">Vota ahora</p>
      {pending.map((accreditation) => (
        <div
          className="flex flex-wrap items-center justify-between gap-2"
          key={accreditation.id}
        >
          <p className="text-xs text-[var(--muted)]">
            {accreditation.unidadCodigo}
            {accreditation.representaNombre
              ? ` · representas a ${accreditation.representaNombre}`
              : ""}
          </p>
          <div className="flex gap-1.5">
            {(["yes", "no", "abstain"] as const).map((option) => (
              <Button
                disabled={busy === busyKey}
                key={option}
                onClick={() =>
                  void onCastSelfServiceVote(itemId, { accreditationId: accreditation.id, option })
                }
                size="sm"
                variant="secondary"
              >
                {voteOptionLabels[option]}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function VotingItemCard({
  item,
  voting,
  canManage,
  secretBallots,
  busy,
  myAccreditations,
  onOpen,
  onClose,
  onCastVote,
  onRevokeVote,
  onCastSelfServiceVote
}: {
  item: AssemblyAgendaItem;
  voting: AssemblyAgendaVoting | undefined;
  canManage: boolean;
  secretBallots: boolean;
  busy: string | null;
  myAccreditations: AssemblyOwnAccreditation[];
  onOpen: (itemId: string) => Promise<unknown>;
  onClose: (itemId: string) => Promise<unknown>;
  onCastVote: (itemId: string, input: CastVote) => Promise<unknown>;
  onRevokeVote: (itemId: string, voteId: string) => Promise<unknown>;
  onCastSelfServiceVote: (itemId: string, input: CastSelfServiceVote) => Promise<unknown>;
}) {
  const status = voting?.status ?? "not_started";
  const tally = voting?.tally;
  const roster = voting?.roster ?? null;
  const totalUnitsBasis = tally ? tally.yesUnits + tally.noUnits : 0;
  const totalCoefficientBasis = tally ? tally.yesCoefficient + tally.noCoefficient : 0;
  const isUnitBasis = item.votingRule === "unit";
  const approvalBase = isUnitBasis ? totalUnitsBasis : totalCoefficientBasis;
  const yesForApproval = tally ? (isUnitBasis ? tally.yesUnits : tally.yesCoefficient) : 0;
  const yesPercent = approvalBase > 0 ? Math.round((yesForApproval / approvalBase) * 100) : 0;

  return (
    <div className="rounded-xl border border-[var(--line)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{item.title}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {votingRuleLabels[item.votingRule]}
            {item.thresholdPercent ? ` · Umbral ${item.thresholdPercent}%` : ""}
          </p>
        </div>
        <Badge tone={statusTone(status)}>{statusLabels[status]}</Badge>
      </div>

      {tally ? (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <span className="rounded-lg bg-[#F0FDF4] p-2 font-bold text-[var(--eve-exito)]">
            Sí {isUnitBasis ? tally.yesUnits : tally.yesCoefficient.toFixed(2)}
          </span>
          <span className="rounded-lg bg-[#FEF2F2] p-2 font-bold text-[var(--eve-error)]">
            No {isUnitBasis ? tally.noUnits : tally.noCoefficient.toFixed(2)}
          </span>
          <span className="rounded-lg bg-[var(--wash)] p-2 font-bold text-[var(--muted)]">
            Abst. {isUnitBasis ? tally.abstainUnits : tally.abstainCoefficient.toFixed(2)}
          </span>
        </div>
      ) : null}

      {status === "open" ? (
        <SelfServiceVoteBlock
          accreditations={myAccreditations}
          busy={busy}
          itemId={item.id}
          onCastSelfServiceVote={onCastSelfServiceVote}
        />
      ) : null}

      {status === "closed" ? (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--wash)]/65 p-3">
          <p className="text-xs font-semibold text-[var(--muted)]">
            {yesPercent}% de aprobación sobre la base contabilizada
          </p>
          <Badge tone={tally?.approved ? "success" : "warning"}>
            {tally?.approved ? "Aprobado" : "No aprobado"}
          </Badge>
        </div>
      ) : null}

      {canManage && status === "not_started" ? (
        <Button
          className="mt-3"
          disabled={busy === `assembly-voting-open-${item.id}`}
          onClick={() => void onOpen(item.id)}
          size="sm"
          variant="secondary"
        >
          {busy === `assembly-voting-open-${item.id}` ? "Abriendo…" : "Abrir votación"}
        </Button>
      ) : null}

      {canManage && status === "open" ? (
        <div className="mt-3 space-y-3">
          <VoteCastForm busy={busy} itemId={item.id} onCastVote={onCastVote} />
          <Button
            disabled={busy === `assembly-voting-close-${item.id}`}
            onClick={() => {
              if (
                window.confirm(
                  "Cerrar la votación es definitivo: el punto no podrá reabrirse ni recibir más votos. ¿Continuar?"
                )
              ) {
                void onClose(item.id);
              }
            }}
            size="sm"
            variant="secondary"
          >
            {busy === `assembly-voting-close-${item.id}` ? "Cerrando…" : "Cerrar votación"}
          </Button>
        </div>
      ) : null}

      {roster ? (
        <div className="mt-4 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
          {roster.length ? (
            roster.map((record) => (
              <div
                className="flex items-center justify-between gap-3 p-3 text-sm"
                key={record.id}
              >
                <div>
                  <p className="font-semibold">{record.unidadCodigo}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {voteOptionLabels[record.option]} · coef. {record.coeficienteAplicado}
                  </p>
                </div>
                {canManage && status === "open" ? (
                  <button
                    className="focus-ring text-xs font-bold text-[var(--eve-error)] hover:underline"
                    disabled={busy === `assembly-voting-revoke-${record.id}`}
                    onClick={() => void onRevokeVote(item.id, record.id)}
                    type="button"
                  >
                    Revocar
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="p-3 text-xs text-[var(--muted)]">Todavía no hay votos registrados.</p>
          )}
        </div>
      ) : status !== "not_started" ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
          <Lock size={13} />
          {secretBallots
            ? "Votación secreta: el detalle por unidad permanece oculto para todos."
            : "El detalle por unidad solo lo puede ver la administración."}
        </p>
      ) : null}
    </div>
  );
}

export function AssemblyVotingPanel({
  agendaItems,
  voting,
  loading,
  canManage,
  capabilities,
  busy,
  myAccreditations,
  onOpen,
  onClose,
  onCastVote,
  onRevokeVote,
  onCastSelfServiceVote
}: {
  agendaItems: AssemblyAgendaItem[];
  voting: AssemblyAgendaVoting[] | null;
  loading: boolean;
  canManage: boolean;
  capabilities: AssemblyCapabilities;
  busy: string | null;
  myAccreditations: AssemblyOwnAccreditation[];
  onOpen: (itemId: string) => Promise<unknown>;
  onClose: (itemId: string) => Promise<unknown>;
  onCastVote: (itemId: string, input: CastVote) => Promise<unknown>;
  onRevokeVote: (itemId: string, voteId: string) => Promise<unknown>;
  onCastSelfServiceVote: (itemId: string, input: CastSelfServiceVote) => Promise<unknown>;
}) {
  const votableItems = agendaItems.filter(
    (item) => item.votingRule !== "none" && capabilityFor(item.votingRule, capabilities)
  );
  const votingByItemId = new Map((voting ?? []).map((entry) => [entry.agendaItemId, entry]));

  return (
    <Card className="p-5 hover:translate-y-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold">Votaciones</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            El resultado explica regla, denominador y umbral.
          </p>
        </div>
        <Badge tone="info">{votableItems.length} configuradas</Badge>
      </div>
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Cargando votaciones…</p>
        ) : votableItems.length ? (
          votableItems.map((item) => (
            <VotingItemCard
              busy={busy}
              canManage={canManage}
              item={item}
              key={item.id}
              myAccreditations={myAccreditations}
              onCastSelfServiceVote={onCastSelfServiceVote}
              onCastVote={onCastVote}
              onClose={onClose}
              onOpen={onOpen}
              onRevokeVote={onRevokeVote}
              secretBallots={capabilities.secret_ballots}
              voting={votingByItemId.get(item.id)}
            />
          ))
        ) : (
          <EmptyState
            icon={<Vote size={20} />}
            title="Sin votaciones configuradas"
            description="Los puntos informativos no requieren una decisión electrónica."
          />
        )}
      </div>
    </Card>
  );
}

export function VotingCapabilityNotice() {
  return (
    <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--wash)]/55 p-5 text-sm text-[var(--muted)]">
      <div className="flex items-center gap-2 font-bold text-[var(--ink)]">
        <CircleSlash size={17} className="text-[var(--accent)]" />
        Las votaciones digitales no están activas para esta copropiedad
      </div>
      <p className="mt-1.5 leading-5">
        La etapa sigue disponible, pero esta capacidad fue inactivada desde la configuración de
        Asambleas.
      </p>
    </div>
  );
}
