import { z } from "zod";
import { structuredCall } from "@/lib/llm";
import type { GraphStateType } from "@/lib/graph/state";

const CritiqueSchema = z.object({
  isSound: z.boolean(),
  issues: z.array(z.string()),
  revisedThesis: z.string().nullable(),
});

export async function critiqueNode(state: GraphStateType) {
  if (!state.decision) {
    return { trace: ["Self-critique skipped: no decision to review"] };
  }

  try {
    const critique = await structuredCall(
      CritiqueSchema,
      "You are a skeptical editor reviewing an investment decision for unsupported claims or internal contradictions against the underlying findings. Only flag real issues, not stylistic nitpicks.",
      `Findings:\n${JSON.stringify(state.findings)}\n\nDecision:\n${JSON.stringify(
        state.decision
      )}\n\nReturn JSON: { isSound, issues (array of strings, empty if none), revisedThesis (a corrected thesis string only if isSound is false, otherwise null) }`
    );

    if (critique.isSound) {
      return {
        selfReview: {
          wasRevised: false,
          note: critique.issues.length ? critique.issues.join("; ") : null,
        },
        trace: [
          `Self-critique: decision holds up${
            critique.issues.length ? ` (minor notes: ${critique.issues.join("; ")})` : ""
          }`,
        ],
      };
    }

    return {
      decision: {
        ...state.decision,
        thesis: critique.revisedThesis ?? state.decision.thesis,
      },
      selfReview: { wasRevised: true, note: critique.issues.join("; ") },
      trace: [`Self-critique: revised thesis - ${critique.issues.join("; ")}`],
    };
  } catch (err) {
    return {
      trace: [
        `Self-critique skipped due to an error: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      ],
    };
  }
}
