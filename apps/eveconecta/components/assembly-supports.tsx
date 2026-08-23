"use client";

import {
  ASSEMBLY_SUPPORT_ACCEPT,
  assemblySupportCategoryLabels,
  formatSupportSize,
  validateAssemblySupport
} from "@/lib/assembly-supports";
import type {
  AssemblyItem,
  AssemblySupportDocument,
  CreateAssemblySupport,
  UpdateAssemblySupportStatus
} from "@/lib/contracts";
import { Badge, Button, Card } from "@/lib/ui";
import {
  Archive,
  Download,
  FileCheck2,
  FileText,
  FileUp,
  RefreshCw,
  RotateCcw,
  Send,
  UploadCloud
} from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Field, SelectInput, TextInput } from "./form-field";
import { Modal } from "./modal";

type SupportCategory = CreateAssemblySupport["category"];

function categoryKeyFor(label: string): SupportCategory {
  const match = Object.entries(assemblySupportCategoryLabels).find(([, value]) => value === label);
  return (match?.[0] as SupportCategory | undefined) ?? "other";
}

function statusTone(
  status: AssemblySupportDocument["status"]
): "success" | "warning" | "neutral" | "info" {
  if (status === "published") return "success";
  if (status === "pending") return "warning";
  if (status === "archived") return "neutral";
  return "info";
}

function statusLabel(status: AssemblySupportDocument["status"]): string {
  const labels = {
    pending: "Pendiente",
    ready: "Listo para publicar",
    published: "Publicado",
    archived: "Archivado"
  };
  return labels[status];
}

