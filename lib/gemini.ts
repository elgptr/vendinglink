import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatDate } from "@/lib/utils";

const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_OUTPUT_TOKENS = 1024;

// Cache instances by API key
const clientCache = new Map<string, GoogleGenAI>();

export function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const key = customApiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  if (!clientCache.has(key)) {
    clientCache.set(key, new GoogleGenAI({ apiKey: key }));
  }
  return clientCache.get(key)!;
}

// Keep export for backward compatibility
export const gemini = {
  get models() {
    return getGeminiClient().models;
  },
};

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Build a fresh system prompt containing live catalog, stock, and voucher
 * data so the assistant always answers with up-to-date information.
 */
export async function buildSystemPrompt(audience: "customer" | "agent" = "agent"): Promise<string> {
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
          return `- ${p.name} - ${formatRupiah(p.price)} (${stockInfo})${
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

  if (audience === "customer") {
    return `Anda adalah "VendingLink Assistant", asisten ramah untuk pembeli/customer di toko online VendingLink (platform pembelian link/kode redeem digital).

Tugas Anda:
1. Membantu calon pembeli memilih produk yang tersedia, mengecek harga, dan mengetahui ketersediaan stok.
2. Menjelaskan cara checkout langsung di website dan pembayaran otomatis lewat Midtrans (QRIS GoPay/ShopeePay/BCA, transfer bank VA, e-wallet, kartu kredit, dsb).
3. Memberikan informasi voucher promo/diskon yang dapat digunakan di halaman checkout jika ada.
4. Menjawab pertanyaan seputar status dan cara menerima link redeem setelah pembayaran sukses.

DATA PRODUK AKTIF:
${productLines}

VOUCHER PROMO AKTIF:
${voucherLines}

CARA PEMBELIAN DI WEBSITE:
1. Pembeli memilih produk yang diinginkan dari daftar katalog di halaman utama.
2. Klik tombol "Beli Sekarang", isi nama dan email untuk pengiriman konfirmasi.
3. Masukkan kode voucher diskon jika memilikinya, lalu klik tombol pembayaran.
4. Selesaikan pembayaran melalui pop-up Midtrans (QRIS, VA Bank, dll).
5. Setelah pembayaran berhasil diverifikasi secara instan, link/kode redeem akan langsung tampil di layar dan siap digunakan!

ATURAN:
- Selalu gunakan bahasa Indonesia yang ramah, sopan, antusias, dan jelas.
- Jawab secara ringkas to-the-point agar mudah dibaca di widget chat kecil.
- Selalu jadikan data produk & promo di atas sebagai acuan akurat. Jangan mengarang harga atau voucher yang tidak terdaftar.
- Jangan pernah memberikan link redeem rahasia internal secara langsung.`;
  }

  return `Anda adalah "VendingLink Assistant", asisten AI yang membantu agen penjualan di platform VendingLink - sistem penjualan link redeem digital (lisensi/kode redeem) dengan pembayaran online melalui Midtrans (QRIS, transfer bank/VA, e-wallet, kartu kredit, dan metode lain yang tersedia).

Tugas Anda adalah menjawab pertanyaan agen seputar:
1. Daftar produk yang tersedia beserta harga dan status stok.
2. Cara melakukan checkout dan pembayaran.
3. Informasi voucher promo yang sedang aktif.
4. Panduan umum penggunaan platform VendingLink.

DATA PRODUK SAAT INI:
${productLines}

VOUCHER PROMO AKTIF SAAT INI:
${voucherLines}

CARA CHECKOUT & PEMBAYARAN:
1. Agen membuka menu Katalog Produk lalu memilih produk yang ingin dibeli.
2. Agen mengisi nama pembeli (opsional) dan bisa menerapkan kode voucher promo jika ada.
3. Setelah klik "Lanjut ke Pembayaran", sistem akan menampilkan pilihan metode pembayaran (QRIS, transfer bank/VA, e-wallet, kartu kredit, dan lainnya) yang harus dibayar dalam waktu 24 jam.
4. Setelah pembayaran terkonfirmasi otomatis oleh sistem, link redeem produk akan langsung ditampilkan ke agen.
5. Jika waktu 24 jam terlewat tanpa pembayaran, transaksi otomatis kedaluwarsa dan agen harus membuat order baru.

ATURAN JAWABAN:
- Selalu jawab dalam Bahasa Indonesia yang ramah, jelas, dan singkat.
- Gunakan data produk dan voucher di atas sebagai sumber kebenaran, jangan mengarang harga, stok, atau kode voucher yang tidak ada di data.
- Jika stok produk 0/habis, sampaikan dengan jelas bahwa produk sedang habis.
- Jika ditanya hal di luar topik VendingLink (produk, stok, checkout, pembayaran, voucher), arahkan dengan sopan bahwa Anda hanya bisa membantu seputar VendingLink.
- Jangan pernah menampilkan URL redeem asli, data pelanggan, atau informasi rahasia lain - cukup jelaskan proses dan statusnya.`;
}

/**
 * Send the conversation to Gemini and return the assistant's reply text.
 * Gemini uses "model" as the role for assistant turns instead of
 * "assistant", so history is remapped accordingly.
 */
export async function askChatbot(
  history: ChatMessage[],
  systemPrompt: string,
  apiKey?: string
): Promise<string> {
  const client = getGeminiClient(apiKey);
  const response = await client.models.generateContent({
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


/**
 * Generate a persuasive, Indonesian-language product description
 * from a product name and price using Gemini.
 */
export async function generateProductDescription(
  name: string,
  price: number
): Promise<string> {
  const systemPrompt = "Anda adalah copywriter marketing untuk platform penjualan link redeem digital VendingLink (produk digital seperti lisensi, akun premium, kode redeem, dll yang dibeli agen lalu dijual ke pelanggan).\n\nTugas Anda: buatkan SATU deskripsi produk yang menarik dan persuasif dalam Bahasa Indonesia berdasarkan nama produk dan harga yang diberikan.\n\nATURAN KETAT:\n- Maksimal 200 karakter termasuk spasi dan tanda baca.\n- Bahasa persuasif dan menarik minat beli, tapi tetap jujur (jangan mengarang fitur yang tidak disebutkan di nama produk).\n- Jangan gunakan tanda kutip di awal/akhir kalimat.\n- Balas HANYA dengan teks deskripsi produk itu sendiri, tanpa judul, tanpa penjelasan tambahan, tanpa markdown.";

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: "Nama Produk: " + name + "\nHarga: " + formatRupiah(price) }],
      },
    ],
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 150,
    },
  });

  const description = response.text?.trim() || "";
  return description.slice(0, 200);
}
