"use client";

import { useState, FormEvent, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Zap, Lock, User, ShieldAlert } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "@/components/ui/Toast";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isUnapproved = searchParams.get("error") === "unapproved";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username: username.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === "CredentialsSignin"
          ? "Username atau password salah"
          : result.error
        );
        toast.error("Login gagal. Periksa kembali kredensial Anda.");
      } else {
        toast.success("Login berhasil! Mengalihkan...");
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
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
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 mb-4 shadow-glow">
            <Zap size={28} className="text-brand-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">VendingLink</h1>
          <p className="text-slate-400">Masuk ke akun Anda untuk melanjutkan</p>
        </div>

        {/* Unapproved agent banner */}
        {isUnapproved && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 animate-fade-in">
            <ShieldAlert size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-400 mb-0.5">Akun Belum Disetujui</p>
              <p>Akun agen Anda masih menunggu persetujuan dari Admin. Silakan hubungi admin untuk proses approval.</p>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
            <Input
              id="username-input"
              label="Username"
              type="text"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              autoFocus
              leftIcon={<User size={16} />}
            />

            <Input
              id="password-input"
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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
            />

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-500/30 rounded-lg text-sm text-red-400 animate-fade-in">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              id="login-submit-btn"
              className="w-full mt-2"
              size="lg"
              loading={loading}
            >
              Masuk
            </Button>
          </form>

          {/* Register link */}
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-400">
              Ingin jadi agen reseller?{" "}
              <Link href="/register" className="text-brand-400 hover:underline font-medium">
                Daftar di sini
              </Link>
            </p>
          </div>


        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          VendingLink v1.0 — Sistem Penjualan Link Redeem
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
