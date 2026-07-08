import { z } from "zod";
import { structuredCall } from "@/lib/llm";
import type { GraphStateType } from "@/lib/graph/state";

const CaseSchema = z.object({
  summary: z.string(),
  points: z.array(z.object({ claim: z.string(), sourceIds: z.array(z.string()) })),
});

export async function bearNode(state: GraphStateType) {
  const result = await structuredCall(
    CaseSchema,
    "You are a skeptical investment analyst. Build the strongest HONEST case AGAINST investing in this company, using only the findings and rubric provided. Cite sourceIds for every point. Do not fabricate facts not present in the findings.",
    `Company: ${state.entity?.resolvedName}\n\nFindings:\n${JSON.stringify(
      state.findings
    )}\n\nRubric:\n${JSON.stringify(state.rubric)}\n\nReturn JSON: { summary, points: [{claim, sourceIds}] }`
  );

  return {
    bearCase: { stance: "bear" as const, ...result },
    trace: ["Bear case built"],
  };
}
