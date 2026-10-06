import { NextRequest } from "next/server";
import crypto from "crypto";

export function verifyBridgeBearer(request: NextRequest): boolean {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  
  const token = authHeader.substring(7);
  const secretKey = process.env.BRIDGE_SECRET_KEY;
  
  if (!secretKey) {
    console.error("BRIDGE_SECRET_KEY is not configured");
    return false;
  }
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(secretKey)
    );
  } catch {
    // Length mismatch or other error
    return false;
  }
}
