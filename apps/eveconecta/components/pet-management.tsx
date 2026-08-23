"use client";

import type { PetItem } from "@/lib/contracts";
import { PET_PHOTO_ACCEPT, validatePetPhoto } from "@/lib/pet-photo";
import { Badge, Button, Card, EmptyState } from "@/lib/ui";
import { Camera, Cat, Dog, ImagePlus, PawPrint, Plus } from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useAuthUser } from "./auth-user-provider";
import { useData } from "./data-provider";
import { Field, SelectInput, TextInput } from "./form-field";
import { Modal } from "./modal";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function formValue(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function petTypeLabel(type: PetItem["type"]) {
  return type === "dog" ? "Perro" : "Gato";
}

function petSizeLabel(size: PetItem["size"]) {
  if (size === "large") return "Grande";
  if (size === "medium") return "Mediano";
  return "Pequeño";
}

function PetAvatar({ pet, previewUrl }: { pet: PetItem; previewUrl?: string | null }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!pet.photoPath || previewUrl) {
      setSignedUrl(null);
      return () => {
        active = false;
      };
    }
    void getSupabaseBrowserClient()
      .storage.from("eveconecta-pet-photos")
      .createSignedUrl(pet.photoPath, 60 * 60)
      .then((result: { data: { signedUrl: string } | null }) => {
        if (active) setSignedUrl(result.data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [pet.photoPath, previewUrl]);

  const photoUrl = previewUrl ?? signedUrl;
  if (photoUrl) {
    return (
      <span
        aria-label={`Foto de ${pet.name}`}
        className="block size-16 shrink-0 rounded-2xl bg-cover bg-center shadow-sm"
        role="img"
        style={{ backgroundImage: `url(${JSON.stringify(photoUrl)})` }}
      />
    );
  }
  return (
    <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
      {pet.type === "dog" ? <Dog size={26} /> : <Cat size={26} />}
    </span>
  );
}

export function PetManagement() {
  const { snapshot, createPet, updatePetPhoto, updatePetStatus, busy } = useData();
  const { user } = useAuthUser();
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const isResident = user.role === "residente";
  const pets = snapshot.pets ?? [];

  useEffect(
    () => () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    },
    [photoPreviewUrl]
  );

  function closeRegistration() {
    setOpen(false);
    setPhoto(null);
    setPhotoError(null);
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(null);
  }

  function selectRegistrationPhoto(event: ChangeEvent<HTMLInputElement>) {
    const nextPhoto = event.target.files?.[0] ?? null;
    setPhotoError(null);
    if (!nextPhoto) return;
    const validationError = validatePetPhoto(nextPhoto);
    if (validationError) {
      setPhoto(null);
      setPhotoError(validationError);
      event.target.value = "";
      return;
    }
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhoto(nextPhoto);
    setPhotoPreviewUrl(URL.createObjectURL(nextPhoto));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await createPet(
      {
        type: formValue(form, "type") as "dog" | "cat",
        birthYear: Number(formValue(form, "birthYear")),
        size: formValue(form, "size") as "large" | "medium" | "small",
        name: formValue(form, "name"),
        status: formValue(form, "status") as "active" | "inactive"
      },
      photo ?? undefined
    );
    if (result) closeRegistration();
  }

  async function toggleStatus(pet: PetItem) {
    await updatePetStatus(pet.id, {
      status: pet.status === "active" ? "inactive" : "active"
    });
  }

  return (
    <section className="mt-5" aria-labelledby="pets-title">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--line)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
              Censo responsable
            </p>
            <h2 id="pets-title" className="mt-1 text-xl font-semibold text-[var(--ink)]">
              Mascotas de la propiedad
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {isResident
                ? "Registra cada perro o gato que viva en tu unidad y mantén vigente su estado."
                : "Cada residente registra y actualiza las mascotas de su propia unidad."}
            </p>
          </div>
          {isResident ? (
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} /> Registrar mascota
            </Button>
          ) : null}
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
          {pets.length ? (
            pets.map((pet) => (
              <article className="rounded-2xl border border-[var(--line)] p-4" key={pet.id}>
                <div className="flex items-start gap-3">
                  <PetAvatar pet={pet} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold">{pet.name}</h3>
                      <Badge tone={pet.status === "active" ? "success" : "neutral"}>
                        {pet.status === "active" ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {petTypeLabel(pet.type)} · {petSizeLabel(pet.size)} · Nació en {pet.birthYear}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {pet.resident} · {pet.unit}
                    </p>
                  </div>
                </div>
                {isResident ? (
                  <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--line)] pt-3">
                    <label className="focus-within:ring-2 focus-within:ring-[var(--accent)] inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#D7E3F0] bg-white px-3 text-sm font-semibold text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent-strong)]">
                      <Camera size={15} /> {pet.photoPath ? "Cambiar foto" : "Agregar foto"}
                      <input
                        accept={PET_PHOTO_ACCEPT}
                        aria-label={`${pet.photoPath ? "Cambiar" : "Agregar"} foto de ${pet.name}`}
                        className="sr-only"
                        disabled={busy === `pet-photo-${pet.id}`}
                        type="file"
                        onChange={(event) => {
                          const nextPhoto = event.target.files?.[0];
                          if (nextPhoto) void updatePetPhoto(pet, nextPhoto);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy === `pet-${pet.id}`}
                      onClick={() => void toggleStatus(pet)}
                    >
                      {busy === `pet-${pet.id}`
                        ? "Actualizando…"
                        : pet.status === "active"
                          ? "Inactivar"
                          : "Reactivar"}
                    </Button>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="sm:col-span-2 xl:col-span-3">
              <EmptyState
                icon={<PawPrint size={20} />}
                title="No hay mascotas registradas"
                description={
                  isResident
                    ? "Registra la primera mascota que viva en tu unidad."
                    : "Los registros aparecerán cuando los residentes los creen."
                }
              />
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={open}
        onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeRegistration())}
        title="Registrar mascota"
        description="Este registro queda vinculado únicamente a tu unidad residencial."
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <Field label="Foto de perfil" hint="Opcional. Imagen JPG, PNG o WebP de máximo 5 MB.">
            <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--wash)]/50 p-4 transition hover:border-[var(--accent)]">
              {photoPreviewUrl ? (
                <span
                  aria-label="Vista previa de la foto de la mascota"
                  className="block size-20 shrink-0 rounded-2xl bg-cover bg-center shadow-sm"
                  role="img"
                  style={{ backgroundImage: `url(${JSON.stringify(photoPreviewUrl)})` }}
                />
              ) : (
                <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-white text-[var(--accent)] shadow-sm">
                  <ImagePlus size={27} />
                </span>
              )}
              <span>
                <span className="block font-semibold text-[var(--ink)]">
                  {photo ? "Cambiar foto seleccionada" : "Seleccionar una foto"}
                </span>
                <span className="mt-1 block text-sm text-[var(--muted)]">
                  La imagen ayudará a identificar a la mascota.
                </span>
              </span>
              <input
                accept={PET_PHOTO_ACCEPT}
                className="sr-only"
                name="photo"
                type="file"
                onChange={selectRegistrationPhoto}
              />
            </label>
            {photoError ? (
              <p className="mt-2 text-sm font-medium text-[var(--eve-error)]" role="alert">
                {photoError}
              </p>
            ) : null}
          </Field>
          <Field label="Nombre de la mascota">
            <TextInput name="name" required minLength={2} maxLength={60} placeholder="Ej. Milo" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de mascota">
              <SelectInput name="type" defaultValue="dog">
                <option value="dog">Perro</option>
                <option value="cat">Gato</option>
              </SelectInput>
            </Field>
            <Field label="Año de nacimiento">
              <TextInput
                name="birthYear"
                type="number"
                inputMode="numeric"
                min="1900"
                max={new Date().getFullYear()}
                defaultValue={new Date().getFullYear()}
                required
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tamaño">
              <SelectInput name="size" defaultValue="medium">
                <option value="large">Grande</option>
                <option value="medium">Mediano</option>
                <option value="small">Pequeño</option>
              </SelectInput>
            </Field>
            <Field
              label="Estado"
              hint="Usa Inactivo cuando la mascota haya fallecido o ya no viva en la propiedad."
            >
              <SelectInput name="status" defaultValue="active">
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </SelectInput>
            </Field>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={closeRegistration}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy === "pet-create"}>
              {busy === "pet-create" ? "Registrando…" : "Registrar mascota"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
