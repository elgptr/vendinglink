import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const fields = z.object({
  code: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).transform((s) => s.toUpperCase()),
  name: z.string().trim().min(1).max(100),
  discountType: z.enum(["FIXED_IDR", "PERCENT"]),
  value: z.number().int().positive(),
  maxDiscount: z.number().int().positive().nullable(),
  minSpend: z.number().int().nonnegative(),
  validFrom: z.string().datetime({ offset: true }),
  validUntil: z.string().datetime({ offset: true }),
  quotaTotal: z.number().int().positive().nullable(),
  quotaPerCustomer: z.number().int().positive().max(100),
  categoryId: z.string().nullable(),
  isActive: z.boolean(),
  bannerImageUrl: z.string().nullable().optional(),
  bannerType: z.enum(["FULL_STRIP", "BADGE_COMPOSED"]).optional().default("BADGE_COMPOSED"),
  bannerText: z.string().nullable().optional(),
  bannerCtaText: z.string().nullable().optional(),
  bannerCtaUrl: z.string().nullable().optional(),
}).strict().refine((v) => new Date(v.validUntil) > new Date(v.validFrom), {
  message: "Akhir promo harus setelah awal promo", path: ["validUntil"],
}).refine((v) => v.discountType !== "PERCENT" || (v.value <= 100 && v.maxDiscount !== null), {
  message: "Persentase maksimal 100 dan wajib memiliki batas diskon", path: ["maxDiscount"],
}).refine((v) => {
  if (v.bannerType === "FULL_STRIP" && v.bannerImageUrl) {
    return Boolean(v.bannerCtaUrl && v.bannerCtaUrl.trim().length > 0);
  }
  return true;
}, {
  message: "CTA Target URL wajib diisi jika menggunakan Banner Horizontal Penuh (Full Strip)",
  path: ["bannerCtaUrl"],
});

const bad = (detail?: string) =>
  NextResponse.json({ error: detail || "Data aturan voucher tidak valid" }, { status: 400 });
const conflict = () => NextResponse.json({ error: "Kode sudah digunakan atau kuota di bawah pemakaian" }, { status: 409 });

async function authorized() { return Boolean(await requireAdminSession()); }

export async function GET() {
  if (!await authorized()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rules = await prisma.voucherRule.findMany({ where: { kind: "SCHEDULED" },
    orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ rules });
}

export async function POST(request: NextRequest) {
  if (!await authorized()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return bad(); }
  const parsed = fields.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return bad(`Validasi gagal — ${issues}`);
  }
  const { validFrom, validUntil, categoryId, ...rest } = parsed.data;
  try {
    const rule = await prisma.voucherRule.create({ data: {
      ...rest, kind: "SCHEDULED", validFrom: new Date(validFrom), validUntil: new Date(validUntil),
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
    } });
    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return conflict();
    console.error("[voucher-rules POST]", error);
    return bad(error instanceof Error ? error.message : "Gagal menyimpan ke database");
  }
}

export async function PATCH(request: NextRequest) {
  if (!await authorized()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return bad(); }
  if (!body || typeof body !== "object" || !("id" in body) || typeof body.id !== "string") return bad();
  const { id, ...values } = body as Record<string, unknown> & { id: string };
  const parsed = fields.safeParse(values);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return bad(`Validasi gagal — ${issues}`);
  }
  const { validFrom, validUntil, categoryId, ...rest } = parsed.data;
  try {
    const result = await prisma.voucherRule.updateMany({ where: {
      id, kind: "SCHEDULED", ...(rest.quotaTotal === null ? {} : { usedCount: { lte: rest.quotaTotal } }),
    }, data: { ...rest, categoryId, validFrom: new Date(validFrom), validUntil: new Date(validUntil) } });
    if (!result.count) return conflict();
    return NextResponse.json(await prisma.voucherRule.findUnique({ where: { id } }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return conflict();
    console.error("[voucher-rules PATCH]", error);
    return bad(error instanceof Error ? error.message : "Gagal menyimpan perubahan ke database");
  }
}

export async function DELETE(request: NextRequest) {
  if (!await authorized()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return bad();
  // Historical redemptions must remain auditable: archive instead of cascading
  // deletion (VoucherRedemption has onDelete: Cascade).
  const result = await prisma.voucherRule.updateMany({ where: { id, kind: "SCHEDULED" }, data: { isActive: false } });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}