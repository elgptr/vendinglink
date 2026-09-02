"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { Send, Bot, User, Sparkles, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import toast from "@/components/ui/Toast";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "Produk apa saja yang tersedia dan berapa harganya?",
  "Apakah ada voucher promo yang aktif?",
  "Bagaimana cara checkout dan bayar dengan QRIS?",
];

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Halo! Saya VendingLink Assistant \ud83d\udc4b\nSaya bisa bantu Anda seputar daftar produk, stok, cara checkout & pembayaran QRIS, serta info voucher promo yang aktif. Silakan tanya apa saja!",
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping]);

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
      // Only send role/content — history kept purely in client-side session state
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
        toast.error(data.error || "Gagal menghubungi asisten AI");
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            content:
              "Maaf, terjadi kesalahan saat menghubungi asisten. Silakan coba lagi.",
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: "assistant", content: data.reply },
      ]);
    } catch {
      toast.error("Koneksi terputus. Silakan coba lagi.");
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "Maaf, koneksi terputus. Silakan coba lagi.",
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
    toast.info("Riwayat chat telah direset");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border bg-surface">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-brand-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">VendingLink Assistant</p>
            <p className="text-xs text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </p>
          </div>
        </div>
        <button
          id="reset-chat-btn"
          onClick={handleReset}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-surface-hover transition-all"
          aria-label="Reset percakapan"
          title="Reset percakapan"
        >
          <RotateCcw size={16} />
        </button>
      </div>
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
      >
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {isTyping && <TypingIndicator />}

        {messages.length === 1 && (
          <div className="pt-2 space-y-2">
            <p className="text-xs text-slate-500 px-1">Coba tanyakan:</p>
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="w-full text-left text-sm px-4 py-2.5 rounded-xl bg-surface border border-surface-border text-slate-300 hover:border-brand-500/40 hover:text-brand-300 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        id="chat-form"
        onSubmit={handleSubmit}
        className="flex items-end gap-3 px-5 py-4 border-t border-surface-border bg-surface"
      >
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tulis pertanyaan Anda di sini..."
          disabled={isTyping}
          autoComplete="off"
          className="flex-1 rounded-xl bg-surface-card border border-surface-border text-slate-100 placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all disabled:opacity-50"
        />
        <Button
          id="chat-send-btn"
          type="submit"
          size="md"
          disabled={!input.trim()}
          loading={isTyping}
          icon={<Send size={16} />}
        >
          Kirim
        </Button>
      </form>
    </div>
  );
}
function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex items-start gap-3 animate-fade-in",
        isUser && "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border",
          isUser
            ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
            : "bg-brand-500/15 border-brand-500/30 text-brand-400"
        )}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words",
          isUser
            ? "bg-brand-500/15 border border-brand-500/25 text-slate-100 rounded-tr-sm"
            : "bg-surface border border-surface-border text-slate-200 rounded-tl-sm"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border bg-brand-500/15 border-brand-500/30 text-brand-400">
        <Bot size={14} />
      </div>
      <div className="bg-surface border border-surface-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
      </div>
    </div>
  );
}



