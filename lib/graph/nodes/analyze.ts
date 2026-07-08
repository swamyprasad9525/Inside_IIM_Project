import { z } from "zod";
import { structuredCall } from "@/lib/llm";
import type { GraphStateType } from "@/lib/graph/state";

const RubricSchema = z.object({
  factors: z.array(
    z.object({
      factor: z.string(),
      score: z.number().min(1).max(5),
      justification: z.string(),
      sourceIds: z.array(z.string()),
    })
  ),
  overallWeightedScore: z.number(),
});

const RUBRIC_FACTORS = [
  "Business fundamentals",
  "Market position",
  "Leadership & execution",
  "Financial health",
  "Risk factors (score low if risk is high)",
];

export async function analyzeNode(state: GraphStateType) {
  const findingsText = JSON.stringify(state.findings, null, 2);

  const rubric = await structuredCall(
    RubricSchema,
    `You score a company against a fixed 5-factor investment rubric using ONLY the findings provided, citing sourceIds for each score. Factors: ${RUBRIC_FACTORS.join(
      ", "
    )}. Score each 1-5. If evidence for a factor is thin or missing, score conservatively (around 3) rather than guessing at an extreme.`,
    `Company: ${state.entity?.resolvedName}\n\nFindings:\n${findingsText}\n\nReturn JSON: { factors: [{factor, score, justification, sourceIds}] (all 5 factors), overallWeightedScore (average of the 5 scores, 1-5) }`
  );

  return {
    rubric,
    trace: [`Rubric scored: overall ${rubric.overallWeightedScore.toFixed(1)}/5`],
  };
}
