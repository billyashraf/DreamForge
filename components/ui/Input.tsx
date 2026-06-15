"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = "", id, ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-mono text-gray-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`
          w-full bg-gray-900 border font-mono text-sm text-gray-100
          px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500
          placeholder:text-gray-600 transition-colors
          ${error ? "border-red-600" : "border-gray-700 hover:border-gray-500"}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
    </div>
  );
});
