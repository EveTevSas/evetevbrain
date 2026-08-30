"use client";

import type { ParkingSpotKind, VehicleAccessEventItem, VehicleAccessResult } from "@/lib/contracts";
import { Badge, Button, Card, EmptyState } from "@/lib/ui";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  Car,
  CircleParking,
  MapPin,
  Plus,
  ShieldCheck,
  ShieldX
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useData } from "./data-provider";
import { useAuthUser } from "./auth-user-provider";
import { Field, SelectInput, TextInput } from "./form-field";
import { Modal } from "./modal";

const eventDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit"
});

function formValue(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function parkingStatusLabel(status: "available" | "assigned" | "maintenance") {
  if (status === "assigned") return "Asignado";
  if (status === "maintenance") return "Fuera de servicio";
  return "Disponible";
}

function vehicleStatusLabel(status: "authorized" | "suspended" | "expired") {
  if (status === "suspended") return "Suspendido";
  if (status === "expired") return "Vencido";
  return "Autorizado";
}

function accessReasonLabel(reason: VehicleAccessEventItem["reason"]) {
  const labels: Record<VehicleAccessEventItem["reason"], string> = {
    registered_vehicle: "Vehículo permanente",
    authorized_visitor: "Visitante autorizado",
    suspended_vehicle: "Vehículo suspendido",
    expired_vehicle: "Registro vencido",
    expired_visitor: "Visita vencida",
    unknown_vehicle: "Sin registro vigente"
  };
  return labels[reason];
}

export function VehicleParkingManagement() {
  const { snapshot, createParkingSpot, createVehicle, busy } = useData();
  const { user } = useAuthUser();
  const [parkingOpen, setParkingOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [parkingKind, setParkingKind] = useState<ParkingSpotKind>("zone");

  async function submitParking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await createParkingSpot({
      code: formValue(form, "code").toUpperCase(),
      kind: parkingKind,
      sector: parkingKind === "zone" ? formValue(form, "sector").toUpperCase() : null,
      number: formValue(form, "number"),
      linkedUnit: parkingKind === "unit" ? formValue(form, "linkedUnit") : null,
      status: formValue(form, "status") as "available" | "maintenance"
    });
    if (result) setParkingOpen(false);
  }

  async function submitVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const validUntil = formValue(form, "validUntil");
    const result = await createVehicle({
      plate: formValue(form, "plate").toUpperCase(),
      kind: formValue(form, "kind") as "car" | "motorcycle" | "other",
      brand: formValue(form, "brand"),
      color: formValue(form, "color"),
      validUntil: validUntil || null
    });
    if (result) setVehicleOpen(false);
  }

  const parkingSpots = snapshot.parkingSpots ?? [];
  const vehicles = snapshot.vehicles ?? [];
  const availableParking = parkingSpots.filter((item) => item.status === "available");
  const canManageParking = user.role === "super_admin" || user.role === "admin_conjunto";
  const canRegisterVehicle = user.role === "residente";
  const resident = snapshot.people[0];

  return (
    <section className="mt-5" aria-labelledby="mobility-title">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
            Movilidad y acceso
          </p>
          <h2 id="mobility-title" className="mt-1 text-xl font-semibold text-[var(--ink)]">
            Vehículos y parqueaderos
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            El permiso de ingreso y la asignación de parqueadero se administran por separado.
          </p>
        </div>
        {canManageParking || canRegisterVehicle ? (
          <div className="flex flex-wrap gap-2">
            {canManageParking ? (
              <Button variant="secondary" onClick={() => setParkingOpen(true)}>
                <CircleParking size={16} /> Registrar parqueadero
              </Button>
            ) : null}
            {canRegisterVehicle ? (
              <Button onClick={() => setVehicleOpen(true)}>
                <Plus size={16} /> Registrar vehículo
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] p-5">
            <div>
              <h3 className="font-extrabold">Inventario de parqueaderos</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {availableParking.length} disponibles de {parkingSpots.length}
              </p>
            </div>
            <CircleParking className="text-[var(--accent)]" size={24} />
          </div>
          <div className="grid gap-3 p-4 sm:p-5">
            {parkingSpots.length ? (
              parkingSpots.map((parkingSpot) => (
                <article
                  className="flex flex-col gap-3 rounded-xl border border-[var(--line)] p-4 sm:flex-row sm:items-center"
                  key={parkingSpot.id}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--wash)] text-[var(--accent)]">
                    {parkingSpot.kind === "unit" ? <Building2 size={18} /> : <MapPin size={18} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-base font-extrabold">{parkingSpot.code}</p>
                      <Badge
                        tone={
                          parkingSpot.status === "available"
                            ? "success"
                            : parkingSpot.status === "maintenance"
                              ? "warning"
                              : "info"
                        }
                      >
                        {parkingStatusLabel(parkingSpot.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {parkingSpot.kind === "zone"
                        ? `Numerado por zona · ${parkingSpot.sector}`
                        : `Asociado a ${parkingSpot.linkedUnit}`}
                      {parkingSpot.assignedUnit ? ` · Asignado a ${parkingSpot.assignedUnit}` : ""}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                icon={<CircleParking size={20} />}
                title="Sin parqueaderos registrados"
                description="Agrega códigos por zona o vinculados a una casa o unidad."
              />
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] p-5">
            <div>
              <h3 className="font-extrabold">Vehículos permanentes</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {vehicles.filter((item) => item.accessStatus === "authorized").length} con ingreso
                vigente
              </p>
            </div>
            <Car className="text-[var(--accent)]" size={24} />
          </div>
          <div className="grid gap-3 p-4 sm:p-5">
            {vehicles.length ? (
              vehicles.map((vehicle) => (
                <article
                  className="flex flex-col gap-3 rounded-xl border border-[var(--line)] p-4 sm:flex-row sm:items-center"
                  key={vehicle.id}
                >
                  <span className="grid min-w-24 place-items-center rounded-lg border border-[var(--line)] bg-[var(--wash)] px-3 py-2 font-mono text-base font-extrabold tracking-wider">
                    {vehicle.plate}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold">{vehicle.resident}</p>
                      <Badge
                        tone={
                          vehicle.accessStatus === "authorized"
                            ? "success"
                            : vehicle.accessStatus === "suspended"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {vehicleStatusLabel(vehicle.accessStatus)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {vehicle.unit} · {vehicle.brand} {vehicle.color}
                      {vehicle.parkingCode
                        ? ` · Parqueadero ${vehicle.parkingCode}`
                        : " · Sin parqueadero asignado"}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                icon={<Car size={20} />}
                title="Sin vehículos registrados"
                description="Vincula una placa con una persona y su unidad para habilitar el ingreso."
              />
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={parkingOpen}
        onOpenChange={setParkingOpen}
        title="Registrar parqueadero"
        description="El código debe ser único dentro de la copropiedad. Ambos sistemas pueden convivir."
      >
        <form className="grid gap-4" onSubmit={(event) => void submitParking(event)}>
          <Field label="Sistema de identificación">
            <SelectInput
              name="kind"
              value={parkingKind}
              onChange={(event) => setParkingKind(event.target.value as ParkingSpotKind)}
            >
              <option value="zone">Numerado por zona, lote o manzana</option>
              <option value="unit">Asociado a una casa o unidad</option>
            </SelectInput>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Código visible"
              hint={parkingKind === "zone" ? "Ej. L1-5, M2-3 o A1" : "Ej. C18-1 o C18-2"}
            >
              <TextInput
                name="code"
                required
                maxLength={24}
                placeholder={parkingKind === "zone" ? "L1-5" : "C18-1"}
              />
            </Field>
            <Field label="Número del parqueadero">
              <TextInput name="number" required maxLength={12} placeholder="5" />
            </Field>
          </div>
          {parkingKind === "zone" ? (
            <Field
              label="Zona, lote o manzana"
              hint="Prefijo estructurado del código, por ejemplo L1, M2 o A."
            >
              <TextInput name="sector" required maxLength={20} placeholder="L1" />
            </Field>
          ) : (
            <Field label="Casa o unidad base">
              <SelectInput name="linkedUnit" required defaultValue="">
                <option value="" disabled>
                  Selecciona una unidad
                </option>
                {snapshot.people.map((person) => (
                  <option value={person.unit} key={person.id}>
                    {person.unit} · {person.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
          )}
          <Field label="Estado inicial">
            <SelectInput name="status" defaultValue="available">
              <option value="available">Disponible</option>
              <option value="maintenance">Fuera de servicio</option>
            </SelectInput>
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setParkingOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy === "parking-create"}>
              {busy === "parking-create" ? "Registrando…" : "Registrar parqueadero"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={vehicleOpen}
        onOpenChange={setVehicleOpen}
        title="Registrar vehículo"
        description="El vehículo quedará vinculado a tu perfil y unidad residencial."
      >
        <form className="grid gap-4" onSubmit={(event) => void submitVehicle(event)}>
          <div className="rounded-xl bg-[var(--wash)] p-4 text-sm text-[var(--muted)]">
            <p className="font-semibold text-[var(--ink)]">
              {resident ? `${resident.name} · ${resident.unit}` : "Tu unidad residencial"}
            </p>
            <p className="mt-1">
              El registro habilita el ingreso permanente. La administración gestiona por separado
              cualquier asignación de parqueadero.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Placa">
              <TextInput
                name="plate"
                required
                minLength={5}
                maxLength={8}
                pattern="[A-Za-z0-9]{5,8}"
                placeholder="ABC123"
              />
            </Field>
            <Field label="Tipo de vehículo">
              <SelectInput name="kind" defaultValue="car">
                <option value="car">Automóvil</option>
                <option value="motorcycle">Motocicleta</option>
                <option value="other">Otro</option>
              </SelectInput>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Marca">
              <TextInput name="brand" required minLength={2} placeholder="Renault" />
            </Field>
            <Field label="Color">
              <TextInput name="color" required minLength={2} placeholder="Gris" />
            </Field>
          </div>
          <Field label="Vigente hasta" hint="Déjalo vacío para vigencia indefinida.">
            <TextInput name="validUntil" type="date" min={new Date().toISOString().slice(0, 10)} />
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setVehicleOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy === "vehicle-create"}>
              {busy === "vehicle-create" ? "Registrando…" : "Registrar vehículo"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export function VehicleGatehousePanel() {
  const { snapshot, registerVehicleAccess, busy } = useData();
  const [result, setResult] = useState<VehicleAccessResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextResult = await registerVehicleAccess({
      plate: formValue(form, "plate").toUpperCase(),
      direction: formValue(form, "direction") as "entry" | "exit"
    });
    if (nextResult) setResult(nextResult);
  }

  const events = snapshot.vehicleAccessEvents ?? [];
  return (
    <section
      className="mb-5 grid gap-5 xl:grid-cols-[1fr_1.2fr]"
      aria-labelledby="vehicle-access-title"
    >
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <ShieldCheck size={21} />
          </span>
          <div>
            <h2 id="vehicle-access-title" className="text-lg font-extrabold">
              Validar acceso vehicular
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Consulta placas permanentes y autorizaciones temporales.
            </p>
          </div>
        </div>
        <form className="mt-5 grid gap-4" onSubmit={(event) => void submit(event)}>
          <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
            <Field label="Placa">
              <TextInput
                name="plate"
                required
                minLength={5}
                maxLength={8}
                pattern="[A-Za-z0-9]{5,8}"
                placeholder="ABC123"
                autoComplete="off"
              />
            </Field>
            <Field label="Movimiento">
              <SelectInput name="direction" defaultValue="entry">
                <option value="entry">Ingreso</option>
                <option value="exit">Salida</option>
              </SelectInput>
            </Field>
          </div>
          <Button type="submit" disabled={busy === "vehicle-access"}>
            {busy === "vehicle-access" ? "Validando…" : "Validar y registrar"}
          </Button>
        </form>
        {result ? (
          <div
            className={`mt-4 rounded-xl border p-4 ${
              result.allowed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
            }`}
            role="status"
          >
            <div className="flex items-start gap-3">
              {result.allowed ? (
                <ShieldCheck className="shrink-0 text-emerald-700" size={22} />
              ) : (
                <ShieldX className="shrink-0 text-red-700" size={22} />
              )}
              <div>
                <p className="font-extrabold">
                  {result.allowed ? "Acceso autorizado" : "Acceso denegado"}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">{result.message}</p>
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--line)] p-5">
          <h2 className="text-lg font-extrabold">Movimientos recientes</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Registro inmutable de decisiones de ingreso y salida.
          </p>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {events.slice(0, 6).map((event) => (
            <article className="flex items-center gap-3 p-4 sm:px-5" key={event.id}>
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  event.decision === "authorized"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {event.direction === "entry" ? (
                  <ArrowDownToLine size={18} />
                ) : (
                  <ArrowUpFromLine size={18} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono font-extrabold">{event.plate}</p>
                  <Badge tone={event.decision === "authorized" ? "success" : "danger"}>
                    {event.decision === "authorized" ? "Autorizado" : "Denegado"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {accessReasonLabel(event.reason)}
                  {event.unit ? ` · ${event.unit}` : ""}
                  {event.parkingCode ? ` · ${event.parkingCode}` : ""}
                </p>
              </div>
              <time className="shrink-0 text-xs font-semibold text-[var(--muted)]">
                {eventDateFormatter.format(new Date(event.occurredAt))}
              </time>
            </article>
          ))}
          {!events.length ? (
            <div className="p-5">
              <EmptyState
                icon={<Car size={20} />}
                title="Sin movimientos"
                description="Las validaciones de ingreso y salida aparecerán aquí."
              />
            </div>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
