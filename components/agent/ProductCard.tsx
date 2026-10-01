"use client";

import Link from "next/link";
import { ShoppingCart, Package, Tag } from "lucide-react";
import { cn, formatRupiah } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number | null;
    showOriginalPrice: boolean;
    description: string | null;
    stockCount: number;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const inStock = product.stockCount > 0;

  return (
    <div className="relative group animate-slide-up">
      <Card
        hoverable={inStock}
        className={cn("p-6 flex flex-col gap-4 relative overflow-hidden h-full", !inStock && "opacity-60 saturate-50")}
      >
        {inStock && (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
        
        <div className="relative z-10 flex flex-col h-full gap-4">
          {/* Product header */}
          <div className="flex items-start justify-between gap-3">
            <div className="p-3 bg-surface-hover/50 rounded-xl border border-surface-border flex-shrink-0 group-hover:text-brand-400 group-hover:border-brand-500/30 transition-colors">
              <Package size={22} className={cn("text-slate-300 group-hover:text-brand-400 transition-colors")} />
            </div>
            <div className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border bg-surface-card/80 backdrop-blur-sm",
                inStock ? "text-emerald-400 border-emerald-500/20" : "text-red-400 border-red-500/20"
              )}>
                <span className={inStock ? "stock-dot-available" : "stock-dot-empty"} />
                {inStock ? `${product.stockCount} Tersedia` : "Habis"}
            </div>
          </div>

          {/* Product info */}
          <div className="flex-1">
            <h2 className="font-semibold text-white text-lg mb-1.5 group-hover:text-brand-300 transition-colors">{product.name}</h2>
            {product.description && (
              <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">{product.description}</p>
            )}
          </div>

          {/* Price & CTA */}
          <div className="flex items-end justify-between pt-4 mt-auto">
            <div className="flex flex-col">
              {product.showOriginalPrice && product.originalPrice && product.originalPrice > product.price && (
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="price-tag-original">
                    {formatRupiah(product.originalPrice)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    HEMAT
                  </span>
                </div>
              )}
              <span className={cn("text-xl tracking-tight", product.showOriginalPrice && product.originalPrice && product.originalPrice > product.price ? "price-tag text-brand-400" : "price-tag")}>
                {formatRupiah(product.price)}
              </span>
            </div>

            {inStock ? (
              <Link href={`/agent/catalog/${product.id}/checkout`}>
                <Button
                  id={`buy-btn-${product.id}`}
                  size="md"
                  className="shadow-none group-hover:shadow-glow transition-all"
                  icon={<ShoppingCart size={14} />}
                >
                  Beli
                </Button>
              </Link>
            ) : (
              <Button
                id={`buy-btn-${product.id}-disabled`}
                size="md"
                variant="secondary"
                disabled
                icon={<ShoppingCart size={14} />}
              >
                Habis
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
