# QuizForge — AI-Powered PDF Quiz Generator

Turn any PDF into an intelligent, interactive quiz in seconds using the Gemini (or OpenAI) API.

---

## ✨ Features

- **Drag-and-drop PDF upload** — up to 20MB
- **Configurable quizzes** — 5, 10, 15, or 20 questions; Easy / Medium / Hard
- **AI-generated questions** — Multiple choice (4 options) + Essay questions
- **Explanations** — Every question includes an AI explanation of the correct answer
- **Timer** — Tracks how long you take
- **Results dashboard** — Score ring, per-question breakdown, expandable reviews
- **Deployable on Vercel** — zero extra configuration needed

---

## 🗂 Project Structure

```
quizforge/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + Google Fonts
│   │   ├── globals.css         # Design tokens + global styles
│   │   ├── page.tsx            # Upload / Landing page
│   │   ├── quiz/page.tsx       # Interactive quiz UI
│   │   ├── results/page.tsx    # Score + question review
│   │   └── api/
│   │       └── generate-quiz/
│   │           └── route.ts    # PDF extraction + AI generation
│   ├── lib/
│   │   ├── ai.ts               # Gemini / OpenAI abstraction
│   │   ├── pdf.ts              # pdf-parse wrapper
│   │   └── utils.ts            # cn(), formatScore(), etc.
│   └── types/
│       └── quiz.ts             # All TypeScript interfaces
├── .env.example
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Option A — Gemini (recommended, generous free tier)
GEMINI_API_KEY=your_key_here
AI_PROVIDER=gemini

# Option B — OpenAI
# OPENAI_API_KEY=your_key_here
# AI_PROVIDER=openai
```

**Get your keys:**
- Gemini: https://aistudio.google.com/app/apikey
- OpenAI: https://platform.openai.com/api-keys

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deploy to Vercel

1. Push to GitHub
2. Import to Vercel at https://vercel.com/new
3. Add environment variables in Vercel dashboard:
   - `GEMINI_API_KEY` (or `OPENAI_API_KEY`)
   - `AI_PROVIDER` → `gemini` or `openai`
4. Deploy!

> **Note:** Free-tier Vercel functions have a 10-second timeout. For large PDFs, consider upgrading to Pro (60s timeout). The `maxDuration = 60` is already set in the API route.

---

## 🔧 Customization

### Change question count options
Edit `QUESTION_OPTIONS` in `src/app/page.tsx`:
```ts
const QUESTION_OPTIONS = [5, 10, 15, 20, 25, 30];
```

### Change AI model
In `src/lib/ai.ts`:
- Gemini: change `"gemini-1.5-flash"` to `"gemini-1.5-pro"` for higher quality
- OpenAI: change `"gpt-4o-mini"` to `"gpt-4o"` for higher quality

### Adjust question ratio
In `src/lib/ai.ts`, the `buildUserPrompt` function:
```ts
const mcCount = Math.ceil(numQuestions * 0.75); // 75% MC, 25% essay
```

---

## 📦 Key Dependencies

| Package | Purpose |
|---|---|
| `next` 14 | App Router framework |
| `pdf-parse` | Extract text from PDFs server-side |
| `@google/generative-ai` | Gemini API SDK |
| `openai` | OpenAI API SDK |
| `react-dropzone` | Drag-and-drop file upload |
| `framer-motion` | (available for future animations) |
| `lucide-react` | Icons |
| `tailwindcss` | Styling |

---

## 🎨 Design

- **Typography:** Syne (display) + DM Sans (body) + JetBrains Mono (code/labels)
- **Palette:** Dark ink (#0A0A0F) + warm amber (#F59E0B) accents
- **Effects:** Grain noise overlay, radial ambient blobs, glassmorphism cards

---

## ⚠️ Limitations

- **Scanned PDFs** (image-only) won't work — pdf-parse extracts text only
- **Password-protected PDFs** are not supported
- **Very large PDFs** (>200 pages) are truncated to ~120k characters to fit AI token limits
- Essay questions are marked "attempted/not attempted" since free-text grading requires AI comparison
