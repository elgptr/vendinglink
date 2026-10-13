'use client';

import { useState, useEffect } from 'react';
import {
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Code,
  ShieldCheck,
  Layers,
  Link as LinkIcon,
  X,
  Wallet,
  AlertCircle,
  WifiOff,
} from 'lucide-react';
import { BridgeSupplier, BridgeBuiltInSupplier } from '@/lib/bridge/suppliersClient';

interface SupplierBalanceInfo {
  code: string;
  displayName: string;
  balance: number | null;
  status: 'OK' | 'LOW' | 'ERROR' | 'CONFIG_IN_BRIDGE';
  error?: string | null;
  isBuiltIn: boolean;
  updatedAt: string;
}

interface BridgeStatusInfo {
  connected: boolean;
  url: string;
  error?: string | null;
}

const BUILT_IN_FALLBACKS: BridgeBuiltInSupplier[] = [
  { code: 'RZK', displayName: 'Rezeki Shop', isBuiltIn: true },
  { code: 'PDA', displayName: 'Prime Digital', isBuiltIn: true },
  { code: 'DAI', displayName: 'Digital AI Store', isBuiltIn: true },
];


interface ProductOption {
  id: string;
  name: string;
}

interface SupplierMapping {
  supplierCode: string;
  supplierProductId: string;
  productId: string;
  product?: { name: string } | null;
}

const PRESET_STANDARD_REST = {
  version: '1.0',
  auth: {
    type: 'API_KEY',
    headerName: 'X-API-KEY',
  },
  endpoints: {
    balance: {
      path: '/v1/balance',
      method: 'GET',
      responsePath: 'data.balance',
    },
    productList: {
      path: '/v1/products',
      method: 'GET',
      searchParam: 'search',
      responsePath: 'data.products',
      mapping: {
        id: 'code',
        name: 'name',
        price: 'price',
        stock: 'stock',
        availability: 'availability',
        requiresEmail: 'requires_email',
        description: 'description',
      },
    },
    order: {
      path: '/v1/order',
      method: 'POST',
      bodyTemplate: {
        product_id: '{productId}',
        quantity: '{qty}',
        email: '{email}',
        ref_id: '{transactionId}',
      },
      response: {
        orderIdPath: 'data.order_id',
        keysPath: 'data.keys',
        balanceBeforePath: 'data.balance.before',
        balanceDeductedPath: 'data.balance.spent',
        balanceAfterPath: 'data.balance.after',
      },
    },
  },
};

const PRESET_DIGIFLAZZ_LIKE = {
  version: '1.0',
  auth: {
    type: 'API_KEY',
    headerName: 'Authorization',
    headerPrefix: 'Bearer ',
  },
  endpoints: {
    balance: {
      path: '/v1/cek-saldo',
      method: 'POST',
      responsePath: 'data.deposit',
    },
    productList: {
      path: '/v1/price-list',
      method: 'POST',
      responsePath: 'data',
      mapping: {
        id: 'buyer_sku_code',
        name: 'product_name',
        price: 'price',
        stock: 'stock',
        availability: 'buyer_product_status',
      },
    },
    order: {
      path: '/v1/transaction',
      method: 'POST',
      bodyTemplate: {
        sku: '{productId}',
        customer_no: '{email}',
        ref_id: '{transactionId}',
      },
      response: {
        orderIdPath: 'data.trx_id',
        keysPath: 'data.sn',
      },
    },
  },
};

