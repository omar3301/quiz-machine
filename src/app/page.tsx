"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  FileText,
  Upload,
  Sparkles,
  ChevronDown,
  AlertCircle,
  X,
  BookOpen,
  Zap,
  Shield,
} from "lucide-react";
import { Difficulty } from "@/types/quiz";
import { cn } from "@/lib/utils";

const QUESTION_OPTIONS = [5, 10, 15, 20];
const DIFFICULTY_OPTIONS: {
  value: Difficulty;
  label: string;
  desc: string;
  color: string;
}[] = [
  {
    value: "easy",
    label: "Easy",
    desc: "Facts & recall",
    color: "emerald",
  },
  {
    value: "medium",
    label: "Medium",
    desc: "Understanding",
    color: "amber",
  },
  {
    value: "hard",
    label: "Hard",
    desc: "Analysis & synthesis",
    color: "rose",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const LOADING_STEPS = [
    "Parsing your PDF…",
    "Extracting key concepts…",
    "Crafting questions with AI…",
    "Finalizing your quiz…",
  ];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const dropped = acceptedFiles[0];
    if (dropped && dropped.type === "application/pdf") {
      setFile(dropped);
      setError(null);
    } else {
      setError("Please upload a valid PDF file.");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
    onDropRejected: (fileRejections) => {
      const err = fileRejections[0]?.errors[0];
      if (err?.code === "file-too-large") {
        setError("PDF must be under 20MB.");
      } else {
        setError("Invalid file. Please upload a PDF.");
      }
    },
  });

  const extractTextFromPDF = async (pdfFile: File): Promise<string> => {
    // Dynamically import pdfjs-dist (runs in browser, no server needed)
    const pdfjsLib = await import("pdfjs-dist");
    // Use locally served worker (copied to /public) — no CDN dependency
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? (item as { str: string }).str : ""))
        .join(" ");
      fullText += pageText + "\n";
    }

    const trimmed = fullText.trim();
    if (!trimmed || trimmed.length < 50) {
      throw new Error(
        "Could not extract text from this PDF. It may be a scanned image or password-protected."
      );
    }

    // Truncate to ~120k chars to stay within AI token limits
    return trimmed.slice(0, 120000);
  };

  const handleGenerate = async () => {
    if (!file) {
      setError("Please upload a PDF first.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    // Cycle through loading steps
    let step = 0;
    const interval = setInterval(() => {
      step = Math.min(step + 1, LOADING_STEPS.length - 1);
      setLoadingStep(step);
    }, 3000);

    try {
      // Step 1: Extract text in the browser (avoids payload size limits)
      let pdfText: string;
      try {
        pdfText = await extractTextFromPDF(file);
      } catch (err: unknown) {
        throw new Error(
          err instanceof Error ? err.message : "Failed to read PDF."
        );
      }

      // Step 2: Send only the extracted text (tiny vs raw PDF binary)
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfText,
          numQuestions,
          difficulty,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      // Store questions in sessionStorage and redirect
      sessionStorage.setItem("quizQuestions", JSON.stringify(data.questions));
      sessionStorage.setItem("quizConfig", JSON.stringify({ numQuestions, difficulty }));

      clearInterval(interval);
      router.push("/quiz");
    } catch (err: unknown) {
      clearInterval(interval);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setIsGenerating(false);
      setLoadingStep(0);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background ambient blobs */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="text-center mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 text-xs font-mono tracking-widest text-amber-glow uppercase">
            <Sparkles className="w-3 h-3" />
            AI-Powered Quiz Generator
          </div>

          <h1
            className="font-display text-6xl md:text-7xl font-800 tracking-tight leading-none mb-6"
            style={{ color: "var(--text-primary)" }}
          >
            Quiz
            <span
              className="italic amber-glow-text"
              style={{ color: "var(--amber-light)" }}
            >
              Forge
            </span>
          </h1>

          <p
            className="text-lg md:text-xl max-w-lg mx-auto leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Upload any PDF — textbooks, papers, notes — and forge an
            intelligent quiz in seconds.
          </p>
        </header>

        {/* Feature pills */}
        <div
          className="flex flex-wrap justify-center gap-3 mb-12 animate-fade-up stagger-2"
          style={{ opacity: 0 }}
        >
          {[
            { icon: Zap, text: "Instant generation" },
            { icon: BookOpen, text: "Smart questions" },
            { icon: Shield, text: "Works offline" },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: "var(--amber)" }} />
              {text}
            </div>
          ))}
        </div>

        {/* Main card */}
        <div
          className="glass rounded-2xl p-8 md:p-10 animate-fade-up stagger-3"
          style={{ opacity: 0 }}
        >
          {/* Drop Zone */}
          <div className="mb-8">
            <label
              className="block text-sm font-medium mb-3 font-mono tracking-wider uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              01 — Upload PDF
            </label>

            <div
              {...getRootProps()}
              className={cn(
                "relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300",
                isDragActive
                  ? "drop-zone-active"
                  : file
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-white/10 hover:border-amber-500/40 hover:bg-amber-500/3"
              )}
            >
              <input {...getInputProps()} />

              {file ? (
                <div className="flex items-center justify-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(16,185,129,0.15)" }}
                  >
                    <FileText
                      className="w-6 h-6"
                      style={{ color: "var(--emerald)" }}
                    />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="ml-auto p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" style={{ color: "var(--text-dim)" }} />
                  </button>
                </div>
              ) : (
                <div>
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(245,158,11,0.1)" }}
                  >
                    <Upload
                      className={cn(
                        "w-7 h-7 transition-transform",
                        isDragActive ? "scale-125" : ""
                      )}
                      style={{ color: "var(--amber)" }}
                    />
                  </div>
                  <p className="font-medium mb-1">
                    {isDragActive
                      ? "Drop it like it's hot…"
                      : "Drag & drop your PDF here"}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    or{" "}
                    <span
                      className="underline underline-offset-2 cursor-pointer"
                      style={{ color: "var(--amber)" }}
                    >
                      browse files
                    </span>{" "}
                    — max 20MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Configuration */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Num Questions */}
            <div>
              <label
                className="block text-sm font-medium mb-3 font-mono tracking-wider uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                02 — Questions
              </label>
              <div className="relative">
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl appearance-none font-body font-medium cursor-pointer focus:outline-none transition-all"
                  style={{
                    background: "rgba(28,28,40,0.8)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  {QUESTION_OPTIONS.map((n) => (
                    <option key={n} value={n} style={{ background: "#13131A" }}>
                      {n} Questions
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: "var(--text-dim)" }}
                />
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label
                className="block text-sm font-medium mb-3 font-mono tracking-wider uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                03 — Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTY_OPTIONS.map(({ value, label, desc, color }) => (
                  <button
                    key={value}
                    onClick={() => setDifficulty(value)}
                    className={cn(
                      "px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-center",
                      difficulty === value
                        ? color === "emerald"
                          ? "border border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                          : color === "amber"
                          ? "border border-amber-500/60 bg-amber-500/10 text-amber-400"
                          : "border border-rose-500/60 bg-rose-500/10 text-rose-400"
                        : "border border-white/10 hover:border-white/20 text-gray-400 hover:text-gray-300"
                    )}
                  >
                    <div className="font-semibold">{label}</div>
                    <div className="text-xs opacity-70 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-xl mb-6"
              style={{
                background: "rgba(244,63,94,0.1)",
                border: "1px solid rgba(244,63,94,0.3)",
              }}
            >
              <AlertCircle
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: "var(--rose)" }}
              />
              <p className="text-sm" style={{ color: "#fda4af" }}>
                {error}
              </p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !file}
            className={cn(
              "w-full py-4 rounded-xl font-display font-semibold text-base tracking-wide transition-all duration-300 relative overflow-hidden",
              isGenerating || !file
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-[1.01] hover:shadow-lg active:scale-[0.99]"
            )}
            style={{
              background: isGenerating
                ? "rgba(245,158,11,0.3)"
                : "linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)",
              color: isGenerating ? "rgba(245,242,235,0.7)" : "#0A0A0F",
              boxShadow: !isGenerating && file
                ? "0 0 30px rgba(245,158,11,0.3)"
                : "none",
            }}
          >
            {isGenerating && (
              <div className="absolute inset-0 shimmer" />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {isGenerating ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray="60"
                      strokeDashoffset="20"
                      strokeLinecap="round"
                    />
                  </svg>
                  {LOADING_STEPS[loadingStep]}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Quiz
                </>
              )}
            </span>
          </button>

          {!file && (
            <p
              className="text-center text-xs mt-3"
              style={{ color: "var(--text-dim)" }}
            >
              Upload a PDF to get started
            </p>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center mt-10">
          <p className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>
            Powered by Gemini AI · Your data is never stored
          </p>
        </footer>
      </div>
    </div>
  );
}
