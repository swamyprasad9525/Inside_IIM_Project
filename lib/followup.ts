import { getLLM } from "@/lib/llm";
import type { ResearchReport } from "@/lib/types";

/**
 * Answers a follow-up question using only the already-gathered research (findings, rubric,
 * bull/bear cases, decision) — no new searches or API calls, so this is free and instant
 * compared to a fresh research run.
 */
export async function answerFollowUp(report: ResearchReport, question: string): Promise<string> {
  const llm = getLLM();

  const context = JSON.stringify({
    company: report.company,
    entity: report.entity,
    findings: report.findings,
    rubric: report.rubric,
    bullCase: report.bullCase,
    bearCase: report.bearCase,
    decision: report.decision,
  });

  const res = await llm.invoke([
    {
      role: "system",
      content:
        "You answer follow-up questions about a completed investment research report, using ONLY the research context provided. If the question asks about something not covered by the research, say so honestly rather than inventing new facts. Keep answers concise (a few sentences).",
    },
    {
      role: "user",
      content: `Research context:\n${context}\n\nFollow-up question: ${question}`,
    },
  ]);

  return typeof res.content === "string" ? res.content : JSON.stringify(res.content);
}
