import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CustomerCheckoutForm from "@/components/customer/CustomerCheckoutForm";
import { formatRupiah } from "@/lib/utils";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Checkout",
};

interface CheckoutPageProps {
  params: { productId: string };
}

export default async function CustomerCheckoutPage({ params }: CheckoutPageProps) {
  const product = await prisma.product.findFirst({
    where: { id: params.productId, isActive: true },
  });

  if (!product) notFound();

  const stockCount = await prisma.redeemStock.count({
    where: { productId: product.id, status: "AVAILABLE" },
  });

  if (stockCount === 0) notFound();

  return (
    <div className="max-w-lg mx-auto animate-slide-up">
      {/* Back button */}
      <Link
        href="/customer"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Kembali ke Katalog
      </Link>

      {/* Product summary */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-500/10 rounded-xl border border-brand-500/20 flex-shrink-0">
            <Package size={22} className="text-brand-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Produk Dipilih</p>
            <h2 className="font-semibold text-white">{product.name}</h2>
            <p className="text-sm text-slate-400">{stockCount} stok tersedia</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-500">Harga</p>
            <p className="text-xl font-bold text-brand-400">
              {formatRupiah(product.price)}
            </p>
          </div>
        </div>
      </div>

      {/* Checkout form */}
      <CustomerCheckoutForm
        productId={product.id}
        productName={product.name}
        productPrice={product.price}
      />
    </div>
  );
}
