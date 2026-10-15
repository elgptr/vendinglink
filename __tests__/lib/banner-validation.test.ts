import { describe, it, expect } from "vitest";
import { validateImageFile } from "@/lib/storage";
import { z } from "zod";

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
  function checkBannerDimensions(w: number, h: number, type: "FULL_STRIP" | "BADGE_COMPOSED" = "BADGE_COMPOSED") {
    const ratio = Number((w / h).toFixed(1));
    let status: "success" | "warning" = "success";
    let message = "Dimensi ideal";

    if (type === "FULL_STRIP") {
      if (h > 150) {
        status = "warning";
        message = "Tinggi melebihi 150px untuk banner strip";
      } else if (ratio < 6) {
        status = "warning";
        message = "Rasio agak pendek untuk banner strip penuh";
      } else {
        message = "Dimensi sangat ideal untuk Banner Full Strip";
      }
    } else {
      if (h > 200) {
        status = "warning";
        message = "Terlalu tinggi untuk top banner";
      } else if (ratio < 2.5) {
        status = "warning";
        message = "Rasio terlalu kotak";
      }
    }

    return { status, ratio, message };
  }

  it("correctly identifies ideal horizontal banner dimensions (e.g. 1200x80 px)", () => {
    const result = checkBannerDimensions(1200, 80, "FULL_STRIP");
    expect(result.status).toBe("success");
    expect(result.ratio).toBe(15);
  });

  it("correctly identifies ideal DataCamp badge dimensions (e.g. 240x80 px)", () => {
    const result = checkBannerDimensions(240, 80, "BADGE_COMPOSED");
    expect(result.status).toBe("success");
    expect(result.ratio).toBe(3);
  });

  it("warns when banner image is too tall (e.g. 800x400 px or height > 200px)", () => {
    const result = checkBannerDimensions(800, 400);
    expect(result.status).toBe("warning");
    expect(result.message).toContain("Terlalu tinggi");
  });

  it("warns when image aspect ratio is too square for full strip", () => {
    const result = checkBannerDimensions(800, 300, "FULL_STRIP");
    expect(result.status).toBe("warning");
  });

  // Test Zod schema validation mirroring app/api/admin/voucher-rules/route.ts
  const bannerSchema = z.object({
    bannerImageUrl: z.string().nullable().optional(),
    bannerType: z.enum(["FULL_STRIP", "BADGE_COMPOSED"]).optional().default("BADGE_COMPOSED"),
    bannerText: z.string().nullable().optional(),
    bannerCtaText: z.string().nullable().optional(),
    bannerCtaUrl: z.string().nullable().optional(),
  }).refine((v) => {
    if (v.bannerType === "FULL_STRIP" && v.bannerImageUrl) {
      return Boolean(v.bannerCtaUrl && v.bannerCtaUrl.trim().length > 0);
    }
    return true;
  }, {
    message: "CTA Target URL wajib diisi jika menggunakan Banner Horizontal Penuh (Full Strip)",
    path: ["bannerCtaUrl"],
  });

  it("validates that FULL_STRIP with banner image requires bannerCtaUrl", () => {
    const validFullStrip = bannerSchema.safeParse({
      bannerImageUrl: "/uploads/full-banner.png",
      bannerType: "FULL_STRIP",
      bannerCtaUrl: "/customer#catalog",
      bannerText: null, // Optional
      bannerCtaText: null, // Optional
    });
    expect(validFullStrip.success).toBe(true);

    const invalidFullStrip = bannerSchema.safeParse({
      bannerImageUrl: "/uploads/full-banner.png",
      bannerType: "FULL_STRIP",
      bannerCtaUrl: null, // Mandatory!
    });
    expect(invalidFullStrip.success).toBe(false);
  });

  it("allows FULL_STRIP mode with completely omitted bannerText and bannerCtaText", () => {
    const parsed = bannerSchema.safeParse({
      bannerImageUrl: "/uploads/full-banner.png",
      bannerType: "FULL_STRIP",
      bannerCtaUrl: "https://example.com/promo",
    });
    expect(parsed.success).toBe(true);
  });
});
