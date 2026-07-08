import { z } from "zod";
import { structuredCall } from "@/lib/llm";
import type { GraphStateType } from "@/lib/graph/state";

const GapSchema = z.object({
  hasCriticalGaps: z.boolean(),
  followUpQueries: z.array(z.object({ query: z.string(), category: z.string() })),
  reasoning: z.string(),
});

const MAX_RESEARCH_ROUNDS = 2;

export async function gapCheckNode(state: GraphStateType) {
  if (state.researchRound >= MAX_RESEARCH_ROUNDS) {
    return {
      followUpQueries: [],
      trace: ["Gap check: max research rounds reached, proceeding with available evidence"],
    };
  }

  try {
    const findingsText = JSON.stringify(state.findings, null, 2);
    const gap = await structuredCall(
      GapSchema,
      "You review research findings for an investment decision and identify if critical information is missing (e.g. no financial data found at all, or no risk information found). Only flag TRUE gaps that would materially change confidence in a decision — not minor details.",
      `Company: ${state.entity?.resolvedName}\n\nFindings so far:\n${findingsText}\n\nReturn JSON: { hasCriticalGaps, followUpQueries: [{query, category}] (max 3, only if hasCriticalGaps is true), reasoning }`
    );

    return {
      followUpQueries: gap.hasCriticalGaps ? gap.followUpQueries : [],
      trace: [
        gap.hasCriticalGaps
          ? `Gap check: found gaps, running follow-up searches - ${gap.reasoning}`
          : `Gap check: sufficient evidence found - ${gap.reasoning}`,
      ],
    };
  } catch (err) {
    return {
      followUpQueries: [],
      trace: [
        `Gap check skipped due to an error, proceeding with available evidence: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      ],
    };
  }
}
