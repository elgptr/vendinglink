"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Package, Sparkles, Clock } from "lucide-react";
import { cn, formatRupiah } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import RequestProductModal from "./RequestProductModal";

interface CustomerProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number | null;
    showOriginalPrice: boolean;
    description: string | null;
    stockCount: number;
    categorySlug?: string | null;
  };
  index?: number;
  /** Tailwind border class applied on hover to match the category accent. */
  accentBorder?: string;
  /** Featured cards are larger and receive stronger elevation. */
  featured?: boolean;
  /** Optional layout class, e.g. col-span for featured cells. */
  className?: string;
}

export default function CustomerProductCard({
  product,
  index = 0,
  accentBorder = "hover:border-surface-border-light",
  featured = false,
  className,
}: CustomerProductCardProps) {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const inStock = product.stockCount > 0;
  const isLowStock = inStock && product.stockCount <= 5;
  const hasDiscount = product.showOriginalPrice && product.originalPrice && product.originalPrice > product.price;

  const discountPercentage = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  // Stagger animation based on position within the section, capped to avoid
  // long lists feeling like an endless loading state (anti-slop MO13).
  const staggerClass = `stagger-${Math.min(index + 1, 4)}`;
  const checkoutUrl = `/customer/checkout/${product.id}`;

  const cardContent = (
    <Card
      hoverable={inStock}
      className={cn(
        "flex flex-col h-full relative overflow-hidden transition-all duration-200 ease-out",
        "hover:shadow-card-hover hover:-translate-y-0.5",
        accentBorder,
        featured && "sm:min-h-full",
        !inStock && "hover:border-brand-500/40 opacity-90"
      )}
    >
      <div className="p-6 flex flex-col flex-1 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="p-2.5 bg-surface-hover/50 rounded-xl border border-surface-border text-slate-300 group-hover:text-brand-400 group-hover:border-brand-500/30 transition-colors">
            <Package size={20} />
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border bg-surface-card",
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

            {!inStock && (
              <span className="text-[10px] text-brand-400/80 font-medium group-hover:text-brand-300 transition-colors flex items-center gap-1">
                <Clock size={11} /> Pre-Order ~5 mnt
              </span>
            )}
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
              <div className="flex items-center gap-2 mb-1">
                <span className="price-tag-original">
                  {formatRupiah(product.originalPrice!)}
                </span>
                <span className="px-2 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wide">
                  HEMAT s.d. {discountPercentage}%
                </span>
              </div>
            )}
            <span className={cn("text-2xl tracking-tight", hasDiscount ? "price-tag text-brand-400" : "price-tag")}>
              {formatRupiah(product.price)}
            </span>
          </div>

          {inStock ? (
            <div className="space-y-3">
              {isLowStock && (
                <div className="text-amber-400 text-xs font-semibold text-center bg-amber-500/10 py-1.5 rounded-lg border border-amber-500/20">
                  Tersisa {product.stockCount} stok - Beli sekarang!
                </div>
              )}
              <Button
                id={`customer-buy-btn-${product.id}`}
                className="w-full shadow-none group-hover:shadow-glow transition-all relative z-30"
                icon={<ShoppingCart size={16} />}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                Beli Sekarang
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Pre-Order Hover Banner */}
              <div className="overflow-hidden transition-all duration-300 ease-out max-h-0 opacity-0 group-hover:max-h-24 group-hover:opacity-100 group-hover:mb-2">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs shadow-sm">
                  <Clock size={15} className="flex-shrink-0 text-brand-400 animate-pulse" />
                  <span className="font-medium text-slate-200 leading-snug text-left">
                    Informasi Pre-Order Produk ini hanya butuh sekitar 5 menit Loh
                  </span>
                </div>
              </div>

              <Button
                id={`customer-request-btn-${product.id}`}
                className="w-full relative z-30 font-semibold text-brand-400 border-brand-500/30 hover:border-brand-400 hover:bg-brand-500/10 shadow-none transition-all cursor-pointer"
                variant="outline"
                icon={<Sparkles size={16} />}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsRequestModalOpen(true);
                }}
              >
                Request Produk ini
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  if (inStock) {
    return (
      <Link
        href={checkoutUrl}
        className={cn(
          "group block relative animate-stagger-item animate-slide-up",
          staggerClass,
          className
        )}
        aria-label={`Beli ${product.name}`}
      >
        {/* Pseudo-element makes the whole card clickable when in stock */}
        <span className="absolute inset-0 z-20" aria-hidden="true" />
        {cardContent}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "group block relative animate-stagger-item animate-slide-up",
        staggerClass,
        className
      )}
      title="Informasi Pre-Order Produk ini hanya butuh sekitar 5 menit Loh"
      aria-label={`${product.name} (Stok Habis - Pre-Order ~5 Menit)`}
    >
      {cardContent}

      <RequestProductModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        product={product}
      />
    </div>
  );
}
