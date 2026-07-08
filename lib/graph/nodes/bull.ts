import { z } from "zod";
import { structuredCall } from "@/lib/llm";
import type { GraphStateType } from "@/lib/graph/state";

const CaseSchema = z.object({
  summary: z.string(),
  points: z.array(z.object({ claim: z.string(), sourceIds: z.array(z.string()) })),
});

export async function bullNode(state: GraphStateType) {
  try {
    const result = await structuredCall(
      CaseSchema,
      "You are a bullish investment analyst. Build the strongest HONEST case FOR investing in this company, using only the findings and rubric provided. Cite sourceIds for every point. Do not fabricate facts not present in the findings.",
      `Company: ${state.entity?.resolvedName}\n\nFindings:\n${JSON.stringify(
        state.findings
      )}\n\nRubric:\n${JSON.stringify(state.rubric)}\n\nReturn JSON: { summary, points: [{claim, sourceIds}] }`
    );

    return {
      bullCase: { stance: "bull" as const, ...result },
      trace: ["Bull case built"],
    };
  } catch (err) {
    return {
      bullCase: {
        stance: "bull" as const,
        summary: "Bull case could not be generated due to an error.",
        points: [],
      },
      trace: [
        `Bull case failed, continuing without it: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      ],
    };
  }
}
