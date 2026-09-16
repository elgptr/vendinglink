import fs from "fs";
import path from "path";
import os from "os";

export type PaymentGatewayType = "MIDTRANS" | "DOKU" | "KASERA";

// In Vercel serverless environment, the current working directory is read-only.
// Writing to process.cwd() throws EROFS (Read-only file system).
// /tmp (os.tmpdir()) is the writable directory on serverless runtimes.
const TMP_FILE_PATH = path.join(os.tmpdir(), "vendinglink-gateway.json");
const CWD_FILE_PATH = path.join(process.cwd(), ".gateway-setting.json");

// In-memory runtime cache for serverless instances
let inMemoryGateway: PaymentGatewayType | null = null;

export function getActivePaymentGateway(): PaymentGatewayType {
  if (inMemoryGateway) {
    return inMemoryGateway;
  }

  // 1. Check in /tmp
  try {
    if (fs.existsSync(TMP_FILE_PATH)) {
      const content = fs.readFileSync(TMP_FILE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (
        parsed.gateway === "DOKU" ||
        parsed.gateway === "MIDTRANS" ||
        parsed.gateway === "KASERA"
      ) {
        inMemoryGateway = parsed.gateway;
        return parsed.gateway;
      }
    }
  } catch {
    // ignore
  }

  // 2. Check local dev root file if exists
  try {
    if (fs.existsSync(CWD_FILE_PATH)) {
      const content = fs.readFileSync(CWD_FILE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (
        parsed.gateway === "DOKU" ||
        parsed.gateway === "MIDTRANS" ||
        parsed.gateway === "KASERA"
      ) {
        inMemoryGateway = parsed.gateway;
        return parsed.gateway;
      }
    }
  } catch {
    // ignore
  }

  // 3. Check environment variable
  const envGateway = process.env.PAYMENT_GATEWAY?.toUpperCase();
  if (envGateway === "DOKU") {
    inMemoryGateway = "DOKU";
    return "DOKU";
  }
  if (envGateway === "KASERA") {
    inMemoryGateway = "KASERA";
    return "KASERA";
  }

  inMemoryGateway = "MIDTRANS";
  return "MIDTRANS";
}

export function setActivePaymentGateway(gateway: PaymentGatewayType): void {
  inMemoryGateway = gateway;

  let writeSuccess = false;

  // Try writing to os.tmpdir() (works on Vercel and local)
  try {
    fs.writeFileSync(
      TMP_FILE_PATH,
      JSON.stringify({ gateway, updatedAt: new Date().toISOString() }),
      "utf-8"
    );
    writeSuccess = true;
  } catch (err) {
    console.warn("Failed to write to tmpdir, trying cwd:", err);
  }

  // Try writing to cwd (for local development persistence)
  try {
    fs.writeFileSync(
      CWD_FILE_PATH,
      JSON.stringify({ gateway, updatedAt: new Date().toISOString() }, null, 2),
      "utf-8"
    );
    writeSuccess = true;
  } catch {
    // Expected on Vercel (read-only filesystem)
  }

  if (!writeSuccess && !inMemoryGateway) {
    throw new Error("Gagal menyimpan konfigurasi gateway");
  }
}