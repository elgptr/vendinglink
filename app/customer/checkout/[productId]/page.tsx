import { calculateProductStock } from "@/lib/productStock";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CustomerCheckoutForm from "@/components/customer/CustomerCheckoutForm";
import { formatRupiah } from "@/lib/utils";
import { ArrowLeft, Package, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";

export const metadata = {
  title: "Checkout",
};

// Prevent static generation - this page needs fresh data on each request
export const dynamic = "force-dynamic";

interface CheckoutPageProps {
  params: { productId: string };
}

export default async function CustomerCheckoutPage({ params }: CheckoutPageProps) {
  const p = await params;
  const product = await prisma.product.findFirst({
    where: { id: p.productId, isActive: true },
  });

  if (!product) notFound();

  const manualStock = await prisma.redeemStock.count({
    where: { productId: product.id, status: "AVAILABLE" },
  });
  const stockCount = calculateProductStock({ ...product, stocksCount: manualStock });

  if (stockCount === 0) notFound();

  const hasDiscount = product.showOriginalPrice && product.originalPrice && product.originalPrice > product.price;

  return (
    <div className="max-w-6xl mx-auto animate-slide-up pt-8 pb-20">
      {/* Back button */}
      <Link
        href="/customer"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
      >
        <ArrowLeft size={16} />
        Kembali ke Katalog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
        {/* Left Column: Product Summary */}
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">Selesaikan Pesanan Anda</h1>
            <p className="text-slate-400">Pembayaran instan diproses secara otomatis 24/7. Link redeem akan langsung diberikan setelah pembayaran berhasil.</p>
          </div>

          <Card className="p-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Ringkasan Produk</p>
            
            <div className="flex items-start gap-4">
              <div className="p-4 bg-brand-500/10 rounded-2xl border border-brand-500/20 flex-shrink-0">
                <Package size={32} className="text-brand-400" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-white text-xl mb-1">{product.name}</h2>
                <div className="flex items-center gap-2 mb-3">
                  <span className="stock-dot-available" />
                  <span className="text-sm text-emerald-400 font-medium">{stockCount} stok tersedia</span>
                </div>
                
                {product.description && (
                  <p className="text-sm text-slate-400 line-clamp-3 mb-4">{product.description}</p>
                )}

                <div className="pt-4 border-t border-surface-border">
                  <p className="text-xs text-slate-500 mb-1">Total Harga</p>
                  <div className="flex flex-col">
                    {hasDiscount && (
                      <span className="price-tag-original">
                        {formatRupiah(product.originalPrice!)}
                      </span>
                    )}
                    <p className={hasDiscount ? "price-tag text-brand-400 text-3xl" : "price-tag text-3xl"}>
                      {formatRupiah(product.price)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Trust points */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface-card rounded-2xl border border-surface-border flex gap-3">
              <ShieldCheck className="text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">Pembayaran Aman</p>
                <p className="text-xs text-slate-400 mt-1">Transaksi Anda dilindungi sistem enkripsi Kasera</p>
              </div>
            </div>
            <div className="p-4 bg-surface-card rounded-2xl border border-surface-border flex gap-3">
              <Zap className="text-brand-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">Pengiriman Instan</p>
                <p className="text-xs text-slate-400 mt-1">Link dikirim real-time 1 detik setelah lunas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Form */}
        <div className="lg:pl-8">
          <CustomerCheckoutForm
            productId={product.id}
            productName={product.name}
            productPrice={product.price}
          />
        </div>
      </div>
    </div>
  );
}
