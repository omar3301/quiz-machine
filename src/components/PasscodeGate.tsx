"use client";

import { useState, useEffect, useRef } from "react";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasscodeGateProps {
  children: React.ReactNode;
}

const SESSION_KEY = "qf_access_granted";

export default function PasscodeGate({ children }: PasscodeGateProps) {
  const [granted, setGranted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved === "yes") setGranted(true);
    setChecking(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = async () => {
    const res = await fetch("/api/verify-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      setSuccess(true);
      sessionStorage.setItem(SESSION_KEY, "yes");
      setTimeout(() => setGranted(true), 800);
    } else {
      setError(true);
      setShaking(true);
      setCode("");
      setTimeout(() => { setShaking(false); setError(false); }, 600);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  if (checking) return null;
  if (granted) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none opacity-20"
        style={{ background: "radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)", filter: "blur(80px)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none opacity-15"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)", filter: "blur(60px)" }} />

      <div className={cn(
        "w-full max-w-sm transition-all duration-300",
        shaking && "animate-[shake_0.4s_ease]"
      )}>
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: success ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.12)", border: `1px solid ${success ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.2)"}`, transition: "all 0.4s ease" }}>
            {success
              ? <ShieldCheck className="w-7 h-7" style={{ color: "var(--emerald)" }} />
              : <Lock className="w-7 h-7" style={{ color: "var(--amber)" }} />}
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">
            Quiz<span style={{ color: "var(--amber-light)" }} className="italic">Forge</span>
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {success ? "Access granted. Welcome!" : "Enter your access code to continue"}
          </p>
        </div>

        {/* Input card */}
        <div className="glass rounded-2xl p-7">
          <label className="block text-xs font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--text-dim)" }}>
            Access Code
          </label>

          <div className="relative mb-5">
            <input
              ref={inputRef}
              type={showCode ? "text" : "password"}
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === "Enter" && code && handleSubmit()}
              placeholder="Enter code…"
              className="w-full px-4 py-3.5 pr-12 rounded-xl text-sm font-mono focus:outline-none transition-all"
              style={{
                background: "rgba(10,10,15,0.6)",
                border: `1px solid ${error ? "rgba(244,63,94,0.5)" : success ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.1)"}`,
                color: "var(--text-primary)",
                boxShadow: error ? "0 0 0 3px rgba(244,63,94,0.1)" : success ? "0 0 0 3px rgba(16,185,129,0.1)" : "none",
              }}
            />
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              {showCode
                ? <EyeOff className="w-4 h-4" style={{ color: "var(--text-dim)" }} />
                : <Eye className="w-4 h-4" style={{ color: "var(--text-dim)" }} />}
            </button>
          </div>

          {error && (
            <p className="text-xs mb-4 text-center font-medium" style={{ color: "#fb7185" }}>
              Incorrect code. Please try again.
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!code || success}
            className="w-full py-3.5 rounded-xl font-display font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: success ? "rgba(16,185,129,0.8)" : "linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)",
              color: "#0A0A0F",
              boxShadow: code && !success ? "0 0 20px rgba(245,158,11,0.25)" : "none",
            }}
          >
            {success ? "✓ Unlocked" : "Unlock"}
          </button>
        </div>

        {/* Branding */}
        <p className="text-center text-xs mt-6 font-mono" style={{ color: "var(--text-dim)" }}>
          Built by{" "}
          <a href="https://www.instagram.com/omar_abomosslam/" target="_blank" rel="noopener noreferrer"
            className="hover:underline transition-all" style={{ color: "rgba(245,158,11,0.7)" }}>
            Omar Abomosslam
          </a>
        </p>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
