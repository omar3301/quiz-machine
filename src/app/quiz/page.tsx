"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Clock,
  BookOpen,
  Send,
  AlertCircle,
} from "lucide-react";
import { Question, QuizConfig } from "@/types/quiz";
import { cn } from "@/lib/utils";

export default function QuizPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("quizQuestions");
    const storedConfig = sessionStorage.getItem("quizConfig");
    if (!stored) {
      router.replace("/");
      return;
    }
    try {
      setQuestions(JSON.parse(stored));
      if (storedConfig) setConfig(JSON.parse(storedConfig));
      setLoaded(true);
    } catch {
      router.replace("/");
    }
  }, [router]);

  // Timer
  useEffect(() => {
    if (!loaded) return;
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, [loaded]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleAnswer = useCallback((idx: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [idx]: answer }));
  }, []);

  const handleSubmit = () => {
    setIsSubmitting(true);
    const userAnswers = questions.map((q, i) => {
      const userAns = answers[i] ?? "";
      const isCorrect =
        q.type === "multiple_choice"
          ? userAns.trim() === q.correctAnswer.trim()
          : userAns.trim().length > 0; // Essays: answered = "attempted"
      return { questionIndex: i, answer: userAns, isCorrect };
    });

    const score = userAnswers.filter((a) => a.isCorrect).length;

    sessionStorage.setItem(
      "quizResults",
      JSON.stringify({
        questions,
        userAnswers,
        score,
        totalQuestions: questions.length,
        elapsedSeconds: elapsed,
      })
    );

    router.push("/results");
  };

  const answeredCount = Object.keys(answers).filter(
    (k) => answers[Number(k)]?.trim()
  ).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
  const currentQ = questions[currentIdx];

  if (!loaded || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full border-2 animate-spin mx-auto mb-4"
            style={{
              borderColor: "var(--amber)",
              borderTopColor: "transparent",
            }}
          />
          <p style={{ color: "var(--text-secondary)" }}>Loading quiz…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Ambient blobs */}
      <div
        className="absolute top-0 right-0 w-96 h-96 opacity-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.15)" }}
            >
              <BookOpen className="w-4 h-4" style={{ color: "var(--amber)" }} />
            </div>
            <div>
              <p
                className="text-xs font-mono uppercase tracking-wider"
                style={{ color: "var(--text-dim)" }}
              >
                QuizForge
              </p>
              <p className="text-sm font-medium capitalize">
                {config?.difficulty ?? "medium"} · {questions.length} Questions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass">
            <Clock className="w-3.5 h-3.5" style={{ color: "var(--amber)" }} />
            <span className="font-mono text-sm">{formatTime(elapsed)}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-xs mb-2 font-mono" style={{ color: "var(--text-dim)" }}>
            <span>{answeredCount} answered</span>
            <span>{questions.length - answeredCount} remaining</span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-full progress-bar rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div
          key={currentIdx}
          className="glass rounded-2xl p-8 mb-6 animate-fade-up"
        >
          {/* Question header */}
          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-display font-bold text-sm"
              style={{
                background: "rgba(245,158,11,0.15)",
                color: "var(--amber)",
              }}
            >
              {currentIdx + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    background:
                      currentQ.type === "multiple_choice"
                        ? "rgba(245,158,11,0.1)"
                        : "rgba(139,92,246,0.1)",
                    color:
                      currentQ.type === "multiple_choice"
                        ? "var(--amber)"
                        : "#a78bfa",
                    border: `1px solid ${
                      currentQ.type === "multiple_choice"
                        ? "rgba(245,158,11,0.2)"
                        : "rgba(139,92,246,0.2)"
                    }`,
                  }}
                >
                  {currentQ.type === "multiple_choice"
                    ? "Multiple Choice"
                    : "Essay"}
                </span>
              </div>
              <h2 className="text-lg font-medium leading-relaxed">
                {currentQ.question}
              </h2>
            </div>
          </div>

          {/* Options or Textarea */}
          {currentQ.type === "multiple_choice" ? (
            <div className="space-y-3">
              {currentQ.options.map((option, i) => {
                const isSelected = answers[currentIdx] === option;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(currentIdx, option)}
                    className={cn(
                      "option-btn w-full text-left px-5 py-4 rounded-xl flex items-center gap-4 group",
                      isSelected ? "selected" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 font-mono text-xs font-medium transition-all",
                        isSelected
                          ? "border-amber-400 bg-amber-400/20 text-amber-300"
                          : "border-white/20 text-white/40 group-hover:border-white/40"
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-sm leading-relaxed">{option}</span>
                    {isSelected && (
                      <CheckCircle
                        className="ml-auto w-4 h-4 shrink-0"
                        style={{ color: "var(--amber)" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <textarea
                value={answers[currentIdx] ?? ""}
                onChange={(e) => handleAnswer(currentIdx, e.target.value)}
                placeholder="Write your answer here… Be thorough and specific."
                rows={5}
                className="w-full px-4 py-3 rounded-xl text-sm leading-relaxed resize-none focus:outline-none transition-all"
                style={{
                  background: "rgba(10,10,15,0.5)",
                  border: answers[currentIdx]
                    ? "1px solid rgba(245,158,11,0.4)"
                    : "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <p
                className="text-xs mt-2 text-right font-mono"
                style={{ color: "var(--text-dim)" }}
              >
                {(answers[currentIdx] ?? "").length} chars
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-xl glass glass-hover font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {/* Question dots */}
          <div className="flex gap-1.5 flex-wrap justify-center max-w-[200px]">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  i === currentIdx
                    ? "scale-125"
                    : answers[i]
                    ? "opacity-100"
                    : "opacity-30"
                )}
                style={{
                  background:
                    i === currentIdx
                      ? "var(--amber)"
                      : answers[i]
                      ? "var(--emerald)"
                      : "rgba(255,255,255,0.3)",
                }}
                title={`Q${i + 1}`}
              />
            ))}
          </div>

          {currentIdx < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all"
              style={{
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.3)",
                color: "var(--amber)",
              }}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #F59E0B, #FCD34D)",
                color: "#0A0A0F",
                boxShadow: "0 0 20px rgba(245,158,11,0.3)",
              }}
            >
              <Send className="w-4 h-4" />
              Submit Quiz
            </button>
          )}
        </div>

        {/* Submit from anywhere */}
        {currentIdx < questions.length - 1 && answeredCount === questions.length && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowConfirm(true)}
              className="text-sm underline underline-offset-2"
              style={{ color: "var(--amber)" }}
            >
              All answered — Submit Quiz →
            </button>
          </div>
        )}
      </div>

      {/* Confirm Submit Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(10,10,15,0.85)", backdropFilter: "blur(8px)" }}
        >
          <div className="glass rounded-2xl p-8 max-w-sm w-full animate-fade-up">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(245,158,11,0.15)" }}
            >
              <Send className="w-6 h-6" style={{ color: "var(--amber)" }} />
            </div>
            <h3 className="font-display text-xl font-semibold text-center mb-2">
              Submit Quiz?
            </h3>
            <p
              className="text-sm text-center mb-2 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              You&apos;ve answered {answeredCount} of {questions.length} questions.
            </p>
            {answeredCount < questions.length && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg mb-5 text-xs"
                style={{
                  background: "rgba(244,63,94,0.1)",
                  border: "1px solid rgba(244,63,94,0.2)",
                  color: "#fda4af",
                }}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {questions.length - answeredCount} question(s) unanswered.
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium glass glass-hover transition-all"
              >
                Keep Going
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, #F59E0B, #FCD34D)",
                  color: "#0A0A0F",
                }}
              >
                {isSubmitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
