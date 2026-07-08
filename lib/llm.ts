import { ChatOpenAI } from "@langchain/openai";
import type { z } from "zod";

let llmInstance: ChatOpenAI | null = null;

export function getLLM(): ChatOpenAI {
  if (llmInstance) return llmInstance;

  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_NIM_API_KEY is not set. Add it to .env.local.");
  }

  llmInstance = new ChatOpenAI({
    apiKey,
    model: process.env.NVIDIA_NIM_MODEL || "meta/llama-3.1-70b-instruct",
    temperature: 0.2,
    configuration: {
      baseURL: process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1",
    },
  });
  return llmInstance;
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`No JSON object found in model output: ${text.slice(0, 300)}`);
  }
  return text.slice(start, end + 1);
}

/**
 * Prompt-based structured output with a one-shot repair retry, used instead of
 * native tool-calling because open-weight models served via NIM have inconsistent
 * function-calling support. This works uniformly across any OpenAI-compatible endpoint.
 */
export async function structuredCall<T>(
  schema: z.ZodType<T>,
  systemPrompt: string,
  userPrompt: string
): Promise<T> {
  const llm = getLLM();
  const jsonInstruction =
    "\n\nRespond with ONLY a single valid JSON object matching the required shape. No markdown code fences, no commentary, no text before or after the JSON.";

  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const prompt =
      attempt === 0
        ? userPrompt + jsonInstruction
        : `${userPrompt}${jsonInstruction}\n\nYour previous response failed validation with this error:\n${lastError}\nFix it and return only valid JSON.`;

    const res = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ]);

    const text = typeof res.content === "string" ? res.content : JSON.stringify(res.content);

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
