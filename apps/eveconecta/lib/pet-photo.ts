export const PET_PHOTO_BUCKET = "eveconecta-pet-photos";
export const PET_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PET_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

const extensionByMimeType: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export function validatePetPhoto(file: File): string | null {
  if (!extensionByMimeType[file.type]) {
    return "Selecciona una imagen JPG, PNG o WebP.";
  }
  if (file.size > PET_PHOTO_MAX_BYTES) {
    return "La foto debe pesar máximo 5 MB.";
  }
  return null;
}

export function petPhotoPath(
  conjuntoId: string,
  userId: string,
  petId: string,
  mimeType: string
): string {
  const extension = extensionByMimeType[mimeType];
  if (!extension) throw new Error("El formato de la foto no es válido.");
  return `${conjuntoId}/${userId}/${petId}/perfil.${extension}`;
}
