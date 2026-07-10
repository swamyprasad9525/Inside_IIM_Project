import { ChatOpenAI } from "@langchain/openai";
import type { z } from "zod";

type Tier = "primary" | "fast" | "alt";

const instances: Partial<Record<Tier, ChatOpenAI>> = {};

const TIER_ENV_VAR: Record<Tier, string> = {
  primary: "NVIDIA_NIM_MODEL",
  fast: "NVIDIA_NIM_FAST_MODEL",
  alt: "NVIDIA_NIM_ALT_MODEL",
};

const TIER_DEFAULT_MODEL: Record<Tier, string> = {
  primary: "meta/llama-3.1-70b-instruct",
  fast: "meta/llama-3.1-8b-instruct",
  alt: "nvidia/llama-3.3-nemotron-super-49b-v1",
};

function buildClient(model: string): ChatOpenAI {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_NIM_API_KEY is not set. Add it to .env.local.");
  }

  return new ChatOpenAI({
    apiKey,
    model,
    temperature: 0.2,
    configuration: {
      baseURL: process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1",
    },
  });
}

/**
 * Three separate NIM model deployments (70B / 8B / Nemotron-49B) used across different
 * pipeline steps. This isn't just a latency optimization — since NIM's free tier tracks
 * rate limits per model deployment, spreading the ~9 calls a single research run makes
 * across three distinct models reduces how often any one of them gets rate-limited.
 * Not a guaranteed fix (if NIM throttles per-account rather than per-model this won't
 * help), but it's a one-line-per-call change worth having regardless.
 */
export function getLLM(tier: Tier = "primary"): ChatOpenAI {
  if (!instances[tier]) {
    instances[tier] = buildClient(process.env[TIER_ENV_VAR[tier]] || TIER_DEFAULT_MODEL[tier]);
  }
  return instances[tier];
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`No JSON object found in model output: ${text.slice(0, 300)}`);
  }
  return text.slice(start, end + 1);
}

function isRetryableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("429") || /abort|timeout/i.test(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Prompt-based structured output with retries, used instead of native tool-calling
 * because open-weight models served via NIM have inconsistent function-calling support.
 * This works uniformly across any OpenAI-compatible endpoint.
 *
 * Retries on a 429 wait before trying again (2s, then 5s) instead of immediately
 * re-hitting the same rate limit window — immediate retries just fail the same way.
 */
export async function structuredCall<T>(
  schema: z.ZodType<T>,
  systemPrompt: string,
  userPrompt: string,
  opts?: { tier?: Tier }
): Promise<T> {
  const llm = getLLM(opts?.tier ?? "primary");
  const jsonInstruction =
    "\n\nRespond with ONLY a single valid JSON object matching the required shape. No markdown code fences, no commentary, no text before or after the JSON.";
  const RETRY_BACKOFF_MS = [2000, 5000];

  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const prompt =
      attempt === 0
        ? userPrompt + jsonInstruction
        : `${userPrompt}${jsonInstruction}\n\nYour previous response failed validation with this error:\n${lastError}\nFix it and return only valid JSON.`;

    let text: string;
    try {
      const res = await llm.invoke(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        { timeout: 100000 }
      );
      text = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (isRetryableError(err) && attempt < RETRY_BACKOFF_MS.length) {
        await sleep(RETRY_BACKOFF_MS[attempt]);
      }
      continue;
    }

    try {
      const jsonStr = extractJson(text);
      const parsed = JSON.parse(jsonStr);
      const result = schema.safeParse(parsed);
      if (result.success) return result.data;
      lastError = result.error.message;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`Structured LLM call failed after retries: ${lastError}`);
}
