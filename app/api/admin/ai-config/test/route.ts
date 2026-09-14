import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { z } from "zod";

const testSchema = z.object({
  provider: z.enum(["gemini", "anthropic"]),
  apiKey: z.string().min(1),
});

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

async function testGeminiConnection(apiKey: string): Promise<boolean> {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const gemini = new GoogleGenAI({ apiKey });
    
    // Simple test: count tokens
    const response = await gemini.models.countTokens({
      model: "gemini-3.6-flash",
      contents: [{ parts: [{ text: "Test" }] }],
    });
    
    return !!response;
  } catch (error) {
    console.error("Gemini test error:", error);
    return false;
  }
}

async function testAnthropicConnection(apiKey: string): Promise<boolean> {
  try {
    const Anthropic = await import("@anthropic-ai/sdk").then(m => m.default);
    const anthropic = new Anthropic({ apiKey });
    
    // Simple test: count tokens
    const response = await anthropic.messages.countTokens({
      model: "claude-haiku-4-5-20251001",
      messages: [{ role: "user", content: "Test" }],
    });
    
    return !!response;
  } catch (error) {
    console.error("Anthropic test error:", error);
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

    const { provider, apiKey } = parsed.data;
    let isValid = false;

    if (provider === "gemini") {
      isValid = await testGeminiConnection(apiKey);
    } else if (provider === "anthropic") {
      isValid = await testAnthropicConnection(apiKey);
    }

    return NextResponse.json({
      valid: isValid,
      message: isValid
        ? `${provider} API key is valid`
        : `${provider} API key is invalid or connection failed`,
    });
  } catch (error) {
    console.error("Test connection error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
