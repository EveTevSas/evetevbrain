"use client";

import { ASSEMBLY_PROXY_ACCEPT, validateAssemblyProxy } from "@/lib/assembly-proxies";
import type {
  AccreditAssemblyAttendee,
  AssemblyAttendee,
  AssemblyAttendeeQuality,
  AssemblyItem,
  AssemblyVoteLink,
  CommunityPerson
} from "@/lib/contracts";
import { Badge, Button, Card, EmptyState } from "@/lib/ui";
import {
  Copy,
  Download,
  Fingerprint,
  Link2,
  Link2Off,
  ShieldOff,
  UploadCloud,
  UserPlus,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Field, SelectInput } from "./form-field";
import { Modal } from "./modal";

const qualityLabels: Record<AssemblyAttendeeQuality, string> = {
  propietario: "Propietario",
  apoderado: "Apoderado",
  residente_con_voz: "Residente con voz",
  invitado: "Invitado"
};

const qualityHints: Record<AssemblyAttendeeQuality, string> = {
  propietario: "Asiste el propietario vigente de la unidad; su coeficiente cuenta para el quórum.",
  apoderado: "Asiste con un poder del propietario vigente; su coeficiente cuenta para el quórum.",
  residente_con_voz: "Tiene voz pero no voto: no aporta coeficiente al quórum deliberatorio.",
  invitado: "No representa ninguna unidad ni aporta coeficiente."
};

function qualityTone(quality: AssemblyAttendeeQuality): "success" | "info" | "neutral" {
  if (quality === "propietario" || quality === "apoderado") return "success";
  if (quality === "residente_con_voz") return "info";
  return "neutral";
}

