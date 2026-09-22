import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptAPIKey, decryptAPIKey } from "@/lib/encryption";
import { z } from "zod";

const updateConfigSchema = z.object({
  geminiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  
  // Custom chat provider
  customChatBaseUrl: z.string().url().optional().or(z.literal("")),
  customChatApiKey: z.string().optional(),
  customChatModel: z.string().optional(),
  
  // Custom description provider
  customDescriptionBaseUrl: z.string().url().optional().or(z.literal("")),
  customDescriptionApiKey: z.string().optional(),
  customDescriptionModel: z.string().optional(),
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
      hasCustomChatKey: !!config.customChatApiKey,
      hasCustomDescriptionKey: !!config.customDescriptionApiKey,
      customChatBaseUrl: config.customChatBaseUrl || "",
      customChatModel: config.customChatModel || "",
      customDescriptionBaseUrl: config.customDescriptionBaseUrl || "",
      customDescriptionModel: config.customDescriptionModel || "",
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
          customChatBaseUrl: parsed.data.customChatBaseUrl || null,
          customChatApiKey: parsed.data.customChatApiKey
            ? encryptAPIKey(parsed.data.customChatApiKey)
            : null,
          customChatModel: parsed.data.customChatModel || null,
          customDescriptionBaseUrl: parsed.data.customDescriptionBaseUrl || null,
          customDescriptionApiKey: parsed.data.customDescriptionApiKey
            ? encryptAPIKey(parsed.data.customDescriptionApiKey)
            : null,
          customDescriptionModel: parsed.data.customDescriptionModel || null,
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
          customChatBaseUrl: parsed.data.customChatBaseUrl !== undefined
            ? (parsed.data.customChatBaseUrl || null)
            : config.customChatBaseUrl,
          customChatApiKey: parsed.data.customChatApiKey
            ? encryptAPIKey(parsed.data.customChatApiKey)
            : config.customChatApiKey,
          customChatModel: parsed.data.customChatModel !== undefined
            ? (parsed.data.customChatModel || null)
            : config.customChatModel,
          customDescriptionBaseUrl: parsed.data.customDescriptionBaseUrl !== undefined
            ? (parsed.data.customDescriptionBaseUrl || null)
            : config.customDescriptionBaseUrl,
          customDescriptionApiKey: parsed.data.customDescriptionApiKey
            ? encryptAPIKey(parsed.data.customDescriptionApiKey)
            : config.customDescriptionApiKey,
          customDescriptionModel: parsed.data.customDescriptionModel !== undefined
            ? (parsed.data.customDescriptionModel || null)
            : config.customDescriptionModel,
          updatedBy: session.user.name || "unknown",
        },
      });
    }

    return NextResponse.json(
      {
        message: "Konfigurasi AI berhasil diperbarui",
        hasGeminiKey: !!config.geminiApiKey,
        hasAnthropicKey: !!config.anthropicApiKey,
        hasCustomChatKey: !!config.customChatApiKey,
        hasCustomDescriptionKey: !!config.customDescriptionApiKey,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update AI config error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
