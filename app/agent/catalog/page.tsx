import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ShoppingBag, Package } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import ProductCard from "@/components/agent/ProductCard";

export const metadata = {
  title: "Katalog Produk",
};

async function getProducts() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: {
          stocks: { where: { status: "AVAILABLE" } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Strip any sensitive data — only return what's needed
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    description: p.description,
    stockCount: p._count.stocks,
  }));
}

export default async function CatalogPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const products = await getProducts();

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-brand-500/10 rounded-xl border border-brand-500/20">
            <ShoppingBag size={20} className="text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Katalog Produk</h1>
        </div>
        <p className="text-slate-400 ml-14">
          Pilih produk yang ingin Anda beli dan bayar dengan QRIS
        </p>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Package size={48} className="mb-4 opacity-40" />
          <p className="text-lg font-medium">Belum ada produk tersedia</p>
          <p className="text-sm">Hubungi admin untuk menambahkan produk</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Info bar */}
      <div className="mt-8 p-4 bg-surface-card border border-surface-border rounded-xl flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
        <p className="text-sm text-slate-400">
          Pembayaran melalui QRIS — Stok langsung diterima setelah pembayaran dikonfirmasi
        </p>
      </div>
    </div>
  );
}
