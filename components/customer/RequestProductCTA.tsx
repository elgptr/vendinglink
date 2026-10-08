"use client";

import { useState } from "react";
import { Package, Send, CheckCircle2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Input, { Textarea } from "@/components/ui/Input";

export default function RequestProductCTA() {
  const [isOpen, setIsOpen] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [requestText, setRequestText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/request-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customerPhone, requestText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Terjadi kesalahan.");
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
        setCustomerPhone("");
        setRequestText("");
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="mt-8 bg-brand-500/10 border border-brand-500/20 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 animate-slide-up hover:border-brand-500/40 transition-colors">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Produk yang Anda cari habis atau tidak ada?</h3>
          <p className="text-slate-400 text-sm">Jangan ragu, hubungi admin kami untuk memesan produk spesifik yang Anda butuhkan secara langsung.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex-shrink-0 bg-brand-500 hover:bg-brand-400 text-black font-bold py-3 px-6 rounded-xl transition-all hover:scale-105 hover:shadow-glow shadow-brand-500/50 flex items-center gap-2"
        >
          <Package size={18} />
          Request Produk
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-card border border-surface-border p-6 rounded-2xl w-full max-w-md shadow-2xl relative animate-scale-in">
            <button
              onClick={() => !isSubmitting && setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              <X size={20} />
            </button>

            {isSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Permintaan Terkirim!</h3>
                <p className="text-slate-400 text-sm">Admin kami akan segera menghubungi Anda melalui WhatsApp.</p>
              </div>
            ) : (
              <>
                <div className="mb-6 pr-8">
                  <h3 className="text-xl font-bold text-white mb-1">Request Produk</h3>
                  <p className="text-sm text-slate-400">Silakan isi form di bawah, admin kami akan segera menghubungi Anda.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Nomor WhatsApp Anda"
                    placeholder="Contoh: 08123456789"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />

                  <Textarea
                    label="Detail Permintaan Produk"
                    placeholder="Saya ingin request berlangganan XYZ selama 1 tahun..."
                    value={requestText}
                    onChange={(e) => setRequestText(e.target.value)}
                    rows={4}
                    required
                    disabled={isSubmitting}
                  />

                  {error && <p className="text-red-400 text-sm font-medium bg-red-500/10 p-2 rounded">{error}</p>}

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full flex items-center justify-center gap-2"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    {!isSubmitting && <Send size={16} />}
                    Kirim Permintaan
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
