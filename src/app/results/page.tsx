"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trophy,
  Target,
  Clock,
  Lightbulb,
  Minus,
} from "lucide-react";
import { Question, UserAnswer } from "@/types/quiz";
import { cn, formatScore, getScoreColor } from "@/lib/utils";

interface Results {
  questions: Question[];
  userAnswers: UserAnswer[];
  score: number;
  totalQuestions: number;
  elapsedSeconds: number;
}

function ScoreRing({
  score,
  total,
}: {
  score: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference * (1 - pct / 100);

  const strokeColor =
    pct >= 75 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#F43F5E";

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 1s ease",
            filter: `drop-shadow(0 0 8px ${strokeColor}80)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold">{pct}%</span>
        <span
          className="text-xs font-mono"
          style={{ color: "var(--text-dim)" }}
        >
          {score}/{total}
        </span>
      </div>
    </div>
  );
}

function QuestionReview({
  question,
  userAnswer,
  index,
}: {
  question: Question;
  userAnswer: UserAnswer;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const { isCorrect } = userAnswer;

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden transition-all duration-200 border",
        isCorrect
          ? "border-emerald-500/20"
          : userAnswer.answer
          ? "border-rose-500/20"
          : "border-white/10"
      )}
      style={{
        background: isCorrect
          ? "rgba(16,185,129,0.04)"
          : userAnswer.answer
          ? "rgba(244,63,94,0.04)"
          : "rgba(28,28,40,0.4)",
      }}
    >
      {/* Header */}
      <button
        className="w-full flex items-start gap-4 p-5 text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="shrink-0 mt-0.5">
          {!userAnswer.answer ? (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <Minus className="w-3 h-3" style={{ color: "var(--text-dim)" }} />
            </div>
          ) : isCorrect ? (
            <CheckCircle className="w-6 h-6" style={{ color: "var(--emerald)" }} />
          ) : (
            <XCircle className="w-6 h-6" style={{ color: "var(--rose)" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-mono"
              style={{ color: "var(--text-dim)" }}
            >
              Q{index + 1}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{
                background:
                  question.type === "multiple_choice"
                    ? "rgba(245,158,11,0.1)"
                    : "rgba(139,92,246,0.1)",
                color:
                  question.type === "multiple_choice" ? "var(--amber)" : "#a78bfa",
              }}
            >
              {question.type === "multiple_choice" ? "MC" : "Essay"}
            </span>
          </div>
          <p className="text-sm leading-relaxed font-medium pr-4">
            {question.question}
          </p>
        </div>
        <div className="shrink-0 mt-1">
          {expanded ? (
            <ChevronUp className="w-4 h-4" style={{ color: "var(--text-dim)" }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: "var(--text-dim)" }} />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div
          className="px-5 pb-5 border-t"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="pt-4 space-y-4">
            {question.type === "multiple_choice" && (
              <div className="space-y-2">
                {question.options.map((opt, i) => {
                  const isCorrectOpt = opt === question.correctAnswer;
                  const isUserOpt = opt === userAnswer.answer;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm",
                        isCorrectOpt
                          ? "border border-emerald-500/40 bg-emerald-500/8"
                          : isUserOpt && !isCorrectOpt
                          ? "border border-rose-500/40 bg-rose-500/8"
                          : "border border-white/5 bg-white/2"
                      )}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-mono font-medium"
                        style={{
                          background: isCorrectOpt
                            ? "rgba(16,185,129,0.2)"
                            : isUserOpt
                            ? "rgba(244,63,94,0.2)"
                            : "rgba(255,255,255,0.06)",
                          color: isCorrectOpt
                            ? "var(--emerald)"
                            : isUserOpt
                            ? "var(--rose)"
                            : "var(--text-dim)",
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span
                        style={{
                          color: isCorrectOpt
                            ? "#34d399"
                            : isUserOpt && !isCorrectOpt
                            ? "#fb7185"
                            : "var(--text-secondary)",
                        }}
                      >
                        {opt}
                      </span>
                      {isCorrectOpt && (
                        <span
                          className="ml-auto text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{
                            background: "rgba(16,185,129,0.15)",
                            color: "var(--emerald)",
                          }}
                        >
                          Correct
                        </span>
                      )}
                      {isUserOpt && !isCorrectOpt && (
                        <span
                          className="ml-auto text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{
                            background: "rgba(244,63,94,0.15)",
                            color: "var(--rose)",
                          }}
                        >
                          Your answer
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {question.type === "essay" && (
              <div className="space-y-3">
                <div>
                  <p
                    className="text-xs font-mono uppercase tracking-wider mb-2"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Your answer
                  </p>
                  <div
                    className="px-4 py-3 rounded-lg text-sm leading-relaxed"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: userAnswer.answer
                        ? "var(--text-primary)"
                        : "var(--text-dim)",
                    }}
                  >
                    {userAnswer.answer || "Not answered"}
                  </div>
                </div>
                <div>
                  <p
                    className="text-xs font-mono uppercase tracking-wider mb-2"
                    style={{ color: "var(--emerald)" }}
                  >
                    Model answer
                  </p>
                  <div
                    className="px-4 py-3 rounded-lg text-sm leading-relaxed"
                    style={{
                      background: "rgba(16,185,129,0.06)",
                      border: "1px solid rgba(16,185,129,0.2)",
                    }}
                  >
                    {question.correctAnswer}
                  </div>
                </div>
              </div>
            )}

            {/* Explanation */}
            <div
              className="flex gap-3 px-4 py-3 rounded-lg"
              style={{
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.15)",
              }}
            >
              <Lightbulb
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: "var(--amber)" }}
              />
              <p className="text-sm leading-relaxed" style={{ color: "#fcd34d" }}>
                {question.explanation}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<Results | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("quizResults");
    if (!stored) {
      router.replace("/");
      return;
    }
    try {
      setResults(JSON.parse(stored));
    } catch {
      router.replace("/");
    }
  }, [router]);

  const handleRetry = () => {
    sessionStorage.removeItem("quizResults");
    sessionStorage.removeItem("quizQuestions");
    sessionStorage.removeItem("quizConfig");
    router.push("/");
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{
            borderColor: "var(--amber)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  const { questions, userAnswers, score, totalQuestions, elapsedSeconds } = results;
  const mcQuestions = questions.filter((q) => q.type === "multiple_choice");
  const mcCorrect = userAnswers.filter(
    (a, i) => questions[i].type === "multiple_choice" && a.isCorrect
  ).length;
  const essayAttempted = userAnswers.filter(
    (a, i) => questions[i].type === "essay" && a.answer.trim()
  ).length;
  const essayTotal = questions.filter((q) => q.type === "essay").length;
  const pct = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  return (
    <div className="min-h-screen relative">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-15 pointer-events-none"
        style={{
          background:
            pct >= 75
              ? "radial-gradient(ellipse, rgba(16,185,129,0.5) 0%, transparent 70%)"
              : pct >= 50
              ? "radial-gradient(ellipse, rgba(245,158,11,0.5) 0%, transparent 70%)"
              : "radial-gradient(ellipse, rgba(244,63,94,0.5) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        {/* Score hero */}
        <div className="text-center mb-10 animate-fade-up">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 text-xs font-mono tracking-wider uppercase"
            style={{ color: "var(--amber)" }}
          >
            <Trophy className="w-3.5 h-3.5" />
            Quiz Complete
          </div>

          <ScoreRing score={score} total={totalQuestions} />

          <h1
            className={cn(
              "font-display text-4xl font-bold mt-6 mb-2",
              getScoreColor(score, totalQuestions)
            )}
          >
            {formatScore(score, totalQuestions)}
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            You scored{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {score} out of {totalQuestions}
            </strong>{" "}
            questions correctly.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            {
              icon: Target,
              label: "Multiple Choice",
              value:
                mcQuestions.length > 0
                  ? `${mcCorrect}/${mcQuestions.length}`
                  : "—",
              color: "var(--amber)",
            },
            {
              icon: Trophy,
              label: "Essays Attempted",
              value:
                essayTotal > 0 ? `${essayAttempted}/${essayTotal}` : "—",
              color: "#a78bfa",
            },
            {
              icon: Clock,
              label: "Time Taken",
              value: formatTime(elapsedSeconds),
              color: "var(--emerald)",
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="glass rounded-xl p-4 text-center">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
                style={{ background: `${color}18` }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p
                className="font-display text-xl font-bold mb-0.5"
                style={{ color }}
              >
                {value}
              </p>
              <p
                className="text-xs font-mono"
                style={{ color: "var(--text-dim)" }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Review section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-semibold">
              Question Review
            </h2>
            <p
              className="text-xs font-mono"
              style={{ color: "var(--text-dim)" }}
            >
              Click to expand
            </p>
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => (
              <QuestionReview
                key={i}
                question={q}
                userAnswer={userAnswers[i]}
                index={i}
              />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-6 py-3 rounded-xl glass glass-hover font-medium transition-all hover:scale-[1.02]"
          >
            <RotateCcw className="w-4 h-4" />
            New Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
