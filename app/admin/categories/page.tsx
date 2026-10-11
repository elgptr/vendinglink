"use client";

import { useState, useEffect, FormEvent } from "react";
import { Folder, Plus, Edit3, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import toast from "@/components/ui/Toast";

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parent: { id: string; name: string; slug: string } | null;
  _count: { products: number; children: number };
  createdAt: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error("Gagal memuat kategori");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Gagal memuat kategori");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const resetForm = () => {
    setName("");
    setSlug("");
    setParentId("");
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setName(category.name);
    setSlug(category.slug);
    setParentId(category.parentId || "");
    setShowModal(true);
  };

  const generateSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 100);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editing) setSlug(generateSlug(value));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setSubmitting(true);
    const method = editing ? "PATCH" : "POST";
    const body = editing
      ? { id: editing.id, name, slug, parentId: parentId || null }
      : { name, slug, parentId: parentId || null };

    try {
      const res = await fetch("/api/admin/categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(editing ? "Kategori diperbarui" : "Kategori dibuat");
        fetchCategories();
        setShowModal(false);
        resetForm();
      } else {
        toast.error(data.error || "Gagal menyimpan kategori");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Hapus kategori "${category.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/categories?id=${category.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Kategori dihapus");
        fetchCategories();
      } else {
        toast.error(data.error || "Gagal menghapus kategori");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    }
  };

  const availableParents = editing
    ? categories.filter((c) => c.id !== editing.id)
    : categories;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-brand-500/10 rounded-xl border border-brand-500/20">
              <Folder size={20} className="text-brand-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Kategori Produk</h1>
          </div>
          <p className="text-slate-400 ml-14">Kelola kategori untuk katalog dan mapping bridge</p>
        </div>
        <Button
          id="add-category-btn"
          variant="secondary"
          size="sm"
          icon={<Plus size={16} />}
          onClick={openCreate}
        >
          Kategori Baru
        </Button>
      </div>

      {/* List */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-12"><Spinner label="Memuat kategori..." /></div>
        ) : categories.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            Belum ada kategori. Buat kategori pertama untuk mengisi dropdown produk.
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-surface text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Nama</th>
                <th className="px-6 py-3">Slug</th>
                <th className="px-6 py-3">Parent</th>
                <th className="px-6 py-3 text-right">Produk</th>
                <th className="px-6 py-3 text-right">Sub</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-surface-hover/50">
                  <td className="px-6 py-4 font-medium text-white">{category.name}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono">{category.slug}</td>
                  <td className="px-6 py-4 text-slate-400">{category.parent?.name || "—"}</td>
                  <td className="px-6 py-4 text-right text-slate-300">{category._count.products}</td>
                  <td className="px-6 py-4 text-right text-slate-300">{category._count.children}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(category)}
                        className="p-2 text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editing ? `Edit Kategori — ${editing.name}` : "Kategori Baru"}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowModal(false); resetForm(); }}>
              Batal
            </Button>
            <Button
              id="save-category-btn"
              onClick={handleSubmit}
              loading={submitting}
            >
              Simpan
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="category-name"
            label="Nama Kategori"
            placeholder="Contoh: AI Tools"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
          <Input
            id="category-slug"
            label="Slug"
            placeholder="ai-tools"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            required
            hint="Hanya huruf kecil, angka, dan tanda hubung."
          />
          <div className="space-y-1.5">
            <label htmlFor="category-parent" className="text-sm font-medium text-slate-300">
              Parent (Opsional)
            </label>
            <select
              id="category-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full bg-surface-card border border-surface-border text-slate-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              <option value="">-- Tanpa Parent --</option>
              {availableParents.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}

