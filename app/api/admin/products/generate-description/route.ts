import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { sanitizeString } from "@/lib/utils";
import { generateProductDescription } from "@/lib/anthropic";

const generateSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().int().positive(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Fitur Generate Deskripsi belum dikonfigurasi. Hubungi admin." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const description = await generateProductDescription(
      sanitizeString(parsed.data.name),
      parsed.data.price
    );

    return NextResponse.json({ description });
  } catch (error) {
    console.error("Generate description error:", error);
    return NextResponse.json(
      { error: "Gagal menghasilkan deskripsi. Coba lagi." },
      { status: 500 }
    );
  }
}