function SupportUploadModal({
  assembly,
  existing,
  busy,
  open,
  onOpenChange,
  onUpload
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  existing: AssemblySupportDocument | null;
  busy: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (
    assemblyId: string,
    input: Omit<CreateAssemblySupport, "filePath" | "mimeType" | "sizeBytes">,
    file: File
  ) => Promise<AssemblySupportDocument | null>;
}) {
  const [documentId] = useState(() => existing?.id ?? crypto.randomUUID());
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState<SupportCategory>(
    existing ? categoryKeyFor(existing.category) : "other"
  );
  const [agendaItemId, setAgendaItemId] = useState(existing?.agendaItemId ?? "");
  const [error, setError] = useState<string | null>(null);
  const version = existing ? (existing.filePath ? existing.version + 1 : existing.version) : 1;
  const isFirstFileForExisting = Boolean(existing && !existing.filePath);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!selected) return;
    const validationError = validateAssemblySupport(selected);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setFile(selected);
    if (!name) setName(selected.name);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Selecciona el archivo que deseas vincular al expediente.");
      return;
    }
    const result = await onUpload(
      assembly.id,
      {
        documentId,
        name,
        category,
        agendaItemId: agendaItemId || null,
        version
      },
      file
    );
    if (result) onOpenChange(false);
  }

  return (
    <Modal
      description={
        isFirstFileForExisting
          ? "Completa este registro del expediente con su primer archivo descargable."
          : existing
            ? `El archivo quedará registrado como versión ${version}; la versión anterior conserva su trazabilidad.`
            : "Vincula el archivo al expediente y, opcionalmente, a un punto del orden del día."
      }
      onOpenChange={onOpenChange}
      open={open}
      title={
        isFirstFileForExisting
          ? "Adjuntar archivo"
          : existing
            ? "Cargar nueva versión"
            : "Subir soporte"
      }
    >
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[var(--line)] bg-[var(--wash)]/50 p-4 transition hover:border-[var(--accent)]">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[var(--accent)] shadow-sm">
            <UploadCloud size={21} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">
              {file ? file.name : "Seleccionar archivo"}
            </span>
            <span className="mt-1 block text-xs text-[var(--muted)]">
              {file
                ? `${formatSupportSize(file.size)} · versión ${version}`
                : "PDF, Word, Excel, JPG o PNG · máximo 15 MB"}
            </span>
          </span>
          <input
            accept={ASSEMBLY_SUPPORT_ACCEPT}
            aria-label="Archivo del soporte"
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
        <Field label="Nombre visible">
          <TextInput
            maxLength={180}
            minLength={3}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Informe de gestión 2026.pdf"
            required
            value={name}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoría">
            <SelectInput
              onChange={(event) => setCategory(event.target.value as SupportCategory)}
              value={category}
            >
              {Object.entries(assemblySupportCategoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Punto del orden del día">
            <SelectInput
              onChange={(event) => setAgendaItemId(event.target.value)}
              value={agendaItemId}
            >
              <option value="">Soporte general</option>
              {assembly.dossier.agendaItems.map((item, index) => (
                <option key={item.id} value={item.id}>
                  {index + 1}. {item.title}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="rounded-xl bg-[var(--wash)]/65 p-4 text-xs leading-5 text-[var(--muted)]">
          El archivo se almacena de forma privada, aislado por copropiedad y asamblea. Solo será
          visible para residentes cuando se publique.
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            Cancelar
          </Button>
          <Button disabled={busy === `assembly-support-${documentId}`} type="submit">
            <FileUp size={16} />
            {busy === `assembly-support-${documentId}`
              ? "Cargando…"
              : isFirstFileForExisting
                ? "Adjuntar archivo"
                : existing
                  ? `Registrar versión ${version}`
                  : "Subir soporte"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AssemblySupportPanel({
  assembly,
  canManage,
  busy,
  onUpload,
  onStatusChange,
  onDownload
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  canManage: boolean;
  busy: string | null;
  onUpload: (
    assemblyId: string,
    input: Omit<CreateAssemblySupport, "filePath" | "mimeType" | "sizeBytes">,
    file: File
  ) => Promise<AssemblySupportDocument | null>;
  onStatusChange: (
    assemblyId: string,
    documentId: string,
    input: UpdateAssemblySupportStatus
  ) => Promise<AssemblySupportDocument | null>;
  onDownload: (document: AssemblySupportDocument) => Promise<void>;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [versionDocument, setVersionDocument] = useState<AssemblySupportDocument | null>(null);
  const documents = assembly.dossier.documents;

  function openNewUpload() {
    setVersionDocument(null);
    setUploadOpen(true);
  }

  function openVersion(document: AssemblySupportDocument) {
    setVersionDocument(document);
    setUploadOpen(true);
  }

  return (
    <>
      <Card className="p-5 hover:translate-y-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText size={19} className="text-[var(--accent)]" />
            <div>
              <h3 className="font-extrabold">Soportes</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Archivos privados y versionados del expediente.
              </p>
            </div>
          </div>
          {canManage ? (
            <Button onClick={openNewUpload} size="sm">
              <FileUp size={16} /> Subir soporte
            </Button>
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          {documents.map((document) => {
            const statusBusy = busy === `assembly-support-status-${document.id}`;
            return (
              <div
                className="rounded-xl border border-[var(--line)] bg-[var(--wash)]/45 p-3"
                key={document.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{document.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {document.category} · v{document.version}
                      {document.sizeBytes ? ` · ${formatSupportSize(document.sizeBytes)}` : ""}
                    </p>
                    {document.uploadedBy ? (
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        Cargado por {document.uploadedBy}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        Registro demostrativo del expediente
                      </p>
                    )}
                  </div>
                  <Badge tone={statusTone(document.status)}>{statusLabel(document.status)}</Badge>
                </div>
                {document.filePath ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--line)] pt-3">
                    <Button onClick={() => void onDownload(document)} size="sm" variant="secondary">
                      <Download size={15} /> Descargar
                    </Button>
                    {canManage && document.status !== "archived" ? (
                      <Button onClick={() => openVersion(document)} size="sm" variant="ghost">
                        <RefreshCw size={15} /> Nueva versión
                      </Button>
                    ) : null}
                    {canManage && document.status === "ready" ? (
                      <Button
                        disabled={statusBusy}
                        onClick={() =>
                          void onStatusChange(assembly.id, document.id, { status: "published" })
                        }
                        size="sm"
                        variant="ghost"
                      >
                        <Send size={15} /> Publicar
                      </Button>
                    ) : null}
                    {canManage && document.status !== "archived" ? (
                      <Button
                        disabled={statusBusy}
                        onClick={() =>
                          void onStatusChange(assembly.id, document.id, { status: "archived" })
                        }
                        size="sm"
                        variant="ghost"
                      >
                        <Archive size={15} /> Archivar
                      </Button>
                    ) : null}
                    {canManage && document.status === "archived" ? (
                      <Button
                        disabled={statusBusy}
                        onClick={() =>
                          void onStatusChange(assembly.id, document.id, { status: "ready" })
                        }
                        size="sm"
                        variant="ghost"
                      >
                        <RotateCcw size={15} /> Reactivar
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
                    <span className="flex items-center gap-2">
                      <FileCheck2 size={14} /> Sin archivo descargable en los datos anteriores
                    </span>
                    {canManage ? (
                      <Button onClick={() => openVersion(document)} size="sm" variant="secondary">
                        <FileUp size={15} /> Adjuntar archivo
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {uploadOpen ? (
        <SupportUploadModal
          assembly={assembly}
          busy={busy}
          existing={versionDocument}
          key={`${versionDocument?.id ?? "new"}-${versionDocument?.version ?? 0}`}
          onOpenChange={setUploadOpen}
          onUpload={onUpload}
          open
        />
      ) : null}
    </>
  );
}
