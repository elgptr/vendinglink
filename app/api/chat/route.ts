import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sanitizeString } from "@/lib/utils";
import { askChatbot, buildSystemPrompt } from "@/lib/gemini";
import { z } from "zod";
import { createLogger } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { decryptAPIKey } from "@/lib/encryption";

const log = createLogger({ module: "chat" });

// 15 requests per minute per user/IP
const chatRateLimiter = createRateLimiter(15, 60 * 1000);

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(30),
});

async function resolveGeminiKey(): Promise<string | null> {
  try {
    const config = await prisma.aIConfiguration.findFirst();
    if (config?.geminiApiKey) {
      return decryptAPIKey(config.geminiApiKey);
    }
  } catch (err) {
    log.error("Failed to read AIConfiguration from database", { error: String(err) });
  }
  return process.env.GEMINI_API_KEY || null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Client identifier for rate limiting: user id if logged in, else client IP
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "anonymous";
    const limiterKey = session?.user?.id ? `user:${session.user.id}` : `ip:${clientIp}`;

    const limitResult = chatRateLimiter.check(limiterKey);
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan chat. Silakan tunggu sebentar." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((limitResult.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const apiKey = await resolveGeminiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Fitur chat belum dikonfigurasi. Hubungi admin." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Input tidak valid", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Sanitize every message content to prevent XSS/prompt injection artifacts
    const sanitizedMessages = parsed.data.messages.map((m) => ({
      role: m.role,
      content: sanitizeString(m.content).slice(0, 2000),
    }));

    const lastMessage = sanitizedMessages[sanitizedMessages.length - 1];
    if (!lastMessage || lastMessage.role !== "user" || !lastMessage.content) {
      return NextResponse.json(
        { error: "Pesan terakhir harus berasal dari pengguna" },
        { status: 400 }
      );
    }

    const isCustomer = !session?.user?.id || session.user.role === "CUSTOMER";
    const systemPrompt = await buildSystemPrompt(isCustomer ? "customer" : "agent");
    const reply = await askChatbot(sanitizedMessages, systemPrompt, apiKey);

    return NextResponse.json({ reply });
  } catch (error) {
    log.error("Chat API error", { error: String(error) });
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghubungi asisten AI" },
      { status: 500 }
    );
  }
}