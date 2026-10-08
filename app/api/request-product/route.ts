import { NextRequest, NextResponse } from "next/server";
import { sendAdminProductRequest } from "@/lib/whatsapp";
import { normalizePhone } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const { customerPhone, requestText } = await req.json();

    if (!customerPhone || !requestText) {
      return NextResponse.json(
        { error: "Phone number and request text are required." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(customerPhone);
    
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Format nomor WhatsApp tidak valid." },
        { status: 400 }
      );
    }

    const result = await sendAdminProductRequest(normalizedPhone, requestText);

    if (result.sent) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Gagal mengirim permintaan ke admin." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Request product error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal." },
      { status: 500 }
    );
  }
}
