import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sanitizeString } from "@/lib/utils";
import { askChatbot, buildSystemPrompt } from "@/lib/anthropic";
import { z } from "zod";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(30),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
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

    const systemPrompt = await buildSystemPrompt();
    const reply = await askChatbot(sanitizedMessages, systemPrompt);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghubungi asisten AI" },
      { status: 500 }
    );
  }
}
