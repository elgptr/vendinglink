"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { submitVoucherRule } from "@/lib/voucherRuleForm";
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Trash2,
  ChevronRight,
  Info,
  LayoutTemplate,
  BadgePercent,
  Link as LinkIcon,
} from "lucide-react";

type Rule = {
  id: string;
  code: string;
  name: string;
  discountType: "FIXED_IDR" | "PERCENT";
  value: number;
  maxDiscount: number | null;
  minSpend: number;
  validFrom: string;
  validUntil: string;
  quotaTotal: number | null;
  quotaPerCustomer: number;
  categoryId: string | null;
  isActive: boolean;
  usedCount: number;
  bannerImageUrl?: string | null;
  bannerType?: "FULL_STRIP" | "BADGE_COMPOSED" | null;
  bannerText?: string | null;
  bannerCtaText?: string | null;
  bannerCtaUrl?: string | null;
};

const empty = {
  code: "",
  name: "",
  discountType: "FIXED_IDR" as const,
  value: 1000,
  maxDiscount: null as number | null,
  minSpend: 0,
  validFrom: "",
  validUntil: "",
  quotaTotal: null as number | null,
  quotaPerCustomer: 1,
  categoryId: null as string | null,
  isActive: true,
  bannerImageUrl: null as string | null,
  bannerType: "FULL_STRIP" as "FULL_STRIP" | "BADGE_COMPOSED",
  bannerText: null as string | null,
  bannerCtaText: null as string | null,
  bannerCtaUrl: "/customer#catalog" as string | null,
};

