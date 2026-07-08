import { z } from "zod";
import { structuredCall } from "@/lib/llm";
import type { GraphStateType } from "@/lib/graph/state";

const DecisionSchema = z.object({
  verdict: z.enum(["INVEST", "PASS"]),
  confidence: z.enum(["Low", "Medium", "High"]),
  thesis: z.string(),
  topReasonsFor: z.array(z.string()),
  topReasonsAgainst: z.array(z.string()),
  keyRisks: z.array(z.string()),
});

export async function judgeNode(state: GraphStateType) {
  const decision = await structuredCall(
    DecisionSchema,
    "You are the final investment decision-maker. Weigh the bull case, bear case, and rubric scores to make a clear INVEST or PASS call. Confidence must reflect how much solid evidence was actually found — thin or sparse evidence means Low confidence regardless of which way you lean. Be decisive, do not hedge.",
    `Company: ${state.entity?.resolvedName}\n\nRubric:\n${JSON.stringify(
      state.rubric
    )}\n\nBull case:\n${JSON.stringify(state.bullCase)}\n\nBear case:\n${JSON.stringify(
      state.bearCase
    )}\n\nReturn JSON: { verdict ("INVEST" or "PASS"), confidence ("Low"|"Medium"|"High"), thesis, topReasonsFor (array of strings), topReasonsAgainst (array of strings), keyRisks (array of strings) }`
  );

  return {
    decision,
    trace: [`Decision: ${decision.verdict} (confidence: ${decision.confidence})`],
  };
}
