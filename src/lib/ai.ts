import { Question, QuizConfig } from "@/types/quiz";

const SYSTEM_PROMPT = `You are an expert quiz generator. Your job is to create high-quality quiz questions from the provided text. You must respond ONLY with a valid JSON object. Do not include markdown formatting or explanations outside the JSON.`;

function buildUserPrompt(text: string, config: QuizConfig): string {
  const { numQuestions, difficulty } = config;
  const mcCount = Math.ceil(numQuestions * 0.75);
  const essayCount = numQuestions - mcCount;

  return `Based on the following text, generate exactly ${numQuestions} quiz questions.
- Difficulty: ${difficulty.toUpperCase()}
- Generate ${mcCount} multiple choice questions and ${essayCount} essay/short answer questions.

Return a JSON object EXACTLY matching this structure:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "The question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "The exact text of the correct option",
      "explanation": "Why this answer is correct."
    },
    {
      "type": "essay",
      "question": "The essay question text",
      "correctAnswer": "Key points for the correct answer",
      "explanation": "Why these points are important."
    }
  ]
}

TEXT TO ANALYZE:
---
${text}
---`;
}

export async function generateQuiz(text: string, config: QuizConfig): Promise<Question[]> {
  try {
    // Groq بيستحمل نصوص كبيرة، هناخد أول 15 ألف حرف
    const safeText = text.substring(0, 15000); 
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
       throw new Error("مفتاح GROQ_API_KEY مش موجود. تأكد من إضافته في إعدادات Vercel.");
    }

    // إرسال الطلب لـ Groq مباشرة بدون مكتبات خارجية
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(safeText, config) }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" } // دي بتجبره يرجع JSON سليم 100%
      })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "مشكلة في الاتصال بسيرفر الذكاء الاصطناعي.");
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    const parsed = JSON.parse(content);
    
    // التأكد من استخراج مصفوفة الأسئلة
    if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions;
    } else {
        throw new Error("الذكاء الاصطناعي لم يرجع الأسئلة بالصيغة الصحيحة.");
    }

  } catch (error: any) {
    console.error("Groq AI Error:", error);
    throw new Error(error.message || "حدث خطأ غير معروف.");
  }
}