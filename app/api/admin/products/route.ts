import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sanitizeString } from "@/lib/utils";

const productSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().int().positive(),
  originalPrice: z.number().int().positive().optional().nullable(),
  showOriginalPrice: z.boolean().optional(),
  type: z.enum(["LINK", "KODE"]).default("LINK"),
  description: z.string().max(500).optional(),
  guideImageUrl: z.string().url("URL gambar tidak valid").max(2048).optional().or(z.literal("")),
  guideText: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  price: z.number().int().positive().optional(),
  originalPrice: z.number().int().positive().optional().nullable(),
  showOriginalPrice: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["LINK", "KODE"]).optional(),
  description: z.string().max(500).optional(),
  guideImageUrl: z.string().url("URL gambar tidak valid").max(2048).optional().nullable().or(z.literal("")),
  guideText: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
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

    const products = await prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            stocks: { where: { status: "AVAILABLE" } },
          },
        },
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Products GET error:", error);
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
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name: sanitizeString(parsed.data.name),
        price: parsed.data.price,
        originalPrice: parsed.data.originalPrice || null,
        showOriginalPrice: parsed.data.showOriginalPrice ?? true,
        type: parsed.data.type,
        description: parsed.data.description
          ? sanitizeString(parsed.data.description)
          : null,
        guideImageUrl: parsed.data.guideImageUrl || null,
        guideText: parsed.data.guideText
          ? sanitizeString(parsed.data.guideText)
          : null,
        isActive: parsed.data.isActive ?? true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Products POST error:", error);
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

    const { id, description, guideImageUrl, guideText, originalPrice, showOriginalPrice, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (originalPrice !== undefined) {
      updateData.originalPrice = originalPrice || null;
    }
    if (showOriginalPrice !== undefined) {
      updateData.showOriginalPrice = showOriginalPrice;
    }
    if (description !== undefined) {
      updateData.description = description ? sanitizeString(description) : null;
    }
    if (guideImageUrl !== undefined) {
      updateData.guideImageUrl = guideImageUrl || null;
    }
    if (guideText !== undefined) {
      updateData.guideText = guideText ? sanitizeString(guideText) : null;
    }
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Products PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
