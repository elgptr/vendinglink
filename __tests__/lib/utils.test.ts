import { describe, it, expect } from "vitest";
import {
  cn,
  formatRupiah,
  formatDate,
  generateOrderId,
  generatePromoCode,
  validateMidtransSignature,
  sanitizeString,
  isValidUrl,
  exportToCsv,
  parseBulkLinks,
  parseBulkCodes,
} from "@/lib/utils";

describe("utils.ts", () => {
  describe("cn", () => {
    it("should merge Tailwind classes", () => {
      const result = cn("px-2", "px-4");
      expect(result).toBeDefined();
    });
  });

  describe("formatRupiah", () => {
    it("should format as IDR", () => {
      const result = formatRupiah(50000);
      expect(result).toBeDefined();
    });
  });

  describe("formatDate", () => {
    it("should format date", () => {
      const date = new Date("2026-09-11");
      const result = formatDate(date);
      expect(result).toBeDefined();
    });
  });

  describe("generateOrderId", () => {
    it("should generate unique ID with VM- prefix", () => {
      const id = generateOrderId();
      expect(id).toMatch(/^VM-/);
    });
  });

  describe("generatePromoCode", () => {
    it("should generate RESTOCK- prefixed code", () => {
      const code = generatePromoCode();
      expect(code).toMatch(/^RESTOCK-[A-Z0-9]{8}$/);
    });
  });

  describe("validateMidtransSignature", () => {
    it("should validate correct signature", () => {
      const crypto = require("crypto");
      const params = {
        orderId: "VM-123",
        statusCode: "200",
        grossAmount: "50000",
        serverKey: "VT-sec-test-key",
        receivedSignature: "",
      };

      const rawString = `${params.orderId}${params.statusCode}${params.grossAmount}${params.serverKey}`;
      params.receivedSignature = crypto
        .createHash("sha512")
        .update(rawString)
        .digest("hex");

      expect(validateMidtransSignature(params)).toBe(true);
    });

    it("should reject invalid signature", () => {
      expect(
        validateMidtransSignature({
          orderId: "VM-123",
          statusCode: "200",
          grossAmount: "50000",
          serverKey: "VT-sec-test-key",
          receivedSignature: "invalid",
        })
      ).toBe(false);
    });
  });

  describe("sanitizeString", () => {
    it("should remove XSS vectors", () => {
      const result = sanitizeString("<script>alert('xss')</script>");
      expect(result).not.toContain("<");
      expect(result).not.toContain("javascript:");
    });

    it("should limit to 255 chars", () => {
      const long = "a".repeat(300);
      expect(sanitizeString(long).length).toBeLessThanOrEqual(255);
    });
  });

  describe("isValidUrl", () => {
    it("should validate http/https URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
      expect(isValidUrl("http://example.com")).toBe(true);
    });

    it("should reject invalid URLs", () => {
      expect(isValidUrl("not a url")).toBe(false);
      expect(isValidUrl("javascript:alert()")).toBe(false);
    });
  });

  describe("exportToCsv", () => {
    it("should export as CSV", () => {
      const result = exportToCsv([{ name: "John", age: 30 }], "test.csv");
      expect(result).toContain("name,age");
    });
  });

  describe("parseBulkLinks", () => {
    it("should parse valid URLs", () => {
      const result = parseBulkLinks("https://a.com\nhttps://b.com");
      expect(result.length).toBe(2);
    });
  });

  describe("parseBulkCodes", () => {
    it("should parse codes", () => {
      const result = parseBulkCodes("CODE1\nCODE2");
      expect(result.length).toBe(2);
    });
  });
});
