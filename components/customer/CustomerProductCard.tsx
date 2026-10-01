"use client";

import Link from "next/link";
import { ShoppingCart, Package } from "lucide-react";
import { cn, formatRupiah } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface CustomerProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number | null;
    showOriginalPrice: boolean;
    description: string | null;
    stockCount: number;
  };
  index?: number;
}

export default function CustomerProductCard({ product, index = 0 }: CustomerProductCardProps) {
  const inStock = product.stockCount > 0;
  const isLowStock = inStock && product.stockCount <= 5;
  const hasDiscount = product.showOriginalPrice && product.originalPrice && product.originalPrice > product.price;

  // Stagger animation based on index
  const staggerClass = `stagger-${Math.min(index + 1, 6)}`;

  return (
    <div className={cn("animate-stagger-item animate-slide-up", staggerClass)}>
      <Card
        hoverable={inStock}
        className={cn(
          "flex flex-col h-full relative overflow-hidden group",
          !inStock && "opacity-60 saturate-50"
        )}
      >
        {/* Subtle background gradient on hover */}
        {inStock && (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}

        <div className="p-6 flex flex-col flex-1 relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="p-2.5 bg-surface-hover/50 rounded-xl border border-surface-border text-slate-300 group-hover:text-brand-400 group-hover:border-brand-500/30 transition-colors">
              <Package size={20} />
            </div>
            
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border bg-surface-card/80 backdrop-blur-sm",
              inStock && !isLowStock ? "text-emerald-400 border-emerald-500/20" : "",
              isLowStock ? "text-amber-400 border-amber-500/20" : "",
              !inStock ? "text-red-400 border-red-500/20" : ""
            )}>
              <span className={cn(
                inStock && !isLowStock ? "stock-dot-available" : "",
                isLowStock ? "stock-dot-low" : "",
                !inStock ? "stock-dot-empty" : ""
              )} />
              {inStock ? `${product.stockCount} Tersedia` : "Habis"}
            </div>
          </div>

          {/* Title & Description */}
          <div className="flex-1 mb-6">
            <h2 className="font-bold text-white text-lg mb-2 leading-tight group-hover:text-brand-300 transition-colors">
              {product.name}
            </h2>
            {product.description && (
              <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          {/* Price & Action */}
          <div className="mt-auto">
            <div className="flex flex-col mb-4">
              {hasDiscount && (
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="price-tag-original">
                    {formatRupiah(product.originalPrice!)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    HEMAT
                  </span>
                </div>
              )}
              <span className={cn("text-2xl tracking-tight", hasDiscount ? "price-tag text-brand-400" : "price-tag")}>
                {formatRupiah(product.price)}
              </span>
            </div>

            {inStock ? (
              <Link href={`/customer/checkout/${product.id}`} className="block">
                <Button
                  id={`customer-buy-btn-${product.id}`}
                  className="w-full shadow-none group-hover:shadow-glow transition-all"
                  icon={<ShoppingCart size={16} />}
                >
                  Beli Sekarang
                </Button>
              </Link>
            ) : (
              <Button
                id={`customer-buy-btn-${product.id}-disabled`}
                className="w-full"
                variant="secondary"
                disabled
              >
                Stok Habis
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
