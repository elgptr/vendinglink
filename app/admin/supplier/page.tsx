'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Loader2 } from 'lucide-react';

export default function SupplierManagementPage() {
  const [mappings, setMappings] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierProductId, setSupplierProductId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/suppliers');
      const data = await res.json();
      if (data.mappings) setMappings(data.mappings);
      if (data.products) setProducts(data.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierCode,
          supplierProductId,
          productId: selectedProductId
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || 'Failed to add mapping');
        return;
      }
      
      setSupplierCode('');
      setSupplierProductId('');
      setSelectedProductId('');
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Error adding mapping');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (code: string, prodId: string) => {
    if (!confirm(`Hapus mapping ${code} - ${prodId}?`)) return;
    
    try {
      const res = await fetch(`/api/admin/suppliers?supplierCode=${encodeURIComponent(code)}&supplierProductId=${encodeURIComponent(prodId)}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        await fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Manajemen Supplier</h1>
        <p className="text-slate-400 mt-1 text-sm">Hubungkan produk dari berbagai supplier eksternal ke satu etalase VendingLink yang ada di inventori Anda.</p>
      </div>

      {/* Add New Binding Form */}
      <div className="bg-surface-card rounded-xl border border-surface-border p-5">
        <h2 className="text-lg font-medium text-white mb-4">Tambah Binding Baru</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Kode Supplier (mis. RZK)</label>
            <input 
              required 
              value={supplierCode}
              onChange={(e) => setSupplierCode(e.target.value.toUpperCase())}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500" 
              placeholder="RZK" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Supplier Product ID</label>
            <input 
              required 
              value={supplierProductId}
              onChange={(e) => setSupplierProductId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500" 
              placeholder="loc_test1" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Etalase VendingLink Tujuan</label>
            <select 
              required
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="">-- Pilih Etalase --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
              ))}
            </select>
          </div>
          <div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-brand-500 text-black rounded-lg px-4 py-2 text-sm font-semibold hover:bg-brand-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-brand-500 disabled:opacity-50 flex justify-center items-center gap-2 transition-colors"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Tambah Binding
            </button>
          </div>
        </form>
      </div>

      {/* Mappings Table */}
      <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h2 className="text-lg font-medium text-white">Daftar Mappings Aktif</h2>
        </div>
        
        {loading ? (
          <div className="p-8 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-base/50 text-xs uppercase tracking-wider text-slate-400 border-b border-surface-border">
                  <th className="px-5 py-3 font-medium">Supplier</th>
                  <th className="px-5 py-3 font-medium">Product ID (Eksternal)</th>
                  <th className="px-5 py-3 font-medium">Target Etalase (Internal VendingLink)</th>
                  <th className="px-5 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-sm">
                {mappings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                      Belum ada mapping. Silahkan tambah binding di atas.
                    </td>
                  </tr>
                ) : (
                  mappings.map((m) => (
                    <tr key={`${m.supplierCode}-${m.supplierProductId}`} className="hover:bg-surface-base/50 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                          {m.supplierCode}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-slate-200 font-mono text-xs">
                        {m.supplierProductId}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="font-medium text-slate-200">{m.product?.name || 'Produk Tidak Ditemukan'}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{m.productId}</div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <button 
                          onClick={() => handleDelete(m.supplierCode, m.supplierProductId)}
                          className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-400/10 transition-colors inline-flex items-center"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
