"use client";

/**
 * DigitalCoreProductLinker
 *
 * Dropdown that lets admin link a vendinglink product to a Rezeki Shop
 * catalog product. Fetches the live catalog from the Rezeki API via
 * /api/admin/supplier?action=products and renders a searchable <select>.
 *
 * Props:
 *   value         - current supplierMode value ("MANUAL" | "REZEKI" | "AUTO")
 *   productId     - current supplierProductId
 *   onModeChange  - called when mode dropdown changes
 *   onProductChange - called when product selection changes
 */

import { useState, useEffect } from "react";
import { Zap, RefreshCw, AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";

export interface SupplierProduct {
  supplierId: string;
  name: string;
  stock: number;
  price: number;
  priceFrom: number;
}

interface Props {
  value: string;           // supplierMode
  productId: string;       // supplierProductId
  onModeChange: (mode: string) => void;
  onProductChange: (slug: string) => void;
}

type FetchStatus = "idle" | "loading" | "success" | "error";

export default function SupplierProductLinker({
  value,
  productId,
  onModeChange,
  onProductChange,
}: Props) {
  const [catalog, setCatalog] = useState<SupplierProduct[]>([]);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchCatalog = async () => {
    setFetchStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/admin/supplier?action=products`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setCatalog(Array.isArray(data) ? data : []);
      setFetchStatus("success");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Gagal mengambil katalog");
      setFetchStatus("error");
    }
  };

  // Auto-fetch when mode switches to an API supplier
  useEffect(() => {
    if ((value === "AUTO" || value === "REZEKI") && catalog.length === 0) {
      fetchCatalog();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const showSupplierSection = value === "AUTO" || value === "REZEKI";
  const providerName = "Rezeki Shop";

  return (
    <div className="space-y-3 border border-surface-border rounded-xl p-4 bg-black/10">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap size={15} className="text-amber-400" />
        <span className="text-sm font-semibold text-slate-300">Supplier Stok</span>
      </div>

      {/* Mode selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Mode Pemenuhan Stok
        </label>
        <select
          id="supplier-mode-select"
          value={value}
          onChange={(e) => onModeChange(e.target.value)}
          className="w-full bg-surface-card border border-surface-border text-slate-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        >
          <option value="MANUAL">
            Manual — Upload link/kode secara manual
          </option>
          <option value="REZEKI">
            Rezeki Shop — Beli otomatis dari Rezeki Shop saat checkout
          </option>
          <option value="AUTO">
            Auto — Pakai manual dulu, fallback ke Rezeki Shop jika habis
          </option>
        </select>
        <p className="text-xs text-slate-500">
          {value === "MANUAL" && "Stok diambil dari link yang kamu upload secara manual."}
          {value === "REZEKI" &&
            "Setiap pembelian akan langsung beli dari Rezeki Shop API. Tidak perlu upload link manual."}
          {value === "AUTO" &&
            "Utamakan link manual. Jika habis, otomatis beli dari Rezeki Shop."}
        </p>
      </div>

      {/* Supplier product picker — only shown for API suppliers */}
      {showSupplierSection && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Produk {providerName}
            </label>
            <Button
              id="refresh-dc-catalog-btn"
              type="button"
              variant="ghost"
              size="sm"
              icon={
                <RefreshCw
                  size={12}
                  className={fetchStatus === "loading" ? "animate-spin" : ""}
                />
              }
              onClick={fetchCatalog}
              disabled={fetchStatus === "loading"}
            >
              Refresh
            </Button>
          </div>

          {fetchStatus === "loading" && catalog.length === 0 ? (
            <p className="text-xs text-slate-500 py-1">Mengambil katalog...</p>
          ) : fetchStatus === "error" ? (
            <div className="flex items-start gap-2 text-red-400 text-xs">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Gagal mengambil katalog {providerName}</p>
                <p className="text-slate-500">{errorMsg}</p>
              </div>
            </div>
          ) : (
            <select
              id="supplier-product-select"
              value={productId}
              onChange={(e) => onProductChange(e.target.value)}
              className="w-full bg-surface-card border border-surface-border text-slate-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <option value="">-- Pilih produk dari {providerName} --</option>
              {catalog.map((p) => (
                <option key={p.supplierId} value={p.supplierId}>
                  {p.name} — Stok: {p.stock} | ${p.price.toFixed(2)}
                </option>
              ))}
            </select>
          )}

          {productId && fetchStatus === "success" && (
            (() => {
              const selected = catalog.find((p) => p.supplierId === productId);
              if (!selected) return null;
              return (
                <div className="text-xs text-slate-500 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2 space-y-0.5">
                  <p>
                    <span className="text-slate-400 font-medium">Slug:</span>{" "}
                    <code className="text-amber-400">{selected.supplierId}</code>
                  </p>
                  <p>
                    <span className="text-slate-400 font-medium">Stok supplier:</span>{" "}
                    {selected.stock} unit
                  </p>
                  <p>
                    <span className="text-slate-400 font-medium">Harga beli:</span>{" "}
                    ${selected.priceFrom.toFixed(2)} – ${selected.price.toFixed(2)}
                    <span className="ml-1 text-slate-600">(harga ini tidak ditampilkan ke customer)</span>
                  </p>
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
