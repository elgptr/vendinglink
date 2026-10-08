"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, MouseEvent } from "react";
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
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  
  const inStock = product.stockCount > 0;
  const isLowStock = inStock && product.stockCount <= 5;
  const hasDiscount = product.showOriginalPrice && product.originalPrice && product.originalPrice > product.price;
  
  const discountPercentage = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  // Stagger animation based on index
  const staggerClass = `stagger-${Math.min(index + 1, 6)}`;

  // Spotlight effect
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={cn("animate-stagger-item animate-slide-up relative group", staggerClass)}
    >
      <Card
        hoverable={inStock}
        className={cn(
          "flex flex-col h-full relative overflow-hidden group",
          !inStock && "opacity-60 saturate-50"
        )}
      >
        {/* Magic Spotlight gradient on hover */}
        {inStock && (
          <div 
            className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
            style={{
              background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(139, 92, 246, 0.08), transparent 40%)`,
            }}
          />
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
                <div className="flex items-center gap-2 mb-1">
                  <span className="price-tag-original">
                    {formatRupiah(product.originalPrice!)}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse border border-red-400/50 uppercase tracking-wide">
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
                  <div className="text-red-400 text-xs font-bold animate-pulse text-center bg-red-500/10 py-1.5 rounded-lg border border-red-500/20">
                    Tersisa {product.stockCount} stok - Beli sekarang!
                  </div>
                )}
                <Button
                  id={`customer-buy-btn-${product.id}`}
                  className="w-full shadow-none group-hover:shadow-glow transition-all"
                  icon={<ShoppingCart size={16} />}
                  loading={isNavigating}
                  onClick={() => {
                    setIsNavigating(true);
                    router.push(`/customer/checkout/${product.id}`);
                  }}
                >
                  Beli Sekarang
                </Button>
              </div>
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
