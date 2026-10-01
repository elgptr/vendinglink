
import { sendAdminLowStockAlert } from '../lib/whatsapp';

// Force LIVE mode for the test
process.env.SAUNGWA_MODE = 'live';

async function run() {
  console.log("Mengetes Notifikasi Stok Menipis...");
  const res1 = await sendAdminLowStockAlert("Tes Produk Claude", 5, false);
  console.log("Hasil:", res1);
  
  console.log("\nMengetes Notifikasi Stok Habis...");
  const res2 = await sendAdminLowStockAlert("Tes Produk Claude", 0, true);
  console.log("Hasil:", res2);
}

run().catch(console.error);
