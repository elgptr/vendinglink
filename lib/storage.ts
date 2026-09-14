import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";

/**
 * File storage utility for managing uploaded images (guide images, product photos).
 * Stores files in public/uploads/ directory with sanitized names.
 * 
 * **Security:**
 * - MIME type whitelist (image/png, image/jpeg only)
 * - File size cap (5MB)
 * - Filename sanitization (no path traversal, XSS)
 * - Unique names via hash to prevent overwrites
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg"];

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
}

/**
 * Sanitize filename to prevent path traversal and XSS
 * @param filename - Original filename
 * @returns Sanitized filename (alphanumeric + underscore + extension)
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and null bytes
  let cleaned = filename.replace(/[\\/\0]/g, "");
  
  // Remove suspicious patterns
  cleaned = cleaned.replace(/\.\./g, "").replace(/<|>|:|"|\\|\||\?|\*/g, "");
  
  // Extract extension safely
  const extMatch = filename.match(/\.([a-z0-9]{1,6})$/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : "";
  
  // Generate base name from hash of original filename for uniqueness
  const hash = createHash("sha256").update(filename + Date.now()).digest("hex").substring(0, 8);
  
  // Whitelist safe characters
  const baseName = hash;
  
  return ext ? `${baseName}.${ext}` : baseName;
}

/**
 * Validate image file before upload
 * @param file - File object with name, size, type
 * @returns { valid: boolean; error?: string }
 */
export function validateImageFile(file: {
  name: string;
  size: number;
  type: string;
}): { valid: boolean; error?: string } {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Tipe file tidak didukung. Hanya PNG dan JPEG yang diizinkan.`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Ukuran file terlalu besar. Maksimal 5MB.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: `File kosong atau tidak valid.`,
    };
  }

  return { valid: true };
}

/**
 * Upload file to storage
 * @param buffer - File buffer
 * @param filename - Original filename
 * @param mimeType - MIME type of file
 * @returns { url: string; size: number; mimeType: string }
 * @throws Error if validation fails or storage operation fails
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ url: string; size: number; mimeType: string }> {
  // Validate
  const validation = validateImageFile({
    name: filename,
    size: buffer.length,
    type: mimeType,
  });

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Ensure directory exists
  await ensureUploadDir();

  // Sanitize filename
  const sanitized = sanitizeFilename(filename);
  const filePath = path.join(UPLOAD_DIR, sanitized);

  // Write file
  try {
    await fs.writeFile(filePath, buffer, { flag: "w" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOSPC") {
      throw new Error("Ruang penyimpanan habis");
    }
    throw error;
  }

  return {
    url: `/uploads/${sanitized}`,
    size: buffer.length,
    mimeType,
  };
}

/**
 * Delete file from storage
 * @param filename - Sanitized filename (from uploadFile return url)
 * @returns true if file was deleted, false if file didn't exist
 */
export async function deleteFile(filename: string): Promise<boolean> {
  // Prevent path traversal attacks
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw new Error("Invalid filename");
  }

  const filePath = path.join(UPLOAD_DIR, filename);

  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false; // File doesn't exist, idempotent
    }
    throw error;
  }
}

/**
 * Get file info (size, mtime) for cache validation
 * @param filename - Sanitized filename
 * @returns { size: number; mtime: Date } or null if file doesn't exist
 */
export async function getFileInfo(filename: string): Promise<{
  size: number;
  mtime: Date;
} | null> {
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw new Error("Invalid filename");
  }

  const filePath = path.join(UPLOAD_DIR, filename);

  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      mtime: stats.mtime,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
