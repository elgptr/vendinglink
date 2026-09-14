"use client";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, Check, X, Zap } from "lucide-react";

interface AIConfigStatus {
  hasGeminiKey: boolean;
  hasAnthropicKey: boolean;
}

export default function AIConfigForm() {
  const [geminiKey, setGeminiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [showKeys, setShowKeys] = useState({ gemini: false, anthropic: false });
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal" });
      } else {
        setMessage({ type: "success", text: data.message });
        setGeminiKey("");
        setAnthropicKey("");
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
      <div className="bg-surface-card border border-surface-border rounded-xl p-6">
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
                className="w-full px-4 py-2.5 bg-surface-input border border-surface-border rounded-lg text-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowKeys((p) => ({ ...p, gemini: !p.gemini }))}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showKeys.gemini ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {status?.hasGeminiKey && <p className="text-xs text-green-400">✓ Configured</p>}
          </div>
          <button
            type="button"
            onClick={() => testConnection("gemini")}
            disabled={testing === "gemini"}
            className="w-full px-3 py-2 bg-blue-600/20 text-blue-400 text-sm rounded-lg"
          >
            Test
          </button>
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap size={20} className="text-orange-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Anthropic Claude</h3>
            <p className="text-sm text-slate-400">Deskripsi & Insight</p>
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
                className="w-full px-4 py-2.5 bg-surface-input border border-surface-border rounded-lg text-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowKeys((p) => ({ ...p, anthropic: !p.anthropic }))}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showKeys.anthropic ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {status?.hasAnthropicKey && <p className="text-xs text-green-400">✓ Configured</p>}
          </div>
          <button
            type="button"
            onClick={() => testConnection("anthropic")}
            disabled={testing === "anthropic"}
            className="w-full px-3 py-2 bg-orange-600/20 text-orange-400 text-sm rounded-lg"
          >
            Test
          </button>
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

      <button type="submit" disabled={loading} className="w-full px-4 py-2.5 bg-purple-600 text-white font-medium rounded-lg">
        {loading ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
