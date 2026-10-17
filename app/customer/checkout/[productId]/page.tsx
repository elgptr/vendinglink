import { calculateProductStock } from "@/lib/productStock";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CustomerCheckoutForm from "@/components/customer/CustomerCheckoutForm";
import { formatRupiah, getPreOrderDisplayPrices } from "@/lib/utils";
import { ArrowLeft, Package, ShieldCheck, Zap, Clock } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";

export const metadata = {
  title: "Checkout",
};

// Prevent static generation - this page needs fresh data on each request
export const dynamic = "force-dynamic";

interface CheckoutPageProps {
  params: Promise<{ productId: string }>;
  searchParams?: Promise<{ requestId?: string }>;
}

export default async function CustomerCheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const p = await params;
  const s = searchParams ? await searchParams : {};
  const product = await prisma.product.findFirst({
    where: { id: p.productId, isActive: true },
  });

  if (!product) notFound();

  let hasPreOrderAccess = false;
  let preOrderInfo: { id: string; quotedPrice?: number | null } | null = null;
  if (s.requestId) {
    const preOrder = await prisma.customerProductRequest.findFirst({
      where: {
        id: s.requestId,
        status: { in: ["FOUND", "CONFIRMED"] },
      },
      select: {
        id: true,
        quotedPrice: true,
      },
    });
    if (preOrder) {
      hasPreOrderAccess = true;
      preOrderInfo = preOrder;
    }
  }

  const manualStock = await prisma.redeemStock.count({
    where: { productId: product.id, status: "AVAILABLE" },
  });
  const stockCount = calculateProductStock({ ...product, stocksCount: manualStock });

  if (stockCount === 0 && !hasPreOrderAccess) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center animate-slide-up">
        <div className="p-8 bg-surface-card rounded-3xl border border-surface-border shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Package size={32} />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 mb-3">
              <span className="stock-dot-empty" /> Stok Habis
            </span>
            <h1 className="text-2xl font-bold text-white mb-2">{product.name}</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Stok untuk produk ini saat ini sedang habis. Anda dapat melakukan on-demand request (hanya butuh sekitar 5 menit)!
            </p>
          </div>
          <div className="p-4 bg-brand-500/10 border border-brand-500/25 rounded-2xl text-xs text-brand-300 flex items-center gap-2.5 text-left">
            <Clock size={18} className="text-brand-400 flex-shrink-0 animate-pulse" />
            <span>
              Kembali ke katalog dan klik tombol <strong>"Request Produk ini"</strong> pada kartu produk untuk memicu pencarian otomatis multi-supplier.
            </span>
          </div>
          <Link
            href="/customer"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold rounded-xl transition-all shadow-glow"
          >
            <ArrowLeft size={16} />
            Kembali ke Katalog
          </Link>
        </div>
      </div>
    );
  }

  const effectivePrice = product.price;
  const { originalPrice: strikePrice, discountPercent } = getPreOrderDisplayPrices(product);
  const hasDiscount = strikePrice > effectivePrice;

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
                  <span className="text-sm text-emerald-400 font-medium">
                    {hasPreOrderAccess ? "1 kuota pre-order dialokasikan" : `${stockCount} stok tersedia`}
                  </span>
                </div>
                
                {product.description && (
                  <p className="text-sm text-slate-400 line-clamp-3 mb-4">{product.description}</p>
                )}

                <div className="pt-4 border-t border-surface-border">
                  <p className="text-xs text-slate-500 mb-1">Total Harga</p>
                  <div className="flex flex-col">
                    {hasDiscount && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="price-tag-original">
                          {formatRupiah(strikePrice)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                          Diskon {discountPercent}%
                        </span>
                      </div>
                    )}
                    <p className={hasDiscount ? "price-tag text-brand-400 text-3xl" : "price-tag text-3xl"}>
                      {formatRupiah(effectivePrice)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {hasPreOrderAccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-sm">
              <ShieldCheck size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-white">Pre-Order Khusus Terverifikasi</p>
                <p className="text-xs text-emerald-300">
                  Kuota produk ini telah diamankan oleh bagian Purchasing kami khusus untuk Anda.
                </p>
              </div>
            </div>
          )}

          {/* Trust points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            productPrice={effectivePrice}
            preOrderRequestId={s.requestId}
          />
        </div>
      </div>
    </div>
  );
}
