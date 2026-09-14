"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Zap, Lock, User, CheckCircle2, ShieldAlert } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "@/components/ui/Toast";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok");
      toast.error("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Pendaftaran gagal");
        toast.error(data.error || "Pendaftaran gagal");
      } else {
        setRegistered(true);
        toast.success("Pendaftaran agen berhasil!");
      }
    } catch {
      setError("Terjadi kesalahan sistem. Silakan coba lagi.");
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 mb-4 shadow-glow">
            <Zap size={28} className="text-brand-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Daftar Agen Reseller</h1>
          <p className="text-slate-400">Bergabung sebagai mitra agen penjualan VendingLink</p>
        </div>

        {/* Register Card */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-8 shadow-2xl">
          {registered ? (
            <div className="text-center space-y-4 py-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-xl font-bold text-white">Pendaftaran Berhasil!</h2>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left text-xs text-amber-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-400 text-sm">
                  <ShieldAlert size={16} />
                  <span>Menunggu Persetujuan Admin</span>
                </div>
                <p>
                  Akun agen Anda dengan username <strong className="text-white">{username}</strong> berhasil dibuat.
                  Sebelum dapat digunakan untuk login dan bertransaksi, akun Anda perlu disetujui terlebih dahulu oleh Admin.
                </p>
              </div>

              <div className="pt-4">
                <Button
                  id="go-to-login-btn"
                  className="w-full"
                  size="lg"
                  onClick={() => router.push("/login")}
                >
                  Kembali ke Halaman Login
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" id="register-form">
              <Input
                id="reg-username-input"
                label="Username"
                type="text"
                placeholder="Masukkan username agen (contoh: agent_sulawesi)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                leftIcon={<User size={16} />}
                hint="3-30 karakter, hanya huruf, angka, dan underscore"
              />

              <Input
                id="reg-password-input"
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Buat password aman"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                leftIcon={<Lock size={16} />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                hint="Minimal 6 karakter"
              />

              <Input
                id="reg-confirm-password-input"
                label="Konfirmasi Password"
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan ulang password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                leftIcon={<Lock size={16} />}
              />

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-500/30 rounded-lg text-sm text-red-400 animate-fade-in">
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                id="register-submit-btn"
                className="w-full mt-2"
                size="lg"
                loading={loading}
              >
                Daftar Sebagai Agen
              </Button>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-400">
                  Sudah memiliki akun agen?{" "}
                  <Link href="/login" className="text-brand-400 hover:underline font-medium">
                    Masuk di sini
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          VendingLink v1.0 — Sistem Penjualan Link Redeem
        </p>
      </div>
    </div>
  );
}
