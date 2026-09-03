import Anthropic from "@anthropic-ai/sdk";
import { formatRupiah } from "@/lib/utils";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const MAX_INSIGHT_TOKENS = 1536;

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
