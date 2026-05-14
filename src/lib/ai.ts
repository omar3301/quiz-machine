import { Question, QuizConfig } from "@/types/quiz";

const SYSTEM_PROMPT = `You are an expert quiz generator. Your job is to create high-quality quiz questions from the provided text. You must respond ONLY with a valid JSON object. Do not include markdown formatting or explanations outside the JSON.`;

function buildUserPrompt(text: string, config: QuizConfig & { includeEssay?: boolean }): string {
  const { numQuestions, difficulty, includeEssay = true } = config;

  const mcCount    = includeEssay ? Math.ceil(numQuestions * 0.75) : numQuestions;
  const essayCount = includeEssay ? numQuestions - mcCount : 0;

  const diffGuide = {
    easy:   "Focus on basic facts and definitions. Questions should be straightforward.",
    medium: "Focus on understanding and application of concepts.",
    hard:   "Focus on analysis, synthesis, critical evaluation, and edge cases.",
  }[difficulty];

  const essaySection = essayCount > 0
    ? `\n    {
      "type": "essay",
      "question": "The essay question text",
      "correctAnswer": "Key points for a strong answer",
      "explanation": "Why these points matter."
    }`
    : "";

  return `Based on the following text, generate exactly ${numQuestions} quiz questions.

DIFFICULTY: ${difficulty.toUpperCase()} — ${diffGuide}
BREAKDOWN: ${mcCount} multiple choice${essayCount > 0 ? ` + ${essayCount} essay/short answer` : " only (no essay questions)"}.

Return a JSON object EXACTLY matching this structure:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The exact text of the correct option (must match one of the 4 options exactly)",
      "explanation": "2-3 sentence explanation of why this answer is correct."
    }${essaySection}
  ]
}

RULES:
- correctAnswer for multiple choice MUST exactly match one of the 4 options strings.
- All options must be plausible and distinct.
- Questions must be directly derived from the text.
- Return ONLY the JSON object. No markdown, no extra text.

TEXT:
---
${text.substring(0, 15000)}
---`;
}

export async function generateQuiz(
  text: string,
  config: QuizConfig & { includeEssay?: boolean }
): Promise<Question[]> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured. Add it to your environment variables.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: buildUserPrompt(text, config) },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq API error: ${response.status}`);
  }

  const data    = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error("Empty response from AI.");

  const parsed = JSON.parse(content);

  if (parsed.questions && Array.isArray(parsed.questions)) {
    return parsed.questions as Question[];
  }

  // Fallback: maybe it returned an array directly
  if (Array.isArray(parsed)) return parsed as Question[];

  throw new Error("AI returned an unexpected format. Please try again.");
}
