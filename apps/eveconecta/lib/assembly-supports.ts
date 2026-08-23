export const ASSEMBLY_SUPPORT_BUCKET = "eveconecta-assembly-supports";
export const ASSEMBLY_SUPPORT_MAX_BYTES = 15 * 1024 * 1024;
export const ASSEMBLY_SUPPORT_ACCEPT =
  ".pdf,.docx,.xlsx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png";

export const assemblySupportCategoryLabels = {
  management_report: "Informe de gestión",
  financial_statements: "Estados financieros",
  budget: "Presupuesto",
  proposal: "Propuesta o anexo",
  legal: "Documento jurídico",
  other: "Otro soporte"
} as const;

type AssemblySupportMimeType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "image/jpeg"
  | "image/png";

const extensionByMimeType: Record<
  AssemblySupportMimeType,
  "pdf" | "docx" | "xlsx" | "jpg" | "png"
> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "image/jpeg": "jpg",
  "image/png": "png"
};

export function isAssemblySupportMimeType(value: string): value is AssemblySupportMimeType {
  return value in extensionByMimeType;
}

export function validateAssemblySupport(file: File): string | null {
  if (!isAssemblySupportMimeType(file.type)) {
    return "Selecciona un archivo PDF, Word, Excel, JPG o PNG.";
  }
  if (file.size <= 0) return "El archivo seleccionado está vacío.";
  if (file.size > ASSEMBLY_SUPPORT_MAX_BYTES) {
    return "El soporte debe pesar máximo 15 MB.";
  }
  return null;
}

export function assemblySupportPath(
  conjuntoId: string,
  assemblyId: string,
  documentId: string,
  version: number,
  mimeType: string
): string {
  if (!isAssemblySupportMimeType(mimeType)) {
    throw new Error("El formato del soporte no es válido.");
  }
  if (!Number.isInteger(version) || version < 1 || version > 999) {
    throw new Error("La versión del soporte no es válida.");
  }
  return `${conjuntoId}/${assemblyId}/${documentId}/v${version}.${extensionByMimeType[mimeType]}`;
}

export function formatSupportSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
