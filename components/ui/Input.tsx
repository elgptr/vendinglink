"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightElement, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-300"
          >
            {label}
            {props.required && (
              <span className="text-red-400 ml-1">*</span>
            )}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-lg bg-surface-card border text-slate-100 placeholder-slate-500",
              "px-3 py-2.5 text-sm",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error
                ? "border-red-500 focus:ring-red-500/50"
                : "border-surface-border hover:border-surface-border-light",
              leftIcon && "pl-10",
              rightElement && "pr-24",
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-2">{rightElement}</div>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-slate-500">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-slate-300">
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full rounded-lg bg-surface-card border text-slate-100 placeholder-slate-500",
            "px-3 py-2.5 text-sm resize-vertical",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500",
            "disabled:opacity-50",
            error
              ? "border-red-500 focus:ring-red-500/50"
              : "border-surface-border hover:border-surface-border-light",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">⚠ {error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export default Input;
