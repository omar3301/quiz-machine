import { NextResponse } from "next/server";
import { generateQuiz } from "@/lib/ai";
import { QuizConfig } from "@/types/quiz";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // سحب النص والإعدادات سواء الفرونت إند بعتهم بأي مسمى
    const text = body.text || body.extractedText || body.pdfText || "";
    const config: QuizConfig = body.config || {
      numQuestions: body.numQuestions || 10,
      difficulty: body.difficulty || "medium"
    };

    if (!text) {
      return NextResponse.json({ success: false, error: "لم يتم العثور على نص في الملف." }, { status: 400 });
    }

    const questions = await generateQuiz(text, config);
    
    // الفرونت إند بتاعك ممكن يكون مستني questions أو quiz
    return NextResponse.json({ success: true, questions, quiz: questions });

  } catch (error: any) {
    console.error("Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "حدث خطأ غير متوقع." },
      { status: 500 }
    );
  }
}