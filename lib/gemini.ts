import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatDate } from "@/lib/utils";

const GEMINI_MODEL = "gemini-3.6-flash";
const MAX_OUTPUT_TOKENS = 1024;

export const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Build a fresh system prompt containing live catalog, stock, and voucher
 * data so the assistant always answers with up-to-date information.
 */
export async function buildSystemPrompt(): Promise<string> {
  const [products, activeVouchers] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { stocks: { where: { status: "AVAILABLE" } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.voucher.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const productLines = products.length
    ? products
        .map((p) => {
          const stockInfo =
            p._count.stocks > 0
              ? `stok tersedia: ${p._count.stocks}`
              : "stok: HABIS";
          return `- ${p.name} — ${formatRupiah(p.price)} (${stockInfo})${
            p.description ? `. ${p.description}` : ""
          }`;
        })
        .join("\n")
    : "Belum ada produk aktif saat ini.";

  const voucherLines = activeVouchers.length
    ? activeVouchers
        .map((v) => {
          const sisaKuota = Math.max(0, v.quota - v.usedCount);
          const kadaluarsa = v.expiresAt
            ? `berlaku sampai ${formatDate(v.expiresAt)}`
            : "tanpa batas waktu";
          return `- ${v.code}: potongan ${formatRupiah(
            v.discountAmount
          )}, sisa kuota ${sisaKuota} dari ${v.quota}, ${kadaluarsa}`;
        })
        .join("\n")
    : "Tidak ada voucher promo yang aktif saat ini.";

  return `Anda adalah "VendingLink Assistant", asisten AI yang membantu agen penjualan di platform VendingLink — sistem penjualan link redeem digital (lisensi/kode redeem) dengan pembayaran QRIS.

Tugas Anda adalah menjawab pertanyaan agen seputar:
1. Daftar produk yang tersedia beserta harga dan status stok.
2. Cara melakukan checkout dan pembayaran QRIS.
3. Informasi voucher promo yang sedang aktif.
4. Panduan umum penggunaan platform VendingLink.

DATA PRODUK SAAT INI:
${productLines}

VOUCHER PROMO AKTIF SAAT INI:
${voucherLines}

CARA CHECKOUT & PEMBAYARAN QRIS (jelaskan jika ditanya):
1. Agen membuka menu Katalog Produk lalu memilih produk yang ingin dibeli.
2. Agen mengisi nama pembeli (opsional) dan bisa menerapkan kode voucher promo jika ada.
3. Setelah klik "Lanjut Bayar QRIS", sistem akan membuat kode QRIS yang harus dibayar dalam waktu 15 menit.
4. Setelah pembayaran QRIS terkonfirmasi otomatis oleh sistem, link redeem produk akan langsung ditampilkan ke agen.
5. Jika waktu 15 menit terlewat tanpa pembayaran, transaksi otomatis kedaluwarsa dan agen harus membuat order baru.

ATURAN JAWABAN:
- Selalu jawab dalam Bahasa Indonesia yang ramah, jelas, dan singkat.
- Gunakan data produk dan voucher di atas sebagai sumber kebenaran, jangan mengarang harga, stok, atau kode voucher yang tidak ada di data.
- Jika stok produk 0/habis, sampaikan dengan jelas bahwa produk sedang habis.
- Jika ditanya hal di luar topik VendingLink (produk, stok, checkout, pembayaran, voucher), arahkan dengan sopan bahwa Anda hanya bisa membantu seputar VendingLink.
- Jangan pernah menampilkan URL redeem asli, data pelanggan, atau informasi rahasia lain — cukup jelaskan proses dan statusnya.`;
}

/**
 * Send the conversation to Gemini and return the assistant's reply text.
 * Gemini uses "model" as the role for assistant turns instead of
 * "assistant", so history is remapped accordingly.
 */
export async function askChatbot(
  history: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  });

  return (
    response.text?.trim() ||
    "Maaf, saya belum bisa memberikan jawaban saat ini. Coba lagi ya."
  );
}
