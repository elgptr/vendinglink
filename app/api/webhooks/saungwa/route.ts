import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as whatsappService from "@/lib/whatsapp";
import { generateOrderId } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("SaungWA Webhook Payload:", JSON.stringify(body, null, 2));

    const from = body?.from;
    const message = body?.message;

    if (!from || !message || typeof message !== "string") {
      console.log("SaungWA Webhook Error: Invalid payload. 'from' or 'message' is missing or not a string.");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const text = message.toLowerCase().trim();

    // Condition 1: Request Catalog
    if (text.includes("beli") || text.includes("katalog") || text.includes("produk")) {
      // Check if it's the order form submission instead (Condition 2)
      if (text.includes("form pemesanan") || text.includes("nama pemesan")) {
        return handleOrderForm(from, message);
      }

      // Fetch active products
      // In prisma schema, Product doesn't have code, only id/name/price etc. Let's select id, name, price.
      const products = await prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, price: true },
      });

      if (products.length === 0) {
        await whatsappService.sendEmptyStockMessage(from);
      } else {
        await whatsappService.sendCatalogAndTemplateMessage(from, products);
      }

      return NextResponse.json({ success: true });
    }

    // Condition 2: Order Form Submission
    if (text.includes("form pemesanan") || text.includes("nama pemesan")) {
      return handleOrderForm(from, message);
    }

    // Unknown message
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("SaungWA webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function handleOrderForm(from: string, message: string) {
  // Very basic regex to parse the form
  const nameMatch = message.match(/nama pemesan\s*:[ \t]*([^\r\n]+)/i);
  const productMatch = message.match(/nama produk\s*:[ \t]*([^\r\n]+)/i);

  const customerName = nameMatch ? nameMatch[1].trim() : "";
  const productName = productMatch ? productMatch[1].trim() : "";

  if (!customerName || !productName) {
    await whatsappService.sendInvalidOrderFormatMessage(from);
    return NextResponse.json({ success: true });
  }

  // Find product by name (case-insensitive approximation)
  const product = await prisma.product.findFirst({
    where: {
      isActive: true,
      name: {
        contains: productName,
        mode: 'insensitive',
      }
    }
  });

  if (!product) {
    await whatsappService.sendInvalidOrderFormatMessage(from);
    return NextResponse.json({ success: true });
  }

  // Generate Order ID
  const orderId = generateOrderId();
  const customerUrl = process.env.NEXT_PUBLIC_CUSTOMER_URL || "https://toko.txsiber.online/customer";

  // Create pending transaction in DB
  await prisma.transaction.create({
    data: {
      orderId,
      productId: product.id,
      customerName,
      customerPhone: from, // Use WhatsApp number
      paymentType: "QRIS",
      originalPrice: product.price,
      finalAmount: product.price,
      status: "PENDING",
    }
  });

  const checkoutUrl = `${customerUrl}/order/${orderId}?show_qr=true`;

  await whatsappService.sendOrderCheckoutLink(from, orderId, checkoutUrl);
  return NextResponse.json({ success: true });
}
