import { PET_PHOTO_MAX_BYTES, petPhotoPath, validatePetPhoto } from "@/lib/pet-photo";
import { describe, expect, it } from "vitest";

function photo(type: string, size: number): File {
  return { type, size } as File;
}

describe("pet photo helpers", () => {
  it("builds a private and predictable profile path", () => {
    expect(
      petPhotoPath(
        "11111111-1111-4111-8111-111111111111",
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "image/jpeg"
      )
    ).toBe(
      "11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/perfil.jpg"
    );
  });

  it("accepts supported images within the size limit", () => {
    expect(validatePetPhoto(photo("image/webp", PET_PHOTO_MAX_BYTES))).toBeNull();
  });

  it("rejects unsupported files and oversized images", () => {
    expect(validatePetPhoto(photo("image/gif", 100))).toContain("JPG");
    expect(validatePetPhoto(photo("image/png", PET_PHOTO_MAX_BYTES + 1))).toContain("5 MB");
  });
});
