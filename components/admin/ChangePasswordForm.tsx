"use client";

import { useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { PasswordInput } from "./PasswordInput";

interface ChangePasswordFormProps {
  onSuccess?: () => void;
}

export default function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (message) setMessage(null);
  };

  const togglePasswordVisibility = (field: "old" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.fieldErrors) {
          const fieldErrors = data.error.fieldErrors as Record<string, string[]>;
          const firstError = Object.values(fieldErrors)[0]?.[0];
          setMessage({ type: "error", text: firstError || "Terjadi kesalahan" });
        } else {
          setMessage({ type: "error", text: data.error || "Gagal mengubah password" });
        }
      } else {
        setMessage({ type: "success", text: data.message || "Password berhasil diubah" });
        setFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
        onSuccess?.();
      }
    } catch (error) {
      setMessage({ type: "error", text: "Terjadi kesalahan jaringan" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordInput
        id="oldPassword"
        label="Password Lama"
        name="oldPassword"
        value={formData.oldPassword}
        onChange={handleInputChange}
        showPassword={showPasswords.old}
        onToggleShow={() => togglePasswordVisibility("old")}
        disabled={loading}
        placeholder="Masukkan password lama Anda"
      />

      <PasswordInput
        id="newPassword"
        label="Password Baru"
        name="newPassword"
        value={formData.newPassword}
        onChange={handleInputChange}
        showPassword={showPasswords.new}
        onToggleShow={() => togglePasswordVisibility("new")}
        disabled={loading}
        placeholder="Minimal 6 karakter"
      />

      <PasswordInput
        id="confirmPassword"
        label="Konfirmasi Password"
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleInputChange}
        showPassword={showPasswords.confirm}
        onToggleShow={() => togglePasswordVisibility("confirm")}
        disabled={loading}
        placeholder="Ulangi password baru"
      />

      {message && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
            message.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <Check size={18} className="flex-shrink-0" />
          ) : (
            <X size={18} className="flex-shrink-0" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !formData.oldPassword || !formData.newPassword || !formData.confirmPassword}
        className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Menyimpan...
          </>
        ) : (
          "Ubah Password"
        )}
      </button>

      <p className="text-xs text-slate-400">
        Password harus minimal 6 karakter dan berbeda dengan password sebelumnya.
      </p>
    </form>
  );
}
