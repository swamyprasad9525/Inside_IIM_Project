import { z } from "zod";
import { structuredCall } from "@/lib/llm";
import type { GraphStateType } from "@/lib/graph/state";

const CaseSchema = z.object({
  summary: z.string(),
  points: z.array(z.object({ claim: z.string(), sourceIds: z.array(z.string()) })),
});

export async function bearNode(state: GraphStateType) {
  try {
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
  } catch (err) {
    return {
      bearCase: {
        stance: "bear" as const,
        summary: "Bear case could not be generated due to an error.",
        points: [],
      },
      trace: [
        `Bear case failed, continuing without it: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      ],
    };
  }
}