function localInput(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function VoucherRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState<Omit<Rule, "id" | "usedCount">>({ ...empty });
  const [editing, setEditing] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationInfo, setValidationInfo] = useState<{
    type: "success" | "warning" | "error" | null;
    message: string;
    dimensions?: { width: number; height: number; ratio: string };
  } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/voucher-rules");
    if (res.ok) setRules((await res.json()).rules);
  }, []);

  useEffect(() => {
    void load();
    void fetch("/api/admin/categories")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setCategories(Array.isArray(data) ? data : data.categories ?? []);
      });
  }, [load]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validate MIME type
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setValidationInfo({
        type: "error",
        message: "Format file tidak didukung. Harap pilih gambar bertipe PNG, JPG, atau WEBP.",
      });
      return;
    }

    // 2. Validate file size (max 2MB)
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setValidationInfo({
        type: "error",
        message: `Ukuran file terlalu besar (${sizeMb} MB). Maksimal 2 MB agar banner cepat dimuat pelanggan.`,
      });
      return;
    }

    // 3. Inspect image dimensions using Image object
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = async () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const ratio = (w / h).toFixed(1);
      URL.revokeObjectURL(objectUrl);

      let type: "success" | "warning" = "success";
      let msg = "";

      if (form.bannerType === "FULL_STRIP") {
        if (h > 150) {
          type = "warning";
          msg = `Perhatian dimensi: Gambar strip berukuran ${w} × ${h} px. Tinggi melebihi 150px dan mungkin agak tebal di layar pelanggan. Rekomendasi tinggi 60–100 px.`;
        } else if (w / h < 6) {
          type = "warning";
          msg = `Perhatian rasio: Rasio gambar (${ratio}:1) agak pendek untuk banner strip penuh. Direkomendasikan rasio melebar (12:1 s/d 20:1, misal 1200 × 80 px).`;
        } else {
          msg = `Dimensi sangat ideal untuk Banner Full Strip: ${w} × ${h} px (Rasio ${ratio}:1)!`;
        }
      } else {
        // BADGE_COMPOSED mode
        if (h > 200) {
          type = "warning";
          msg = `Perhatian dimensi: Gambar berukuran ${w} × ${h} px. Tinggi melebihi 200px dan mungkin terlalu tebal untuk badge. Rekomendasi tinggi 60–90 px.`;
        } else if (w / h < 2) {
          type = "warning";
          msg = `Perhatian rasio: Rasio gambar (${ratio}:1) terlalu kotak. Badge disarankan memiliki rasio lebar (minimal 3:1).`;
        } else {
          msg = `Dimensi ideal untuk badge: ${w} × ${h} px (Rasio ${ratio}:1)!`;
        }
      }

      setValidationInfo({
        type,
        message: msg,
        dimensions: { width: w, height: h, ratio },
      });

      // Upload file to server
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const json = await res.json();
          setForm((prev) => ({ ...prev, bannerImageUrl: json.url }));
        } else {
          const errJson = await res.json().catch(() => ({}));
          setValidationInfo({
            type: "error",
            message: errJson.error || "Gagal mengunggah gambar banner ke server.",
          });
        }
      } catch {
        setValidationInfo({
          type: "error",
          message: "Koneksi terputus saat mengunggah banner.",
        });
      } finally {
        setUploading(false);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setValidationInfo({
        type: "error",
        message: "Gagal membaca file gambar. Pastikan file valid dan tidak rusak.",
      });
    };

    img.src = objectUrl;
  };

  const handleRemoveBanner = () => {
    setForm((prev) => ({ ...prev, bannerImageUrl: null }));
    setValidationInfo(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);
    try {
      const result = await submitVoucherRule({
        form,
        editing,
      });

      if (!result.success) {
        setMessage(result.message);
        return;
      }

      setMessage(result.message);
      setEditing(null);
      setForm({ ...empty });
      setValidationInfo(null);
      await load();
    } catch {
      setMessage("Koneksi ke server gagal. Periksa jaringan Anda dan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-8 text-slate-100">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Promo &amp; Voucher Berjadwal</h1>
        <p className="mt-1 text-sm text-slate-400">
          Kelola program promosi berjadwal dan konfigurasikan banner dinamis atas layar (ala DataCamp atau Full Strip) yang tampil di semua halaman pelanggan.
        </p>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-4 text-sm font-medium text-brand-300"
        >
          {message}
        </div>
      )}

      {/* Main Configuration Form */}
      <form onSubmit={submit} className="space-y-6 rounded-2xl border border-surface-border bg-surface-card p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white border-b border-surface-border pb-3">
          {editing ? "Edit Aturan Promo & Banner" : "Buat Promo & Banner Baru"}
        </h2>

        {/* Voucher core fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-300">
            <span>Kode Voucher</span>
            <input
              required
              minLength={3}
              maxLength={30}
              placeholder="Contoh: PROMO_HEMAT"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full rounded-lg border border-surface-border bg-surface p-2.5 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-300">
            <span>Nama Promosi</span>
            <input
              required
              maxLength={100}
              placeholder="Contoh: Flash Sale Akhir Bulan"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-surface-border bg-surface p-2.5 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-300">
            <span>Jenis Diskon</span>
            <select
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value as Rule["discountType"] })}
              className="w-full rounded-lg border border-surface-border bg-surface p-2.5 text-white focus:border-brand-500 focus:outline-none"
            >
              <option value="FIXED_IDR">Potongan Nominal (Rupiah)</option>
              <option value="PERCENT">Potongan Persen (%)</option>
            </select>
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-300">
            <span>Nilai Diskon {form.discountType === "PERCENT" ? "(1 - 100%)" : "(Rp)"}</span>
            <input
              required
              type="number"
              min={1}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
              className="w-full rounded-lg border border-surface-border bg-surface p-2.5 text-white focus:border-brand-500 focus:outline-none"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-300">
            <span>Batas Maksimal Diskon (Wajib jika Persen)</span>
            <input
              type="number"
              min={1}
              placeholder="Kosongkan jika nominal tetap"
              value={form.maxDiscount ?? ""}
              onChange={(e) => setForm({ ...form, maxDiscount: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-lg border border-surface-border bg-surface p-2.5 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-300">
            <span>Minimal Belanja (Rp)</span>
            <input
              type="number"
              min={0}
              value={form.minSpend}
              onChange={(e) => setForm({ ...form, minSpend: Number(e.target.value) })}
              className="w-full rounded-lg border border-surface-border bg-surface p-2.5 text-white focus:border-brand-500 focus:outline-none"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-300">
            <span>Mulai Berlaku</span>
            <input
              required
              type="datetime-local"
              value={form.validFrom}
              onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
              className="w-full rounded-lg border border-surface-border bg-surface p-2.5 text-white focus:border-brand-500 focus:outline-none"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-300">
            <span>Berakhir</span>
            <input
              required
              type="datetime-local"
              value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              className="w-full rounded-lg border border-surface-border bg-surface p-2.5 text-white focus:border-brand-500 focus:outline-none"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-300">
            <span>Kuota Total (Kosong = Tanpa Batas)</span>
            <input
              type="number"
              min={1}
              placeholder="Tak terbatas"
              value={form.quotaTotal ?? ""}
              onChange={(e) => setForm({ ...form, quotaTotal: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-lg border border-surface-border bg-surface p-2.5 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-300">
            <span>Kuota per Pelanggan</span>
            <input
              required
              type="number"
              min={1}
              max={100}
              value={form.quotaPerCustomer}
              onChange={(e) => setForm({ ...form, quotaPerCustomer: Number(e.target.value) })}
              className="w-full rounded-lg border border-surface-border bg-surface p-2.5 text-white focus:border-brand-500 focus:outline-none"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-300">
            <span>Kategori Produk</span>
            <select
              value={form.categoryId ?? ""}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value || null })}
              className="w-full rounded-lg border border-surface-border bg-surface p-2.5 text-white focus:border-brand-500 focus:outline-none"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center pt-6">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-5 w-5 rounded border-surface-border bg-surface text-brand-500 focus:ring-brand-500"
              />
              <span className="font-semibold text-white">Status Aktif</span>
            </label>
          </div>
        </div>

        {/* ── Rumah Konfigurasi Banner (Full Strip & DataCamp Dynamic Top Banner) ── */}
        <div className="mt-8 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-300">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Konfigurasi Banner Promosi Atas Layar</h3>
                <p className="text-xs text-purple-300/80">
                  Banner atas layar interaktif dengan tombol tutup (✕) yang tampil di semua halaman pelanggan.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-200 border border-purple-400/30">
              Top Customer Bar
            </span>
          </div>

          {/* Banner Presentation Mode Switcher */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
              Pilih Tipe Tampilan Banner:
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Option A: FULL STRIP */}
              <button
                type="button"
                onClick={() => setForm({ ...form, bannerType: "FULL_STRIP" })}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                  form.bannerType === "FULL_STRIP"
                    ? "border-emerald-500/60 bg-emerald-950/30 text-white shadow-md shadow-emerald-900/20 ring-1 ring-emerald-500/40"
                    : "border-surface-border bg-surface/50 text-slate-400 hover:border-purple-400/30 hover:bg-surface"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                    form.bannerType === "FULL_STRIP"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-surface text-slate-400"
                  }`}
                >
                  <LayoutTemplate size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">1. Banner Horizontal Penuh (Full Strip)</span>
                    {form.bannerType === "FULL_STRIP" && (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-bold text-emerald-400">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    Upload 1 file banner horizontal utuh (desain teks &amp; tombol sudah menyatu dalam gambar). Hanya membutuhkan <strong>CTA Target URL</strong>.
                  </p>
                </div>
              </button>

              {/* Option B: BADGE COMPOSED */}
              <button
                type="button"
                onClick={() => setForm({ ...form, bannerType: "BADGE_COMPOSED" })}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                  form.bannerType === "BADGE_COMPOSED"
                    ? "border-purple-500/60 bg-purple-950/40 text-white shadow-md shadow-purple-900/20 ring-1 ring-purple-500/40"
                    : "border-surface-border bg-surface/50 text-slate-400 hover:border-purple-400/30 hover:bg-surface"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                    form.bannerType === "BADGE_COMPOSED"
                      ? "bg-purple-500/20 text-purple-300"
                      : "bg-surface text-slate-400"
                  }`}
                >
                  <BadgePercent size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">2. Komposisi Dinamis (DataCamp Style)</span>
                    {form.bannerType === "BADGE_COMPOSED" && (
                      <span className="rounded bg-purple-500/20 px-1.5 py-0.2 text-[10px] font-bold text-purple-400">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    Upload gambar badge/logo promo, sistem otomatis menyusun teks promo dan tombol aksi di sampingnya.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Contextual UX Guidance / Petunjuk Ukuran & Format Gambar */}
          <div className="rounded-xl border border-purple-500/30 bg-purple-900/20 p-4 space-y-2 text-xs text-purple-200">
            <div className="flex items-center gap-2 font-semibold text-purple-100">
              <Info size={16} className="text-purple-400 flex-shrink-0" />
              <span>
                {form.bannerType === "FULL_STRIP"
                  ? "Petunjuk Ukuran Banner Horizontal Penuh (Full Strip):"
                  : "Petunjuk Ukuran Grafis Badge Promo (DataCamp Style):"}
              </span>
            </div>

            {form.bannerType === "FULL_STRIP" ? (
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li>
                  <strong>Ukuran Ideal:</strong>{" "}
                  <span className="text-emerald-300 font-mono font-bold">1200 × 80 px</span> s/d{" "}
                  <span className="text-emerald-300 font-mono font-bold">1920 × 90 px</span> (Rasio lebar 15:1 s/d 20:1, tinggi 60–100 px agar tidak menutupi isi halaman).
                </li>
                <li>
                  <strong>Ketentuan Desain:</strong> Desain gambar sudah mencakup seluruh grafis promosi, teks promo, dan tombol visual dalam 1 file utuh.
                </li>
                <li>
                  <strong>Aturan Input:</strong> Teks Khusus Banner &amp; Teks Tombol Aksi bersifat{" "}
                  <span className="text-amber-300 font-semibold">OPSIONAL</span>. Yang{" "}
                  <span className="text-emerald-400 font-bold underline">MANDATORY (WAJIB)</span> adalah{" "}
                  <strong>CTA Target URL</strong> agar banner dapat diklik pelanggan.
                </li>
              </ul>
            ) : (
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li>
                  <strong>Ukuran Ideal Badge/Logo:</strong>{" "}
                  <span className="text-emerald-300 font-mono font-bold">240 × 80 px</span> s/d{" "}
                  <span className="text-emerald-300 font-mono font-bold">320 × 90 px</span> (Rasio 3:1 s/d 4:1) berlatar belakang transparan (PNG/WEBP).
                </li>
                <li>
                  <strong>Tampilan:</strong> Teks promosi dan tombol aksi dinamis akan dirangkai otomatis di sebelah kanan badge.
                </li>
              </ul>
            )}
          </div>

          {/* File Upload / Image Attachment & Input Validation */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-200">
              {form.bannerType === "FULL_STRIP"
                ? "Unggah File Banner Horizontal Penuh (1 File Strip)"
                : "Unggah File Badge Promo (Opsional)"}
            </label>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* File picker button */}
              <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-purple-400/50 bg-purple-950/40 px-5 py-3 hover:bg-purple-900/40 hover:border-purple-300 transition-colors text-purple-200 text-sm font-medium">
                <Upload size={18} className="text-purple-300" />
                <span>
                  {uploading
                    ? "Mengunggah gambar..."
                    : form.bannerType === "FULL_STRIP"
                    ? "Pilih File Banner Full Strip"
                    : "Pilih File Gambar Badge"}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileSelected}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              {/* Direct image URL input option */}
              <div className="flex-1 w-full">
                <input
                  placeholder="Atau tempel URL gambar (/uploads/..., https://...)"
                  value={form.bannerImageUrl ?? ""}
                  onChange={(e) => setForm({ ...form, bannerImageUrl: e.target.value || null })}
                  className="w-full rounded-lg border border-surface-border bg-surface p-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>

              {form.bannerImageUrl && (
                <button
                  type="button"
                  onClick={handleRemoveBanner}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 size={14} />
                  <span>Hapus</span>
                </button>
              )}
            </div>

            {/* Validation Feedback Messages */}
            {validationInfo && (
              <div
                className={`flex items-start gap-2.5 rounded-lg p-3 text-xs font-medium ${
                  validationInfo.type === "error"
                    ? "border border-red-500/30 bg-red-950/30 text-red-300"
                    : validationInfo.type === "warning"
                    ? "border border-amber-500/30 bg-amber-950/30 text-amber-300"
                    : "border border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
                }`}
              >
                {validationInfo.type === "error" && <XCircle size={16} className="flex-shrink-0 mt-0.5 text-red-400" />}
                {validationInfo.type === "warning" && <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-amber-400" />}
                {validationInfo.type === "success" && <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-emerald-400" />}
                <div>{validationInfo.message}</div>
              </div>
            )}
          </div>

          {/* Banner Text, CTA, & URL Inputs */}
          <div className="grid gap-4 sm:grid-cols-3 pt-2">
            {/* CTA Target URL */}
            <label className="space-y-1 text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <LinkIcon size={13} className="text-emerald-400" />
                <span className="font-bold">CTA Target URL</span>
                {form.bannerType === "FULL_STRIP" ? (
                  <span className="text-emerald-400 font-bold">(Wajib Diisi)</span>
                ) : (
                  <span className="text-slate-400">(Default: /customer#catalog)</span>
                )}
              </span>
              <input
                required={form.bannerType === "FULL_STRIP" && Boolean(form.bannerImageUrl)}
                placeholder="/customer#catalog"
                value={form.bannerCtaUrl ?? ""}
                onChange={(e) => setForm({ ...form, bannerCtaUrl: e.target.value || null })}
                className={`w-full rounded-lg border bg-surface p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none ${
                  form.bannerType === "FULL_STRIP" && !form.bannerCtaUrl
                    ? "border-amber-500/60 focus:border-amber-400 ring-1 ring-amber-500/30"
                    : "border-surface-border focus:border-purple-500"
                }`}
              />
              <span className="text-[11px] text-slate-400 block">
                {form.bannerType === "FULL_STRIP"
                  ? "Seluruh banner Full Strip akan mengarahkan pelanggan ke tautan ini."
                  : "Halaman tujuan saat tombol aksi diklik."}
              </span>
            </label>

            {/* Optional Banner Text */}
            <label className="space-y-1 text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <span>Teks Khusus Banner</span>
                <span className="text-slate-400">(Opsional)</span>
              </span>
              <input
                placeholder={
                  form.bannerType === "FULL_STRIP"
                    ? "Opsional (desain sudah di gambar)"
                    : "Contoh: 50% Off Khusus Minggu Ini!"
                }
                value={form.bannerText ?? ""}
                onChange={(e) => setForm({ ...form, bannerText: e.target.value || null })}
                className="w-full rounded-lg border border-surface-border bg-surface p-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 block">
                {form.bannerType === "FULL_STRIP"
                  ? "Bisa dikosongkan untuk banner full strip."
                  : "Kosong = sistem membuat teks otomatis."}
              </span>
            </label>

            {/* Optional CTA Button Text */}
            <label className="space-y-1 text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <span>Teks Tombol Aksi (CTA)</span>
                <span className="text-slate-400">(Opsional)</span>
              </span>
              <input
                placeholder={
                  form.bannerType === "FULL_STRIP"
                    ? "Opsional (tombol sudah di gambar)"
                    : "Gunakan Kode (default)"
                }
                value={form.bannerCtaText ?? ""}
                onChange={(e) => setForm({ ...form, bannerCtaText: e.target.value || null })}
                className="w-full rounded-lg border border-surface-border bg-surface p-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 block">
                {form.bannerType === "FULL_STRIP"
                  ? "Bisa dikosongkan untuk banner full strip."
                  : "Contoh: Beli Sekarang, Klaim."}
              </span>
            </label>
          </div>

          {/* Interactive Live Preview Box (Dynamically switches between FULL_STRIP and BADGE_COMPOSED) */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                {form.bannerType === "FULL_STRIP"
                  ? "Pratinjau Banner Horizontal Penuh (Full Strip):"
                  : "Pratinjau Komposisi Dinamis (DataCamp Style):"}
              </span>
              <span className="text-[11px] text-slate-400">Tampil di bagian atas semua halaman pelanggan</span>
            </div>

            {form.bannerType === "FULL_STRIP" ? (
              /* Preview for FULL_STRIP mode */
              <div className="relative overflow-hidden rounded-xl border border-purple-500/40 bg-[#0f0326] shadow-xl">
                {/* Floating close demonstration */}
                <span className="absolute top-2 right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/90 shadow">
                  <X size={13} />
                </span>

                {form.bannerImageUrl ? (
                  <div
                    className="cursor-pointer group text-center"
                    title={`Mengarahkan ke: ${form.bannerCtaUrl || "/customer#catalog"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.bannerImageUrl}
                      alt="Preview Full Strip"
                      className="w-full h-auto max-h-[85px] sm:max-h-[96px] object-cover sm:object-contain mx-auto transition-opacity hover:opacity-95"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-7 px-4 text-center space-y-1">
                    <LayoutTemplate size={28} className="text-purple-400/60 mb-1" />
                    <p className="text-xs font-bold text-purple-200">
                      Pratinjau Banner Horizontal Penuh
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-md">
                      Pilih file gambar banner (rekomendasi 1200 × 80 px) untuk melihat pratinjau strip utuh di sini.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Preview for BADGE_COMPOSED mode */
              <div className="overflow-hidden rounded-xl border border-purple-500/40 bg-gradient-to-r from-[#140432] via-[#240a50] to-[#3e0f6f] p-3 text-white shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  {/* Left side preview */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="flex h-5 w-5 items-center justify-center rounded text-purple-300/80 hover:bg-white/10">
                      <X size={14} />
                    </span>

                    {form.bannerImageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={form.bannerImageUrl}
                        alt="Preview Badge"
                        className="h-8 max-w-[160px] object-contain drop-shadow"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-lg border border-purple-400/30 bg-purple-950/80 px-2 py-0.5 text-xs font-extrabold text-purple-200">
                        <span className="text-emerald-400">⚡</span>
                        <span>
                          {form.discountType === "PERCENT"
                            ? `${form.value}% OFF`
                            : `DISKON Rp ${form.value.toLocaleString("id-ID")}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Center text preview */}
                  <div className="min-w-0 flex-1 text-center text-xs sm:text-sm font-medium text-slate-100 truncate">
                    {form.bannerText ? (
                      <span>{form.bannerText}</span>
                    ) : (
                      <span>
                        <strong className="text-white">{form.name || "Nama Promosi"}</strong> — Gunakan kode{" "}
                        <span className="font-extrabold text-emerald-300 underline">
                          {form.code || "KODE_VOUCHER"}
                        </span>{" "}
                        saat checkout!
                      </span>
                    )}
                  </div>

                  {/* Right button preview */}
                  <div className="flex-shrink-0">
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded-full bg-emerald-500 px-3.5 py-1 text-xs font-bold text-slate-950 shadow-md hover:bg-emerald-400"
                    >
                      <span>{form.bannerCtaText || "Gunakan Kode"}</span>
                      <ChevronRight size={13} className="stroke-[3]" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit / Cancel Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-surface-border">
          <button
            type="submit"
            disabled={submitting || uploading}
            className="rounded-xl bg-brand-500 px-6 py-2.5 font-bold text-black shadow-lg shadow-brand-500/20 hover:bg-brand-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Menyimpan..." : (editing ? "Simpan Perubahan Promo" : "Buat Promo & Aktifkan")}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm({ ...empty });
                setValidationInfo(null);
              }}
              className="rounded-xl border border-surface-border px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-surface-hover"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      {/* Rules List Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Daftar Promo &amp; Voucher Terjadwal</h2>
        {rules.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada promo berjadwal yang dibuat.</p>
        ) : (
          <ul className="space-y-3">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-surface-border bg-surface-card/70 p-4 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-base">{rule.name}</span>
                    <span className="rounded bg-surface px-2 py-0.5 font-mono text-xs text-brand-300 border border-surface-border">
                      {rule.code}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        rule.isActive
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {rule.isActive ? "Aktif" : "Nonaktif"}
                    </span>

                    {rule.bannerImageUrl ? (
                      rule.bannerType === "FULL_STRIP" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/40">
                          <LayoutTemplate size={11} />
                          <span>Banner Full Strip</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-purple-300 border border-purple-500/40">
                          <ImageIcon size={11} />
                          <span>Badge DataCamp</span>
                        </span>
                      )
                    ) : (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                        Top Bar Dinamis
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Diskon: {rule.discountType === "PERCENT" ? `${rule.value}%` : `Rp ${rule.value.toLocaleString("id-ID")}`} ·{" "}
                    {rule.usedCount} dipakai · Berlaku s/d {new Date(rule.validUntil).toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(rule.id);
                      setForm({
                        ...rule,
                        validFrom: localInput(rule.validFrom),
                        validUntil: localInput(rule.validUntil),
                        bannerImageUrl: rule.bannerImageUrl ?? null,
                        bannerType: (rule.bannerType as "FULL_STRIP" | "BADGE_COMPOSED") || "FULL_STRIP",
                        bannerText: rule.bannerText ?? null,
                        bannerCtaText: rule.bannerCtaText ?? null,
                        bannerCtaUrl: rule.bannerCtaUrl ?? "/customer#catalog",
                      });
                      if (rule.bannerImageUrl) {
                        setValidationInfo({
                          type: "success",
                          message: `Gambar banner (${rule.bannerType === "FULL_STRIP" ? "Full Strip" : "Badge"}) terpasang untuk promo ini.`,
                        });
                      } else {
                        setValidationInfo(null);
                      }
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-brand-400 border border-surface-border hover:bg-surface-hover"
                  >
                    Edit &amp; Banner
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(`Nonaktifkan promo '${rule.name}'?`)) return;
                      const res = await fetch(`/api/admin/voucher-rules?id=${encodeURIComponent(rule.id)}`, {
                        method: "DELETE",
                      });
                      if (res.ok) await load();
                      else setMessage("Gagal menonaktifkan promo.");
                    }}
                    className="rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-red-400 border border-surface-border hover:bg-surface-hover"
                  >
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}