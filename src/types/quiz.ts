export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "multiple_choice" | "essay";

export interface MultipleChoiceQuestion {
  type: "multiple_choice";
  question: string;
  options: [string, string, string, string];
  correctAnswer: string;
  explanation: string;
}

export interface EssayQuestion {
  type: "essay";
  question: string;
  options?: never;
  correctAnswer: string;
  explanation: string;
}

export type Question = MultipleChoiceQuestion | EssayQuestion;

export interface QuizConfig {
  numQuestions: number;
  difficulty: Difficulty;
}

export interface GenerateQuizRequest {
  pdfText: string;
  config: QuizConfig;
}

export interface GenerateQuizResponse {
  questions: Question[];
  error?: string;
}

export interface UserAnswer {
  questionIndex: number;
  answer: string;
  isCorrect: boolean;
}

export interface QuizResult {
  questions: Question[];
  userAnswers: UserAnswer[];
  score: number;
  totalQuestions: number;
}

export interface QuizState {
  questions: Question[];
  currentAnswers: Record<number, string>;
  submitted: boolean;
  results: QuizResult | null;
}
