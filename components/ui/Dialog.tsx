"use client";

import { useState, useEffect, ReactNode } from "react";
import { Button } from "./Button";

type ConfirmVariant = "danger" | "primary" | "success";

interface DialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  confirmVariant?: ConfirmVariant;
  cancelLabel?: string;
  withInput?: boolean;
  inputPlaceholder?: string;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
}

export function Dialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  cancelLabel = "Cancel",
  withInput = false,
  inputPlaceholder = "",
  onConfirm,
  onCancel,
}: DialogProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm bg-gray-950 border border-gray-700 shadow-2xl">
        <div className="px-5 py-3 border-b border-gray-800">
          <h2 className="text-xs font-mono font-bold text-gray-200 uppercase tracking-widest">
            {title}
          </h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="text-xs font-mono text-gray-400 leading-relaxed">{message}</div>
          {withInput && (
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={inputPlaceholder}
              maxLength={300}
              className="w-full bg-gray-900 border border-gray-700 focus:border-gray-500 text-gray-200 text-xs font-mono px-3 py-2 placeholder-gray-700 outline-none transition-colors"
            />
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-800 flex justify-end gap-3">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            variant={confirmVariant === "danger" ? "danger" : confirmVariant === "success" ? "success" : "primary"}
            onClick={() => onConfirm(withInput ? value : undefined)}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
