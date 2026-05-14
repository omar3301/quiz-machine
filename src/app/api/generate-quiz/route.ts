import { NextResponse } from "next/server";
import { generateQuiz } from "@/lib/ai";
import { QuizConfig } from "@/types/quiz";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pdfText: string = body.pdfText || body.text || body.extractedText || "";
    const numQuestions: number = body.config?.numQuestions ?? body.numQuestions ?? 10;
    const difficulty: string = body.config?.difficulty ?? body.difficulty ?? "medium";
    const includeEssay: boolean = body.includeEssay !== undefined ? Boolean(body.includeEssay) : true;

    if (!pdfText || pdfText.trim().length < 50)
      return NextResponse.json({ error: "Could not extract enough text from the PDF." }, { status: 400 });

    if (!["easy", "medium", "hard"].includes(difficulty))
      return NextResponse.json({ error: "Invalid difficulty." }, { status: 400 });

    const parsed = parseInt(String(numQuestions));
    if (isNaN(parsed) || parsed < 1 || parsed > 30)
      return NextResponse.json({ error: "Questions must be 1–30." }, { status: 400 });

    const config = { numQuestions: parsed, difficulty: difficulty as QuizConfig["difficulty"], includeEssay };
    const questions = await generateQuiz(pdfText, config);

    return NextResponse.json({ success: true, questions, quiz: questions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
