import { rezekiSupplier } from "@/lib/suppliers";
import { calculateProductStock } from "@/lib/productStock";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatRupiah } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Package, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Metadata } from "next";

interface ProductPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const p = await params;
  const product = await prisma.product.findFirst({
    where: { id: p.id, isActive: true },
  });

  if (!product) return { title: "Product Not Found" };

  return {
    title: product.name,
    description: product.description || `Beli ${product.name} dengan harga terbaik.`,
    openGraph: {
      title: product.name,
      description: product.description || `Beli ${product.name} dengan pengiriman instan.`,
      type: "website",
    },
  };
}

export default async function CustomerProductDetailPage({ params }: ProductPageProps) {
  const p = await params;
  const product = await prisma.product.findFirst({
    where: { id: p.id, isActive: true },
  });

  if (!product) notFound();

  if (
    (product.supplierMode === "REZEKI" || product.supplierMode === "AUTO") &&
    product.supplierProductId &&
    product.supplierLastCheckedAt === null
  ) {
    const check = await rezekiSupplier.checkProductStock(product.supplierProductId).catch(() => null);
    if (check) {
      product.supplierStock = check.inStock ? check.stock : 0;
      product.isSupplierAvailable = check.inStock;
      product.supplierLastCheckedAt = new Date();
      await prisma.product.update({
        where: { id: product.id },
        data: {
          supplierStock: product.supplierStock,
          isSupplierAvailable: product.isSupplierAvailable,
          supplierLastCheckedAt: product.supplierLastCheckedAt,
        },
      }).catch(() => null);
    }
  }

  const manualStock = await prisma.redeemStock.count({
    where: { productId: product.id, status: "AVAILABLE" },
  });
  const stockCount = calculateProductStock({ ...product, stocksCount: manualStock });

  const isOutOfStock = stockCount === 0;
  const hasDiscount = product.showOriginalPrice && product.originalPrice && product.originalPrice > product.price;

  // Generate structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || `Beli ${product.name}`,
    "offers": {
      "@type": "Offer",
      "priceCurrency": "IDR",
      "price": product.price,
      "availability": isOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      "url": `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/customer/product/${product.id}`,
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 animate-slide-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <Link
        href="/customer"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
      >
        <ArrowLeft size={16} />
        Kembali ke Katalog
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center border border-brand-500/20 shadow-glow">
                <Package size={28} className="text-brand-400" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">{product.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className={isOutOfStock ? "stock-dot-empty" : "stock-dot-available"} />
                  <span className={`text-sm font-medium ${isOutOfStock ? "text-red-400" : "text-emerald-400"}`}>
                    {isOutOfStock ? "Stok Habis" : `${stockCount} stok tersedia`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="prose prose-invert prose-slate max-w-none">
            <h3 className="text-lg font-semibold text-white mb-2">Deskripsi Produk</h3>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {product.description || "Tidak ada deskripsi."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface-card rounded-2xl border border-surface-border">
              <ShieldCheck className="text-emerald-400 mb-2" size={24} />
              <p className="text-sm font-semibold text-white">Legal & Aman</p>
              <p className="text-xs text-slate-400 mt-1">Produk digital resmi dan bergaransi.</p>
            </div>
            <div className="p-4 bg-surface-card rounded-2xl border border-surface-border">
              <Zap className="text-brand-400 mb-2" size={24} />
              <p className="text-sm font-semibold text-white">Pengiriman Instan</p>
              <p className="text-xs text-slate-400 mt-1">Akses dikirim detik itu juga setelah bayar.</p>
            </div>
          </div>
        </div>

        <div>
          <Card className="p-6 sticky top-24 border-brand-500/20" glow>
            <div className="mb-6 pb-6 border-b border-surface-border">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Harga</p>
              <div className="flex flex-col">
                {hasDiscount && (
                  <span className="price-tag-original text-lg">
                    {formatRupiah(product.originalPrice!)}
                  </span>
                )}
                <p className="price-tag text-4xl text-brand-400">
                  {formatRupiah(product.price)}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                <span>Bayar otomatis via Kasera/Midtrans</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                <span>Dukungan pelanggan prioritas</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                <span>Tanpa biaya admin tersembunyi</span>
              </div>
            </div>

            <Link href={`/customer/checkout/${product.id}`} className={isOutOfStock ? "pointer-events-none" : ""}>
              <Button
                size="xl"
                className="w-full font-bold text-lg"
                disabled={isOutOfStock}
              >
                {isOutOfStock ? "Stok Habis" : "Beli Sekarang"}
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
