"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "error" | "success" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

function Toast({ toast, onRemove }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 10);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const Icon = toast.type === "error" ? AlertCircle : toast.type === "success" ? CheckCircle : Info;
  const colors = {
    error: { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.3)", icon: "#f43f5e", text: "#fda4af" },
    success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", icon: "#10b981", text: "#6ee7b7" },
    info: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", icon: "#f59e0b", text: "#fcd34d" },
  }[toast.type];

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 max-w-sm w-full shadow-2xl",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, backdropFilter: "blur(20px)" }}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: colors.icon }} />
      <p className="text-sm flex-1 leading-relaxed" style={{ color: colors.text }}>{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="p-0.5 rounded hover:bg-white/10 transition-colors shrink-0">
        <X className="w-3.5 h-3.5" style={{ color: colors.text }} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {toasts.map((t) => <Toast key={t.id} toast={t} onRemove={onRemove} />)}
    </div>
  );
}

// Hook
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}
