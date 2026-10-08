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

    // Render products instantly from database (0ms latency).
    // Note: Stock syncing is handled asynchronously by webhooks, crons, 
    // or manually via the SyncStockButton to prevent blocking page loads.
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
          <div className="section-header mb-8 animate-fade-in">
            <h2 className="section-header-title text-3xl">Pilihan Produk</h2>
            <div className="ml-auto flex items-center gap-2 text-sm text-slate-400">
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


