"use client";

import type {
  AssemblyAttendeeQuality,
  AssemblyItem,
  AssemblyMinutesOverview,
  SaveAssemblyMinutes
} from "@/lib/contracts";
import { Badge, Button, Card, EmptyState } from "@/lib/ui";
import { BookOpenCheck, FileSignature, Lock, Send, Signature } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Field, SelectInput, TextArea } from "./form-field";

const qualityLabels: Record<AssemblyAttendeeQuality, string> = {
  propietario: "Propietario",
  apoderado: "Apoderado",
  residente_con_voz: "Residente con voz",
  invitado: "Invitado"
};

const decisionTypeLabels: Record<string, string> = {
  informative: "Informativo",
  economic: "Económica",
  non_economic: "No económica",
  qualified: "Mayoría calificada"
};

const votingRuleLabels: Record<string, string> = {
  none: "Sin votación",
  unit: "Un voto por unidad",
  coefficient: "Por coeficiente representado",
  qualified_coefficient: "Mayoría calificada · total de coeficientes"
};

const minutesStatusLabels: Record<string, string> = {
  draft: "Borrador",
  signed: "Firmada",
  published: "Publicada"
};

function minutesStatusTone(status: string): "success" | "warning" | "neutral" {
  if (status === "published") return "success";
  if (status === "signed") return "warning";
  return "neutral";
}

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

