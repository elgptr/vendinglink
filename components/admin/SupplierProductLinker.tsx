"use client";

/**
 * SupplierProductLinker
 *
 * Configures product fulfillment mode and supplier mapping.
 * In accordance with Cleanup 6 (Architectural Boundary):
 * - Fulfillment is strictly MANUAL (stocks managed in RedeemStock via manual upload or Bridge Bot).
 * - Preserves supplierProductId for Bridge mapping (SupplierProductMapping / fallback).
 *
 * Props:
 *   value           - supplierMode (always "MANUAL")
 *   productId       - current supplierProductId / Bridge SKU
 *   onModeChange    - callback when mode changes
 *   onProductChange - callback when supplierProductId changes
 */

import { useEffect } from "react";
import { Zap, Link as LinkIcon, Info } from "lucide-react";

interface Props {
  value: string;           // supplierMode
  productId: string;       // supplierProductId
  onModeChange: (mode: string) => void;
  onProductChange: (slug: string) => void;
}

export default function SupplierProductLinker({
  value,
  productId,
  onModeChange,
  onProductChange,
}: Props) {
  // Normalize mode to MANUAL on mount if legacy value is passed
  useEffect(() => {
    if (value !== "MANUAL") {
      onModeChange("MANUAL");
    }
  }, [value, onModeChange]);

  return (
    <div className="space-y-3 border border-surface-border rounded-xl p-4 bg-black/10">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap size={15} className="text-amber-400" />
        <span className="text-sm font-semibold text-slate-300">Supplier Stok & Bridge Mapping</span>
      </div>

      {/* Mode selector (Locked to MANUAL) */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Mode Pemenuhan Stok
        </label>
        <select
          id="supplier-mode-select"
          value="MANUAL"
          disabled
          aria-readonly="true"
          className="w-full bg-surface-card/60 border border-surface-border text-slate-300 text-sm rounded-lg px-3 py-2.5 cursor-not-allowed opacity-90"
        >
          <option value="MANUAL">
            Manual (Stok Lokal / Bot Bridge) — Dipasok ke RedeemStock
          </option>
        </select>
        <div className="flex items-start gap-1.5 text-xs text-slate-500 pt-0.5">
          <Info size={13} className="shrink-0 mt-0.5 text-slate-400" />
          <span>
            Seluruh pesanan dipenuhi dari tabel <code className="text-amber-400/90 font-mono">RedeemStock</code>. Pasokan stok eksternal dikelola asinkron oleh <code className="text-slate-300 font-mono">vendinglink_bridge</code>.
          </span>
        </div>
      </div>

      {/* Supplier product ID input for Bridge mapping */}
      <div className="space-y-1.5 pt-1">
        <label htmlFor="supplier-product-id-input" className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <LinkIcon size={12} className="text-slate-400" />
          ID Produk Supplier / Bridge SKU (Opsional)
        </label>
        <input
          id="supplier-product-id-input"
          type="text"
          value={productId}
          onChange={(e) => onProductChange(e.target.value)}
          placeholder="Misal: rzk-canva-1m atau SKU Supplier Bridge"
          className="w-full bg-surface-card border border-surface-border text-slate-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <p className="text-xs text-slate-500">
          Digunakan oleh webhook Bridge untuk memetakan kiriman stok otomatis ke produk ini.
        </p>
      </div>
    </div>
  );
}
