"use client";

import { cn } from "@/lib/utils";
import { Star, Quote } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  text: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    id: "t1",
    name: "Ms. Januari",
    text: "Keren banget produk Toko Txsiber ini, google Pro untuk Family murah banget dibandingkan dengan berlangganan individu.",
    rating: 5,
  },
  {
    id: "t2",
    name: "Mr. September",
    text: "Berkat beli produk langganan AI di toko Txsiber ini, tulisan saya semakin bisa menaikan karir dan memenuhi ekspektasi pekerjaan saya.",
    rating: 5,
  },
  {
    id: "t3",
    name: "Mr. Isyak",
    text: "Murah banget buat langganan $500 token Claude disini, gw bisa bangun aplikasi dengan cepat dan menyelesaikan use case yang gw perlukan.",
    rating: 5,
  },
];

interface TestimonialsProps {
  className?: string;
}

export default function Testimonials({ className }: TestimonialsProps) {
  return (
    <section className={cn("py-12 animate-slide-up stagger-5", className)}>
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-3">Apa Kata Mereka?</h2>
        <p className="text-slate-400">Ribuan pelanggan telah terbantu oleh produk kami.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t, index) => (
          <div
            key={t.id}
            className={cn(
              "p-6 rounded-3xl bg-surface-card border border-surface-border relative flex flex-col",
              "hover:border-brand-500/30 transition-colors duration-300"
            )}
          >
            <Quote className="absolute top-6 right-6 text-brand-500/20" size={40} />

            <div className="flex items-center gap-1 mb-4">
              {[...Array(t.rating)].map((_, i) => (
                <Star key={i} size={16} className="fill-brand-400 text-brand-400" />
              ))}
            </div>

            <p className="text-slate-300 text-sm leading-relaxed mb-6 flex-1 relative z-10">
              "{t.text}"
            </p>

            <div className="flex items-center gap-3 pt-4 border-t border-surface-border">
              <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center font-bold text-brand-400 border border-surface-border-light">
                {t.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{t.name}</p>
                <p className="text-xs text-slate-500">Verified Buyer</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
