"use client";

import { CASE_IMAGE_ACCEPT, CASE_IMAGE_MAX_COUNT, validateCaseImages } from "@/lib/case-images";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";

interface CaseImagePickerProps {
  disabled?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
}

interface ImagePreview {
  file: File;
  url: string;
}

export function CaseImagePicker({ disabled, files, onChange }: CaseImagePickerProps) {
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<ImagePreview[]>([]);

  useEffect(() => {
    const nextPreviews = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(nextPreviews);
    return () => nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [files]);

  function selectImages(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;

    const nextFiles = [...files, ...selected];
    const validationError = validateCaseImages(nextFiles);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onChange(nextFiles);
  }

  function removeImage(index: number) {
    setError(null);
    onChange(files.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="grid gap-3">
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--wash)]/50 p-4 transition hover:border-[var(--accent)]">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[var(--accent)] shadow-sm">
          <ImagePlus size={20} />
        </span>
        <span className="min-w-0">
          <span className="block font-bold text-[var(--ink)]">
            {files.length ? "Agregar más imágenes" : "Seleccionar imágenes"}
          </span>
          <span className="mt-0.5 block text-xs text-[var(--muted)]">
            {files.length} de {CASE_IMAGE_MAX_COUNT} seleccionadas
          </span>
        </span>
        <input
          accept={CASE_IMAGE_ACCEPT}
          aria-label="Anexar imágenes al caso"
          className="sr-only"
          disabled={disabled || files.length >= CASE_IMAGE_MAX_COUNT}
          multiple
          type="file"
          onChange={selectImages}
        />
      </label>
      {previews.length ? (
        <div className="grid grid-cols-3 gap-3" aria-label="Imágenes seleccionadas">
          {previews.map((preview, index) => (
            <div
              className="relative overflow-hidden rounded-xl border border-[var(--line)]"
              key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
            >
              <span
                aria-label={`Vista previa de ${preview.file.name}`}
                className="block aspect-square bg-cover bg-center"
                role="img"
                style={{ backgroundImage: `url(${JSON.stringify(preview.url)})` }}
              />
              <button
                aria-label={`Quitar ${preview.file.name}`}
                className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-white/95 text-[var(--ink)] shadow"
                disabled={disabled}
                type="button"
                onClick={() => removeImage(index)}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="text-sm font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
