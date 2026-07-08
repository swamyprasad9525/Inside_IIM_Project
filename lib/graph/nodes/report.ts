import type { GraphStateType } from "@/lib/graph/state";

export async function reportNode(state: GraphStateType) {
  return { trace: [`Report assembled with ${state.sources.length} sources`] };
}
