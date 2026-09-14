"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { MessageCircle, X, Send, Sparkles, Bot, User, RotateCcw, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "Produk apa saja yang tersedia?",
  "Bagaimana cara pembayaran?",
  "Ada promo atau voucher aktif?",
];

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Halo! Ada yang bisa saya bantu terkait produk, stok, atau cara pembelian di VendingLink? 👋",
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function CustomerChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isTyping, isOpen]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: trimmed,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsTyping(true);

    try {
      const payload = nextMessages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            content: data.error || "Maaf, terjadi kesalahan. Silakan coba lagi sebentar.",
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: "assistant", content: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "Koneksi terputus. Silakan coba sesaat lagi.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleReset = () => {
    setMessages([WELCOME_MESSAGE]);
  };

  return (
    <aside aria-label="Asisten AI Bantuan Customer" className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {/* Floating Popup Chat Window */}
      {isOpen && (
        <div className="mb-3 w-[calc(100vw-2.5rem)] sm:w-[360px] h-[480px] max-h-[75vh] flex flex-col bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-brand-400" />
              </div>
              <div>
                <p className="font-semibold text-white text-xs leading-tight">AI Assistant</p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-hover transition-colors"
                title="Reset percakapan"
                aria-label="Reset percakapan"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-hover transition-colors"
                title="Tutup chat"
                aria-label="Tutup chat"
              >
                <Minimize2 size={14} />
              </button>
            </div>
          </div>

          {/* Message List */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex items-start gap-2 text-xs",
                  msg.role === "user" && "flex-row-reverse"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border mt-0.5",
                    msg.role === "user"
                      ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                      : "bg-brand-500/15 border-brand-500/30 text-brand-400"
                  )}
                >
                  {msg.role === "user" ? <User size={12} /> : <Bot size={12} />}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-3 py-2 leading-relaxed whitespace-pre-wrap break-words",
                    msg.role === "user"
                      ? "bg-brand-500 text-white rounded-tr-none font-medium"
                      : "bg-surface border border-surface-border text-slate-200 rounded-tl-none"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-start gap-2 text-xs">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border bg-brand-500/15 border-brand-500/30 text-brand-400">
                  <Bot size={12} />
                </div>
                <div className="bg-surface border border-surface-border rounded-xl rounded-tl-none px-3 py-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                </div>
              </div>
            )}

            {messages.length === 1 && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[10px] text-slate-400 font-medium px-1">Pertanyaan Cepat:</p>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-surface-border text-slate-300 hover:border-brand-500/40 hover:text-brand-300 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 p-2.5 border-t border-surface-border bg-surface"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ketik pertanyaan..."
              disabled={isTyping}
              className="flex-1 bg-surface-card border border-surface-border text-slate-100 placeholder-slate-500 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Kirim pesan"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25 border border-brand-400/40 transition-all duration-200 active:scale-95"
        aria-label={isOpen ? "Tutup chat asisten" : "Buka chat asisten"}
      >
        {isOpen ? (
          <>
            <X size={18} />
            <span className="text-xs font-semibold">Tutup</span>
          </>
        ) : (
          <>
            <MessageCircle size={18} />
            <span className="text-xs font-semibold">Tanya AI</span>
          </>
        )}
      </button>
    </aside>
  );
}