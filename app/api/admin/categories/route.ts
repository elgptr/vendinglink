import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sanitizeString } from "@/lib/utils";
import { checkAdminRateLimit } from "@/lib/adminRateLimit";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "admin-categories" });

const slugRegex = /^[a-z0-9-]+$/;

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(slugRegex, "Slug hanya boleh huruf kecil, angka, dan tanda hubung"),
  parentId: z.string().optional().nullable(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(slugRegex).optional(),
  parentId: z.string().optional().nullable(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET(request: NextRequest) {
  try {
    const rateCheck = checkAdminRateLimit(request);
    if (!rateCheck.allowed) return rateCheck.response;

    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: true, children: true } },
        parent: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    log.error("Categories GET error", { error: String(error) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateCheck = checkAdminRateLimit(request);
    if (!rateCheck.allowed) return rateCheck.response;

    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, slug, parentId } = parsed.data;

    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { id: true } });
      if (!parent) {
        return NextResponse.json({ error: "Parent category not found" }, { status: 400 });
      }
    }

    const category = await prisma.category.create({
      data: {
        name: sanitizeString(name),
        slug,
        parentId: parentId || null,
      },
    });

    log.info("Category created", { categoryId: category.id, slug });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log.error("Categories POST error", { error: errMsg });
    if (errMsg.includes("Unique constraint failed on the fields: (`slug`)")) {
      return NextResponse.json({ error: "Slug sudah digunakan" }, { status: 409 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


export async function PATCH(request: NextRequest) {
  try {
    const rateCheck = checkAdminRateLimit(request);
    if (!rateCheck.allowed) return rateCheck.response;

    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { id, parentId, ...rest } = parsed.data;

    if (parentId === id) {
      return NextResponse.json({ error: "Kategori tidak boleh menjadi parent dari dirinya sendiri" }, { status: 400 });
    }

    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { id: true } });
      if (!parent) {
        return NextResponse.json({ error: "Parent category not found" }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = { ...rest };
    if (parentId !== undefined) updateData.parentId = parentId || null;
    if (rest.name) updateData.name = sanitizeString(rest.name);

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    log.info("Category updated", { categoryId: category.id });
    return NextResponse.json(category);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log.error("Categories PATCH error", { error: errMsg });
    if (errMsg.includes("Unique constraint failed on the fields: (`slug`)")) {
      return NextResponse.json({ error: "Slug sudah digunakan" }, { status: 409 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rateCheck = checkAdminRateLimit(request);
    if (!rateCheck.allowed) return rateCheck.response;

    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const children = await prisma.category.count({ where: { parentId: id } });
    if (children > 0) {
      return NextResponse.json(
        { error: "Kategori masih memiliki sub-kategori. Hapus sub-kategori terlebih dahulu." },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });
    log.info("Category deleted", { categoryId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error("Categories DELETE error", { error: String(error) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
