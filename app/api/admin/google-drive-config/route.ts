import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptAPIKey, decryptAPIKey, maskAPIKey } from "@/lib/encryption";
import { z } from "zod";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "admin-gdrive-config" });

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const configSchema = z.object({
  clientEmail: z.string().email().optional().or(z.literal("")),
  privateKey: z.string().optional().or(z.literal("")),
  folderId: z.string().optional().or(z.literal("")),
  isActive: z.boolean(),
});

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await prisma.googleDriveConfig.findFirst();

    if (!config) {
      return NextResponse.json({
        clientEmail: "",
        privateKey: "",
        folderId: "",
        isActive: false,
      });
    }

    // Mask private key for security when sending to frontend
    return NextResponse.json({
      clientEmail: config.clientEmail || "",
      privateKey: maskAPIKey(config.privateKey ? decryptAPIKey(config.privateKey) : null),
      folderId: config.folderId || "",
      isActive: config.isActive,
    });
  } catch (error) {
    log.error("Failed to get Google Drive config", { error: String(error) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = configSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Input tidak valid", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { clientEmail, privateKey, folderId, isActive } = parsed.data;

    let existing = await prisma.googleDriveConfig.findFirst();

    // If privateKey contains "...", it means user didn't change it, keep old value
    let finalPrivateKey = existing?.privateKey || null;
    if (privateKey && !privateKey.includes("...")) {
      // Fix formatted private keys from JSON if they use escaped newlines
      const formattedKey = privateKey.replace(/\\n/g, '\n');
      finalPrivateKey = encryptAPIKey(formattedKey);
    }

    if (existing) {
      await prisma.googleDriveConfig.update({
        where: { id: existing.id },
        data: {
          clientEmail: clientEmail || null,
          privateKey: finalPrivateKey,
          folderId: folderId || null,
          isActive,
        },
      });
    } else {
      await prisma.googleDriveConfig.create({
        data: {
          clientEmail: clientEmail || null,
          privateKey: finalPrivateKey,
          folderId: folderId || null,
          isActive,
        },
      });
    }

    log.info("Google Drive config updated by admin");
    return NextResponse.json({ success: true, message: "Konfigurasi berhasil disimpan" });
  } catch (error) {
    log.error("Failed to save Google Drive config", { error: String(error) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
