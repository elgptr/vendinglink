import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { createRateLimiter } from "@/lib/rateLimit";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "admin-upload" });

// Rate limiter: 5 uploads per minute per admin
const uploadLimiter = createRateLimiter(5, 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ────────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // ── Rate limiting ─────────────────────────────────────────────────────
    if (!uploadLimiter.check(session.user.id).allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak upload. Maksimal 5 per menit." },
        { status: 429 }
      );
    }

    // ── Parse multipart form data ─────────────────────────────────────────
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const productId = formData.get("productId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "File wajib diunggah" },
        { status: 400 }
      );
    }

    // ── Upload file ───────────────────────────────────────────────────────
    let uploadResult;
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      uploadResult = await uploadFile(buffer, file.name, file.type);
    } catch (uploadError) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : "Upload failed";
      log.error("File upload failed", { error: errorMessage, productId });
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    // ── Update product guide image if productId provided ──────────────────
    if (productId) {
      // Verify product exists and is visible to admin
      const product = await prisma.product.findFirst({
        where: { id: productId },
        select: { id: true },
      });

      if (!product) {
        log.warn("Product not found for image upload", { productId });
        return NextResponse.json(
          { error: "Produk tidak ditemukan" },
          { status: 404 }
        );
      }

      // Update product with new image URL
      await prisma.product.update({
        where: { id: productId },
        data: { guideImageUrl: uploadResult.url },
      });

      log.info("Product guide image updated", { productId, url: uploadResult.url });
    }

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      size: uploadResult.size,
      mimeType: uploadResult.mimeType,
      message: productId ? "Gambar produk berhasil diperbarui" : "File berhasil diunggah",
    });

  } catch (error) {
    log.error("Admin upload error", { error: String(error) });
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
