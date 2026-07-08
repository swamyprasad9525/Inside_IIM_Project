import { z } from "zod";
import { structuredCall } from "@/lib/llm";
import type { GraphStateType } from "@/lib/graph/state";

const FindingsSchema = z.object({
  categories: z.array(
    z.object({
      category: z.string(),
      summary: z.string(),
      items: z.array(z.object({ claim: z.string(), sourceIds: z.array(z.string()) })),
    })
  ),
});

export async function synthesizeNode(state: GraphStateType) {
  if (state.sources.length === 0) {
    return {
      findings: [],
      trace: ["Synthesize: no sources available to synthesize"],
    };
  }

  const sourcesText = state.sources
    .map((s) => `[${s.id}] (${s.category}) ${s.title}\n${s.snippet}\nURL: ${s.url}`)
    .join("\n\n");

  const findings = await structuredCall(
    FindingsSchema,
    "You extract structured research findings from raw web search results for investment research. Every claim MUST cite the sourceIds it is based on. Do not invent facts that are not present in the sources. If a category has no supporting sources, say so in its summary with an empty items list.",
    `Company: ${state.entity?.resolvedName}\n\nRaw sources:\n${sourcesText}\n\nGroup findings into these categories: overview, news, financials, competition, risks. Return JSON: { categories: [{ category, summary, items: [{ claim, sourceIds }] }] }`
  );

  return {
    findings: findings.categories,
    trace: [
      `Synthesized ${findings.categories.reduce((n, c) => n + c.items.length, 0)} findings across ${
        findings.categories.length
      } categories`,
    ],
  };
}
