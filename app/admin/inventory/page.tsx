"use client";

import { useState, useEffect, FormEvent } from "react";
import { Package, Plus, Upload, RefreshCw, Edit3, Search, Sparkles, ImageIcon, Eye, EyeOff, Copy, Check, Trash2, AlertTriangle, CheckCircle2, Key, Link as LinkIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import Input, { Textarea } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import toast from "@/components/ui/Toast";
import SupplierProductLinker from "@/components/admin/SupplierProductLinker";
import { formatRupiah, formatDate } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice: number | null;
  type: string;
  description: string | null;
  showOriginalPrice: boolean;
  guideImageUrl: string | null;
  guideText: string | null;
  isActive: boolean;
  updatedAt: string;
  supplierMode: string;
  supplierProductId: string | null;
  _count: { stocks: number };
}

interface Stock {
  id: string;
  productName: string;
  productId: string;
  status: string;
  redeemUrl: string;
  claimedByAgent: string | null;
  customerName: string | null;
  claimedAt: string | null;
  createdAt: string;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [syncingSupplier, setSyncingSupplier] = useState(false);
  const handleSyncSupplier = async () => {
    setSyncingSupplier(true);
    try {
      const res = await fetch("/api/admin/supplier?action=sync");
      const data = await res.json();
      if (res.ok) {
        toast.success(`Stok supplier berhasil disinkronkan (${data.updated || 0} produk)`);
        fetchProducts();
      } else {
        toast.error(data.error || "Gagal sinkronkan stok supplier");
      }
    } catch {
      toast.error("Gagal terhubung ke supplier");
    } finally {
      setSyncingSupplier(false);
    }
  };
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Modals
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Form states
  const [newPrice, setNewPrice] = useState("");
  const [bulkLinks, setBulkLinks] = useState("");
  const [uploadProductId, setUploadProductId] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newOriginalPrice, setNewOriginalPrice] = useState("");
  const [newShowOriginalPrice, setNewShowOriginalPrice] = useState(true);
  const [newProductType, setNewProductType] = useState("LINK");
  const [newProductDesc, setNewProductDesc] = useState("");
  const [editProductName, setEditProductName] = useState("");
  const [editOriginalPrice, setEditOriginalPrice] = useState("");
  const [editShowOriginalPrice, setEditShowOriginalPrice] = useState(true);
  const [editProductType, setEditProductType] = useState("LINK");
  const [editProductDesc, setEditProductDesc] = useState("");
  const [newProductGuideUrl, setNewProductGuideUrl] = useState("");
  const [newProductGuideText, setNewProductGuideText] = useState("");
  const [editGuideUrl, setEditGuideUrl] = useState("");
  const [editGuideText, setEditGuideText] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSupplierMode, setEditSupplierMode] = useState("MANUAL");
  const [editSupplierProductId, setEditSupplierProductId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // Revealed stock links map: stockId -> fullUrl
  const [revealedStocks, setRevealedStocks] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleRevealStock = async (stock: Stock) => {
    if (revealedStocks[stock.id]) {
      setRevealedStocks((prev) => {
        const next = { ...prev };
        delete next[stock.id];
        return next;
      });
      return;
    }

    if (stock.status === "SOLD") {
      setRevealedStocks((prev) => ({ ...prev, [stock.id]: stock.redeemUrl }));
      return;
    }

    setRevealingId(stock.id);
    try {
      const res = await fetch(`/api/admin/stock/${stock.id}/reveal`);
      const data = await res.json();
      if (res.ok && data.redeemUrl) {
        setRevealedStocks((prev) => ({ ...prev, [stock.id]: data.redeemUrl }));
      } else {
        toast.error(data.error || "Gagal memuat link full");
      }
    } catch {
      toast.error("Gagal memuat link full");
    } finally {
      setRevealingId(null);
    }
  };

  const copyToClipboard = (textToCopy: string, id: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    toast.success("Link berhasil disalin");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter
  const [filterProductId, setFilterProductId] = useState("");

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch products:", e);
      toast.error("Gagal memuat produk. Coba lagi.");
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchStocks = async (productId?: string) => {
    setLoadingStocks(true);
    try {
      const url = productId
        ? `/api/admin/stock?productId=${productId}&limit=100`
        : `/api/admin/stock?limit=100`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setStocks(Array.isArray(data.stocks) ? data.stocks : []);
    } catch (e) {
      console.error("Failed to fetch stocks:", e);
      toast.error("Gagal memuat stok. Coba lagi.");
      setStocks([]);
    } finally {
      setLoadingStocks(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchStocks();
  }, []);

  const handleStockDelete = async (stock: Stock) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus stok ini dari riwayat?`)) return;

    try {
      const res = await fetch(`/api/admin/stock?id=${stock.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Stok berhasil dihapus");
        fetchStocks(filterProductId || undefined);
      } else {
        const data = await res.json();
        toast.error(data.error || "Gagal menghapus stok");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    }
  };

  const submitUpdateProduct = async () => {
    if (!selectedProduct || !newPrice || !editProductName) return;
    setSubmitting(true);

    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedProduct.id,
        name: editProductName,
        price: parseInt(newPrice),
        originalPrice: editOriginalPrice ? parseInt(editOriginalPrice) : undefined,
        showOriginalPrice: editShowOriginalPrice,
        type: editProductType,
        description: editProductDesc || undefined,
        isActive: editIsActive,
        guideImageUrl: editGuideUrl,
        guideText: editGuideText || undefined,
        supplierMode: editSupplierMode,
        supplierProductId: editSupplierProductId || null,
      }),
    });

    if (res.ok) {
      toast.success("Produk berhasil diperbarui!");
      fetchProducts();
      setShowPriceModal(false);
    } else {
      toast.error("Gagal memperbarui produk");
    }
    setSubmitting(false);
  };

  const handleUpdateProduct = async (e: FormEvent) => {
    e.preventDefault();
    await submitUpdateProduct();
  };

  const handleGenerateDescription = async (
    name: string,
    price: string,
    setDescription: (value: string) => void
  ) => {
    if (!name.trim() || !price) {
      toast.warning("Isi nama produk dan harga terlebih dahulu");
      return;
    }
    setGeneratingDesc(true);

    try {
      const res = await fetch("/api/admin/products/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), price: parseInt(price) }),
      });
      const data = await res.json();

      if (res.ok) {
        setDescription(data.description);
        toast.success("Deskripsi berhasil digenerate!");
      } else {
        toast.error(data.error || "Gagal generate deskripsi");
      }
    } catch {
      toast.error("Gagal generate deskripsi");
    } finally {
      setGeneratingDesc(false);
    }
  };

  const submitBulkUpload = async () => {
    if (!uploadProductId || !bulkLinks.trim()) return;
    setSubmitting(true);

    const res = await fetch("/api/admin/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: uploadProductId, links: bulkLinks }),
    });

    const data = await res.json();
    if (res.ok) {
      toast.success(data.message);
      setBulkLinks("");
      fetchStocks(filterProductId || undefined);
      setShowUploadModal(false);
    } else {
      toast.error(data.error || "Gagal upload link");
    }
    setSubmitting(false);
  };

  const handleBulkUpload = async (e: FormEvent) => {
    e.preventDefault();
    await submitBulkUpload();
  };

  const submitAddProduct = async () => {
    if (!newProductName || !newProductPrice) return;
    setSubmitting(true);

    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newProductName,
        price: parseInt(newProductPrice),
        originalPrice: newOriginalPrice ? parseInt(newOriginalPrice) : undefined,
        showOriginalPrice: newShowOriginalPrice,
        type: newProductType,
        description: newProductDesc || undefined,
        guideImageUrl: newProductGuideUrl || undefined,
        guideText: newProductGuideText || undefined,
      }),
    });

    if (res.ok) {
      toast.success("Produk berhasil ditambahkan!");
      fetchProducts();
      setShowAddProductModal(false);
      setNewProductName("");
      setNewProductPrice("");
      setNewOriginalPrice("");
      setNewShowOriginalPrice(true);
      setNewProductType("LINK");
      setNewProductDesc("");
      setNewProductGuideUrl("");
      setNewProductGuideText("");
    } else {
      toast.error("Gagal menambahkan produk");
    }
    setSubmitting(false);
  };

  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    await submitAddProduct();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <Package size={20} className="text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Inventori & Stok</h1>
          </div>
          <p className="text-slate-400 ml-14">Kelola produk dan link redeem</p>
        </div>
        <div className="flex gap-3">
          <Button
            id="sync-supplier-btn"
            variant="secondary"
            size="sm"
            disabled={syncingSupplier}
            className="hover:border-brand-500/50 hover:shadow-glow transition-all"
            icon={<RefreshCw size={16} className={syncingSupplier ? "animate-spin" : ""} />}
            onClick={handleSyncSupplier}
          >
            Sync Supplier
          </Button>
          <Button
            id="add-product-btn"
            variant="secondary"
            size="sm"
            className="hover:border-brand-500/50 hover:shadow-glow transition-all"
            icon={<Plus size={16} />}
            onClick={() => setShowAddProductModal(true)}
          >
            Produk Baru
          </Button>
          <Button
            id="bulk-upload-btn"
            size="sm"
            className="shadow-glow shadow-brand-500/50 hover:scale-105 transition-all"
            icon={<Upload size={16} />}
            onClick={() => setShowUploadModal(true)}
          >
            Upload Link
          </Button>
        </div>
      </div>

      {/* Products Section */}
      <section>
        <h2 className="text-base font-semibold text-slate-300 mb-4">Daftar Produk</h2>
        {loadingProducts ? (
          <div className="py-10"><Spinner label="Memuat produk..." /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {products.map((product) => (
              <div 
                key={product.id} 
                className="bg-surface-card border border-surface-border rounded-2xl p-5 relative overflow-hidden group hover:border-brand-500/50 hover:shadow-glow-lg transition-all duration-300 flex flex-col justify-between"
              >
                {/* Background Glow */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="pr-4">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-white text-lg leading-tight group-hover:text-brand-400 transition-colors">{product.name}</h3>
                      </div>
                      <div className="flex items-baseline gap-2 mt-2">
                        <p className="text-2xl font-black text-brand-400 tracking-tight">
                          {formatRupiah(product.price)}
                        </p>
                        {product.showOriginalPrice && product.originalPrice && (
                          <p className="text-sm text-slate-500 line-through decoration-rose-500/50 decoration-2">
                            {formatRupiah(product.originalPrice)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge variant={product.isActive ? "success" : "danger"} className="shadow-sm">
                        {product.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-surface-hover px-2 py-1 rounded-md border border-surface-border">
                        {product.type === "KODE" ? <Key size={10} className="text-amber-400" /> : <LinkIcon size={10} className="text-blue-400" />}
                        {product.type}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 py-4 border-y border-surface-border/50 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Ketersediaan Stok</span>
                      {product._count.stocks === 0 ? (
                        <span className="text-rose-400 font-bold flex items-center gap-1.5 bg-rose-500/10 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={14} /> Habis
                        </span>
                      ) : product._count.stocks <= 5 ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1.5 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          <Sparkles size={14} className="animate-pulse" /> {product._count.stocks} Tersisa
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={14} /> {product._count.stocks} Tersedia
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Pembaruan Terakhir</span>
                      <div className="flex items-center gap-2 text-slate-300">
                        {product.guideImageUrl && (
                          <span className="flex items-center gap-1 text-brand-400 bg-brand-500/10 p-1 rounded" title="Gambar panduan tersedia">
                            <ImageIcon size={12} />
                          </span>
                        )}
                        <span>{formatDate(product.updatedAt).split(' pukul')[0]}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  id={`edit-price-btn-${product.id}`}
                  variant="secondary"
                  size="sm"
                  className="w-full bg-surface-hover hover:bg-brand-500 hover:text-black border-surface-border group-hover:border-brand-500 transition-all duration-300"
                  icon={<Edit3 size={14} />}
                  onClick={() => {
                    setSelectedProduct(product);
                    setEditProductName(product.name);
                    setNewPrice(product.price.toString());
                    setEditOriginalPrice(product.originalPrice ? product.originalPrice.toString() : "");
                    setEditShowOriginalPrice(product.showOriginalPrice);
                    setEditProductType(product.type);
                    setEditProductDesc(product.description || "");
                    setEditGuideUrl(product.guideImageUrl || "");
                    setEditGuideText(product.guideText || "");
                    setEditIsActive(product.isActive);
                    setEditSupplierMode(product.supplierMode || "MANUAL");
                    setEditSupplierProductId(product.supplierProductId || "");
                    setShowPriceModal(true);
                  }}
                >
                  Edit Produk
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Stock Log Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-300">Log Stok Link</h2>
          <div className="flex gap-2">
            <select
              id="stock-filter-product"
              value={filterProductId}
              onChange={(e) => {
                setFilterProductId(e.target.value);
                fetchStocks(e.target.value || undefined);
              }}
              className="bg-surface-card border border-surface-border text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="">Semua Produk</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <Button
              id="refresh-stocks-btn"
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={() => fetchStocks(filterProductId || undefined)}
            >
              Refresh
            </Button>
          </div>
        </div>

        <Card noPadding className="overflow-hidden border border-surface-border bg-surface-card/50 backdrop-blur-md rounded-2xl shadow-xl">
          {loadingStocks ? (
            <div className="py-12"><Spinner label="Memuat log stok..." /></div>
          ) : stocks.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Package size={40} className="mx-auto mb-3 opacity-40 text-slate-600" />
              <p>Belum ada log stok link</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-surface-border/30 text-slate-400 border-b border-surface-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider">Produk</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Link (Masked)</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Agen</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Pembeli</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Terjual Pada</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50">
                  {stocks.map((stock) => (
                    <tr key={stock.id} className="hover:bg-surface-border/20 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-200 group-hover:text-brand-300 transition-colors">{stock.productName}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 max-w-[250px] xl:max-w-[320px]">
                          <span
                            onClick={() => toggleRevealStock(stock)}
                            className="font-mono text-xs text-slate-400 bg-surface px-2 py-1 rounded border border-surface-border hover:border-brand-500/50 hover:text-brand-300 cursor-pointer truncate transition-all shadow-inner"
                            title={revealedStocks[stock.id] ? "Klik untuk menyembunyikan link" : "Klik untuk melihat link full"}
                          >
                            {revealingId === stock.id ? "Memuat..." : (revealedStocks[stock.id] || stock.redeemUrl)}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealStock(stock)}
                            className="text-slate-500 hover:text-brand-400 p-1.5 rounded-md hover:bg-brand-500/10 transition-colors flex-shrink-0"
                            title={revealedStocks[stock.id] ? "Sembunyikan link" : "Lihat link full"}
                          >
                            {revealedStocks[stock.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          {revealedStocks[stock.id] && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(revealedStocks[stock.id], stock.id)}
                              className="text-slate-500 hover:text-brand-400 p-1.5 rounded-md hover:bg-brand-500/10 transition-colors flex-shrink-0"
                              title="Salin link"
                            >
                              {copiedId === stock.id ? <Check size={14} className="text-brand-400" /> : <Copy size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={stock.status === "AVAILABLE" ? "success" : "neutral"} className="shadow-sm">
                          {stock.status === "AVAILABLE" ? "Tersedia" : "Terjual"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{stock.claimedByAgent || "—"}</td>
                      <td className="px-6 py-4 text-slate-300">{stock.customerName || "—"}</td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {stock.claimedAt ? formatDate(stock.claimedAt) : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleStockDelete(stock)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Hapus stok"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {/* ── Modals ─────────────────────────────────────────── */}

      {/* Edit Product Modal */}
      <Modal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        title={`Edit Produk — ${selectedProduct?.name}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowPriceModal(false)}>
              Batal
            </Button>
            <Button
              id="save-price-btn"
              onClick={submitUpdateProduct}
              loading={submitting}
            >
              Simpan Produk
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateProduct} className="space-y-4">
          <Input
            id="edit-product-name"
            label="Nama Produk"
            placeholder="Link Redeem Premium"
            value={editProductName}
            onChange={(e) => setEditProductName(e.target.value)}
            required
          />
          <Input
            id="new-price-input"
            label="Harga Baru (Rp)"
            type="number"
            min="1"
            placeholder="350000"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            required
          />
          <Input
            id="edit-original-price-input"
            label="Harga Asli / Coret (Opsional)"
            type="number"
            min="1"
            placeholder="500000"
            value={editOriginalPrice}
            onChange={(e) => setEditOriginalPrice(e.target.value)}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Tampilkan Harga Coret?</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="editShowOriginalPrice" checked={editShowOriginalPrice} onChange={() => setEditShowOriginalPrice(true)} className="accent-brand-500" />
                <span className="text-sm text-slate-200">Ya, Tampilkan</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="editShowOriginalPrice" checked={!editShowOriginalPrice} onChange={() => setEditShowOriginalPrice(false)} className="accent-brand-500" />
                <span className="text-sm text-slate-200">Sembunyikan</span>
              </label>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Tipe Produk</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="editProductType" value="LINK" checked={editProductType === "LINK"} onChange={(e) => setEditProductType(e.target.value)} className="accent-brand-500" />
                <span className="text-sm text-slate-200">Link Redeem</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="editProductType" value="KODE" checked={editProductType === "KODE"} onChange={(e) => setEditProductType(e.target.value)} className="accent-brand-500" />
                <span className="text-sm text-slate-200">Kode Redeem</span>
              </label>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">
              Status Produk Aktif
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} className="accent-brand-500 w-4 h-4" />
              <span className="text-sm text-slate-200">{editIsActive ? "Aktif" : "Nonaktif"}</span>
            </label>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="edit-product-desc" className="text-sm font-medium text-slate-300">
                Deskripsi
              </label>
              <Button
                id="generate-desc-btn-edit"
                type="button"
                variant="secondary"
                size="sm"
                icon={<Sparkles size={14} />}
                loading={generatingDesc}
                onClick={() =>
                  handleGenerateDescription(
                    editProductName,
                    newPrice,
                    setEditProductDesc
                  )
                }
              >
                Generate Deskripsi
              </Button>
            </div>
            <Textarea
              id="edit-product-desc"
              placeholder="Deskripsi produk..."
              value={editProductDesc}
              onChange={(e) => setEditProductDesc(e.target.value)}
              rows={3}
              maxLength={500}
              hint={`${editProductDesc.length}/200 karakter disarankan`}
            />
          </div>
          <div className="space-y-1.5">
            <Input
              id="edit-guide-url"
              label="URL Gambar Panduan (Opsional)"
              placeholder="https://example.com/guide-image.jpg"
              value={editGuideUrl}
              onChange={(e) => setEditGuideUrl(e.target.value)}
            />
            {editGuideUrl && (
              <div className="mt-2 rounded-xl border border-surface-border overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editGuideUrl}
                  alt="Preview panduan"
                  className="w-full max-h-48 object-contain bg-black/20"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block'; }}
                />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="edit-product-guide-text" className="text-sm font-medium text-slate-300">
                Panduan Penggunaan (Opsional)
              </label>
              <div>
                <input
                  type="file"
                  accept=".md"
                  id="edit-upload-md"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.name.endsWith(".md")) {
                      toast.error("Hanya file .md yang diperbolehkan");
                      e.target.value = "";
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setEditGuideText(ev.target?.result as string);
                      toast.success("File .md berhasil dimuat");
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<Upload size={14} />}
                  onClick={() => document.getElementById("edit-upload-md")?.click()}
                >
                  Upload .md
                </Button>
              </div>
            </div>
            <Textarea
              id="edit-product-guide-text"
              placeholder="Langkah 1: Buka link...\nLangkah 2: Masukkan kode..."
              value={editGuideText}
              onChange={(e) => setEditGuideText(e.target.value)}
              rows={3}
              maxLength={2000}
              hint="Akan ditampilkan sebagai step-by-step instruksi ke pembeli."
            />
          </div>

          {/* ── Supplier Linker ── */}
          <SupplierProductLinker
            value={editSupplierMode}
            productId={editSupplierProductId}
            onModeChange={setEditSupplierMode}
            onProductChange={setEditSupplierProductId}
          />
        </form>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Bulk Upload Link Redeem"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowUploadModal(false)}>
              Batal
            </Button>
            <Button
              id="save-links-btn"
              onClick={submitBulkUpload}
              loading={submitting}
              icon={<Upload size={14} />}
            >
              Upload Link
            </Button>
          </>
        }
      >
        <form onSubmit={handleBulkUpload} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Pilih Produk</label>
            <select
              id="upload-product-select"
              value={uploadProductId}
              onChange={(e) => setUploadProductId(e.target.value)}
              required
              className="w-full bg-surface-card border border-surface-border text-slate-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              <option value="">-- Pilih Produk --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <Textarea
            id="bulk-links-textarea"
            label={products.find(p => p.id === uploadProductId)?.type === "KODE" ? "Kode Redeem (1 baris = 1 kode)" : "Link Redeem (1 baris = 1 link)"}
            placeholder={products.find(p => p.id === uploadProductId)?.type === "KODE" ? "KODE123\nKODE456" : "https://example.com/redeem/LINK1\nhttps://example.com/redeem/LINK2"}
            value={bulkLinks}
            onChange={(e) => setBulkLinks(e.target.value)}
            rows={8}
            required
            hint={products.find(p => p.id === uploadProductId)?.type === "KODE" ? "Masukkan 1 kode per baris" : "Setiap baris harus berisi 1 URL valid yang diawali http:// atau https://"}
          />
        </form>
      </Modal>

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        title="Tambah Produk Baru"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddProductModal(false)}>
              Batal
            </Button>
            <Button
              id="save-product-btn"
              onClick={submitAddProduct}
              loading={submitting}
            >
              Simpan Produk
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddProduct} className="space-y-4">
          <Input
            id="new-product-name"
            label="Nama Produk"
            placeholder="Link Redeem Premium"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            required
          />
          <Input
            id="new-product-price"
            label="Harga (Rp)"
            type="number"
            min="1"
            placeholder="350000"
            value={newProductPrice}
            onChange={(e) => setNewProductPrice(e.target.value)}
            required
          />
          <Input
            id="new-original-price"
            label="Harga Asli / Coret (Opsional)"
            type="number"
            min="1"
            placeholder="500000"
            value={newOriginalPrice}
            onChange={(e) => setNewOriginalPrice(e.target.value)}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Tampilkan Harga Coret?</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="newShowOriginalPrice" checked={newShowOriginalPrice} onChange={() => setNewShowOriginalPrice(true)} className="accent-brand-500" />
                <span className="text-sm text-slate-200">Ya, Tampilkan</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="newShowOriginalPrice" checked={!newShowOriginalPrice} onChange={() => setNewShowOriginalPrice(false)} className="accent-brand-500" />
                <span className="text-sm text-slate-200">Sembunyikan</span>
              </label>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Tipe Produk</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="newProductType" value="LINK" checked={newProductType === "LINK"} onChange={(e) => setNewProductType(e.target.value)} className="accent-brand-500" />
                <span className="text-sm text-slate-200">Link Redeem</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="newProductType" value="KODE" checked={newProductType === "KODE"} onChange={(e) => setNewProductType(e.target.value)} className="accent-brand-500" />
                <span className="text-sm text-slate-200">Kode Redeem</span>
              </label>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="new-product-desc" className="text-sm font-medium text-slate-300">
                Deskripsi (Opsional)
              </label>
              <Button
                id="generate-desc-btn-add"
                type="button"
                variant="secondary"
                size="sm"
                icon={<Sparkles size={14} />}
                loading={generatingDesc}
                onClick={() =>
                  handleGenerateDescription(
                    newProductName,
                    newProductPrice,
                    setNewProductDesc
                  )
                }
              >
                Generate Deskripsi
              </Button>
            </div>
            <Textarea
              id="new-product-desc"
              placeholder="Deskripsi produk..."
              value={newProductDesc}
              onChange={(e) => setNewProductDesc(e.target.value)}
              rows={3}
              maxLength={500}
              hint={`${newProductDesc.length}/200 karakter disarankan`}
            />
          </div>
          <div className="space-y-1.5">
            <Input
              id="new-product-guide-url"
              label="URL Gambar Panduan (Opsional)"
              placeholder="https://example.com/guide-image.jpg"
              value={newProductGuideUrl}
              onChange={(e) => setNewProductGuideUrl(e.target.value)}
            />
            {newProductGuideUrl && (
              <div className="mt-2 rounded-xl border border-surface-border overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={newProductGuideUrl}
                  alt="Preview panduan"
                  className="w-full max-h-48 object-contain bg-black/20"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block'; }}
                />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="new-product-guide-text" className="text-sm font-medium text-slate-300">
                Panduan Penggunaan (Opsional)
              </label>
              <div>
                <input
                  type="file"
                  accept=".md"
                  id="new-upload-md"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.name.endsWith(".md")) {
                      toast.error("Hanya file .md yang diperbolehkan");
                      e.target.value = "";
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setNewProductGuideText(ev.target?.result as string);
                      toast.success("File .md berhasil dimuat");
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<Upload size={14} />}
                  onClick={() => document.getElementById("new-upload-md")?.click()}
                >
                  Upload .md
                </Button>
              </div>
            </div>
            <Textarea
              id="new-product-guide-text"
              placeholder="Langkah 1: Buka link...\nLangkah 2: Masukkan kode..."
              value={newProductGuideText}
              onChange={(e) => setNewProductGuideText(e.target.value)}
              rows={3}
              maxLength={2000}
              hint="Akan ditampilkan sebagai step-by-step instruksi ke pembeli."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
