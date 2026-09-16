import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActivePaymentGateway, setActivePaymentGateway } from "@/lib/paymentConfig";
import { z } from "zod";

const updateSchema = z.object({
  gateway: z.enum(["MIDTRANS", "DOKU"]),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const gateway = getActivePaymentGateway();
    return NextResponse.json({
      gateway,
      hasMidtrans: !!process.env.MIDTRANS_SERVER_KEY,
      hasDoku: !!process.env.DOKU_CLIENT_ID && !!process.env.DOKU_SECRET_KEY,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Gateway tidak valid" }, { status: 400 });
    }

    setActivePaymentGateway(parsed.data.gateway);

    return NextResponse.json({
      message: `Gateway berhasil diubah ke ${parsed.data.gateway}`,
      gateway: parsed.data.gateway,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Gagal memperbarui gateway" }, { status: 500 });
  }
}