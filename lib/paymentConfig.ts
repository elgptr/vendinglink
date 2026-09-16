import fs from "fs";
import path from "path";

export type PaymentGatewayType = "MIDTRANS" | "DOKU";

const CONFIG_FILE_PATH = path.join(process.cwd(), ".gateway-setting.json");

export function getActivePaymentGateway(): PaymentGatewayType {
  // 1. Check override file created by admin panel
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const content = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed.gateway === "DOKU" || parsed.gateway === "MIDTRANS") {
        return parsed.gateway;
      }
    }
  } catch {
    // Fallback to env
  }

  // 2. Check process.env.PAYMENT_GATEWAY
  if (process.env.PAYMENT_GATEWAY?.toUpperCase() === "DOKU") {
    return "DOKU";
  }

  return "MIDTRANS";
}

export function setActivePaymentGateway(gateway: PaymentGatewayType): void {
  try {
    fs.writeFileSync(
      CONFIG_FILE_PATH,
      JSON.stringify({ gateway, updatedAt: new Date().toISOString() }, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.error("Failed to write payment gateway setting file:", err);
    throw new Error("Gagal menyimpan konfigurasi gateway");
  }
}