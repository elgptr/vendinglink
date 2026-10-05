import { calculateProductStock } from "@/lib/productStock";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatDate } from "@/lib/utils";
import { decryptAPIKey } from "@/lib/encryption";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "ai" });

export async function getAIConfig() {
  const config = await prisma.aIConfiguration.findFirst();
  let apiKey = process.env.OPENAI_API_KEY || "";
  if (config?.apiKey) {
    apiKey = decryptAPIKey(config.apiKey);
  }
  return {
    apiKey,
    baseUrl: config?.baseUrl || "https://api.openai.com/v1",
    chatModel: config?.chatModel || "gpt-4o-mini",
    descriptionModel: config?.descriptionModel || "gpt-4o-mini",
  };
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

async function callOpenAICompatibleAPI(
  apiKey: string,
  baseUrl: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number = 1024,
  stream: boolean = false
) {
  // Ensure the baseUrl points to /chat/completions
  const endpoint = baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : baseUrl.replace(/\/$/, "") + "/chat/completions";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      stream,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    log.error("AI API Error", { status: res.status, text });
    throw new Error(`AI API Error (${res.status}): ${text}`);
  }

  return res;
}

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
          const stockCount = calculateProductStock(p);
          const stockInfo =
            stockCount > 0
              ? `stok tersedia: ${stockCount}`
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

export async function askChatbot(
  history: { role: "user" | "assistant"; content: string }[],
  systemPrompt: string
): Promise<string> {
  const config = await getAIConfig();
  if (!config.apiKey) throw new Error("API Key is not set");

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history,
  ];

  const res = await callOpenAICompatibleAPI(config.apiKey, config.baseUrl, config.chatModel, messages);
  const data = await res.json();
  
  return data.choices?.[0]?.message?.content?.trim() || "Maaf, saya belum bisa memberikan jawaban saat ini.";
}

export async function generateProductDescription(name: string, price: number): Promise<string> {
  const config = await getAIConfig();
  if (!config.apiKey) throw new Error("API Key is not set");

  const systemPrompt = `Anda adalah copywriter marketing untuk platform penjualan link redeem digital VendingLink (produk digital seperti lisensi, akun premium, kode redeem, dll yang dibeli agen lalu dijual ke pelanggan).

Tugas Anda: buatkan SATU deskripsi produk yang menarik dan persuasif dalam Bahasa Indonesia berdasarkan nama produk dan harga yang diberikan.

ATURAN KETAT:
- Maksimal 200 karakter termasuk spasi dan tanda baca.
- Bahasa persuasif dan menarik minat beli, tapi tetap jujur (jangan mengarang fitur yang tidak disebutkan di nama produk).
- Jangan gunakan tanda kutip di awal/akhir kalimat.
- Balas HANYA dengan teks deskripsi produk itu sendiri, tanpa judul, tanpa penjelasan tambahan, tanpa markdown.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Nama Produk: ${name}\nHarga: ${formatRupiah(price)}` }
  ];

  const res = await callOpenAICompatibleAPI(config.apiKey, config.baseUrl, config.descriptionModel, messages, 150);
  const data = await res.json();
  
  const description = data.choices?.[0]?.message?.content?.trim() || "";
  return description.slice(0, 200);
}

export async function* streamSalesInsight(salesDataSummary: string): AsyncGenerator<string> {
  const config = await getAIConfig();
  if (!config.apiKey) throw new Error("API Key is not set");

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
  
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: salesDataSummary }
  ];

  const res = await callOpenAICompatibleAPI(config.apiKey, config.baseUrl, config.descriptionModel, messages, 1536, true);
  
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // Process full lines
    let lineEnd = buffer.indexOf("\\n");
    while (lineEnd !== -1) {
      const line = buffer.slice(0, lineEnd).trim();
      buffer = buffer.slice(lineEnd + 1);
      lineEnd = buffer.indexOf("\\n");
      
      if (line.startsWith("data: ") && line !== "data: [DONE]") {
        try {
          const data = JSON.parse(line.slice(6));
          const content = data.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch (e) {
          // ignore parse error for incomplete chunks
        }
      }
    }
  }
}
