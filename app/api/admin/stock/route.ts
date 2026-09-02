import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBulkLinks, isValidUrl } from "@/lib/utils";
import { z } from "zod";

const bulkUploadSchema = z.object({
  productId: z.string().min(1),
  links: z.string().min(1),
});

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where = productId ? { productId } : {};

    const [stocks, total] = await Promise.all([
      prisma.redeemStock.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { name: true } },
          claimedByAgent: { select: { username: true } },
        },
      }),
      prisma.redeemStock.count({ where }),
    ]);

    // Mask redeemUrl for AVAILABLE stocks — show only first/last chars
    const safeStocks = stocks.map((s) => ({
      id: s.id,
      productName: s.product.name,
      productId: s.productId,
      status: s.status,
      // Show full URL for SOLD, masked for AVAILABLE
      redeemUrl:
        s.status === "SOLD"
          ? s.redeemUrl
          : `${s.redeemUrl.substring(0, 20)}...`,
      claimedByAgent: s.claimedByAgent?.username || null,
      customerName: s.customerName,
      claimedAt: s.claimedAt,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({
      stocks: safeStocks,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Stock GET error:", error);
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
    const parsed = bulkUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { productId, links: linksText } = parsed.data;

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    // Parse and validate links
    const links = parseBulkLinks(linksText);

    if (links.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada URL valid yang ditemukan" },
        { status: 400 }
      );
    }

    // Check for duplicate links already in DB
    const existingLinks = await prisma.redeemStock.findMany({
      where: { redeemUrl: { in: links } },
      select: { redeemUrl: true },
    });

    const existingUrlSet = new Set(existingLinks.map((s) => s.redeemUrl));
    const newLinks = links.filter((l) => !existingUrlSet.has(l));
    const skippedCount = links.length - newLinks.length;

    if (newLinks.length === 0) {
      return NextResponse.json(
        { error: "Semua link sudah ada dalam database" },
        { status: 400 }
      );
    }

    // Bulk insert
    await prisma.redeemStock.createMany({
      data: newLinks.map((url) => ({
        productId,
        redeemUrl: url,
        status: "AVAILABLE",
      })),
    });

    return NextResponse.json({
      message: `Berhasil menambahkan ${newLinks.length} link`,
      added: newLinks.length,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error("Stock POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
