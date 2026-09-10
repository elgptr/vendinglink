"use client";

import { useState, useEffect, FormEvent } from "react";
import { Package, Plus, Upload, RefreshCw, Edit3, Search, Sparkles, ImageIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import Input, { Textarea } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import toast from "@/components/ui/Toast";
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
  const [submitting, setSubmitting] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // Filter
  const [filterProductId, setFilterProductId] = useState("");

  const fetchProducts = async () => {
    setLoadingProducts(true);
    const res = await fetch("/api/admin/products");
    const data = await res.json();
    setProducts(data);
    setLoadingProducts(false);
  };

  const fetchStocks = async (productId?: string) => {
    setLoadingStocks(true);
    const url = productId
      ? `/api/admin/stock?productId=${productId}&limit=100`
      : `/api/admin/stock?limit=100`;
    const res = await fetch(url);
    const data = await res.json();
    setStocks(data.stocks || []);
    setLoadingStocks(false);
  };

  useEffect(() => {
    fetchProducts();
    fetchStocks();
  }, []);

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
        guideImageUrl: editGuideUrl,
        guideText: editGuideText || undefined,
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
            id="add-product-btn"
            variant="secondary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => setShowAddProductModal(true)}
          >
            Produk Baru
          </Button>
          <Button
            id="bulk-upload-btn"
            size="sm"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{product.name}</h3>
                      <Badge variant="neutral" className="text-[10px] px-1.5 py-0">
                        {product.type === "KODE" ? "🔑 Kode" : "🔗 Link"}
                      </Badge>
                    </div>
                    <p className="text-xl font-bold text-purple-400 mt-1">
                      {formatRupiah(product.price)}
                    </p>
                  </div>
                  <Badge variant={product.isActive ? "success" : "danger"}>
                    {product.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                  <span>{product._count.stocks} stok tersedia</span>
                  <div className="flex items-center gap-2">
                    {product.guideImageUrl && (
                      <span className="flex items-center gap-1 text-emerald-400" title="Gambar panduan tersedia">
                        <ImageIcon size={12} />
                      </span>
                    )}
                    <span>{formatDate(product.updatedAt)}</span>
                  </div>
                </div>
                <Button
                  id={`edit-price-btn-${product.id}`}
                  variant="secondary"
                  size="sm"
                  className="w-full"
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
                    setShowPriceModal(true);
                  }}
                >
                  Edit Produk
                </Button>
              </Card>
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

        <Card className="overflow-hidden">
          {loadingStocks ? (
            <div className="py-10"><Spinner label="Memuat stok..." /></div>
          ) : stocks.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Package size={40} className="mx-auto mb-3 opacity-40" />
              <p>Belum ada stok link</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Link (Masked)</th>
                    <th>Status</th>
                    <th>Agen</th>
                    <th>Pembeli</th>
                    <th>Terjual Pada</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((stock) => (
                    <tr key={stock.id}>
                      <td className="font-medium text-slate-200">{stock.productName}</td>
                      <td className="font-mono text-xs text-slate-400 max-w-[200px] truncate">
                        {stock.redeemUrl}
                      </td>
                      <td>
                        <Badge variant={stock.status === "AVAILABLE" ? "success" : "neutral"}>
                          {stock.status === "AVAILABLE" ? "Tersedia" : "Terjual"}
                        </Badge>
                      </td>
                      <td className="text-slate-300">{stock.claimedByAgent || "—"}</td>
                      <td className="text-slate-300">{stock.customerName || "—"}</td>
                      <td className="text-slate-400 text-xs">
                        {stock.claimedAt ? formatDate(stock.claimedAt) : "—"}
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
          <Textarea
            id="edit-product-guide-text"
            label="Panduan Penggunaan (Opsional)"
            placeholder="Langkah 1: Buka link...\nLangkah 2: Masukkan kode..."
            value={editGuideText}
            onChange={(e) => setEditGuideText(e.target.value)}
            rows={3}
            maxLength={2000}
            hint="Akan ditampilkan sebagai step-by-step instruksi ke pembeli."
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
          <Textarea
            id="new-product-guide-text"
            label="Panduan Penggunaan (Opsional)"
            placeholder="Langkah 1: Buka link...\nLangkah 2: Masukkan kode..."
            value={newProductGuideText}
            onChange={(e) => setNewProductGuideText(e.target.value)}
            rows={3}
            maxLength={2000}
            hint="Akan ditampilkan sebagai step-by-step instruksi ke pembeli."
          />
        </form>
      </Modal>
    </div>
  );
}
