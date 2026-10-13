import { calculateProductStock } from "@/lib/productStock";
import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/cache";
import { buildSalesMap, groupByCategory, type ProductForCatalog } from "@/lib/catalogGrouping";
import { Package } from "lucide-react";
import CategorySection from "@/components/customer/CategorySection";
import CategoryNav from "@/components/customer/CategoryNav";
import HeroBanner from "@/components/customer/HeroBanner";
import TrustStrip from "@/components/customer/TrustStrip";
import Testimonials from "@/components/customer/Testimonials";
import Footer from "@/components/customer/Footer";
import RequestProductCTA from "@/components/customer/RequestProductCTA";
import ActivePromoPopup from "@/components/customer/ActivePromoPopup";

// Stock count changes every time a purchase happens — never prerender this
// page statically at build time, always fetch fresh data per request.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Katalog Produk | VendingLink",
  description: "Beli voucher game, pulsa, dan produk digital secara otomatis 24/7. Bayar pakai QRIS langsung diproses.",
};

async function getProducts() {
  return cache.getOrSet("catalog-products", async () => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        _count: {
          select: {
            stocks: { where: { status: "AVAILABLE" } },
          },
        },
      },
      orderBy: { price: "desc" },
    });

    return products.map((p): ProductForCatalog => ({
      id: p.id,
      name: p.name,
      price: p.price,
      originalPrice: p.originalPrice,
      showOriginalPrice: p.showOriginalPrice,
      description: p.description,
      stockCount: calculateProductStock(p),
      categoryId: p.categoryId,
      categorySlug: p.category?.slug ?? null,
      categoryName: p.category?.name ?? null,
    }));
  }, 10);
}

async function getCategorySales() {
  return cache.getOrSet("catalog-category-sales", async () => {
    const paidTransactions = await prisma.transaction.findMany({
      where: {
        status: "PAID",
      },
      select: {
        productId: true,
        status: true,
        paidAt: true,
        customerId: true,
      },
    });

    return buildSalesMap(paidTransactions);
  }, 300);
}

export default async function CustomerCatalogPage() {
  const products = await getProducts();
  const salesMap = await getCategorySales();
  const groups = groupByCategory(products, salesMap);

  return (
    <div className="min-h-screen flex flex-col">
      <ActivePromoPopup />
      <main className="customer-container pt-8 pb-16 flex-1 space-y-16">
        {/* Hero Section */}
        <HeroBanner />

        {/* Catalog Section */}
        <section id="catalog" className="scroll-mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 animate-fade-in">
            <h2 className="section-header-title text-2xl sm:text-3xl">Pilihan Produk</h2>
            <div className="sm:ml-auto flex items-center gap-2 text-sm text-slate-400">
              <span className="stock-dot-available" />
              <span>Real-time Stock</span>
            </div>
          </div>

          {/* Empty State */}
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-surface-card/50 rounded-3xl border border-surface-border">
              <Package size={48} className="mb-4 opacity-40" />
              <p className="text-xl font-semibold text-slate-300">Belum ada produk tersedia</p>
              <p className="text-sm mt-2">Silakan cek kembali nanti</p>
            </div>
          ) : (
            <div className="catalog-container">
              <CategoryNav groups={groups} />

              <div className="space-y-12 sm:space-y-16">
                {groups.map((group, index) => (
                  <CategorySection
                    key={group.categoryId ?? "uncategorized"}
                    group={group}
                    isTopRanked={index === 0}
                  />
                ))}
              </div>
            </div>
          )}

          <RequestProductCTA />
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

