import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMidtransStatus } from "@/lib/midtrans";
import { getKaseraPaymentStatus } from "@/lib/kasera";
import { applyMidtransStatusUpdate } from "@/lib/transactionStatus";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "cron-reconcile" });

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Verify Cron Secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      log.warn("Unauthorized reconcile cron attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find transactions older than 25 hours that are still PENDING
    const cutoffDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
    
    const stuckTransactions = await prisma.transaction.findMany({
      where: {
        status: "PENDING",
        createdAt: {
          lt: cutoffDate,
        },
      },
      select: {
        orderId: true,
        paymentType: true,
        qrCodeUrl: true,
      }
    });

    if (stuckTransactions.length === 0) {
      return NextResponse.json({ message: "No stuck transactions found", processed: 0 });
    }

    log.info(`Found ${stuckTransactions.length} stuck transactions. Reconciling...`);

    let reconciledCount = 0;
    let expiredCount = 0;
    let errorCount = 0;

    for (const tx of stuckTransactions) {
      try {
        let isPaid = false;
        
        if (tx.paymentType === "KASERA") {
          // Kasera uses qrCodeUrl to store the payment ID in our DB
          if (tx.qrCodeUrl) {
            const kaseraStatus = await getKaseraPaymentStatus(tx.qrCodeUrl);
            if (kaseraStatus.status === "succeeded") {
              isPaid = true;
              await applyMidtransStatusUpdate(tx.orderId, "settlement");
              reconciledCount++;
            }
          }
        } else if (tx.paymentType === "MIDTRANS") {
          try {
            const midtransStatus = await getMidtransStatus(tx.orderId);
            const status = midtransStatus.transaction_status;
            if (status === "settlement" || status === "capture") {
              isPaid = true;
              await applyMidtransStatusUpdate(tx.orderId, "settlement");
              reconciledCount++;
            }
          } catch (e: any) {
            // Midtrans often returns 404 for expired/unpaid transactions that were dropped
            if (e.httpStatusCode === 404) {
              isPaid = false; 
            } else {
              throw e;
            }
          }
        }
        // DOKU doesn't have a direct status check implemented in lib/doku.ts yet,
        // so we default to treating it as expired.

        if (!isPaid) {
          // Mark as EXPIRED locally
          await prisma.transaction.update({
            where: { orderId: tx.orderId },
            data: { status: "EXPIRED" },
          });
          expiredCount++;
        }
      } catch (err) {
        log.error(`Failed to reconcile tx ${tx.orderId}`, {
          error: err instanceof Error ? err.message : String(err),
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      message: "Reconciliation complete",
      stats: {
        totalFound: stuckTransactions.length,
        markedAsPaid: reconciledCount,
        markedAsExpired: expiredCount,
        errors: errorCount,
      }
    });

  } catch (error) {
    log.error("Reconciliation cron failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
