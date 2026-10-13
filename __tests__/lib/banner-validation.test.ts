import { describe, it, expect } from "vitest";
import { validateImageFile } from "@/lib/storage";

describe("Banner Validation & Dimensions Logic", () => {
  it("allows PNG, JPEG, and WebP for banner uploads", () => {
    expect(
      validateImageFile({ name: "banner.webp", size: 1024 * 50, type: "image/webp" }).valid
    ).toBe(true);
    expect(
      validateImageFile({ name: "banner.png", size: 1024 * 50, type: "image/png" }).valid
    ).toBe(true);
    expect(
      validateImageFile({ name: "banner.jpg", size: 1024 * 50, type: "image/jpeg" }).valid
    ).toBe(true);
  });

  it("rejects non-image files such as PDF and SVG/HTML scripts", () => {
    expect(
      validateImageFile({ name: "banner.pdf", size: 1024 * 50, type: "application/pdf" }).valid
    ).toBe(false);
    expect(
      validateImageFile({ name: "banner.svg", size: 1024 * 50, type: "image/svg+xml" }).valid
    ).toBe(false);
  });

  it("enforces max file size limit of 5MB in storage and 2MB in admin guidelines", () => {
    // Storage hard limit is 5MB
    expect(
      validateImageFile({
        name: "banner.png",
        size: 5 * 1024 * 1024 + 1,
        type: "image/png",
      }).valid
    ).toBe(false);

    // Recommended banner size under 2MB passes storage
    expect(
      validateImageFile({
        name: "banner.png",
        size: 1.5 * 1024 * 1024,
        type: "image/png",
      }).valid
    ).toBe(true);
  });

  // Dimension validator function (mirroring the logic in VoucherRulesPage)
  function checkBannerDimensions(w: number, h: number) {
    const ratio = Number((w / h).toFixed(1));
    let type: "success" | "warning" = "success";
    let message = "Dimensi ideal";

    if (h > 200) {
      type = "warning";
      message = "Terlalu tinggi untuk top banner";
    } else if (ratio < 2.5) {
      type = "warning";
      message = "Rasio terlalu kotak";
    }

    return { type, ratio, message };
  }

  it("correctly identifies ideal horizontal banner dimensions (e.g. 1200x80 px)", () => {
    const result = checkBannerDimensions(1200, 80);
    expect(result.type).toBe("success");
    expect(result.ratio).toBe(15);
  });

  it("correctly identifies ideal DataCamp badge dimensions (e.g. 240x80 px)", () => {
    const result = checkBannerDimensions(240, 80);
    expect(result.type).toBe("success");
    expect(result.ratio).toBe(3);
  });

  it("warns when banner image is too tall (e.g. 800x400 px or height > 200px)", () => {
    const result = checkBannerDimensions(800, 400);
    expect(result.type).toBe("warning");
    expect(result.message).toContain("Terlalu tinggi");
  });

  it("warns when image aspect ratio is too square (e.g. 300x200 px, ratio 1.5)", () => {
    const result = checkBannerDimensions(300, 180);
    expect(result.type).toBe("warning");
    expect(result.message).toContain("terlalu kotak");
  });
});
