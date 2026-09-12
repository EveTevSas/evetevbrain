export const ASSEMBLY_PROXY_BUCKET = "eveconecta-assembly-proxies";
export const ASSEMBLY_PROXY_MAX_BYTES = 5 * 1024 * 1024;
export const ASSEMBLY_PROXY_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

type AssemblyProxyMimeType = "application/pdf" | "image/jpeg" | "image/png";

const extensionByMimeType: Record<AssemblyProxyMimeType, "pdf" | "jpg" | "png"> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png"
};

export function isAssemblyProxyMimeType(value: string): value is AssemblyProxyMimeType {
  return value in extensionByMimeType;
}

export function validateAssemblyProxy(file: File): string | null {
  if (!isAssemblyProxyMimeType(file.type)) {
    return "Selecciona un archivo PDF, JPG o PNG.";
  }
  if (file.size <= 0) return "El archivo seleccionado está vacío.";
  if (file.size > ASSEMBLY_PROXY_MAX_BYTES) {
    return "La evidencia debe pesar máximo 5 MB.";
  }
  return null;
}

export function assemblyProxyPath(
  conjuntoId: string,
  assemblyId: string,
  proxyUploadId: string,
  mimeType: string
): string {
  if (!isAssemblyProxyMimeType(mimeType)) {
    throw new Error("El formato de la evidencia no es válido.");
  }
  return `${conjuntoId}/${assemblyId}/${proxyUploadId}.${extensionByMimeType[mimeType]}`;
}
