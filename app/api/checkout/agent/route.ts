import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOrderId } from "@/lib/utils";
import { claimAvailableStock } from "@/lib/stock";
import { z } from "zod";

const agentCheckoutSchema = z.object({
  productId: z.string().min(1),
  voucherId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "AGENT") {
      return NextResponse.json({ error: "Forbidden: Not an agent" }, { status: 403 });
    }

    // Verify agent is approved
    const agent = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isApproved: true },
    });

    if (!agent?.isApproved) {
      return NextResponse.json(
        { error: "Akun agen Anda belum disetujui oleh admin." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = agentCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Input tidak valid", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, voucherId } = parsed.data;

    // ─── Verify product exists and is active ──────────────────────────────
    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan atau tidak aktif" },
        { status: 404 }
      );
    }

    // ─── Calculate price with voucher ──────────────────────────────────────
    let discountAmount = 0;
    let resolvedVoucherId: string | undefined;

    if (voucherId) {
      const voucher = await prisma.voucher.findFirst({
        where: { id: voucherId, isActive: true },
      });

      if (voucher && voucher.usedCount < voucher.quota) {
        if (!voucher.expiresAt || new Date(voucher.expiresAt) > new Date()) {
          discountAmount = voucher.discountAmount;
          resolvedVoucherId = voucher.id;
        }
      }
    }

    const originalPrice = product.price;
    const finalAmount = Math.max(0, originalPrice - discountAmount);
    const orderId = generateOrderId();

    // ─── Database Transaction ──────────────────────────────────────────────
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Atomically claim an available stock unit (compare-and-swap,
        //    safe under concurrent checkouts — see lib/stock.ts).
        const claimedStock = await claimAvailableStock(tx, productId, {
          claimedByAgentId: session.user.id,
        });

        if (!claimedStock) {
          throw new Error("NO_STOCK");
        }

        // 2. Create the transaction as PAID
        const transaction = await tx.transaction.create({
          data: {
            orderId,
            productId,
            agentId: session.user.id,
            voucherId: resolvedVoucherId,
            customerName: session.user.name || "Agent",
            paymentType: "AGENT_CREDIT",
            originalPrice,
            discountAmount,
            finalAmount,
            status: "PAID",
            stockStatus: "FULFILLED",
            isSettled: false,
            redeemUrl: claimedStock.redeemUrl,
            paidAt: new Date(),
          },
        });

        // 3. Update Voucher usage if applicable
        if (resolvedVoucherId) {
          await tx.voucher.update({
            where: { id: resolvedVoucherId },
            data: { usedCount: { increment: 1 } },
          });
        }

        // 4. Increment agent's outstanding debt
        await tx.user.update({
          where: { id: session.user.id },
          data: { outstandingDebt: { increment: finalAmount } },
        });

        return { transaction, claimedStock };
      });

      return NextResponse.json({
        orderId: result.transaction.orderId,
        amount: finalAmount,
        originalPrice,
        discountAmount,
        productName: product.name,
        redeemUrl: result.claimedStock.redeemUrl,
        guideImageUrl: product.guideImageUrl,
      });
    } catch (txError) {
      if (txError instanceof Error && txError.message === "NO_STOCK") {
        return NextResponse.json(
          { error: "Stok produk habis." },
          { status: 400 }
        );
      }
      throw txError;
    }
  } catch (error) {
    console.error("Agent checkout error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
