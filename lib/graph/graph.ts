import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState, type GraphStateType } from "./state";
import { intakeNode } from "./nodes/intake";
import { researchNode } from "./nodes/research";
import { peerNode } from "./nodes/peer";
import { synthesizeNode } from "./nodes/synthesize";
import { gapCheckNode } from "./nodes/gapcheck";
import { analyzeNode } from "./nodes/analyze";
import { bullNode } from "./nodes/bull";
import { bearNode } from "./nodes/bear";
import { judgeNode } from "./nodes/judge";
import { critiqueNode } from "./nodes/critique";
import { reportNode } from "./nodes/report";
import type { ResearchReport, StreamEvent } from "@/lib/types";

function shouldLoopBack(state: GraphStateType): "research" | "analyze" {
  return state.followUpQueries.length > 0 ? "research" : "analyze";
}

const graph = new StateGraph(GraphState)
  .addNode("intake", intakeNode)
  .addNode("research", researchNode)
  .addNode("peer", peerNode)
  .addNode("synthesize", synthesizeNode)
  .addNode("gapcheck", gapCheckNode)
  .addNode("analyze", analyzeNode)
  .addNode("bull", bullNode)
  .addNode("bear", bearNode)
  .addNode("judge", judgeNode)
  .addNode("critique", critiqueNode)
  .addNode("report", reportNode)
  .addEdge(START, "intake")
  .addEdge("intake", "research")
  .addEdge("intake", "peer")
  .addEdge("research", "synthesize")
  .addEdge("peer", "synthesize")
  .addEdge("synthesize", "gapcheck")
  .addConditionalEdges("gapcheck", shouldLoopBack, {
    research: "research",
    analyze: "analyze",
  })
  .addEdge("analyze", "bull")
  .addEdge("analyze", "bear")
  .addEdge("bull", "judge")
  .addEdge("bear", "judge")
  .addEdge("judge", "critique")
  .addEdge("critique", "report")
  .addEdge("report", END);

export const compiledGraph = graph.compile();

function dedupeSources(sources: GraphStateType["sources"]) {
  const seen = new Set<string>();
  return sources.filter((s) => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
}

export async function runResearchGraph(
  companyInput: string,
  onUpdate: (event: StreamEvent) => void
): Promise<void> {
  const stream = await compiledGraph.stream(
    { companyInput },
    { streamMode: "values", recursionLimit: 30 }
  );

  let lastState: GraphStateType | null = null;
  let seenTraceCount = 0;

  for await (const state of stream) {
    lastState = state as GraphStateType;
    const newTrace = lastState.trace.slice(seenTraceCount);
    seenTraceCount = lastState.trace.length;
    for (const msg of newTrace) {
      onUpdate({ type: "progress", message: msg });
    }
  }

  if (
    !lastState ||
    !lastState.entity ||
    !lastState.rubric ||
    !lastState.bullCase ||
    !lastState.bearCase ||
    !lastState.decision
  ) {
    throw new Error("Graph completed without producing a full result");
  }

  const report: ResearchReport = {
    company: companyInput,
    entity: lastState.entity,
    findings: lastState.findings,
    rubric: lastState.rubric,
    bullCase: lastState.bullCase,
    bearCase: lastState.bearCase,
    decision: lastState.decision,
    selfReview: lastState.selfReview,
    sources: dedupeSources(lastState.sources),
    trace: lastState.trace,
  };

  onUpdate({ type: "final", report });
}
