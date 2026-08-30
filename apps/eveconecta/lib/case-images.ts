export const CASE_IMAGE_BUCKET = "eveconecta-case-images";
export const CASE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CASE_IMAGE_MAX_COUNT = 3;
export const CASE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

const extensionByMimeType: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export function validateCaseImage(file: File): string | null {
  if (!extensionByMimeType[file.type]) {
    return "Selecciona imágenes JPG, PNG o WebP.";
  }
  if (file.size > CASE_IMAGE_MAX_BYTES) {
    return "Cada imagen debe pesar máximo 5 MB.";
  }
  return null;
}

export function validateCaseImages(files: File[]): string | null {
  if (files.length > CASE_IMAGE_MAX_COUNT) {
    return "Puedes anexar máximo 3 imágenes por caso.";
  }
  for (const file of files) {
    const error = validateCaseImage(file);
    if (error) return error;
  }
  return null;
}

export function caseImagePath(
  conjuntoId: string,
  userId: string,
  uploadId: string,
  position: number,
  mimeType: string
): string {
  const extension = extensionByMimeType[mimeType];
  if (!extension) throw new Error("El formato de la imagen no es válido.");
  if (!Number.isInteger(position) || position < 1 || position > CASE_IMAGE_MAX_COUNT) {
    throw new Error("La posición de la imagen no es válida.");
  }
  return `${conjuntoId}/${userId}/${uploadId}/${position}.${extension}`;
}