function AccreditationForm({
  open,
  onOpenChange,
  assembly,
  people,
  busy,
  onAccredit
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assembly: AssemblyItem;
  people: CommunityPerson[];
  busy: string | null;
  onAccredit: (
    input: Omit<AccreditAssemblyAttendee, "soportePath">,
    evidenceFile?: File
  ) => Promise<AssemblyAttendee | null>;
}) {
  const units = useMemo(
    () => Array.from(new Set(people.map((person) => person.unit))).sort(),
    [people]
  );
  const [calidad, setCalidad] = useState<AssemblyAttendeeQuality>("propietario");
  const [unit, setUnit] = useState(units[0] ?? "");
  const [personaId, setPersonaId] = useState(people[0]?.id ?? "");
  const [representaPersonaId, setRepresentaPersonaId] = useState("");
  const [canal, setCanal] = useState<"presencial" | "virtual">("presencial");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const owners = useMemo(
    () => people.filter((person) => person.unit === unit && person.kind === "owner"),
    [people, unit]
  );
  const attendeeChoices = useMemo(
    () => (calidad === "apoderado" ? people : people.filter((p) => p.unit === unit)),
    [calidad, people, unit]
  );
  const busyKey = `assembly-attendee-${assembly.id}`;

  // Autocorrige unidad/persona cuando el padrón llega tarde, cambia, o cuando
  // cambiar de calidad/unidad deja seleccionada una opción que ya no aplica —
  // un <select> controlado con un value sin <option> correspondiente queda
  // desincronizado entre lo que ve el operador y lo que se enviaría.
  useEffect(() => {
    if (!units.includes(unit)) setUnit(units[0] ?? "");
  }, [units, unit]);

  useEffect(() => {
    if (!attendeeChoices.some((person) => person.id === personaId)) {
      setPersonaId(attendeeChoices[0]?.id ?? "");
    }
  }, [attendeeChoices, personaId]);

  useEffect(() => {
    if (representaPersonaId && !owners.some((person) => person.id === representaPersonaId)) {
      setRepresentaPersonaId("");
    }
  }, [owners, representaPersonaId]);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    const validationError = validateAssemblyProxy(selected);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setFile(selected);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!personaId) {
      setError("Selecciona quién asiste.");
      return;
    }
    if (calidad === "apoderado" && !representaPersonaId) {
      setError("Selecciona a quién representa el apoderado.");
      return;
    }
    const result = await onAccredit(
      {
        calidad,
        personaId,
        unidadCodigo: calidad === "invitado" ? null : unit,
        representaPersonaId: calidad === "apoderado" ? representaPersonaId : null,
        canal
      },
      file ?? undefined
    );
    if (result) {
      setFile(null);
      onOpenChange(false);
    }
  }

  return (
    <Modal
      description="La unidad queda representada por una sola acreditación activa; corrige revocándola antes de registrar otra."
      onOpenChange={onOpenChange}
      open={open}
      title="Acreditar asistente"
    >
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <Field hint={qualityHints[calidad]} label="Calidad">
          <SelectInput
            onChange={(event) => {
              const next = event.target.value as AssemblyAttendeeQuality;
              setCalidad(next);
              setRepresentaPersonaId("");
            }}
            value={calidad}
          >
            {(Object.keys(qualityLabels) as AssemblyAttendeeQuality[]).map((value) => (
              <option key={value} value={value}>
                {qualityLabels[value]}
              </option>
            ))}
          </SelectInput>
        </Field>
        {calidad !== "invitado" ? (
          <Field label="Unidad">
            <SelectInput
              onChange={(event) => {
                setUnit(event.target.value);
                setRepresentaPersonaId("");
              }}
              value={unit}
            >
              {units.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </SelectInput>
          </Field>
        ) : null}
        <Field label={calidad === "invitado" ? "Invitado" : "Quién asiste"}>
          <SelectInput onChange={(event) => setPersonaId(event.target.value)} value={personaId}>
            {attendeeChoices.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} · {person.unit}
              </option>
            ))}
          </SelectInput>
        </Field>
        {calidad === "apoderado" ? (
          <Field
            hint={
              owners.length
                ? "Solo aparecen los propietarios vigentes de la unidad seleccionada."
                : "Esta unidad no tiene un propietario registrado en el padrón: regístralo en Comunidad antes de asignar el poder."
            }
            label="Representa a"
          >
            <SelectInput
              disabled={!owners.length}
              onChange={(event) => setRepresentaPersonaId(event.target.value)}
              value={representaPersonaId}
            >
              <option value="">
                {owners.length ? "Selecciona el propietario" : "Sin propietarios registrados"}
              </option>
              {owners.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        ) : null}
        <Field label="Canal">
          <SelectInput
            onChange={(event) => setCanal(event.target.value as "presencial" | "virtual")}
            value={canal}
          >
            <option value="presencial">Presencial</option>
            <option value="virtual">Virtual</option>
          </SelectInput>
        </Field>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[var(--line)] bg-[var(--wash)]/50 p-4 transition hover:border-[var(--accent)]">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[var(--accent)] shadow-sm">
            <UploadCloud size={21} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">
              {file ? file.name : "Adjuntar evidencia del poder (opcional)"}
            </span>
            <span className="mt-1 block text-xs text-[var(--muted)]">
              PDF, JPG o PNG · máximo 5 MB
            </span>
          </span>
          <input
            accept={ASSEMBLY_PROXY_ACCEPT}
            aria-label="Evidencia del poder"
            className="sr-only"
            onChange={selectFile}
            type="file"
          />
        </label>
        {error ? (
          <p className="text-sm font-semibold text-[var(--eve-error)]" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button disabled={busy === busyKey} type="submit">
            <UserPlus size={16} />
            {busy === busyKey ? "Acreditando…" : "Acreditar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function VoteLinkAction({
  attendeeId,
  busy,
  onGenerate,
  onRevoke
}: {
  attendeeId: string;
  busy: string | null;
  onGenerate: (accreditationId: string) => Promise<AssemblyVoteLink | null>;
  onRevoke: (accreditationId: string) => Promise<{ acreditacionId: string } | null>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const generateBusyKey = `assembly-vote-link-generate-${attendeeId}`;
  const revokeBusyKey = `assembly-vote-link-revoke-${attendeeId}`;

  async function generate() {
    setCopied(false);
    const result = await onGenerate(attendeeId);
    setToken(result?.token ?? null);
  }

  async function revoke() {
    const result = await onRevoke(attendeeId);
    if (result) {
      setToken(null);
    }
  }

  if (token) {
    const url = `${window.location.origin}/votar/${token}`;
    return (
      <div className="flex flex-col items-end gap-1.5 rounded-lg bg-[var(--wash)] p-2.5 text-right">
        <p className="text-[11px] font-semibold text-[var(--muted)]">
          Solo se muestra una vez — cópialo ahora.
        </p>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              void navigator.clipboard.writeText(url);
              setCopied(true);
            }}
            size="sm"
            variant="secondary"
          >
            <Copy size={13} /> {copied ? "Copiado" : "Copiar enlace"}
          </Button>
          <button
            className="focus-ring flex items-center gap-1 text-xs font-bold text-[var(--eve-error)] hover:underline"
            disabled={busy === revokeBusyKey}
            onClick={() => void revoke()}
            type="button"
          >
            <Link2Off size={13} /> Revocar
          </button>
        </div>
      </div>
    );
  }

  return (
    <Button
      disabled={busy === generateBusyKey}
      onClick={() => void generate()}
      size="sm"
      variant="secondary"
    >
      <Link2 size={14} />
      {busy === generateBusyKey ? "Generando…" : "Enlace de voto"}
    </Button>
  );
}

export function AssemblyAccreditationPanel({
  assembly,
  people,
  attendees,
  attendeesLoading,
  canManage,
  busy,
  onAccredit,
  onRevoke,
  onDownloadProxy,
  onGenerateVoteLink,
  onRevokeVoteLink
}: {
  assembly: AssemblyItem;
  people: CommunityPerson[];
  attendees: AssemblyAttendee[];
  attendeesLoading: boolean;
  canManage: boolean;
  busy: string | null;
  onAccredit: (
    input: Omit<AccreditAssemblyAttendee, "soportePath">,
    evidenceFile?: File
  ) => Promise<AssemblyAttendee | null>;
  onRevoke: (attendeeId: string) => Promise<{ id: string } | null>;
  onDownloadProxy: (attendee: AssemblyAttendee) => Promise<void>;
  onGenerateVoteLink: (accreditationId: string) => Promise<AssemblyVoteLink | null>;
  onRevokeVoteLink: (accreditationId: string) => Promise<{ acreditacionId: string } | null>;
}) {
  const [formOpen, setFormOpen] = useState(false);

  if (!canManage) {
    return (
      <Card className="p-5 hover:translate-y-0">
        <div className="flex items-start gap-3">
          <Fingerprint className="mt-0.5 text-[var(--accent)]" size={20} />
          <div>
            <h3 className="font-extrabold">Asistencia y poderes</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              El registro de asistentes está reservado para la administración de la copropiedad.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:translate-y-0">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-2">
          <Users className="text-[var(--accent)]" size={19} />
          <div>
            <h3 className="font-extrabold">Asistentes acreditados</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Una unidad, una acreditación activa a la vez.
            </p>
          </div>
        </div>
        <Button onClick={() => setFormOpen(true)} size="sm">
          <UserPlus size={16} /> Acreditar
        </Button>
      </div>
      <div className="border-t border-[var(--line)]">
        {attendeesLoading ? (
          <p className="p-5 text-sm text-[var(--muted)]">Cargando asistentes…</p>
        ) : attendees.length ? (
          <div className="divide-y divide-[var(--line)]">
            {attendees.map((attendee) => (
              <div
                className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                key={attendee.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={qualityTone(attendee.calidad)}>
                      {qualityLabels[attendee.calidad]}
                    </Badge>
                    {attendee.unidadCodigo ? (
                      <span className="text-xs font-bold text-[var(--muted)]">
                        {attendee.unidadCodigo}
                      </span>
                    ) : null}
                    <Badge tone="neutral">
                      {attendee.canal === "virtual" ? "Virtual" : "Presencial"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-bold">
                    {attendee.personaNombre ?? "Persona sin nombre registrado"}
                  </p>
                  {attendee.representaNombre ? (
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      Representa a {attendee.representaNombre}
                    </p>
                  ) : null}
                  {attendee.calidad === "propietario" || attendee.calidad === "apoderado" ? (
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      Coeficiente aplicado: {attendee.coeficienteAplicado.toFixed(4)}%
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {attendee.soportePath ? (
                    <Button
                      onClick={() => void onDownloadProxy(attendee)}
                      size="sm"
                      variant="secondary"
                    >
                      <Download size={14} /> Poder
                    </Button>
                  ) : null}
                  {attendee.calidad === "propietario" || attendee.calidad === "apoderado" ? (
                    <VoteLinkAction
                      attendeeId={attendee.id}
                      busy={busy}
                      onGenerate={onGenerateVoteLink}
                      onRevoke={onRevokeVoteLink}
                    />
                  ) : null}
                  <Button
                    disabled={busy === `assembly-attendee-revoke-${attendee.id}`}
                    onClick={() => void onRevoke(attendee.id)}
                    size="sm"
                    variant="secondary"
                  >
                    <ShieldOff size={14} />
                    {busy === `assembly-attendee-revoke-${attendee.id}` ? "Revocando…" : "Revocar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            description="Acredita al primer asistente para empezar a calcular el quórum real."
            icon={<Fingerprint size={20} />}
            title="Todavía no hay asistentes acreditados"
          />
        )}
      </div>
      <AccreditationForm
        assembly={assembly}
        busy={busy}
        onAccredit={onAccredit}
        onOpenChange={setFormOpen}
        open={formOpen}
        people={people}
      />
    </Card>
  );
}
