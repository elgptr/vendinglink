import SyncStockButton from "@/components/customer/SyncStockButton";
import { syncSupplierStocks } from "@/lib/suppliers/sync";
import { calculateProductStock } from "@/lib/productStock";
import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/cache";
import { Package } from "lucide-react";
import CustomerProductCard from "@/components/customer/CustomerProductCard";
import HeroBanner from "@/components/customer/HeroBanner";
import TrustStrip from "@/components/customer/TrustStrip";
import Testimonials from "@/components/customer/Testimonials";
import Footer from "@/components/customer/Footer";

// Stock count changes every time a purchase happens — never prerender this
// page statically at build time, always fetch fresh data per request.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Katalog Produk | VendingLink",
  description: "Beli voucher game, pulsa, dan produk digital secara otomatis 24/7. Bayar pakai QRIS langsung diproses.",
};

async function getProducts() {
  return cache.getOrSet("catalog-products", async () => {
    let products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            stocks: { where: { status: "AVAILABLE" } },
          },
        },
      },
      orderBy: { price: "desc" },
    });

    const needsInitialSync = products.some(
      (p: any) =>
        (p.supplierMode === "REZEKI" || p.supplierMode === "AUTO") &&
        p.supplierProductId &&
        (!p.supplierLastCheckedAt || Date.now() - new Date(p.supplierLastCheckedAt).getTime() > 60 * 1000)
    );

    if (needsInitialSync) {
      try {
        // Anti-Ngadat mechanism: Try syncing, but if it takes more than 800ms, 
        // we just proceed rendering and let the sync finish in the background.
        await Promise.race([
          syncSupplierStocks(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 800))
        ]);
        
        // If it succeeded within 800ms, update the products list
        products = await prisma.product.findMany({
          where: { isActive: true },
          include: {
            _count: {
              select: {
                stocks: { where: { status: "AVAILABLE" } },
              },
            },
          },
          orderBy: { price: "desc" },
        });
      } catch (e) {
        // If timeout or error, we just ignore and serve the stale products instantly.
        // The sync might still finish in the background.
      }
    }

    return products.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      originalPrice: p.originalPrice,
      showOriginalPrice: p.showOriginalPrice,
      description: p.description,
      stockCount: calculateProductStock(p),
    }));
  }, 10);
}

export default async function CustomerCatalogPage() {
  const products = await getProducts();

  return (
    <div className="min-h-screen flex flex-col">
      <main className="customer-container pt-8 pb-16 flex-1 space-y-16">
        {/* Hero Section */}
        <HeroBanner />

        {/* Catalog Section */}
        <section id="catalog" className="scroll-mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 animate-fade-in">
            <h2 className="section-header-title text-2xl sm:text-3xl">Pilihan Produk</h2>
            <div className="sm:ml-auto flex items-center gap-2 text-sm text-slate-400">
              <span className="stock-dot-available" />
              <span>Real-time Stock</span>
              <SyncStockButton />
            </div>
          </div>

          {/* Products Grid */}
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-surface-card/50 rounded-3xl border border-surface-border">
              <Package size={48} className="mb-4 opacity-40" />
              <p className="text-xl font-semibold text-slate-300">Belum ada produk tersedia</p>
              <p className="text-sm mt-2">Silakan cek kembali nanti</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product: any, index: any) => (
                <CustomerProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          )}

          {/* Request Product CTA */}
          <div className="mt-8 bg-brand-500/10 border border-brand-500/20 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 animate-slide-up hover:border-brand-500/40 transition-colors">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Produk yang Anda cari habis atau tidak ada?</h3>
              <p className="text-slate-400 text-sm">Jangan ragu, hubungi admin kami untuk memesan produk spesifik yang Anda butuhkan secara langsung.</p>
            </div>
            <a 
              href="https://wa.me/6282254203272?text=Halo%20Admin,%20saya%20ingin%20request%20produk%20di%20VendingLink%20yang%20saat%20ini%20habis/tidak%20ada%20di%20katalog."
              target="_blank"
              rel="noreferrer"
              className="flex-shrink-0 bg-brand-500 hover:bg-brand-400 text-black font-bold py-3 px-6 rounded-xl transition-all hover:scale-105 hover:shadow-glow shadow-brand-500/50 flex items-center gap-2"
            >
              <Package size={18} />
              Request Produk via WA
            </a>
          </div>
        </section>

        {/* Testimonials */}
        <Testimonials />

        {/* Trust Indicators */}
        <TrustStrip />
      </main>

      <Footer />
    </div>
  );
}


