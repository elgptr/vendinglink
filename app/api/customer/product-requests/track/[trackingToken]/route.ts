import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  auditTrackingLinkAccessed,
  auditTrackingLinkExpired,
} from "@/lib/audit/trackingAudit";
import { getPreOrderDisplayPrices } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ trackingToken: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { trackingToken } = await params;

    if (!trackingToken) {
      return NextResponse.json(
        { error: "Tracking token required" },
        { status: 400 }
      );
    }

    // Lookup by trackingToken or fallback to ID (backward compatibility)
    const requestRecord = await prisma.customerProductRequest.findFirst({
      where: {
        OR: [{ trackingToken }, { id: trackingToken }],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            originalPrice: true,
            showOriginalPrice: true,
            guideImageUrl: true,
            description: true,
          },
        },
      },
    });

    if (!requestRecord) {
      return NextResponse.json(
        { error: "TRACKING_NOT_FOUND", message: "Pesanan pre-order tidak ditemukan." },
        { status: 404 }
      );
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Check if link is explicitly invalidated
    if (requestRecord.isInvalidated) {
      return NextResponse.json(
        {
          error: "TRACKING_INVALIDATED",
          status: "INVALIDATED",
          message: "Link tracking ini telah dinonaktifkan.",
        },
        { status: 410 }
      );
    }

    // Check expiration
    if (requestRecord.expiresAt && new Date() > requestRecord.expiresAt) {
      auditTrackingLinkExpired({
        trackingToken,
        requestId: requestRecord.id,
        customerPhone: requestRecord.customerPhone,
        productName: requestRecord.productName,
        expiredAt: requestRecord.expiresAt.toISOString(),
      });

      return NextResponse.json(
        {
          error: "TRACKING_EXPIRED",
          status: "EXPIRED",
          message: "Link tracking ini telah kedaluwarsa.",
          request: {
            id: requestRecord.id,
            productName: requestRecord.productName,
            status: "EXPIRED",
          },
        },
        { status: 410 }
      );
    }

    // Log tracking access audit
    auditTrackingLinkAccessed({
      trackingToken,
      requestId: requestRecord.id,
      status: requestRecord.status,
      customerPhone: requestRecord.customerPhone,
      productName: requestRecord.productName,
      clientIp,
      userAgent,
    });

    const displayPrices = requestRecord.product
      ? getPreOrderDisplayPrices(requestRecord.product)
      : null;

    return NextResponse.json(
      {
        success: true,
        request: {
          id: requestRecord.id,
          trackingToken: requestRecord.trackingToken || requestRecord.id,
          productName: requestRecord.productName,
          productId: requestRecord.productId,
          categorySlug: requestRecord.categorySlug,
          maxBudget: requestRecord.maxBudget,
          status: requestRecord.status,
          rejectionReason: requestRecord.rejectionReason,
          transactionId: requestRecord.transactionId,
          createdAt: requestRecord.createdAt.toISOString(),
          expiresAt: requestRecord.expiresAt?.toISOString() || null,
          product: requestRecord.product
            ? {
                id: requestRecord.product.id,
                name: requestRecord.product.name,
                price: requestRecord.product.price,
                originalPrice: displayPrices?.originalPrice ?? null,
                discountPercent: displayPrices?.discountPercent ?? null,
                guideImageUrl: requestRecord.product.guideImageUrl,
                description: requestRecord.product.description,
              }
            : null,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal server error", details: msg },
      { status: 500 }
    );
  }
}
