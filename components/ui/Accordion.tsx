"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionItemProps {
  trigger: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function AccordionItem({
  trigger,
  children,
  defaultOpen = false,
  className,
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("border-b border-surface-border last:border-b-0", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-3 py-4 text-left",
          "text-sm font-medium text-slate-200 hover:text-white transition-colors"
        )}
        aria-expanded={isOpen}
      >
        <span>{trigger}</span>
        <ChevronDown
          size={16}
          className={cn(
            "text-slate-400 transition-transform duration-200 flex-shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100 pb-4" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="text-sm text-slate-400 leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

interface AccordionProps {
  children: React.ReactNode;
  className?: string;
}

export default function Accordion({ children, className }: AccordionProps) {
  return (
    <div className={cn("divide-y divide-surface-border", className)}>
      {children}
    </div>
  );
}
