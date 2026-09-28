import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { decryptAPIKey } from "@/lib/encryption";

const testSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
  model: z.string().min(1),
});

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

async function testConnection(baseUrl: string, apiKey: string, model: string): Promise<boolean> {
  try {
    const endpoint = baseUrl.endsWith("/chat/completions")
      ? baseUrl
      : baseUrl.replace(/\/$/, "") + "/chat/completions";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Test" }],
        max_tokens: 10,
      }),
    });
    
    return res.ok;
  } catch (error) {
    console.error("Test error:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = testSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let { baseUrl, apiKey, model } = parsed.data;
    
    if (!apiKey || apiKey === "existing") {
      const config = await prisma.aIConfiguration.findFirst();
      if (config?.apiKey) {
        apiKey = decryptAPIKey(config.apiKey);
      } else {
        apiKey = process.env.OPENAI_API_KEY || "";
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is required" }, { status: 400 });
    }

    const isValid = await testConnection(baseUrl, apiKey, model);

    return NextResponse.json({
      valid: isValid,
      message: isValid
        ? `API key is valid`
        : `API key is invalid or connection failed`,
    });
  } catch (error) {
    console.error("Test connection error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
