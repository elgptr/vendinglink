import { describe, it, expect } from "vitest";
import { normalizePhone } from "@/lib/phone";

describe("lib/phone", () => {
  it("converts 08xx to 628xx", () => {
    expect(normalizePhone("081234567890")).toBe("6281234567890");
  });

  it("removes + prefix", () => {
    expect(normalizePhone("+6281234567890")).toBe("6281234567890");
  });

  it("passes through already-normalized numbers", () => {
    expect(normalizePhone("6281234567890")).toBe("6281234567890");
  });

  it("strips formatting characters", () => {
    expect(normalizePhone("0822-542-03272")).toBe("6282254203272");
    expect(normalizePhone("0822 542 03272")).toBe("6282254203272");
    expect(normalizePhone("+62 822 542 03272")).toBe("6282254203272");
  });

  it("returns null for invalid input", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("12345678")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("62")).toBeNull();
    expect(normalizePhone("628123456789012")).toBeNull();
  });
});
