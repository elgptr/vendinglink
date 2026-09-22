import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptAPIKey, decryptAPIKey } from "@/lib/encryption";
import { z } from "zod";

const updateConfigSchema = z.object({
  baseUrl: z.string().url().optional().or(z.literal("")),
  apiKey: z.string().optional(),
  chatModel: z.string().optional(),
  descriptionModel: z.string().optional(),
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
      hasApiKey: !!config.apiKey,
      baseUrl: config.baseUrl || "",
      chatModel: config.chatModel || "",
      descriptionModel: config.descriptionModel || "",
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
          baseUrl: parsed.data.baseUrl || null,
          apiKey: parsed.data.apiKey
            ? encryptAPIKey(parsed.data.apiKey)
            : null,
          chatModel: parsed.data.chatModel || null,
          descriptionModel: parsed.data.descriptionModel || null,
          updatedBy: session.user.name || "unknown",
        },
      });
    } else {
      config = await prisma.aIConfiguration.update({
        where: { id: config.id },
        data: {
          baseUrl: parsed.data.baseUrl !== undefined
            ? (parsed.data.baseUrl || null)
            : config.baseUrl,
          apiKey: parsed.data.apiKey
            ? encryptAPIKey(parsed.data.apiKey)
            : config.apiKey,
          chatModel: parsed.data.chatModel !== undefined
            ? (parsed.data.chatModel || null)
            : config.chatModel,
          descriptionModel: parsed.data.descriptionModel !== undefined
            ? (parsed.data.descriptionModel || null)
            : config.descriptionModel,
          updatedBy: session.user.name || "unknown",
        },
      });
    }

    return NextResponse.json(
      {
        message: "Konfigurasi AI berhasil diperbarui",
        hasApiKey: !!config.apiKey,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update AI config error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
