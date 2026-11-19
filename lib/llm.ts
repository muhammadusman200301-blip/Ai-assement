import OpenAI from "openai";
import type { ZodType } from "zod";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY?.trim() });

/** Error with a short, safe reason code (never includes the key or raw message). */
export class LlmError extends Error {
  constructor(message: string, public reason: string) {
    super(message);
  }
}

function reasonOf(err: unknown): string {
  const e = err as { status?: number; code?: string };
  if (e?.code) return e.code; // e.g. invalid_api_key, insufficient_quota, model_not_found
  if (e?.status) return `http_${e.status}`;
  if (err instanceof SyntaxError) return "bad_json";
  return "unknown";
}

// Errors that will not fix themselves on retry
const FATAL = new Set(["invalid_api_key", "insufficient_quota", "http_401"]);

const PRIMARY = process.env.PRIMARY_MODEL?.trim() || "gpt-4o";
const FALLBACK = process.env.FALLBACK_MODEL?.trim() || "gpt-4o-mini";

export type LlmResult<T> = { data: T; model: string; attempts: number };

type Options = {
  system: string;
  user: string;
  /** Retries per model before moving to the fallback */
  retries?: number;
  timeoutMs?: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Ask the model for JSON and validate it with a Zod schema.
 * Order: primary model with retries, then the cheaper fallback model.
 * Invalid JSON or a schema mismatch counts as a failure and is retried,
 * so callers only ever get data that matches the schema.
 */
export async function structuredCompletion<T>(
  schema: ZodType<T>,
  { system, user, retries = 2, timeoutMs = 20_000 }: Options
): Promise<LlmResult<T>> {
  let attempts = 0;
  let lastError: unknown;

  for (const model of [PRIMARY, FALLBACK]) {
    for (let i = 0; i <= retries; i++) {
      attempts++;
      try {
        const res = await client.chat.completions.create(
          {
            model,
            temperature: 0.3,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          },
          { timeout: timeoutMs }
        );

        const raw = res.choices[0]?.message?.content ?? "";
        const parsed = schema.safeParse(JSON.parse(raw));
        if (parsed.success) return { data: parsed.data, model, attempts };

        lastError = new Error(`Schema mismatch: ${parsed.error.issues[0]?.message}`);
      } catch (err) {
        lastError = err;
        const reason = reasonOf(err);
        if (FATAL.has(reason)) throw new LlmError(`LLM call failed: ${reason}`, reason);
      }
      // simple exponential backoff: 400ms, 800ms, 1600ms...
      await sleep(400 * 2 ** i);
    }
  }

  throw new LlmError(`LLM failed after ${attempts} attempts`, reasonOf(lastError));
}
