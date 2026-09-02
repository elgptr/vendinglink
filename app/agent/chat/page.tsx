import { MessageCircle } from "lucide-react";
import ChatWindow from "@/components/agent/ChatWindow";

export const metadata = {
  title: "AI Chat Assistant",
};

export default function ChatPage() {
  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-brand-500/10 rounded-xl border border-brand-500/20">
            <MessageCircle size={20} className="text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">AI Chat Assistant</h1>
        </div>
        <p className="text-slate-400 ml-14">
          Tanya seputar produk, stok, cara checkout QRIS, dan voucher promo yang aktif
        </p>
      </div>

      <ChatWindow />
    </div>
  );
}
