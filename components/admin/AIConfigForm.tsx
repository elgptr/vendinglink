"use client";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, Check, X, Globe } from "lucide-react";

interface AIConfigStatus {
  hasApiKey: boolean;
  baseUrl: string;
  chatModel: string;
  descriptionModel: string;
}

export default function AIConfigForm() {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [chatModel, setChatModel] = useState("");
  const [descriptionModel, setDescriptionModel] = useState("");
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [status, setStatus] = useState<AIConfigStatus | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/admin/ai-config");
      const data = await res.json();
      setStatus(data);
      
      // Pre-fill existing config
      if (data.baseUrl) setBaseUrl(data.baseUrl);
      if (data.chatModel) setChatModel(data.chatModel);
      if (data.descriptionModel) setDescriptionModel(data.descriptionModel);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!baseUrl) {
      setMessage({ type: "error", text: "Base URL wajib diisi" });
      return;
    }
    if (!apiKey && !status?.hasApiKey) {
      setMessage({ type: "error", text: "API Key wajib diisi" });
      return;
    }
    if (!chatModel) {
      setMessage({ type: "error", text: "Chat Model wajib diisi" });
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrl || null,
          apiKey: apiKey || null,
          chatModel: chatModel || null,
          descriptionModel: descriptionModel || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal menyimpan" });
      } else {
        setMessage({ type: "success", text: data.message });
        setApiKey(""); // Clear input setelah save
        await loadStatus();
      }
    } catch (e) {
      setMessage({ type: "error", text: "Server error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-surface border border-surface-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Globe size={24} className="text-purple-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Custom AI Provider</h3>
            <p className="text-sm text-slate-400">OpenRouter, 9Router, atau OpenAI-compatible API lainnya</p>
          </div>
        </div>
        
        <div className="space-y-5">
          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-2">
              Base URL <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://toko.txsiber.online/v1"
              required
              className="w-full px-4 py-2.5 bg-surface-input border border-surface-border rounded-lg text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
            />
            {status?.baseUrl && (
              <p className="text-xs text-green-400 mt-1.5 flex items-center gap-1.5">
                <Check size={14} />
                Current: {status.baseUrl}
              </p>
            )}
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-2">
              API Key <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={status?.hasApiKey ? "••••••••••••••••" : "sk-..."}
                className="w-full px-4 py-2.5 pr-12 bg-surface-input border border-surface-border rounded-lg text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {status?.hasApiKey && (
              <p className="text-xs text-green-400 mt-1.5 flex items-center gap-1.5">
                <Check size={14} />
                API key tersimpan (kosongkan jika tidak ingin mengubah)
              </p>
            )}
          </div>

          <div className="border-t border-surface-border pt-5">
            <h4 className="text-sm font-semibold text-slate-200 mb-4">Model Configuration</h4>
            
            {/* Chat Model */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-100 mb-2">
                Chat Model <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={chatModel}
                onChange={(e) => setChatModel(e.target.value)}
                placeholder="kr/claude-sonnet-4.5"
                required
                className="w-full px-4 py-2.5 bg-surface-input border border-surface-border rounded-lg text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Digunakan untuk AI chatbot customer & agent
              </p>
            </div>

            {/* Description Model */}
            <div>
              <label className="block text-sm font-medium text-slate-100 mb-2">
                Description Model (opsional)
              </label>
              <input
                type="text"
                value={descriptionModel}
                onChange={(e) => setDescriptionModel(e.target.value)}
                placeholder="kr/claude-sonnet-4.5"
                className="w-full px-4 py-2.5 bg-surface-input border border-surface-border rounded-lg text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Untuk generate deskripsi produk & sales insight (default: sama dengan chat model)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Example Config */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-sm font-medium text-blue-300 mb-2">💡 Contoh Konfigurasi 9Router:</p>
        <div className="text-xs font-mono text-blue-200 space-y-1">
          <div>Base URL: <span className="text-white">https://toko.txsiber.online/v1</span></div>
          <div>API Key: <span className="text-white">sk-f8fc05bca71b0e5e4ecc...</span></div>
          <div>Chat Model: <span className="text-white">kr/auto</span> atau <span className="text-white">kr/claude-sonnet-4.5</span></div>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
          message.type === "success"
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {message.type === "success" ? <Check size={18} /> : <X size={18} />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      <button 
        type="submit" 
        disabled={loading} 
        className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={18} className="animate-spin" />}
        {loading ? "Menyimpan..." : "Simpan Konfigurasi"}
      </button>
    </form>
  );
}
