import { formatCop } from "@/lib/contracts";
import { describe, expect, it } from "vitest";

describe("web contract helpers", () => {
  it("formats minor COP units without decimals", () => {
    expect(formatCop(48_500_000)).toContain("485.000");
  });
});
