"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  Users,
  Plus,
  ToggleLeft,
  ToggleRight,
  KeyRound,
  ShoppingBag,
  Check,
  X,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import toast from "@/components/ui/Toast";
import { formatDate, formatRupiah } from "@/lib/utils";

interface Agent {
  id: string;
  username: string;
  role: string;
  isApproved: boolean;
  isActive: boolean;
  outstandingDebt: number;
  createdAt: string;
  _count: { transactions: number };
}

type ModalMode = "add" | "reset-password" | "settle-debt" | null;

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  // Add form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/agents");
      const data = await res.json();
      if (Array.isArray(data)) {
        setAgents(data);
      }
    } catch (err) {
      console.error("Fetch agents error:", err);
      toast.error("Gagal memuat data agen");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const submitAddAgent = async () => {
    setSubmitting(true);

    const res = await fetch("/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword }),
    });

    const data = await res.json();
    if (res.ok) {
      toast.success("Agen berhasil ditambahkan!");
      fetchAgents();
      setModalMode(null);
      setNewUsername("");
      setNewPassword("");
    } else {
      toast.error(data.error || "Gagal menambahkan agen");
    }
    setSubmitting(false);
  };

  const handleAddAgent = async (e: FormEvent) => {
    e.preventDefault();
    await submitAddAgent();
  };

  const submitResetPassword = async () => {
    if (!selectedAgent) return;
    setSubmitting(true);

    const res = await fetch("/api/admin/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedAgent.id, password: resetPassword }),
    });

    if (res.ok) {
      toast.success(`Password ${selectedAgent.username} berhasil direset!`);
      setModalMode(null);
      setResetPassword("");
    } else {
      toast.error("Gagal mereset password");
    }
    setSubmitting(false);
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    await submitResetPassword();
  };

  const handleToggleActive = async (agent: Agent) => {
    setToggling(agent.id);
    const res = await fetch("/api/admin/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: agent.id, isActive: !agent.isActive }),
    });

    if (res.ok) {
      toast.success(`Akun agen ${agent.isActive ? "dinonaktifkan" : "diaktifkan"}`);
      fetchAgents();
    } else {
      toast.error("Gagal mengubah status akun agen");
    }
    setToggling(null);
  };

  const handleToggleApproval = async (agent: Agent, approve: boolean) => {
    setApproving(agent.id);
    const res = await fetch("/api/admin/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: agent.id, isApproved: approve }),
    });

    if (res.ok) {
      toast.success(approve ? `Agen ${agent.username} telah disetujui!` : `Persetujuan agen ${agent.username} dibatalkan`);
      fetchAgents();
    } else {
      toast.error("Gagal merubah persetujuan agen");
    }
    setApproving(null);
  };

  const submitSettleDebt = async () => {
    if (!selectedAgent) return;
    setSubmitting(true);

    const res = await fetch("/api/admin/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedAgent.id, settleDebt: true }),
    });

    if (res.ok) {
      toast.success(`Hutang agen ${selectedAgent.username} berhasil ditandai lunas!`);
      fetchAgents();
      setModalMode(null);
    } else {
      toast.error("Gagal melunasi hutang agen");
    }
    setSubmitting(false);
  };

  const pendingApprovalCount = agents.filter((a) => !a.isApproved).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <Users size={20} className="text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Manajemen Agen Reseller</h1>
          </div>
          <p className="text-slate-400 ml-14">Kelola pendaftaran, persetujuan, dan pelunasan hutang agen</p>
        </div>
        <Button
          id="add-agent-btn"
          icon={<Plus size={16} />}
          onClick={() => setModalMode("add")}
        >
          Tambah Agen
        </Button>
      </div>

      {/* Pending approval notice if any */}
      {pendingApprovalCount > 0 && (
        <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300">
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className="text-amber-400 flex-shrink-0" />
            <span className="text-sm font-medium">
              Ada <strong>{pendingApprovalCount}</strong> pendaftaran agen baru yang menunggu persetujuan Admin!
            </span>
          </div>
        </div>
      )}

      {/* Agents Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-12"><Spinner label="Memuat data agen..." /></div>
        ) : agents.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Users size={40} className="mx-auto mb-3 opacity-40" />
            <p>Belum ada agen terdaftar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Approval</th>
                  <th>Akun</th>
                  <th>Hutang (Credit)</th>
                  <th>Transaksi</th>
                  <th>Terdaftar</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id} className={!agent.isApproved ? "bg-amber-950/10" : undefined}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 text-xs font-bold flex-shrink-0">
                          {agent.username[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{agent.username}</span>
                      </div>
                    </td>
                    <td>
                      {agent.isApproved ? (
                        <Badge variant="success" dot>
                          Disetujui
                        </Badge>
                      ) : (
                        <Badge variant="warning" dot>
                          Menunggu Approval
                        </Badge>
                      )}
                    </td>
                    <td>
                      <Badge variant={agent.isActive ? "info" : "danger"}>
                        {agent.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            agent.outstandingDebt > 0 ? "text-amber-400" : "text-slate-400"
                          }`}
                        >
                          {formatRupiah(agent.outstandingDebt)}
                        </span>
                        {agent.outstandingDebt > 0 && (
                          <button
                            id={`settle-debt-btn-${agent.id}`}
                            onClick={() => {
                              setSelectedAgent(agent);
                              setModalMode("settle-debt");
                            }}
                            className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-xs hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                            title="Tandai Lunas Hutang"
                          >
                            <DollarSign size={12} />
                            Tandai Lunas
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <ShoppingBag size={14} className="text-slate-500" />
                        {agent._count.transactions}
                      </span>
                    </td>
                    <td className="text-slate-400 text-xs">
                      {formatDate(agent.createdAt)}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {/* Approval Toggle Button */}
                        {!agent.isApproved ? (
                          <button
                            id={`approve-agent-btn-${agent.id}`}
                            onClick={() => handleToggleApproval(agent, true)}
                            disabled={approving === agent.id}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/20 transition-colors disabled:opacity-50 font-medium"
                            title="Setujui Agen"
                          >
                            <Check size={14} />
                            Approve
                          </button>
                        ) : (
                          <button
                            id={`reject-agent-btn-${agent.id}`}
                            onClick={() => handleToggleApproval(agent, false)}
                            disabled={approving === agent.id}
                            className="flex items-center gap-1 p-1.5 text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Batalkan Persetujuan"
                          >
                            <X size={14} />
                          </button>
                        )}

                        {/* Active Toggle Button */}
                        <button
                          id={`toggle-agent-${agent.id}`}
                          onClick={() => handleToggleActive(agent)}
                          disabled={toggling === agent.id}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                          title={agent.isActive ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                        >
                          {agent.isActive ? (
                            <ToggleRight size={18} className="text-brand-400" />
                          ) : (
                            <ToggleLeft size={18} />
                          )}
                        </button>

                        {/* Reset Password Button */}
                        <button
                          id={`reset-pwd-btn-${agent.id}`}
                          onClick={() => {
                            setSelectedAgent(agent);
                            setModalMode("reset-password");
                          }}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition-colors p-1.5 rounded-lg hover:bg-amber-500/10"
                          title="Reset Password"
                        >
                          <KeyRound size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Agent Modal */}
      <Modal
        isOpen={modalMode === "add"}
        onClose={() => setModalMode(null)}
        title="Tambah Agen Baru"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalMode(null)}>Batal</Button>
            <Button
              id="submit-add-agent-btn"
              onClick={submitAddAgent}
              loading={submitting}
            >
              Tambah Agen
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddAgent} className="space-y-4">
          <Input
            id="new-agent-username"
            label="Username"
            placeholder="agent02"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            required
            hint="Minimal 3 karakter, hanya huruf/angka/underscore"
          />
          <Input
            id="new-agent-password"
            label="Password"
            type="password"
            placeholder="Password awal agen"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            hint="Minimal 6 karakter"
          />
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={modalMode === "reset-password"}
        onClose={() => { setModalMode(null); setResetPassword(""); }}
        title={`Reset Password — ${selectedAgent?.username}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setModalMode(null); setResetPassword(""); }}>
              Batal
            </Button>
            <Button
              id="submit-reset-pwd-btn"
              onClick={submitResetPassword}
              loading={submitting}
              variant="danger"
            >
              Reset Password
            </Button>
          </>
        }
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-slate-400">
            Masukkan password baru untuk agen{" "}
            <span className="font-semibold text-white">{selectedAgent?.username}</span>
          </p>
          <Input
            id="reset-password-field"
            label="Password Baru"
            type="password"
            placeholder="Password baru..."
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            required
            hint="Minimal 6 karakter"
          />
        </form>
      </Modal>

      {/* Settle Debt Confirmation Modal */}
      <Modal
        isOpen={modalMode === "settle-debt"}
        onClose={() => setModalMode(null)}
        title={`Pelunasan Hutang — ${selectedAgent?.username}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalMode(null)}>Batal</Button>
            <Button
              id="confirm-settle-debt-btn"
              onClick={submitSettleDebt}
              loading={submitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Konfirmasi Pelunasan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Apakah Anda yakin ingin menandai lunas seluruh hutang transaksi agen{" "}
            <strong className="text-white">{selectedAgent?.username}</strong>?
          </p>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
            <div className="text-xs text-slate-400">Total Hutang Saat Ini</div>
            <div className="text-xl font-bold text-emerald-400">
              {formatRupiah(selectedAgent?.outstandingDebt || 0)}
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Tindakan ini akan mengosongkan nilai <code>outstandingDebt</code> agen ini menjadi Rp 0 dan menandai transaksi kredit agen terkait sebagai <em>settled</em>.
          </p>
        </div>
      </Modal>
    </div>
  );
}
