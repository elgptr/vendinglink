import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChangePasswordForm from "@/components/admin/ChangePasswordForm";
import AIConfigForm from "@/components/admin/AIConfigForm";
import PaymentGatewaySettingsCard from "@/components/admin/PaymentGatewaySettingsCard";

export default async function AdminSettingsPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Pengaturan Admin</h1>
        <p className="text-slate-400">
          Kelola payment gateway, konfigurasi AI, dan keamanan akun Anda
        </p>
      </div>

      <div className="grid gap-6">
        {/* Payment Gateway Card */}
        <PaymentGatewaySettingsCard />

        {/* Change Password Card */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-1">Ubah Password</h2>
            <p className="text-sm text-slate-400">
              Perbarui password Anda untuk menjaga keamanan akun
            </p>
          </div>
          <ChangePasswordForm />
        </div>

        {/* Account Info Card */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Informasi Akun</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-400">Username</p>
              <p className="text-slate-100 font-medium">{session.user.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Role</p>
              <p className="text-slate-100 font-medium">Administrator</p>
            </div>
          </div>
        </div>

        {/* AI Configuration Card */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-1">Konfigurasi AI</h2>
          <p className="text-sm text-slate-400 mb-6">Kelola API keys untuk Google Gemini & Anthropic Claude</p>
          <AIConfigForm />
        </div>
      </div>
    </div>
  );
}