"use client";

import { useState, useEffect } from "react";
import { Save, AlertCircle, CheckCircle2, HardDrive } from "lucide-react";

interface GoogleDriveConfig {
  clientEmail: string;
  privateKey: string;
  folderId: string;
  isActive: boolean;
}

export default function GoogleDriveSettingsCard() {
  const [data, setData] = useState<GoogleDriveConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/google-drive-config");
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error("Fetch Google Drive config error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!data) return;
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch("/api/admin/google-drive-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: result.message });
        await fetchSettings();
      } else {
        setMessage({ type: "error", text: result.error || "Gagal menyimpan konfigurasi" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Terjadi kesalahan jaringan" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-surface-card h-64 rounded-xl border border-surface-border" />;
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-brand-500/10 rounded-lg">
          <HardDrive className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Google Drive Export</h2>
          <p className="text-sm text-slate-400">
            Atur kredensial Service Account untuk mengekspor laporan ke Google Drive otomatis.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg mb-6 flex items-start gap-3 ${
            message.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 mb-4 cursor-pointer group w-fit">
            <div
              className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                data?.isActive ? "bg-brand-500" : "bg-slate-700"
              }`}
              onClick={() => setData((prev) => prev ? { ...prev, isActive: !prev.isActive } : { clientEmail: "", privateKey: "", folderId: "", isActive: true })}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  data?.isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
              Aktifkan Integrasi Google Drive
            </span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">
            Client Email (Service Account)
          </label>
          <input
            type="email"
            value={data?.clientEmail || ""}
            onChange={(e) => setData((prev) => prev ? { ...prev, clientEmail: e.target.value } : { clientEmail: e.target.value, privateKey: "", folderId: "", isActive: false })}
            placeholder="example@project-id.iam.gserviceaccount.com"
            className="w-full px-4 py-2 bg-surface-dark border border-surface-border rounded-lg text-white focus:outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">
            Private Key (Service Account)
          </label>
          <textarea
            value={data?.privateKey || ""}
            onChange={(e) => setData((prev) => prev ? { ...prev, privateKey: e.target.value } : { clientEmail: "", privateKey: e.target.value, folderId: "", isActive: false })}
            placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
            rows={4}
            className="w-full px-4 py-2 bg-surface-dark border border-surface-border rounded-lg text-white focus:outline-none focus:border-brand-500 font-mono text-xs"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">
            Google Drive Folder ID
          </label>
          <input
            type="text"
            value={data?.folderId || ""}
            onChange={(e) => setData((prev) => prev ? { ...prev, folderId: e.target.value } : { clientEmail: "", privateKey: "", folderId: e.target.value, isActive: false })}
            placeholder="1A2b3C4d5E6f7G8h9I0j..."
            className="w-full px-4 py-2 bg-surface-dark border border-surface-border rounded-lg text-white focus:outline-none focus:border-brand-500 font-mono"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save size={18} />
              Simpan Konfigurasi
            </>
          )}
        </button>
      </div>
    </div>
  );
}