function MinutesForm({
  overview,
  busy,
  assemblyId,
  onSave
}: {
  overview: AssemblyMinutesOverview;
  busy: string | null;
  assemblyId: string;
  onSave: (input: SaveAssemblyMinutes) => Promise<unknown>;
}) {
  const [presidentePersonaId, setPresidentePersonaId] = useState(
    overview.minutes?.presidentePersonaId ?? ""
  );
  const [secretarioPersonaId, setSecretarioPersonaId] = useState(
    overview.minutes?.secretarioPersonaId ?? ""
  );
  const [resumen, setResumen] = useState(overview.minutes?.resumen ?? "");
  const [error, setError] = useState<string | null>(null);
  const busyKey = `assembly-minutes-save-${assemblyId}`;

  const attendeeOptions = overview.attendees.filter(
    (attendee) => attendee.personaId && attendee.personaNombre
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!presidentePersonaId || !secretarioPersonaId) {
      setError("Selecciona presidencia y secretaría.");
      return;
    }
    if (presidentePersonaId === secretarioPersonaId) {
      setError("Presidencia y secretaría deben ser personas distintas.");
      return;
    }
    if (resumen.trim().length < 20) {
      setError("El resumen debe tener al menos 20 caracteres.");
      return;
    }
    const result = await onSave({ presidentePersonaId, secretarioPersonaId, resumen });
    if (!result) setError("No fue posible guardar el acta; revisa los datos.");
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Presidencia">
          <SelectInput
            onChange={(event) => setPresidentePersonaId(event.target.value)}
            value={presidentePersonaId}
          >
            <option value="">Selecciona un asistente…</option>
            {attendeeOptions.map((attendee) => (
              <option key={attendee.id} value={attendee.personaId}>
                {attendee.personaNombre} · {qualityLabels[attendee.calidad]}
                {attendee.unidadCodigo ? ` · ${attendee.unidadCodigo}` : ""}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Secretaría">
          <SelectInput
            onChange={(event) => setSecretarioPersonaId(event.target.value)}
            value={secretarioPersonaId}
          >
            <option value="">Selecciona un asistente…</option>
            {attendeeOptions.map((attendee) => (
              <option key={attendee.id} value={attendee.personaId}>
                {attendee.personaNombre} · {qualityLabels[attendee.calidad]}
                {attendee.unidadCodigo ? ` · ${attendee.unidadCodigo}` : ""}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <Field hint="Mínimo 20 caracteres." label="Resumen de la sesión">
        <TextArea
          minLength={20}
          maxLength={4000}
          onChange={(event) => setResumen(event.target.value)}
          placeholder="Desarrollo de la sesión, deliberaciones e intervenciones relevantes…"
          required
          rows={5}
          value={resumen}
        />
      </Field>
      {error ? (
        <p className="text-sm font-semibold text-[var(--eve-error)]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button disabled={busy === busyKey} type="submit">
          {busy === busyKey ? "Guardando…" : "Guardar acta"}
        </Button>
      </div>
    </form>
  );
}

function ReconstructedContent({ overview }: { overview: AssemblyMinutesOverview }) {
  if (!overview.attendees.length && !overview.agendaItems.length) return null;
  return (
    <div className="space-y-4">
      <Card className="p-5 hover:translate-y-0">
        <div className="flex items-center gap-2">
          <BookOpenCheck size={19} className="text-[var(--accent)]" />
          <h3 className="font-extrabold">Asistentes y poderes</h3>
        </div>
        <div className="mt-3 divide-y divide-[var(--line)]">
          {overview.attendees.map((attendee) => (
            <div className="flex items-center justify-between gap-3 py-2 text-sm" key={attendee.id}>
              <div>
                <p className="font-semibold">{attendee.personaNombre ?? "—"}</p>
                <p className="text-xs text-[var(--muted)]">
                  {qualityLabels[attendee.calidad]}
                  {attendee.unidadCodigo ? ` · ${attendee.unidadCodigo}` : ""}
                  {attendee.representaNombre ? ` · en representación de ${attendee.representaNombre}` : ""}
                </p>
              </div>
              <span className="text-xs font-bold text-[var(--muted)]">
                coef. {attendee.coeficienteAplicado}
              </span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5 hover:translate-y-0">
        <div className="flex items-center gap-2">
          <Signature size={19} className="text-[var(--accent)]" />
          <h3 className="font-extrabold">Orden del día y resultado</h3>
        </div>
        <div className="mt-3 space-y-3">
          {overview.agendaItems.map((item) => (
            <div className="rounded-xl border border-[var(--line)] p-3" key={item.id}>
              <p className="text-sm font-bold">{item.title}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {decisionTypeLabels[item.decisionType]} · {votingRuleLabels[item.votingRule]}
              </p>
              {item.tally ? (
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <span className="rounded-lg bg-[#F0FDF4] p-2 font-bold text-[var(--eve-exito)]">
                    Sí {item.tally.yesUnits}
                  </span>
                  <span className="rounded-lg bg-[#FEF2F2] p-2 font-bold text-[var(--eve-error)]">
                    No {item.tally.noUnits}
                  </span>
                  <span className="rounded-lg bg-[var(--wash)] p-2 font-bold text-[var(--muted)]">
                    Abst. {item.tally.abstainUnits}
                  </span>
                </div>
              ) : null}
              {item.tally?.approved !== null && item.tally?.approved !== undefined ? (
                <Badge className="mt-2" tone={item.tally.approved ? "success" : "warning"}>
                  {item.tally.approved ? "Aprobado" : "No aprobado"}
                </Badge>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function AssemblyMinutesPanel({
  assemblyId,
  assemblyStatus,
  overview,
  loading,
  canManage,
  busy,
  onSave,
  onSign,
  onPublish
}: {
  assemblyId: string;
  assemblyStatus: AssemblyItem["status"];
  overview: AssemblyMinutesOverview | null;
  loading: boolean;
  canManage: boolean;
  busy: string | null;
  onSave: (input: SaveAssemblyMinutes) => Promise<unknown>;
  onSign: () => Promise<unknown>;
  onPublish: () => Promise<unknown>;
}) {
  if (loading || !overview) {
    return (
      <Card className="p-5 hover:translate-y-0">
        <p className="text-sm text-[var(--muted)]">Cargando acta…</p>
      </Card>
    );
  }

  if (assemblyStatus === "scheduled") {
    return (
      <EmptyState
        icon={<FileSignature size={20} />}
        title="El acta se redacta después de iniciar la asamblea"
        description="Inicia la asamblea desde el encabezado del expediente para habilitar el acta."
      />
    );
  }

  const minutes = overview.minutes;
  const status = minutes?.status ?? "draft";

  return (
    <div className="space-y-4">
      <Card className="p-5 hover:translate-y-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Signature size={19} className="text-[var(--accent)]" />
            <h3 className="font-extrabold">Acta de la sesión</h3>
          </div>
          <Badge tone={minutesStatusTone(status)}>{minutesStatusLabels[status]}</Badge>
        </div>

        {canManage && status === "draft" ? (
          <div className="mt-4">
            <MinutesForm assemblyId={assemblyId} busy={busy} onSave={onSave} overview={overview} />
          </div>
        ) : minutes ? (
          <div className="mt-4 space-y-3 text-sm">
            <p>
              <span className="font-bold">Presidencia:</span> {minutes.presidenteNombre ?? "—"}
              {!minutes.presidenteAcreditado ? (
                <span className="ml-2 text-xs font-semibold text-[var(--eve-alerta)]">
                  (ya no tiene acreditación activa)
                </span>
              ) : null}
            </p>
            <p>
              <span className="font-bold">Secretaría:</span> {minutes.secretarioNombre ?? "—"}
              {!minutes.secretarioAcreditado ? (
                <span className="ml-2 text-xs font-semibold text-[var(--eve-alerta)]">
                  (ya no tiene acreditación activa)
                </span>
              ) : null}
            </p>
            <p className="leading-6 text-[var(--muted)]">{minutes.resumen}</p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Todavía no hay un acta redactada para esta asamblea.
          </p>
        )}

        {canManage && status === "draft" && minutes ? (
          assemblyStatus === "closed" ? (
            <Button
              className="mt-4"
              disabled={busy === `assembly-minutes-sign-${assemblyId}`}
              onClick={() => {
                if (
                  window.confirm(
                    "Firmar el acta es definitivo: no podrá editarse después. ¿Continuar?"
                  )
                ) {
                  void onSign();
                }
              }}
              size="sm"
              variant="secondary"
            >
              {busy === `assembly-minutes-sign-${assemblyId}` ? "Firmando…" : "Firmar acta"}
            </Button>
          ) : (
            <p className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
              <Lock size={13} /> Cierra la asamblea desde el encabezado del expediente para poder
              firmar el acta.
            </p>
          )
        ) : null}

        {canManage && status === "signed" ? (
          <div className="mt-4 space-y-2">
            {minutes?.signedAt ? (
              <p className="text-xs text-[var(--muted)]">
                Firmada el {formatDateTime(minutes.signedAt)}
              </p>
            ) : null}
            <Button
              disabled={busy === `assembly-minutes-publish-${assemblyId}`}
              onClick={() => {
                if (
                  window.confirm(
                    "Publicar el acta la hace visible de forma permanente a consejo y residentes. ¿Continuar?"
                  )
                ) {
                  void onPublish();
                }
              }}
              size="sm"
              variant="secondary"
            >
              <Send size={15} />
              {busy === `assembly-minutes-publish-${assemblyId}` ? "Publicando…" : "Publicar acta"}
            </Button>
          </div>
        ) : null}

        {status === "published" && minutes?.publishedAt ? (
          <p className="mt-4 text-xs text-[var(--muted)]">
            Publicada el {formatDateTime(minutes.publishedAt)}
          </p>
        ) : null}
      </Card>

      {overview.attendees.length || overview.agendaItems.length ? (
        <ReconstructedContent overview={overview} />
      ) : !canManage ? (
        <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <Lock size={13} /> El contenido del acta se hace visible cuando administración la
          publica.
        </p>
      ) : null}
    </div>
  );
}
