import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmBridgeProductRequest } from "@/lib/bridge/requestsClient";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "customer-request-confirm" });

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const requestRecord = await prisma.customerProductRequest.findUnique({
      where: { id },
    });

    if (!requestRecord) {
      return NextResponse.json(
        { error: "Permintaan pengadaan produk tidak ditemukan" },
        { status: 404 }
      );
    }

    if (requestRecord.status === "CONFIRMED" || requestRecord.status === "PURCHASED") {
      return NextResponse.json(
        {
          success: true,
          status: requestRecord.status,
          transactionId: requestRecord.transactionId,
          message: "Permintaan ini sudah dikonfirmasi sebelumnya.",
        },
        { status: 200 }
      );
    }

    if (requestRecord.status !== "FOUND") {
      return NextResponse.json(
        {
          error: `Tidak dapat mengonfirmasi permintaan dengan status ${requestRecord.status}. Status harus FOUND.`,
        },
        { status: 400 }
      );
    }

    if (!requestRecord.bridgeRequestId) {
      return NextResponse.json(
        { error: "Permintaan ini belum terhubung ke antrean Bridge" },
        { status: 400 }
      );
    }

    // Panggil Bridge untuk trigger konfirmasi pembelian
    const bridgeResult = await confirmBridgeProductRequest(requestRecord.bridgeRequestId);

    if (!bridgeResult.success) {
      log.warn("Bridge rejected confirmation", {
        id,
        bridgeRequestId: requestRecord.bridgeRequestId,
        error: bridgeResult.error,
      });
      return NextResponse.json(
        { error: bridgeResult.error || "Gagal mengonfirmasi pesanan ke Bridge" },
        { status: 400 }
      );
    }

    // Update status di database lokal
    const updated = await prisma.customerProductRequest.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        transactionId: bridgeResult.transactionId,
        confirmedAt: new Date(),
      },
    });

    log.info("Product request successfully confirmed by customer", {
      id: updated.id,
      transactionId: updated.transactionId,
    });

    return NextResponse.json({
      success: true,
      id: updated.id,
      status: "CONFIRMED",
      transactionId: updated.transactionId,
      message: "Pesanan berhasil dikonfirmasi dan sedang diproses pengadaannya.",
    });
  } catch (error) {
    log.error("Error confirming product request", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Terjadi kesalahan internal saat konfirmasi" },
      { status: 500 }
    );
  }
}
