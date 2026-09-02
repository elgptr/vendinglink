"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  Users,
  Plus,
  ToggleLeft,
  ToggleRight,
  KeyRound,
  ShoppingBag,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import toast from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

interface Agent {
  id: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count: { transactions: number };
}

type ModalMode = "add" | "reset-password" | null;

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  // Add form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  const fetchAgents = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/agents");
    const data = await res.json();
    setAgents(data);
    setLoading(false);
  };

  useEffect(() => { fetchAgents(); }, []);

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

  const handleToggle = async (agent: Agent) => {
    setToggling(agent.id);
    const res = await fetch("/api/admin/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: agent.id, isActive: !agent.isActive }),
    });

    if (res.ok) {
      toast.success(`Agen ${agent.isActive ? "dinonaktifkan" : "diaktifkan"}`);
      fetchAgents();
    } else {
      toast.error("Gagal mengubah status agen");
    }
    setToggling(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <Users size={20} className="text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Manajemen Agen</h1>
          </div>
          <p className="text-slate-400 ml-14">Kelola akun agen penjualan</p>
        </div>
        <Button
          id="add-agent-btn"
          icon={<Plus size={16} />}
          onClick={() => setModalMode("add")}
        >
          Tambah Agen
        </Button>
      </div>

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
                  <th>Total Transaksi</th>
                  <th>Status</th>
                  <th>Terdaftar</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 text-xs font-bold flex-shrink-0">
                          {agent.username[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{agent.username}</span>
                      </div>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <ShoppingBag size={14} className="text-slate-500" />
                        {agent._count.transactions} transaksi
                      </span>
                    </td>
                    <td>
                      <Badge variant={agent.isActive ? "success" : "danger"} dot>
                        {agent.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="text-slate-400 text-xs">
                      {formatDate(agent.createdAt)}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          id={`toggle-agent-${agent.id}`}
                          onClick={() => handleToggle(agent)}
                          disabled={toggling === agent.id}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                          title={agent.isActive ? "Nonaktifkan" : "Aktifkan"}
                        >
                          {agent.isActive ? (
                            <ToggleRight size={18} className="text-brand-400" />
                          ) : (
                            <ToggleLeft size={18} />
                          )}
                        </button>
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
    </div>
  );
}
