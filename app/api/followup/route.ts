import type { NextRequest } from "next/server";
import { answerFollowUp } from "@/lib/followup";
import type { ResearchReport } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let report: ResearchReport;
  let question: string;

  try {
    const body = await req.json();
    report = body?.report;
    question = body?.question;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!report || typeof question !== "string" || !question.trim()) {
    return Response.json({ error: "report and question are required" }, { status: 400 });
  }

  try {
    const answer = await answerFollowUp(report, question.trim());
    return Response.json({ answer });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}
