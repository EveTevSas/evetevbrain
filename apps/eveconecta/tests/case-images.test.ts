import { CASE_IMAGE_MAX_BYTES, caseImagePath, validateCaseImages } from "@/lib/case-images";
import { describe, expect, it } from "vitest";

function image(type: string, size: number): File {
  return { type, size } as File;
}

describe("case image helpers", () => {
  it("builds a tenant and user scoped image path", () => {
    expect(
      caseImagePath(
        "11111111-1111-4111-8111-111111111111",
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        2,
        "image/webp"
      )
    ).toBe(
      "11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/2.webp"
    );
  });

  it("accepts three supported images within the size limit", () => {
    expect(
      validateCaseImages([
        image("image/jpeg", CASE_IMAGE_MAX_BYTES),
        image("image/png", 1_024),
        image("image/webp", 2_048)
      ])
    ).toBeNull();
  });

  it("rejects a fourth, unsupported or oversized image", () => {
    expect(
      validateCaseImages([
        image("image/jpeg", 1),
        image("image/jpeg", 1),
        image("image/jpeg", 1),
        image("image/jpeg", 1)
      ])
    ).toContain("máximo 3");
    expect(validateCaseImages([image("image/gif", 1)])).toContain("JPG");
    expect(validateCaseImages([image("image/png", CASE_IMAGE_MAX_BYTES + 1)])).toContain("5 MB");
  });
});
