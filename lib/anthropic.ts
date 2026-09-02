import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatDate } from "@/lib/utils";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const MAX_OUTPUT_TOKENS = 1024;
const MAX_INSIGHT_TOKENS = 1536;

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
 * Send the conversation to Claude and return the assistant's reply text.
 */
export async function askChatbot(
  history: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: systemPrompt,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock && textBlock.type === "text"
    ? textBlock.text
    : "Maaf, saya belum bisa memberikan jawaban saat ini. Coba lagi ya.";
}

/**
 * Generate a persuasive, Indonesian-language product description (single-shot,
 * non-streaming) from a product name and price. Always returns text trimmed
 * to at most 200 characters as a hard safety net against the model
 * overshooting the requested length.
 */
export async function generateProductDescription(
  name: string,
  price: number
): Promise<string> {
  const systemPrompt = `Anda adalah copywriter marketing untuk platform penjualan link redeem digital VendingLink (produk digital seperti lisensi, akun premium, kode redeem, dll yang dibeli agen lalu dijual ke pelanggan).

Tugas Anda: buatkan SATU deskripsi produk yang menarik dan persuasif dalam Bahasa Indonesia berdasarkan nama produk dan harga yang diberikan.

ATURAN KETAT:
- Maksimal 200 karakter termasuk spasi dan tanda baca.
- Bahasa persuasif dan menarik minat beli, tapi tetap jujur (jangan mengarang fitur yang tidak disebutkan di nama produk).
- Jangan gunakan tanda kutip di awal/akhir kalimat.
- Balas HANYA dengan teks deskripsi produk itu sendiri, tanpa judul, tanpa penjelasan tambahan, tanpa markdown.`;

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 150,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Nama Produk: ${name}\nHarga: ${formatRupiah(price)}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const description =
    textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

  return description.slice(0, 200);
}

/**
 * Stream an AI-generated sales analysis (Bahasa Indonesia, Markdown-formatted)
 * from a pre-aggregated sales data summary. Yields text chunks as they arrive
 * from Claude so the UI can render progressively instead of waiting for the
 * full response.
 */
export async function* streamSalesInsight(
  salesDataSummary: string
): AsyncGenerator<string> {
  const systemPrompt = `Anda adalah analis bisnis untuk platform VendingLink (penjualan link redeem digital via agen dengan pembayaran QRIS). Anda akan menerima ringkasan data penjualan 30 hari terakhir dan harus memberikan analisis yang tajam dan actionable.

Jawab dalam Bahasa Indonesia, format Markdown, dengan struktur berikut (gunakan heading level 3 "###" untuk setiap bagian):

### 📊 Ringkasan Performa
Ringkasan singkat performa penjualan (omset, jumlah transaksi, tren umum).

### 🏆 Produk Terlaris & Kurang Laku
Sebutkan produk dengan penjualan tertinggi dan terendah berdasarkan data.

### 📈 Tren Penjualan
Analisis tren naik/turun berdasarkan data harian yang diberikan.

### 💡 Rekomendasi Aksi
Berikan 3-5 rekomendasi aksi konkret untuk meningkatkan penjualan.

### 🥇 Agen Terbaik
Sebutkan agen dengan performa penjualan terbaik.

Gunakan hanya data yang diberikan, jangan mengarang angka. Jika data tidak cukup untuk salah satu bagian, katakan demikian secara singkat. Jawaban harus ringkas dan padat, hindari basa-basi.`;

  const stream = anthropic.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: MAX_INSIGHT_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: salesDataSummary }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