export default function SupplierManagementPage() {
  const [activeTab, setActiveTab] = useState<'dynamic' | 'mappings'>('dynamic');

  // Dynamic Suppliers State
  const [suppliers, setSuppliers] = useState<BridgeSupplier[]>([]);
  const [builtIns, setBuiltIns] = useState<BridgeBuiltInSupplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  // Mappings State
  const [mappings, setMappings] = useState<SupplierMapping[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(true);

  // Add Mapping Form State
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierProductId, setSupplierProductId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isSubmittingMapping, setIsSubmittingMapping] = useState(false);

  // Add Supplier Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [newAuthType, setNewAuthType] = useState('API_KEY');
  const [newApiKey, setNewApiKey] = useState('');
  const [newDescriptorStr, setNewDescriptorStr] = useState(
    JSON.stringify(PRESET_STANDARD_REST, null, 2)
  );
  const [isRegistering, setIsRegistering] = useState(false);

  // Inspect Descriptor Modal State
  const [inspectSupplier, setInspectSupplier] = useState<BridgeSupplier | null>(null);

  // Validating supplier state (code in progress)
  const [validatingCode, setValidatingCode] = useState<string | null>(null);

  // Balances & Bridge Status State
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatusInfo | null>(null);
  const [balances, setBalances] = useState<Record<string, SupplierBalanceInfo>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [refreshingBalanceCode, setRefreshingBalanceCode] = useState<string | null>(null);
  const [lastBalancesFetch, setLastBalancesFetch] = useState<Date | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchBalances = async (targetCode: string = 'ALL') => {
    if (targetCode === 'ALL') {
      setLoadingBalances(true);
    } else {
      setRefreshingBalanceCode(targetCode);
    }

    try {
      const res = await fetch(`/api/admin/suppliers?action=balances&code=${encodeURIComponent(targetCode)}`);
      const data = await res.json();
      if (data.balances) {
        setBalances((prev) => ({
          ...prev,
          ...data.balances,
        }));
        setLastBalancesFetch(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch supplier balances:', err);
    } finally {
      if (targetCode === 'ALL') {
        setLoadingBalances(false);
      } else {
        setRefreshingBalanceCode(null);
      }
    }
  };

  const fetchData = async () => {
    setLoadingSuppliers(true);
    setLoadingMappings(true);
    try {
      const res = await fetch('/api/admin/suppliers');
      const data = await res.json();
      if (data.mappings) setMappings(data.mappings);
      if (data.products) setProducts(data.products);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.builtIns) setBuiltIns(data.builtIns);
      if (data.bridgeStatus) setBridgeStatus(data.bridgeStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSuppliers(false);
      setLoadingMappings(false);
    }
    // Fetch balances in background
    fetchBalances('ALL');
  };

  const handleRegisterSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);

    try {
      let parsedDescriptor: any;
      try {
        parsedDescriptor = JSON.parse(newDescriptorStr);
      } catch {
        alert('Format JSON Descriptor tidak valid. Silakan periksa kembali tanda kurung/kutip.');
        setIsRegistering(false);
        return;
      }

      const res = await fetch('/api/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_supplier',
          code: newCode.toUpperCase(),
          displayName: newName,
          baseUrl: newBaseUrl,
          authType: newAuthType,
          credentials: { apiKey: newApiKey },
          descriptor: parsedDescriptor,
          validateImmediately: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Gagal mendaftarkan supplier');
        return;
      }

      if (data.validation) {
        if (data.validation.success) {
          alert(`✅ Supplier ${newCode} berhasil terdaftar dan divalidasi!\nSaldo terdeteksi: Rp${(data.validation.balance || 0).toLocaleString('id-ID')}\nProduk terbaca: ${data.validation.productCount || 0} item`);
        } else {
          alert(`⚠️ Supplier ${newCode} tersimpan tapi validasi gagal:\n${data.validation.error}\nStatus diset ke NEEDS_REVIEW.`);
        }
      }

      setIsModalOpen(false);
      setNewCode('');
      setNewName('');
      setNewBaseUrl('');
      setNewApiKey('');
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Error saat menghubungi server');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleToggleStatus = async (supplier: BridgeSupplier) => {
    const nextStatus = supplier.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: supplier.code,
          status: nextStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Gagal mengubah status');
        return;
      }

      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Error saat mengubah status');
    }
  };

  const handleValidateSupplier = async (code: string) => {
    setValidatingCode(code);
    try {
      const res = await fetch(`/api/admin/suppliers/${encodeURIComponent(code)}/validate`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.validation?.success) {
        alert(`✅ Validasi Berhasil untuk [${code}]!\nSaldo: Rp${(data.validation.balance || 0).toLocaleString('id-ID')}\nJumlah produk: ${data.validation.productCount || 0}`);
      } else {
        alert(`❌ Validasi Gagal untuk [${code}]:\n${data.validation?.error || data.error || 'Unknown error'}`);
      }
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Error menghubungi endpoint validasi');
    } finally {
      setValidatingCode(null);
    }
  };

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingMapping(true);

    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierCode,
          supplierProductId,
          productId: selectedProductId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Gagal menambahkan mapping');
        return;
      }

      setSupplierCode('');
      setSupplierProductId('');
      setSelectedProductId('');
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Error menambahkan mapping');
    } finally {
      setIsSubmittingMapping(false);
    }
  };

  const handleDeleteMapping = async (code: string, prodId: string) => {
    if (!confirm(`Hapus mapping ${code} - ${prodId}?`)) return;

    try {
      const res = await fetch(
        `/api/admin/suppliers?supplierCode=${encodeURIComponent(code)}&supplierProductId=${encodeURIComponent(prodId)}`,
        { method: 'DELETE' }
      );

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

  const renderStatusBadge = (status: BridgeSupplier['status']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Aktif (ACTIVE)
          </span>
        );
      case 'PENDING_VALIDATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Menunggu Validasi
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            Perlu Tinjauan
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            <PauseCircle className="w-3.5 h-3.5" />
            Dijeda (PAUSED)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page Title & Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-brand-500" />
            Manajemen Supplier & Integrasi (P2b)
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Daftarkan supplier eksternal dinamis dengan REST Descriptor atau atur mapping binding etalase produk.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-surface-card border border-surface-border p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('dynamic')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'dynamic'
                ? 'bg-brand-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Integrasi Supplier Dinamis
          </button>
          <button
            onClick={() => setActiveTab('mappings')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'mappings'
                ? 'bg-brand-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            Product Binding ({mappings.length})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INTEGRASI SUPPLIER DINAMIS (P2b Dynamic Engine & Descriptor)       */}
      {/* ========================================================================= */}
      {activeTab === 'dynamic' && (() => {
        const effectiveBuiltIns = builtIns.length > 0 ? builtIns : BUILT_IN_FALLBACKS;

        // Build unified list for balance monitoring
        const allSuppliersForBalance: Array<{
          code: string;
          displayName: string;
          isBuiltIn: boolean;
        }> = [
          ...effectiveBuiltIns.map((b) => ({
            code: b.code,
            displayName: b.displayName,
            isBuiltIn: true,
          })),
          ...suppliers.map((s) => ({
            code: s.code,
            displayName: s.displayName,
            isBuiltIn: false,
          })),
        ];

        // Ensure any dynamic suppliers returned in balances are also included
        const knownCodes = new Set(allSuppliersForBalance.map((s) => s.code));
        for (const code of Object.keys(balances)) {
          if (!knownCodes.has(code)) {
            const b = balances[code];
            allSuppliersForBalance.push({
              code: b.code,
              displayName: b.displayName,
              isBuiltIn: b.isBuiltIn,
            });
            knownCodes.add(code);
          }
        }

        return (
          <div className="space-y-6">
            {/* Bridge Connection Warning Banner */}
            {bridgeStatus && !bridgeStatus.connected && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                    <WifiOff className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">
                      VendingLink Bridge Belum Terhubung
                    </div>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      Service Bridge di <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-amber-200">{bridgeStatus.url}</code> tidak merespons.
                      Pendaftaran supplier dinamis memerlukan Bridge. Adapter bawaan (Rezeki Shop) tetap aktif via fallback Storefront.
                    </p>
                    {bridgeStatus.error && (
                      <p className="text-[11px] text-slate-400 mt-1 font-mono">
                        Detail: {bridgeStatus.error}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={fetchData}
                  disabled={loadingSuppliers}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-center"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSuppliers ? 'animate-spin' : ''}`} />
                  Coba Sambung Ulang
                </button>
              </div>
            )}

            {/* Quick Metrics & Action Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-surface-card rounded-xl border border-surface-border p-4">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Supplier</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {suppliers.length + effectiveBuiltIns.length}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {effectiveBuiltIns.length} Built-in | {suppliers.length} Dynamic
                </div>
              </div>

              <div className="bg-surface-card rounded-xl border border-surface-border p-4">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Aktif & Siap</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {suppliers.filter((s) => s.status === 'ACTIVE').length + effectiveBuiltIns.length}
                </div>
                <div className="text-xs text-slate-500 mt-1">Siap untuk procurement</div>
              </div>

              <div className="bg-surface-card rounded-xl border border-surface-border p-4">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Perlu Tinjauan</div>
                <div className="text-2xl font-bold text-rose-400 mt-1">
                  {suppliers.filter((s) => s.status === 'NEEDS_REVIEW').length}
                </div>
                <div className="text-xs text-slate-500 mt-1">Gagal ping / kredensial salah</div>
              </div>

              <div className="bg-surface-card rounded-xl border border-surface-border p-4 flex items-center justify-center">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full h-full bg-brand-500 text-black rounded-lg px-4 py-3 text-sm font-bold hover:bg-brand-400 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.02]"
                >
                  <Plus className="w-5 h-5" />
                  Tambah Supplier Baru
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* MULTI-SUPPLIER BALANCE MONITORING CARD                                     */}
            {/* ========================================================================= */}
            <div className="bg-surface-card rounded-xl border border-surface-border p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-500/10 rounded-xl border border-brand-500/20 text-brand-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      Monitoring Saldo Deposit Supplier
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pantau ketersediaan saldo deposit procurement secara real-time dari seluruh supplier terdaftar.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  {lastBalancesFetch && (
                    <span className="text-xs text-slate-500 hidden sm:inline">
                      Diperbarui: {lastBalancesFetch.toLocaleTimeString('id-ID')}
                    </span>
                  )}
                  <button
                    onClick={() => fetchBalances('ALL')}
                    disabled={loadingBalances}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/30 hover:bg-brand-500/20 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingBalances ? 'animate-spin' : ''}`} />
                    Segarkan Semua Saldo
                  </button>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {allSuppliersForBalance.map((s) => {
                  const bInfo = balances[s.code];
                  const isRefreshing = refreshingBalanceCode === s.code || (loadingBalances && !bInfo);
                  const balance = bInfo?.balance;
                  const isLow = balance !== null && balance !== undefined && balance < 20000;

                  return (
                    <div
                      key={s.code}
                      className={`relative bg-surface-base/90 rounded-xl p-4 border transition-all flex flex-col justify-between ${
                        isLow && balance !== null
                          ? 'border-amber-500/40 bg-amber-500/[0.02]'
                          : bInfo?.status === 'ERROR'
                          ? 'border-rose-500/40 bg-rose-500/[0.02]'
                          : 'border-surface-border hover:border-slate-600'
                      }`}
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">
                              {s.displayName}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              s.isBuiltIn
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            }`}>
                              {s.code}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {s.isBuiltIn ? 'Built-in Adapter' : 'Dynamic Descriptor'}
                          </span>
                        </div>

                        <button
                          onClick={() => fetchBalances(s.code)}
                          disabled={isRefreshing}
                          title={`Segarkan saldo ${s.displayName}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-400' : ''}`} />
                        </button>
                      </div>

                      {/* Middle row: Balance Amount */}
                      <div className="my-2">
                        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-1">
                          Saldo Deposit
                        </div>

                        {isRefreshing && !bInfo ? (
                          <div className="py-2 flex items-center gap-2 text-slate-400 text-xs">
                            <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                            <span>Memeriksa saldo...</span>
                          </div>
                        ) : bInfo?.status === 'CONFIG_IN_BRIDGE' ? (
                          <div className="space-y-1 py-1">
                            <div className="text-slate-400 text-sm font-medium flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-slate-500" />
                              Belum Dikonfigurasi
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Kredensial adapter perlu diisi di Bridge (.env / config)
                            </p>
                          </div>
                        ) : bInfo?.status === 'ERROR' ? (
                          <div className="space-y-1 py-1">
                            <div className="text-rose-400 text-sm font-semibold flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                              Gagal Membaca Saldo
                            </div>
                            <p className="text-[11px] text-rose-300/80 line-clamp-2" title={bInfo.error || ''}>
                              {bInfo.error || 'Periksa API Key / koneksi ke supplier'}
                            </p>
                          </div>
                        ) : balance !== null && balance !== undefined ? (
                          <div>
                            <div className={`text-2xl font-bold font-mono tracking-tight ${
                              isLow ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              Rp {balance.toLocaleString('id-ID')}
                            </div>

                            {isLow && (
                              <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                Saldo Rendah (&lt; Rp 20.000)
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-500 text-sm py-1">—</div>
                        )}
                      </div>

                      {/* Bottom row: Helper Info & Status */}
                      <div className="mt-3 pt-3 border-t border-surface-border/60 flex items-center justify-between text-[11px]">
                        {s.code === 'RZK' ? (
                          <span className="text-slate-400 flex items-center gap-1">
                            <span>Top up:</span>
                            <code className="text-brand-400 font-mono">@rezeki_shop_bot</code>
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            {bInfo?.updatedAt ? `Update: ${new Date(bInfo.updatedAt).toLocaleTimeString('id-ID')}` : 'Belum dicek'}
                          </span>
                        )}

                        <div>
                          {bInfo?.status === 'OK' && (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              Siap
                            </span>
                          )}
                          {bInfo?.status === 'LOW' && (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                              <AlertTriangle className="w-3 h-3" />
                              Perlu Top Up
                            </span>
                          )}
                          {bInfo?.status === 'ERROR' && (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                              <AlertCircle className="w-3 h-3" />
                              Error
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tips footer */}
              <div className="bg-surface-base/60 rounded-lg p-3 border border-surface-border/50 text-xs text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-400 shrink-0" />
                <span>
                  <strong>Info Saldo:</strong> Saldo supplier dipotong secara otomatis saat pesanan pelanggan diproses. Saldo Rezeki Shop terbaca langsung melalui konfigurasi <code>REZEKI_API_KEY</code> atau adapter Bridge.
                </span>
              </div>
            </div>

          {/* Dynamic Suppliers Table */}
          <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-white">Daftar Supplier Dinamis (Bridge DB)</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Supplier didaftarkan secara runtime tanpa perlu rebuild Docker atau deploy ulang.
                </p>
              </div>
              <button
                onClick={fetchData}
                disabled={loadingSuppliers}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSuppliers ? 'animate-spin' : ''}`} />
                Segarkan
              </button>
            </div>

            {loadingSuppliers ? (
              <div className="p-8 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              </div>
            ) : suppliers.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="text-slate-300 font-medium">Belum ada supplier dinamis</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Klik tombol <strong>&quot;Tambah Supplier Baru&quot;</strong> di atas untuk mendaftarkan supplier via REST Descriptor.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-base/50 text-xs uppercase tracking-wider text-slate-400 border-b border-surface-border">
                      <th className="px-5 py-3 font-medium">Supplier</th>
                      <th className="px-5 py-3 font-medium">Base URL</th>
                      <th className="px-5 py-3 font-medium">Auth</th>
                      <th className="px-5 py-3 font-medium">Status Validasi</th>
                      <th className="px-5 py-3 font-medium text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-sm">
                    {suppliers.map((s) => (
                      <tr key={s.code} className="hover:bg-surface-base/50 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-200">{s.displayName}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                              {s.code}
                            </span>
                            <span className="text-xs text-slate-500">
                              Kredensial: {s.credentialsMasked}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-300 font-mono text-xs">
                          <span className="truncate max-w-[200px] inline-block" title={s.baseUrl}>
                            {s.baseUrl}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">
                            {s.authType}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            {renderStatusBadge(s.status)}
                            {s.lastError && (
                              <div
                                className="text-[11px] text-rose-400 max-w-xs truncate cursor-help"
                                title={s.lastError}
                              >
                                {s.lastError}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-right space-x-2">
                          <button
                            onClick={() => handleValidateSupplier(s.code)}
                            disabled={validatingCode === s.code}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
                            title="Lakukan Dry-Run Validasi (Cek Saldo & Produk)"
                          >
                            {validatingCode === s.code ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5 text-brand-400" />
                            )}
                            Uji
                          </button>

                          <button
                            onClick={() => handleToggleStatus(s)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                            title={s.status === 'PAUSED' ? 'Aktifkan Supplier' : 'Jeda Supplier'}
                          >
                            {s.status === 'PAUSED' ? (
                              <>
                                <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                                Aktifkan
                              </>
                            ) : (
                              <>
                                <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                                Jeda
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => setInspectSupplier(s)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                            title="Lihat Descriptor JSON"
                          >
                            <Code className="w-3.5 h-3.5 text-cyan-400" />
                            Descriptor
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Built-in Adapters Card */}
          <div className="bg-surface-card rounded-xl border border-surface-border p-5">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Built-In Adapters (Static Fallback)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Adapter bawaan yang dikompilasi langsung di codebase Bridge sebagai fallback bawaan:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {effectiveBuiltIns.map((b) => (
                <div
                  key={b.code}
                  className="p-3 rounded-lg bg-surface-base border border-surface-border flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-200 text-sm">{b.displayName}</div>
                    <div className="text-xs text-slate-500 font-mono">Kode: {b.code}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    BUILT-IN
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    })()}

      {/* ========================================================================= */}
      {/* TAB 2: PRODUCT MAPPINGS (Binding Etalase VendingLink)                      */}
      {/* ========================================================================= */}
      {activeTab === 'mappings' && (
        <div className="space-y-6">
          {/* Add New Binding Form */}
          <div className="bg-surface-card rounded-xl border border-surface-border p-5">
            <h2 className="text-lg font-medium text-white mb-4">Tambah Binding Baru</h2>
            <form onSubmit={handleAddMapping} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Kode Supplier (mis. RZK, DGF)
                </label>
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
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Etalase VendingLink Tujuan
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="">-- Pilih Etalase --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isSubmittingMapping}
                  className="w-full bg-brand-500 text-black rounded-lg px-4 py-2 text-sm font-semibold hover:bg-brand-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-brand-500 disabled:opacity-50 flex justify-center items-center gap-2 transition-colors"
                >
                  {isSubmittingMapping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
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

            {loadingMappings ? (
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
                        <tr
                          key={`${m.supplierCode}-${m.supplierProductId}`}
                          className="hover:bg-surface-base/50 transition-colors"
                        >
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                              {m.supplierCode}
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-slate-200 font-mono text-xs">
                            {m.supplierProductId}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="font-medium text-slate-200">
                              {m.product?.name || 'Produk Tidak Ditemukan'}
                            </div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{m.productId}</div>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleDeleteMapping(m.supplierCode, m.supplierProductId)}
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
      )}

      {/* ========================================================================= */}
      {/* MODAL: DAFTARKAN SUPPLIER BARU (P2b Dynamic JSON Descriptor)              */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-2xl w-full p-6 space-y-5 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-brand-500" />
                  Tambah Supplier Dinamis Baru
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kredensial otomatis dienkripsi dengan AES-256-GCM di Bridge server.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSupplier} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kode Supplier (Huruf/Angka Unik)
                  </label>
                  <input
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    placeholder="DGF"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Tampilan Supplier
                  </label>
                  <input
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    placeholder="Digiflazz Reseller"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Base URL API Supplier
                  </label>
                  <input
                    required
                    type="url"
                    value={newBaseUrl}
                    onChange={(e) => setNewBaseUrl(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    placeholder="https://api.supplier.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jenis Autentikasi
                  </label>
                  <select
                    value={newAuthType}
                    onChange={(e) => setNewAuthType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="API_KEY">API_KEY (Header)</option>
                    <option value="BEARER">BEARER (Token)</option>
                    <option value="BASIC">BASIC (User/Pass)</option>
                    <option value="CUSTOM">CUSTOM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  API Key / Secret / Token
                </label>
                <input
                  required
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-600"
                  placeholder="Masukkan API Key rahasia supplier..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    JSON Descriptor Endpoints & Mappings
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Pilih Template:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value === 'standard') {
                          setNewDescriptorStr(JSON.stringify(PRESET_STANDARD_REST, null, 2));
                        } else if (e.target.value === 'digiflazz') {
                          setNewDescriptorStr(JSON.stringify(PRESET_DIGIFLAZZ_LIKE, null, 2));
                        }
                      }}
                      className="bg-slate-800 border border-slate-700 text-white text-[11px] rounded px-2 py-1"
                    >
                      <option value="standard">Standard REST Preset</option>
                      <option value="digiflazz">Digiflazz-like Preset</option>
                    </select>
                  </div>
                </div>
                <textarea
                  required
                  rows={9}
                  value={newDescriptorStr}
                  onChange={(e) => setNewDescriptorStr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs rounded-lg p-3 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  spellCheck={false}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="bg-brand-500 text-black rounded-lg px-5 py-2 text-sm font-bold hover:bg-brand-400 disabled:opacity-50 flex items-center gap-2 transition-all shadow-md shadow-brand-500/20"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memvalidasi Dry-Run...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Uji & Daftarkan Supplier
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INSPECT DESCRIPTOR JSON                                            */}
      {/* ========================================================================= */}
      {inspectSupplier && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Code className="w-4 h-4 text-brand-500" />
                  Descriptor: {inspectSupplier.displayName} ({inspectSupplier.code})
                </h3>
              </div>
              <button
                onClick={() => setInspectSupplier(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-xl text-emerald-400 text-xs font-mono overflow-auto max-h-96 border border-slate-800">
              {JSON.stringify(inspectSupplier.descriptor, null, 2)}
            </pre>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectSupplier(null)}
                className="px-4 py-2 rounded-lg text-sm bg-slate-800 text-white hover:bg-slate-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
