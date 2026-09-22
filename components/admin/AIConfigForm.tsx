"use client";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, Check, X, Zap, Globe } from "lucide-react";

interface AIConfigStatus {
  hasGeminiKey: boolean;
  hasAnthropicKey: boolean;
  hasCustomChatKey: boolean;
  hasCustomDescriptionKey: boolean;
  customChatBaseUrl: string;
  customChatModel: string;
  customDescriptionBaseUrl: string;
  customDescriptionModel: string;
}

export default function AIConfigForm() {
  const [geminiKey, setGeminiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  
  // Custom Chat Provider
  const [customChatBaseUrl, setCustomChatBaseUrl] = useState("");
  const [customChatApiKey, setCustomChatApiKey] = useState("");
  const [customChatModel, setCustomChatModel] = useState("");
  
  // Custom Description Provider
  const [customDescriptionBaseUrl, setCustomDescriptionBaseUrl] = useState("");
  const [customDescriptionApiKey, setCustomDescriptionApiKey] = useState("");
  const [customDescriptionModel, setCustomDescriptionModel] = useState("");
  
  const [showKeys, setShowKeys] = useState({ 
    gemini: false, 
    anthropic: false,
    customChat: false,
    customDescription: false
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<"gemini" | "anthropic" | null>(null);
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
      if (data.customChatBaseUrl) setCustomChatBaseUrl(data.customChatBaseUrl);
      if (data.customChatModel) setCustomChatModel(data.customChatModel);
      if (data.customDescriptionBaseUrl) setCustomDescriptionBaseUrl(data.customDescriptionBaseUrl);
      if (data.customDescriptionModel) setCustomDescriptionModel(data.customDescriptionModel);
    } catch (e) {
      console.error(e);
    }
  };

  const testConnection = async (provider: "gemini" | "anthropic") => {
    const apiKey = provider === "gemini" ? geminiKey : anthropicKey;
    if (!apiKey) {
      setMessage({ type: "error", text: `Masukkan ${provider} API key` });
      return;
    }
    setTesting(provider);
    try {
      const res = await fetch("/api/admin/ai-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = await res.json();
      setMessage({ type: data.valid ? "success" : "error", text: data.message });
    } catch (e) {
      setMessage({ type: "error", text: "Kesalahan" });
    } finally {
      setTesting(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geminiApiKey: geminiKey || null,
          anthropicApiKey: anthropicKey || null,
          customChatBaseUrl: customChatBaseUrl || null,
          customChatApiKey: customChatApiKey || null,
          customChatModel: customChatModel || null,
          customDescriptionBaseUrl: customDescriptionBaseUrl || null,
          customDescriptionApiKey: customDescriptionApiKey || null,
          customDescriptionModel: customDescriptionModel || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal" });
      } else {
        setMessage({ type: "success", text: data.message });
        setGeminiKey("");
        setAnthropicKey("");
        setCustomChatApiKey("");
        setCustomDescriptionApiKey("");
        await loadStatus();
      }
    } catch (e) {
      setMessage({ type: "error", text: "Error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Gemini */}
      <div className="bg-surface border border-surface-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap size={20} className="text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Google Gemini</h3>
            <p className="text-sm text-slate-400">AI Chatbot</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-2">API Key</label>
            <div className="relative">
              <input
                type={showKeys.gemini ? "text" : "password"}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy-..."
                className="w-full px-4 py-2.5 bg-surface-input border border-surface-border rounded-lg text-slate-100 placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowKeys((p) => ({ ...p, gemini: !p.gemini }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showKeys.gemini ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {status?.hasGeminiKey && <p className="text-xs text-green-400 mt-1">✓ Configured</p>}
          </div>
          <button
            type="button"
            onClick={() => testConnection("gemini")}
            disabled={testing === "gemini"}
            className="w-full px-3 py-2 bg-blue-600/20 text-blue-400 text-sm rounded-lg hover:bg-blue-600/30 transition-colors disabled:opacity-50"
          >
            {testing === "gemini" ? "Testing..." : "Test Connection"}
          </button>
        </div>
      </div>

      {/* Anthropic */}
      <div className="bg-surface border border-surface-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap size={20} className="text-orange-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Anthropic Claude</h3>
            <p className="text-sm text-slate-400">Generate Deskripsi Produk & Sales Insight</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-2">API Key</label>
            <div className="relative">
              <input
                type={showKeys.anthropic ? "text" : "password"}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-4 py-2.5 bg-surface-input border border-surface-border rounded-lg text-slate-100 placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowKeys((p) => ({ ...p, anthropic: !p.anthropic }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showKeys.anthropic ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {status?.hasAnthropicKey && <p className="text-xs text-green-400 mt-1">✓ Configured</p>}
          </div>
          <button
            type="button"
            onClick={() => testConnection("anthropic")}
            disabled={testing === "anthropic"}
            className="w-full px-3 py-2 bg-orange-600/20 text-orange-400 text-sm rounded-lg hover:bg-orange-600/30 transition-colors disabled:opacity-50"
          >
            {testing === "anthropic" ? "Testing..." : "Test Connection"}
          </button>
        </div>
      </div>

      {/* Custom Chat Provider */}
      <div className="bg-surface border border-surface-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe size={20} className="text-purple-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Custom Chat Provider</h3>
            <p className="text-sm text-slate-400">OpenRouter, 9Router, atau OpenAI-compatible API lainnya</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-2">Base URL</label>
            <input
              type="url"
              value={customChatBaseUrl}
              onChange={(e) => setCustomChatBaseUrl(e.target.value)}
              placeholder="https://toko.txsiber.online/v1"
              className="w-full px-4 py-2.5 bg-surface-input border border-surface-border rounded-lg text-slate-100 placeholder:text-slate-500"
            />
            {status?.customChatBaseUrl && <p className="text-xs text-green-400 mt-1">✓ {status.customChatBaseUrl}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-2">API Key</label>
            <div className="relative">
              <input
                type={showKeys.customChat ? "text" : "password"}
                value={customChatApiKey}
                onChange={(e) => setCustomChatApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2.5 bg-surface-input border border-surface-border rounded-lg text-slate-100 placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowKeys((p) => ({ ...p, customChat: !p.customChat }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showKeys.customChat ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {status?.hasCustomChatKey && <p className="text-xs text-green-400 mt-1">✓ Configured</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-2">Model Name</label>
            <input
              type="text"
              value={customChatModel}
              onChange={(e) => setCustomChatModel(e.target.value)}
              placeholder="kr/claude-sonnet-4.5"
              className="w-full px-4 py-2.5 bg-surface-input border border-surface-border rounded-lg text-slate-100 placeholder:text-slate-500"
            />
            {status?.customChatModel && <p className="text-xs text-slate-400 mt-1">Current: {status.customChatModel}</p>}
          </div>
        </div>
      </div>

      {/* Custom Description Provider */}
      <div className="bg-surface border border-surface-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe size={20} className="text-cyan-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Custom Description Provider</h3>
            <p className="text-sm text-slate-400">API untuk generate deskripsi produk (opsional, default pakai Claude)</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-2">Base URL</label>
            <input
              type="url"
              value={customDescriptionBaseUrl}
              onChange={(e) => setCustomDescriptionBaseUrl(e.target.value)}
              placeholder="https://toko.txsiber.online/v1"
              className="w-full px-4 py-2.5 bg-surface-input border border-surface-border rounded-lg text-slate-100 placeholder:text-slate-500"
            />
            {status?.customDescriptionBaseUrl && <p className="text-xs text-green-400 mt-1">✓ {status.customDescriptionBaseUrl}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-2">API Key</label>
            <div className="relative">
              <input
                type={showKeys.customDescription ? "text" : "password"}
                value={customDescriptionApiKey}
                onChange={(e) => setCustomDescriptionApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2.5 bg-surface-input border border-surface-border rounded-lg text-slate-100 placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowKeys((p) => ({ ...p, customDescription: !p.customDescription }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showKeys.customDescription ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {status?.hasCustomDescriptionKey && <p className="text-xs text-green-400 mt-1">✓ Configured</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-2">Model Name</label>
            <input
              type="text"
              value={customDescriptionModel}
              onChange={(e) => setCustomDescriptionModel(e.target.value)}
              placeholder="kr/claude-sonnet-4.5"
              className="w-full px-4 py-2.5 bg-surface-input border border-surface-border rounded-lg text-slate-100 placeholder:text-slate-500"
            />
            {status?.customDescriptionModel && <p className="text-xs text-slate-400 mt-1">Current: {status.customDescriptionModel}</p>}
          </div>
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
