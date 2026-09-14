import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  sanitizeFilename,
  validateImageFile,
  uploadFile,
  deleteFile,
  getFileInfo,
} from "@/lib/storage";
import { promises as fs } from "fs";
import path from "path";

describe("lib/storage.ts", () => {
  const testDir = path.join(process.cwd(), "public", "uploads");

  beforeAll(async () => {
    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch (e) {
      // Directory may already exist
    }
  });

  afterAll(async () => {
    try {
      const files = await fs.readdir(testDir);
      for (const file of files) {
        if (file.startsWith("test-")) {
          await fs.unlink(path.join(testDir, file));
        }
      }
    } catch (e) {
      // Cleanup failure is non-critical
    }
  });

  describe("sanitizeFilename", () => {
    it("should sanitize filename with path traversal attempt", () => {
      const result = sanitizeFilename("../../../etc/passwd.png");
      expect(result).not.toContain("..");
      expect(result).not.toContain("/");
      expect(result).toMatch(/\.png$/i);
    });

    it("should remove XSS patterns from filename", () => {
      const result = sanitizeFilename("<script>alert('xss')</script>.png");
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
      expect(result).toMatch(/\.png$/i);
    });

    it("should preserve file extension", () => {
      const pngResult = sanitizeFilename("my-image.png");
      expect(pngResult).toMatch(/\.png$/i);

      const jpegResult = sanitizeFilename("photo.jpeg");
      expect(jpegResult).toMatch(/\.jpeg$/i);
    });
  });

  describe("validateImageFile", () => {
    it("should accept valid PNG file", () => {
      const result = validateImageFile({
        name: "test.png",
        size: 1024 * 100,
        type: "image/png",
      });
      expect(result.valid).toBe(true);
    });

    it("should accept valid JPEG file", () => {
      const result = validateImageFile({
        name: "test.jpg",
        size: 1024 * 500,
        type: "image/jpeg",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject unsupported MIME type (PDF)", () => {
      const result = validateImageFile({
        name: "document.pdf",
        size: 1024 * 100,
        type: "application/pdf",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Tipe file tidak didukung");
    });

    it("should reject file exceeding 5MB limit", () => {
      const result = validateImageFile({
        name: "huge.png",
        size: 5 * 1024 * 1024 + 1,
        type: "image/png",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("terlalu besar");
    });

    it("should reject empty file", () => {
      const result = validateImageFile({
        name: "empty.png",
        size: 0,
        type: "image/png",
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("uploadFile", () => {
    it("should upload valid PNG file and return URL", async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xde,
      ]);

      const result = await uploadFile(pngBuffer, "test-upload.png", "image/png");

      expect(result.url).toMatch(/^\/uploads\/[a-z0-9]+\.png$/i);
      expect(result.size).toBe(pngBuffer.length);
      expect(result.mimeType).toBe("image/png");

      const filePath = path.join(testDir, path.basename(result.url));
      const stats = await fs.stat(filePath);
      expect(stats.size).toBe(pngBuffer.length);
      await fs.unlink(filePath);
    });

    it("should reject invalid MIME type during upload", async () => {
      const buffer = Buffer.from("fake PDF content");
      
      try {
        await uploadFile(buffer, "test.pdf", "application/pdf");
        expect.fail("Should have thrown error");
      } catch (error) {
        expect((error as Error).message).toContain("Tipe file tidak didukung");
      }
    });
  });

  describe("deleteFile", () => {
    it("should delete existing file", async () => {
      const filename = `test-delete-${Date.now()}.txt`;
      const filePath = path.join(testDir, filename);
      await fs.writeFile(filePath, "test content");

      const result = await deleteFile(filename);
      expect(result).toBe(true);

      try {
        await fs.stat(filePath);
        expect.fail("File should be deleted");
      } catch (e) {
        expect((e as NodeJS.ErrnoException).code).toBe("ENOENT");
      }
    });

    it("should return false when deleting non-existent file", async () => {
      const result = await deleteFile(`nonexistent-${Date.now()}.txt`);
      expect(result).toBe(false);
    });

    it("should reject path traversal in delete", async () => {
      try {
        await deleteFile("../../../etc/passwd");
        expect.fail("Should have rejected path traversal");
      } catch (error) {
        expect((error as Error).message).toContain("Invalid filename");
      }
    });
  });

  describe("getFileInfo", () => {
    it("should return file info for existing file", async () => {
      const filename = `test-info-${Date.now()}.txt`;
      const filePath = path.join(testDir, filename);
      await fs.writeFile(filePath, "test content");

      const info = await getFileInfo(filename);
      expect(info).not.toBeNull();
      expect(info?.size).toBeGreaterThan(0);
      expect(info?.mtime).toBeInstanceOf(Date);

      await fs.unlink(filePath);
    });

    it("should return null for non-existent file", async () => {
      const info = await getFileInfo(`nonexistent-${Date.now()}.txt`);
      expect(info).toBeNull();
    });
  });
});
