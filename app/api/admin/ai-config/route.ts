import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptAPIKey, decryptAPIKey } from "@/lib/encryption";
import { z } from "zod";

const updateConfigSchema = z.object({
  geminiApiKey: z.string().optional().nullable(),
  anthropicApiKey: z.string().optional().nullable(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let config = await prisma.aIConfiguration.findFirst();

    if (!config) {
      config = await prisma.aIConfiguration.create({
        data: {},
      });
    }

    return NextResponse.json({
      hasGeminiKey: !!config.geminiApiKey,
      hasAnthropicKey: !!config.anthropicApiKey,
      lastUpdatedBy: config.updatedBy,
      lastUpdatedAt: config.updatedAt,
    });
  } catch (error) {
    console.error("Get AI config error:", error);
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
    const parsed = updateConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let config = await prisma.aIConfiguration.findFirst();

    if (!config) {
      config = await prisma.aIConfiguration.create({
        data: {
          geminiApiKey: parsed.data.geminiApiKey
            ? encryptAPIKey(parsed.data.geminiApiKey)
            : null,
          anthropicApiKey: parsed.data.anthropicApiKey
            ? encryptAPIKey(parsed.data.anthropicApiKey)
            : null,
          updatedBy: session.user.name || "unknown",
        },
      });
    } else {
      config = await prisma.aIConfiguration.update({
        where: { id: config.id },
        data: {
          geminiApiKey: parsed.data.geminiApiKey
            ? encryptAPIKey(parsed.data.geminiApiKey)
            : config.geminiApiKey,
          anthropicApiKey: parsed.data.anthropicApiKey
            ? encryptAPIKey(parsed.data.anthropicApiKey)
            : config.anthropicApiKey,
          updatedBy: session.user.name || "unknown",
        },
      });
    }

    return NextResponse.json(
      {
        message: "Konfigurasi AI berhasil diperbarui",
        hasGeminiKey: !!config.geminiApiKey,
        hasAnthropicKey: !!config.anthropicApiKey,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update AI config error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
