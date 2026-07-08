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

const CONFIDENCE_RANK = { Low: 0, Medium: 1, High: 2 } as const;

export async function judgeNode(state: GraphStateType) {
  const bullMissing = (state.bullCase?.points.length ?? 0) === 0;
  const bearMissing = (state.bearCase?.points.length ?? 0) === 0;
  const debateIncomplete = bullMissing || bearMissing;

  const decision = await structuredCall(
    DecisionSchema,
    "You are the final investment decision-maker. Weigh the bull case, bear case, and rubric scores to make a clear INVEST or PASS call. Confidence must reflect how much solid evidence was actually found — thin or sparse evidence means Low confidence regardless of which way you lean. Be decisive, do not hedge.",
    `Company: ${state.entity?.resolvedName}\n\nRubric:\n${JSON.stringify(
      state.rubric
    )}\n\nBull case:\n${JSON.stringify(state.bullCase)}\n\nBear case:\n${JSON.stringify(
      state.bearCase
    )}${
      debateIncomplete
        ? `\n\nNOTE: ${
            bullMissing ? "The bull case" : "The bear case"
          } could not be generated due to a technical error, so you only have one side of the debate. Factor this uncertainty into your confidence level.`
        : ""
    }\n\nReturn JSON: { verdict ("INVEST" or "PASS"), confidence ("Low"|"Medium"|"High"), thesis, topReasonsFor (array of strings), topReasonsAgainst (array of strings), keyRisks (array of strings) }`
  );

  // Deterministic safety net: never allow High confidence when only one side of the
  // bull/bear debate actually generated (the LLM can't be fully trusted to remember
  // to downgrade itself here, so this is enforced in code, not just prompted).
  if (debateIncomplete && CONFIDENCE_RANK[decision.confidence] > CONFIDENCE_RANK.Medium) {
    decision.confidence = "Medium";
  }

  return {
    decision,
    trace: [
      `Decision: ${decision.verdict} (confidence: ${decision.confidence}${
        debateIncomplete ? ", capped due to incomplete debate" : ""
      })`,
    ],
  };
}
