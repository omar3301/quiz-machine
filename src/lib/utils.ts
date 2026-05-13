import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateText(text: string, maxLength: number = 150000): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function formatScore(score: number, total: number): string {
  const pct = Math.round((score / total) * 100);
  if (pct >= 90) return "Outstanding";
  if (pct >= 75) return "Great Job";
  if (pct >= 60) return "Good Effort";
  if (pct >= 40) return "Keep Practicing";
  return "Keep Going";
}

export function getScoreColor(score: number, total: number): string {
  const pct = Math.round((score / total) * 100);
  if (pct >= 75) return "text-emerald-glow";
  if (pct >= 50) return "text-amber-glow";
  return "text-rose-glow";
}
