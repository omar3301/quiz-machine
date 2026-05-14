"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  FileText, Upload, Sparkles, X,
  BookOpen, Zap, Shield, ScanText, AlignLeft, Instagram,
} from "lucide-react";
import { Difficulty } from "@/types/quiz";
import { cn } from "@/lib/utils";
import { ToastContainer, useToast } from "@/components/Toast";
import PasscodeGate from "@/components/PasscodeGate";

const QUESTION_OPTIONS = [5, 10, 15, 20, 25, 30];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; desc: string }[] = [
  { value: "easy",   label: "Easy",   desc: "Facts & recall" },
  { value: "medium", label: "Medium", desc: "Understanding"  },
  { value: "hard",   label: "Hard",   desc: "Analysis"       },
];

const LOADING_STEPS = [
  "Reading your PDF…",
  "Extracting concepts…",
  "Crafting questions…",
  "Finalizing quiz…",
];

function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
      {number} — {label}
    </p>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { toasts, addToast, removeToast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [includeEssay, setIncludeEssay] = useState(true);
  const [pageFrom, setPageFrom] = useState("");
  const [pageTo, setPageTo]   = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [ocrActive, setOcrActive] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Drop ────────────────────────────────────────────────────
  const onDrop = useCallback(async (accepted: File[]) => {
    const dropped = accepted[0];
    if (!dropped) return;
    setFile(dropped);
    setPageFrom(""); setPageTo("");

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const buf = await dropped.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      setPdfPageCount(pdf.numPages);
    } catch { setPdfPageCount(0); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 25 * 1024 * 1024,
    onDropRejected: (r) =>
      addToast(r[0]?.errors[0]?.code === "file-too-large" ? "PDF must be under 25MB." : "Please upload a PDF file.", "error"),
  });

  // ── Page-range validation ───────────────────────────────────
  const validatePageRange = (): { from: number; to: number } | null => {
    if (!pageFrom && !pageTo) return null;
    const from = parseInt(pageFrom || "1");
    const to   = parseInt(pageTo   || String(pdfPageCount || 9999));
    if (isNaN(from) || isNaN(to) || from < 1 || to < 1) {
      addToast("Page numbers must be positive integers.", "error"); return null;
    }
    if (from > to) {
      addToast(`"From" page (${from}) cannot exceed "To" page (${to}).`, "error"); return null;
    }
    if (pdfPageCount && from > pdfPageCount) {
      addToast(`This PDF only has ${pdfPageCount} pages. Page ${from} doesn't exist.`, "error"); return null;
    }
    const cappedTo = pdfPageCount ? Math.min(to, pdfPageCount) : to;
    if (pdfPageCount && to > pdfPageCount)
      addToast(`Capping "To" at ${pdfPageCount} (last page).`, "info");
    return { from, to: cappedTo };
  };

// ── Extract text ────────────────────────────────────────────
  const extractText = async (pdfFile: File, range: { from: number; to: number } | null): Promise<string> => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const buf  = await pdfFile.arrayBuffer();
    const pdf  = await pdfjsLib.getDocument({ data: buf }).promise;
    const start = range?.from ?? 1;
    const end   = Math.min(range?.to ?? pdf.numPages, pdf.numPages);

    let text = ""; let empty = 0;
    
    for (let i = start; i <= end; i++) {
      try {
        const page    = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        let pt = "";
        // استخدام حلقة for آمنة جداً لمتصفح سفاري بدل map و join
        if (content && content.items && content.items.length > 0) {
          for (let j = 0; j < content.items.length; j++) {
            const item = content.items[j] as any;
            if (item && typeof item.str === "string") {
              pt += item.str + " ";
            }
          }
        }
        
        pt = pt.trim();
        
        if (!pt) empty++;
        text += pt + "\n";
      } catch (err) {
        console.warn(`Error reading page ${i}:`, err);
        empty++; // لو صفحة ضربت، نعتبرها فاضية ونكمل عادي
        continue;
      }
    }

    const trimmed = text.trim();
    const total   = end - start + 1;
    
    if (!trimmed || trimmed.length < 100 || empty / total > 0.7) {
      setOcrActive(true);
      addToast("Scanned PDF detected — running OCR. Please wait…", "info");
      return runOCR(pdfFile, start, end, pdf.numPages);
    }
    
    return trimmed.slice(0, 120000);
  };
  // ── OCR via Tesseract ───────────────────────────────────────
  const runOCR = async (pdfFile: File, start: number, end: number, totalPages: number): Promise<string> => {
    const pdfjsLib = await import("pdfjs-dist");
    const { createWorker } = await import("tesseract.js");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const buf    = await pdfFile.arrayBuffer();
    const pdf    = await pdfjsLib.getDocument({ data: buf }).promise;
    const worker = await createWorker("eng");
    const canvas = document.createElement("canvas");
    const ctx    = canvas.getContext("2d")!;
    const maxPg  = Math.min(end, start + 19, totalPages); // max 20 pages for perf

    let ocrText = "";
    for (let i = start; i <= maxPg; i++) {
      const page     = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport, canvas } as Parameters<typeof page.render>[0]).promise;
      const { data } = await worker.recognize(canvas.toDataURL("image/png"));
      ocrText += data.text + "\n";
    }
    await worker.terminate();
    canvas.remove();

    const trimmed = ocrText.trim();
    if (!trimmed || trimmed.length < 50)
      throw new Error("OCR failed — PDF may be too blurry or corrupted.");
    return trimmed.slice(0, 120000);
  };

  // ── Generate ────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!file) { addToast("Please upload a PDF first.", "error"); return; }

    const range = validatePageRange();
    // If user typed something invalid, validatePageRange already toasted and returns null for bad ranges
    if ((pageFrom || pageTo) && range === null) return;

    setIsGenerating(true); setOcrActive(false);

    let step = 0;
    intervalRef.current = setInterval(() => {
      step = Math.min(step + 1, LOADING_STEPS.length - 1);
      setLoadingStep(step);
    }, 4000);

    const cleanup = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setLoadingStep(0);
    };

    try {
      const pdfText = await extractText(file, range);

      const res  = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfText, numQuestions, difficulty, includeEssay }),
      });
      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.error ?? "Server error.");

      const questions = data.questions ?? data.quiz;
      if (!questions?.length) throw new Error("No questions generated. Try a different PDF.");

      sessionStorage.setItem("quizQuestions", JSON.stringify(questions));
      sessionStorage.setItem("quizConfig", JSON.stringify({ numQuestions, difficulty }));

      cleanup();
      router.push("/quiz");
    } catch (err: unknown) {
      cleanup();
      addToast(err instanceof Error ? err.message : "Unexpected error.", "error");
      setIsGenerating(false); setOcrActive(false);
    }
  };

  const sectionNum = (n: number) => {
    // Offset section numbers if page range row is visible
    const base = file && pdfPageCount > 0 ? n + 1 : n;
    return String(base).padStart(2, "0");
  };

  return (
    <PasscodeGate>
      <div className="min-h-screen relative overflow-hidden">
        {/* Ambient */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)", filter: "blur(80px)" }} />

        <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

          {/* Header */}
          <header className="text-center mb-10 animate-fade-up">
            <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight leading-none mb-4">
              Quiz<span className="italic amber-glow-text" style={{ color: "var(--amber-light)" }}>Forge</span>
            </h1>
            <p className="text-base sm:text-lg max-w-md mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Upload any PDF and generate a smart, interactive quiz in seconds.
            </p>
          </header>

          {/* Pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {[
              { icon: Zap, text: "Instant" },
              { icon: BookOpen, text: "Smart questions" },
              { icon: ScanText, text: "OCR support" },
              { icon: Shield, text: "Private" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs"
                style={{ color: "var(--text-secondary)" }}>
                <Icon className="w-3 h-3" style={{ color: "var(--amber)" }} />
                {text}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="glass rounded-2xl p-6 sm:p-8 animate-fade-up">

            {/* 01 Upload */}
            <SectionLabel number="01" label="Upload PDF" />
            <div {...getRootProps()} className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 mb-6",
              isDragActive ? "drop-zone-active"
                : file ? "border-emerald-500/50 bg-emerald-500/5"
                : "border-white/10 hover:border-amber-500/40"
            )}>
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(16,185,129,0.15)" }}>
                    <FileText className="w-5 h-5" style={{ color: "var(--emerald)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{file.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                      {pdfPageCount > 0 && ` · ${pdfPageCount} pages`}
                    </p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); setPdfPageCount(0); setPageFrom(""); setPageTo(""); }}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0">
                    <X className="w-4 h-4" style={{ color: "var(--text-dim)" }} />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: "rgba(245,158,11,0.1)" }}>
                    <Upload className={cn("w-6 h-6 transition-transform", isDragActive && "scale-125")}
                      style={{ color: "var(--amber)" }} />
                  </div>
                  <p className="font-medium text-sm mb-1">
                    {isDragActive ? "Drop it here…" : "Drag & drop your PDF"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    or <span className="underline underline-offset-2" style={{ color: "var(--amber)" }}>browse files</span> — max 25MB
                  </p>
                </div>
              )}
            </div>

            {/* 02 Page Range (conditional) */}
            {file && pdfPageCount > 0 && (
              <div className="mb-6">
                <SectionLabel number="02" label={`Page Range — ${pdfPageCount} pages total`} />
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "From page", val: pageFrom, set: setPageFrom, placeholder: "1" },
                    { label: "To page",   val: pageTo,   set: setPageTo,   placeholder: String(pdfPageCount) },
                  ].map(({ label, val, set, placeholder }) => (
                    <div key={label}>
                      <p className="text-xs font-mono mb-1.5" style={{ color: "var(--text-dim)" }}>{label}</p>
                      <input type="number" min={1} max={pdfPageCount}
                        value={val} onChange={(e) => set(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all appearance-none"
                        style={{ background: "rgba(10,10,15,0.6)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-2 font-mono" style={{ color: "var(--text-dim)" }}>
                  Leave blank to process all pages
                </p>
              </div>
            )}

            {/* Questions count */}
            <div className="mb-6">
              <SectionLabel number={sectionNum(2)} label="Number of Questions" />
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {QUESTION_OPTIONS.map((n) => (
                  <button key={n} onClick={() => setNumQuestions(n)}
                    className={cn("py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                      numQuestions !== n && "border border-white/10 hover:border-white/20 text-gray-400 hover:text-gray-200")}
                    style={numQuestions === n ? {
                      background: "linear-gradient(135deg, #F59E0B, #FCD34D)", color: "#0A0A0F"
                    } : {}}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="mb-6">
              <SectionLabel number={sectionNum(3)} label="Difficulty" />
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTY_OPTIONS.map(({ value, label, desc }) => {
                  const activeClass = { easy: "border-emerald-500/60 bg-emerald-500/10 text-emerald-400", medium: "border-amber-500/60 bg-amber-500/10 text-amber-400", hard: "border-rose-500/60 bg-rose-500/10 text-rose-400" }[value];
                  return (
                    <button key={value} onClick={() => setDifficulty(value)}
                      className={cn("px-2 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-center border",
                        difficulty === value ? activeClass : "border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300")}>
                      <div className="font-semibold">{label}</div>
                      <div className="text-xs opacity-70 mt-0.5 hidden sm:block">{desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Essay toggle */}
            <div className="mb-8">
              <SectionLabel number={sectionNum(4)} label="Question Types" />
              <button onClick={() => setIncludeEssay(!includeEssay)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200"
                style={{
                  background: includeEssay ? "rgba(139,92,246,0.08)" : "rgba(10,10,15,0.4)",
                  border: `1px solid ${includeEssay ? "rgba(139,92,246,0.3)" : "var(--border)"}`,
                }}>
                <div className="flex items-center gap-3">
                  <AlignLeft className="w-4 h-4 shrink-0" style={{ color: includeEssay ? "#a78bfa" : "var(--text-dim)" }} />
                  <div className="text-left">
                    <p className="text-sm font-medium" style={{ color: includeEssay ? "#c4b5fd" : "var(--text-secondary)" }}>
                      Include Essay Questions
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
                      {includeEssay ? "Mix of multiple choice + short answer" : "Multiple choice only"}
                    </p>
                  </div>
                </div>
                <div className="relative w-11 h-6 shrink-0 ml-3">
                  <div className="absolute inset-0 rounded-full transition-all duration-300"
                    style={{ background: includeEssay ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.1)" }} />
                  <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300"
                    style={{ left: includeEssay ? "calc(100% - 22px)" : "2px" }} />
                </div>
              </button>
            </div>

            {/* OCR status */}
            {ocrActive && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
                style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <ScanText className="w-4 h-4 shrink-0 animate-pulse" style={{ color: "#a78bfa" }} />
                <p className="text-sm" style={{ color: "#c4b5fd" }}>Running OCR on scanned pages…</p>
              </div>
            )}

            {/* Generate */}
            <button onClick={handleGenerate} disabled={isGenerating || !file}
              className={cn(
                "w-full py-4 rounded-xl font-display font-semibold text-base tracking-wide transition-all duration-300 relative overflow-hidden",
                isGenerating || !file ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.01] active:scale-[0.99]"
              )}
              style={{
                background: isGenerating ? "rgba(245,158,11,0.3)" : "linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)",
                color: isGenerating ? "rgba(245,242,235,0.6)" : "#0A0A0F",
                boxShadow: !isGenerating && file ? "0 0 28px rgba(245,158,11,0.25)" : "none",
              }}>
              {isGenerating && <div className="absolute inset-0 shimmer" />}
              <span className="relative flex items-center justify-center gap-2">
                {isGenerating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                        strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round" />
                    </svg>
                    {LOADING_STEPS[loadingStep]}
                  </>
                ) : (
                  <><Sparkles className="w-4 h-4" />Generate Quiz</>
                )}
              </span>
            </button>

            {!file && (
              <p className="text-center text-xs mt-3" style={{ color: "var(--text-dim)" }}>
                Upload a PDF to get started
              </p>
            )}
          </div>

          {/* Footer branding */}
          <footer className="text-center mt-8">
            <a href="https://www.instagram.com/omar_abomosslam/"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass hover:bg-white/5 transition-all group">
              <Instagram className="w-3.5 h-3.5" style={{ color: "rgba(245,158,11,0.6)" }} />
              <span className="text-xs font-mono group-hover:text-amber-400 transition-colors"
                style={{ color: "var(--text-dim)" }}>
                Built by Omar Abomosslam
              </span>
            </a>
          </footer>
        </div>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </PasscodeGate>
  );
}
