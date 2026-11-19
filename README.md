# AI Assessment

A small Next.js app that runs a technical skill assessment with an LLM. You pick a role and level, it writes practical interview questions, you answer them, and it grades each answer against a rubric and shows what you covered and what you missed.

Built with **Next.js (App Router)**, **TypeScript**, **OpenAI** and **Zod**.

## How it works

1. **Generate** – `POST /api/generate` asks the model for questions as JSON. Each question comes with a rubric of 2–6 points a strong answer should cover.
2. **Answer** – the user writes answers in the browser.
3. **Grade** – `POST /api/grade` sends the answers with their rubrics. The model only returns *which rubric points were covered* plus short feedback.
4. **Score** – the score is calculated in code (`lib/scoring.ts`), not by the model, so it's consistent and testable.

## Making the AI part reliable

- **Structured outputs** – every model response is parsed and checked with a Zod schema (`lib/schemas.ts`). Bad JSON or a wrong shape counts as a failure.
- **Retries with backoff** – each failed call is retried with exponential backoff.
- **Model fallback** – if the primary model keeps failing, the same request goes to a cheaper fallback model (`lib/llm.ts`).
- **Timeouts** – each call has a timeout so the UI never hangs.
- **Safe scoring** – out-of-range or duplicate rubric indexes from the model are ignored before scoring.
- **Clear errors** – the API returns a friendly message (HTTP 502) instead of crashing when the model can't be reached.

## Project structure

```
app/
  page.tsx               # UI: pick role, answer, see report
  api/generate/route.ts  # question generation
  api/grade/route.ts     # grading
lib/
  llm.ts                 # structured completion: validation, retries, fallback
  schemas.ts             # Zod schemas for requests and model output
  scoring.ts             # deterministic scoring and report
tests/
  scoring.test.ts        # unit tests for scoring
```

## Run it locally

```bash
npm install
cp .env.example .env.local   # add your OPENAI_API_KEY
npm run dev                  # http://localhost:3000
npm test                     # run unit tests
```

## Ideas for next steps

- Save attempts to PostgreSQL to track progress over time
- Add a timer and difficulty that adapts to earlier answers
- Stream feedback as it's generated
