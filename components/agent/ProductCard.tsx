"use client";

import Link from "next/link";
import { ShoppingCart, Package, Tag } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    description: string | null;
    stockCount: number;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const inStock = product.stockCount > 0;

  return (
    <Card
      hoverable={inStock}
      className={`p-6 flex flex-col gap-4 ${!inStock ? "opacity-60" : ""}`}
    >
      {/* Product header */}
      <div className="flex items-start justify-between gap-3">
        <div className="p-3 bg-brand-500/10 rounded-xl border border-brand-500/20 flex-shrink-0">
          <Package size={22} className="text-brand-400" />
        </div>
        <Badge
          variant={inStock ? "success" : "danger"}
          dot={inStock}
        >
          {inStock ? `${product.stockCount} Tersedia` : "Habis"}
        </Badge>
      </div>

      {/* Product info */}
      <div className="flex-1">
        <h2 className="font-semibold text-white text-lg mb-1.5">{product.name}</h2>
        {product.description && (
          <p className="text-sm text-slate-400 line-clamp-2">{product.description}</p>
        )}
      </div>

      {/* Price & CTA */}
      <div className="flex items-center justify-between pt-2 border-t border-surface-border">
        <div>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Tag size={10} />
            Harga
          </p>
          <p className="text-xl font-bold text-brand-400">
            {formatRupiah(product.price)}
          </p>
        </div>

        {inStock ? (
          <Link href={`/agent/catalog/${product.id}/checkout`}>
            <Button
              id={`buy-btn-${product.id}`}
              size="sm"
              icon={<ShoppingCart size={14} />}
            >
              Beli
            </Button>
          </Link>
        ) : (
          <Button
            id={`buy-btn-${product.id}-disabled`}
            size="sm"
            disabled
            icon={<ShoppingCart size={14} />}
          >
            Habis
          </Button>
        )}
      </div>
    </Card>
  );
}
