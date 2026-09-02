import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeString } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  code: z.string().min(3).max(30).toUpperCase(),
  discountAmount: z.number().int().positive(),
  quota: z.number().int().positive(),
  isActive: z.boolean().optional().default(true),
  expiresAt: z.string().datetime().optional().nullable(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
  quota: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
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

    const vouchers = await prisma.voucher.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(vouchers);
  } catch (error) {
    console.error("Vouchers GET error:", error);
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
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const code = sanitizeString(parsed.data.code).toUpperCase().replace(/\s+/g, "");

    // Check duplicate code
    const existing = await prisma.voucher.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: "Kode voucher sudah digunakan" },
        { status: 409 }
      );
    }

    const voucher = await prisma.voucher.create({
      data: {
        code,
        discountAmount: parsed.data.discountAmount,
        quota: parsed.data.quota,
        isActive: parsed.data.isActive,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      },
    });

    return NextResponse.json(voucher, { status: 201 });
  } catch (error) {
    console.error("Vouchers POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { id, ...updateData } = parsed.data;

    const voucher = await prisma.voucher.update({
      where: { id },
      data: {
        ...updateData,
        expiresAt: updateData.expiresAt ? new Date(updateData.expiresAt) : undefined,
      },
    });

    return NextResponse.json(voucher);
  } catch (error) {
    console.error("Vouchers PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
