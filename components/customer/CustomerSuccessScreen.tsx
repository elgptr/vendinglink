"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle, Copy, Check, ShoppingBag, ExternalLink, ImageIcon, AlertTriangle } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { formatRupiah, formatDate } from "@/lib/utils";
import Button from "@/components/ui/Button";
import toast from "@/components/ui/Toast";
import Card from "@/components/ui/Card";

interface CustomerSuccessScreenProps {
  redeemUrl: string;
  guideImageUrl?: string | null;
  guideText?: string | null;
  productType?: string | null;
  productName: string;
  amount: number;
  customerName?: string | null;
  paidAt?: string | null;
}

export default function CustomerSuccessScreen({
  redeemUrl,
  guideImageUrl,
  guideText,
  productType,
  productName,
  amount,
  customerName,
  paidAt,
}: CustomerSuccessScreenProps) {
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const isKode = productType === "KODE";

  useEffect(() => {
    // Trigger animation after mount for a spectacular entrance
    setTimeout(() => setAnimateIn(true), 100);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(redeemUrl);
      setCopied(true);
      toast.success(isKode ? "Kode berhasil disalin ke clipboard!" : "Link berhasil disalin ke clipboard!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = redeemUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success(isKode ? "Kode berhasil disalin!" : "Link berhasil disalin!");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className={`max-w-2xl mx-auto transition-all duration-700 transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
      
      {/* Spectacular Success Banner */}
      <div className="text-center mb-10 mt-8">
        <div className="relative inline-flex items-center justify-center w-28 h-28 mb-6">
          <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute inset-2 rounded-full bg-brand-500/30 animate-pulse" />
          <div className="relative w-28 h-28 rounded-full bg-brand-500/20 border-4 border-brand-400 flex items-center justify-center shadow-[0_0_50px_rgba(229,244,74,0.4)]">
            <CheckCircle size={56} className="text-brand-400" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">
          Pembayaran <span className="text-brand-400">Sukses!</span>
        </h1>
        <p className="text-lg text-slate-400">
          {isKode ? "Kode redeem Anda telah siap digunakan" : "Link produk digital Anda telah siap diakses"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Left Col: Important Link & Warning */}
        <div className="md:col-span-3 space-y-6">
          
          {/* SIMPAN LINK INI Warning Box */}
          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={24} />
              <div>
                <h3 className="text-lg font-bold text-amber-400 mb-1 tracking-tight">SIMPAN {isKode ? "KODE" : "LINK"} INI!</h3>
                <p className="text-sm text-amber-200/80 leading-relaxed">
                  Kami tidak mengirimkan salinan via email/WhatsApp. Jika Anda kehilangan halaman ini, Anda akan kehilangan akses ke produk. <strong>Harap salin (copy) sekarang.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Redeem link box */}
          <Card className="p-6 border-brand-500/40" glow>
            <p className="text-sm font-bold text-brand-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <ExternalLink size={16} />
              {isKode ? "KODE AKSES ANDA" : "LINK AKSES ANDA"}
            </p>

            <div className="bg-surface rounded-xl p-5 mb-5 border border-surface-border shadow-inner">
              <p
                id="customer-redeem-url-text"
                className="text-base text-white font-mono break-all leading-relaxed select-all"
              >
                {redeemUrl}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                id="customer-copy-link-btn"
                variant={copied ? "success" : "primary"}
                size="xl"
                className="flex-1 font-bold"
                onClick={handleCopy}
                icon={copied ? <Check size={20} /> : <Copy size={20} />}
              >
                {copied ? "Tersalin!" : (isKode ? "Salin Kode Sekarang" : "Salin Link Sekarang")}
              </Button>

              {!isKode && (
                <a href={redeemUrl} target="_blank" rel="noopener noreferrer" id="customer-open-link-btn" className="flex-1">
                  <Button variant="secondary" size="xl" className="w-full font-bold" icon={<ExternalLink size={20} />}>
                    Buka Langsung
                  </Button>
                </a>
              )}
            </div>

            <div className="mt-4">
              <a 
                href={`https://wa.me/?text=Hai,%20saya%20baru%20saja%20membeli%20${encodeURIComponent(productName)}.%20Cek%20pesanannya%20di%20sini:%20${encodeURIComponent(redeemUrl)}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="md" className="w-full text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
                  Bagikan ke WhatsApp
                </Button>
              </a>
            </div>

            {!isKode && (
              <div className="mt-6 flex flex-col items-center justify-center p-4 bg-surface rounded-xl border border-surface-border">
                <p className="text-xs text-slate-400 mb-3 text-center">Buka di Desktop? Scan QR ini pakai HP Anda untuk langsung membuka link</p>
                <div className="p-2 bg-white rounded-lg">
                  <QRCodeCanvas value={redeemUrl} size={140} level="M" includeMargin={false} />
                </div>
              </div>
            )}

            {(guideText || guideImageUrl) && (
              <div className="mt-5 pt-5 border-t border-surface-border">
                <Button
                  id="customer-show-guide-btn"
                  variant="ghost"
                  size="md"
                  className="w-full text-slate-300 hover:text-white border border-surface-border-light bg-surface-hover/30"
                  icon={<ImageIcon size={18} />}
                  onClick={() => setShowGuide(true)}
                >
                  Lihat Cara Penggunaan
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Receipt */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 bg-surface-card/60 backdrop-blur">
            <h3 className="font-semibold text-white mb-4 border-b border-surface-border pb-3">Resi Pembelian</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Produk</p>
                <p className="text-sm text-slate-200 font-medium">{productName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Total Bayar</p>
                <p className="text-lg text-brand-400 font-bold">{formatRupiah(amount)}</p>
              </div>
              {customerName && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Nama Pembeli</p>
                  <p className="text-sm text-slate-300">{customerName}</p>
                </div>
              )}
              {paidAt && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Waktu Transaksi</p>
                  <p className="text-sm text-slate-300">{formatDate(paidAt)}</p>
                </div>
              )}
            </div>

            {/* Order again */}
            <div className="mt-8 pt-4 border-t border-surface-border">
              <Link href="/customer">
                <Button
                  id="customer-order-again-btn"
                  variant="ghost"
                  size="sm"
                  className="w-full text-slate-400 hover:text-slate-200"
                  icon={<ShoppingBag size={16} />}
                >
                  Kembali ke Katalog
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Guide Modal */}
      {(guideText || guideImageUrl) && showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-card">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <ImageIcon size={18} className="text-brand-400" />
                Cara Penggunaan
              </h3>
              <button 
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-surface-hover transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {guideText && (
                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap bg-surface p-4 rounded-xl border border-surface-border">
                  {guideText}
                </div>
              )}
              
              {guideImageUrl && (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={guideImageUrl}
                    alt="Panduan Penggunaan"
                    className="w-full rounded-xl border border-surface-border shadow-lg"
                  />
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-surface-border bg-surface-card text-right">
              <Button onClick={() => setShowGuide(false)} size="md">
                Tutup Panduan
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
