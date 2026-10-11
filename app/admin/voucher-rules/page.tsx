"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Rule = {
  id: string; code: string; name: string; discountType: "FIXED_IDR" | "PERCENT";
  value: number; maxDiscount: number | null; minSpend: number;
  validFrom: string; validUntil: string; quotaTotal: number | null;
  quotaPerCustomer: number; categoryId: string | null; isActive: boolean; usedCount: number;
};

const empty = {
  code: "", name: "", discountType: "FIXED_IDR" as const, value: 1000,
  maxDiscount: null as number | null, minSpend: 0, validFrom: "", validUntil: "",
  quotaTotal: null as number | null, quotaPerCustomer: 1, categoryId: null as string | null,
  isActive: true,
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
  const load = useCallback(async () => {
    const res = await fetch("/api/admin/voucher-rules");
    if (res.ok) setRules((await res.json()).rules);
  }, []);
  useEffect(() => {
    void load();
    void fetch("/api/admin/categories").then((res) => res.ok ? res.json() : []).then((data) => {
      setCategories(Array.isArray(data) ? data : data.categories ?? []);
    });
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    const body = { ...form, ...(editing ? { id: editing } : {}),
      validFrom: new Date(form.validFrom).toISOString(), validUntil: new Date(form.validUntil).toISOString() };
    const res = await fetch("/api/admin/voucher-rules", {
      method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) { setMessage("Gagal menyimpan. Periksa kode, waktu, kategori, dan kuota."); return; }
    setMessage("Aturan voucher tersimpan.");
    setEditing(null); setForm({ ...empty }); await load();
  };

  return <div className="max-w-4xl space-y-6 text-slate-100">
    <h1 className="text-2xl font-bold">Voucher Berjadwal</h1>
    <p className="text-sm text-slate-400">Waktu diisi sesuai zona waktu perangkat Anda; server menyimpan dan memeriksa dalam UTC. Hapus menonaktifkan promo agar riwayat pemakaian tetap tersedia.</p>
    {message && <p role="status">{message}</p>}
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-surface-border p-5 sm:grid-cols-2">
      <label>Kode<input required minLength={3} maxLength={30} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full bg-surface p-2" /></label>
      <label>Nama<input required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-surface p-2" /></label>
      <label>Jenis diskon<select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as Rule["discountType"] })} className="w-full bg-surface p-2"><option value="FIXED_IDR">Rupiah</option><option value="PERCENT">Persen</option></select></label>
      <label>Nilai<input required type="number" min={1} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="w-full bg-surface p-2" /></label>
      <label>Batas diskon (wajib untuk persen)<input type="number" min={1} value={form.maxDiscount ?? ""} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value ? Number(e.target.value) : null })} className="w-full bg-surface p-2" /></label>
      <label>Minimal belanja<input type="number" min={0} value={form.minSpend} onChange={(e) => setForm({ ...form, minSpend: Number(e.target.value) })} className="w-full bg-surface p-2" /></label>
      <label>Mulai<input required type="datetime-local" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className="w-full bg-surface p-2" /></label>
      <label>Berakhir<input required type="datetime-local" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className="w-full bg-surface p-2" /></label>
      <label>Kuota total (kosong = tak terbatas)<input type="number" min={1} value={form.quotaTotal ?? ""} onChange={(e) => setForm({ ...form, quotaTotal: e.target.value ? Number(e.target.value) : null })} className="w-full bg-surface p-2" /></label>
      <label>Kuota per pelanggan<input required type="number" min={1} max={100} value={form.quotaPerCustomer} onChange={(e) => setForm({ ...form, quotaPerCustomer: Number(e.target.value) })} className="w-full bg-surface p-2" /></label>
      <label>Kategori<select value={form.categoryId ?? ""} onChange={(e) => setForm({ ...form, categoryId: e.target.value || null })} className="w-full bg-surface p-2"><option value="">Semua kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Aktif</label>
      <div className="flex gap-3"><button type="submit" className="rounded bg-brand-500 px-4 py-2 text-black">{editing ? "Simpan" : "Buat promo"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm({ ...empty }); }}>Batal</button>}</div>
    </form>
    <ul className="space-y-3">{rules.map((rule) => <li key={rule.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-surface-border p-3">
      <span>{rule.name} ({rule.code}) · {rule.isActive ? "Aktif" : "Nonaktif"} · {rule.usedCount} dipakai · sampai {new Date(rule.validUntil).toLocaleString("id-ID")}</span>
      <span className="flex gap-3"><button type="button" onClick={() => { setEditing(rule.id); setForm({ ...rule, validFrom: localInput(rule.validFrom), validUntil: localInput(rule.validUntil) }); }} className="text-brand-400">Edit</button><button type="button" onClick={async () => { if (!window.confirm("Nonaktifkan promo ini?")) return; const res = await fetch(`/api/admin/voucher-rules?id=${encodeURIComponent(rule.id)}`, { method: "DELETE" }); if (res.ok) await load(); else setMessage("Gagal menonaktifkan promo."); }} className="text-red-400">Hapus</button></span>
    </li>)}</ul>
  </div>;
}