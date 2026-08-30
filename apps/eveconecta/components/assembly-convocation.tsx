"use client";

import { communityContactChannels } from "@/lib/community-contacts";
import type {
  AssemblyConvocationRecipient,
  AssemblyItem,
  CommunityPerson,
  SendAssemblyEmailConvocation
} from "@/lib/contracts";
import { Badge, Button, Card } from "@/lib/ui";
import { Mail, MessageCircle, Phone, Search, Send, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

function statusLabel(status: AssemblyConvocationRecipient["emailStatus"]): string {
  const labels = {
    not_sent: "Sin enviar",
    queued: "En cola",
    sent: "Enviado",
    delivered: "Entregado",
    opened: "Consultado",
    failed: "Fallido"
  };
  return labels[status];
}

function statusTone(
  status: AssemblyConvocationRecipient["emailStatus"]
): "success" | "warning" | "info" | "neutral" {
  if (status === "opened" || status === "delivered") return "success";
  if (status === "queued" || status === "sent") return "info";
  if (status === "failed") return "warning";
  return "neutral";
}

export function AssemblyConvocationPanel({
  assembly,
  people,
  canManage,
  busy,
  onSendEmail
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  people: CommunityPerson[];
  canManage: boolean;
  busy: string | null;
  onSendEmail: (
    assemblyId: string,
    input: SendAssemblyEmailConvocation
  ) => Promise<AssemblyItem | null>;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const statusByPerson = useMemo(
    () =>
      new Map(
        assembly.dossier.convocationRecipients.map((recipient) => [recipient.personId, recipient])
      ),
    [assembly.dossier.convocationRecipients]
  );
  const residents = useMemo(
    () =>
      people.map((person) => ({
        person,
        channels: communityContactChannels(person),
        delivery: statusByPerson.get(person.id)
      })),
    [people, statusByPerson]
  );
  const filteredResidents = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es");
    if (!term) return residents;
    return residents.filter(({ person, channels }) =>
      [person.name, person.unit, channels.email, channels.phone].some((value) =>
        value.toLocaleLowerCase("es").includes(term)
      )
    );
  }, [query, residents]);
  const emailableResidents = filteredResidents.filter(({ channels }) => channels.hasEmail);
  const selectedCount = selected.size;
  const sending = busy === `assembly-convocation-email-${assembly.id}`;

  function toggle(personId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((current) => {
      const next = new Set(current);
      const ids = emailableResidents.map(({ person }) => person.id);
      const everySelected = ids.length > 0 && ids.every((id) => next.has(id));
      ids.forEach((id) => (everySelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  async function sendEmail() {
    const result = await onSendEmail(assembly.id, { personIds: [...selected] });
    if (result) setSelected(new Set());
  }

  if (!canManage) {
    return (
      <Card className="p-5 hover:translate-y-0">
        <div className="flex items-start gap-3">
          <UsersRound className="mt-0.5 text-[var(--accent)]" size={20} />
          <div>
            <h3 className="font-extrabold">Padrón de convocatoria</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Los datos de contacto y el lanzamiento por canales están reservados para la
              administración de la copropiedad.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:translate-y-0">
      <div className="border-b border-[var(--line)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-extrabold">Padrón de convocatoria</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Selecciona destinatarios, verifica sus canales y conserva la evidencia por persona.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">
              <Mail className="mr-1" size={13} /> Email disponible
            </Badge>
            <Badge tone="neutral">
              <MessageCircle className="mr-1" size={13} /> WhatsApp próximamente
            </Badge>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[var(--wash)] p-3">
            <p className="text-[11px] font-bold uppercase text-[var(--muted)]">Residentes</p>
            <p className="mt-1 text-lg font-extrabold">{residents.length}</p>
          </div>
          <div className="rounded-xl bg-[var(--wash)] p-3">
            <p className="text-[11px] font-bold uppercase text-[var(--muted)]">Con email</p>
            <p className="mt-1 text-lg font-extrabold">
              {residents.filter(({ channels }) => channels.hasEmail).length}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--wash)] p-3">
            <p className="text-[11px] font-bold uppercase text-[var(--muted)]">Con WhatsApp</p>
            <p className="mt-1 text-lg font-extrabold">
              {residents.filter(({ channels }) => channels.hasPhone).length}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              size={17}
            />
            <span className="sr-only">Buscar residente</span>
            <input
              className="focus-ring h-11 w-full rounded-xl border border-[var(--line)] bg-white pl-10 pr-3 text-sm"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar nombre, unidad, correo o teléfono"
              type="search"
              value={query}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={toggleAllVisible} size="sm" variant="secondary">
              {emailableResidents.every(({ person }) => selected.has(person.id)) &&
              emailableResidents.length
                ? "Quitar selección"
                : "Seleccionar con email"}
            </Button>
            <Button disabled={!selectedCount || sending} onClick={() => void sendEmail()} size="sm">
              <Send size={15} />
              {sending ? "Registrando envío…" : `Enviar por email (${selectedCount})`}
            </Button>
            <Button
              disabled
              size="sm"
              title="Disponible cuando se integre WhatsApp"
              variant="secondary"
            >
              <MessageCircle size={15} /> Enviar por WhatsApp
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
          En el ambiente local, el email se registra en una cola demostrativa con auditoría. La
          entrega externa se activará al conectar un proveedor transaccional.
        </p>
        {!assembly.dossier.convocationRecipients.length && assembly.dossier.delivery.sent ? (
          <p className="mt-2 rounded-lg bg-[#FFF7ED] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
            El consolidado superior proviene de los datos históricos del demo y todavía no tiene
            evidencia individual. Los nuevos envíos sí quedarán asociados a cada residente.
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-[var(--wash)] text-[11px] uppercase text-[var(--muted)]">
            <tr>
              <th className="w-12 px-5 py-3">
                <span className="sr-only">Seleccionar</span>
              </th>
              <th className="px-3 py-3">Residente</th>
              <th className="px-3 py-3">Unidad</th>
              <th className="px-3 py-3">Correo electrónico</th>
              <th className="px-3 py-3">WhatsApp</th>
              <th className="px-5 py-3">Estado email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {filteredResidents.map(({ person, channels, delivery }) => {
              const emailStatus = delivery?.emailStatus ?? "not_sent";
              return (
                <tr key={person.id}>
                  <td className="px-5 py-4 align-top">
                    <input
                      aria-label={`Seleccionar a ${person.name}`}
                      checked={selected.has(person.id)}
                      className="size-4 accent-[var(--eve-mezclado)]"
                      disabled={!channels.hasEmail}
                      onChange={() => toggle(person.id)}
                      type="checkbox"
                    />
                  </td>
                  <td className="px-3 py-4 align-top font-semibold">{person.name}</td>
                  <td className="px-3 py-4 align-top text-[var(--muted)]">{person.unit}</td>
                  <td className="px-3 py-4 align-top">
                    {channels.hasEmail ? (
                      <span className="inline-flex items-center gap-2">
                        <Mail className="text-[var(--accent)]" size={15} /> {channels.email}
                      </span>
                    ) : (
                      <span className="text-[var(--eve-error)]">Sin correo registrado</span>
                    )}
                  </td>
                  <td className="px-3 py-4 align-top">
                    {channels.hasPhone ? (
                      <span className="inline-flex items-center gap-2 text-[var(--muted)]">
                        <Phone size={15} /> {channels.phone}
                      </span>
                    ) : (
                      <span className="text-[var(--muted)]">Sin teléfono</span>
                    )}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <Badge tone={statusTone(emailStatus)}>{statusLabel(emailStatus)}</Badge>
                    {delivery?.emailUpdatedAt ? (
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        {new Intl.DateTimeFormat("es-CO", {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit"
                        }).format(new Date(delivery.emailUpdatedAt))}
                      </p>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
