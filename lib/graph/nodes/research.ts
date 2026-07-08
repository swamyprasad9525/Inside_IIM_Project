import { tavilySearch } from "@/lib/search";
import type { GraphStateType } from "@/lib/graph/state";
import type { ResearchCategory } from "@/lib/types";

const BASE_QUERIES: { category: ResearchCategory; template: (name: string) => string }[] = [
  { category: "overview", template: (n) => `${n} company overview business model what they do` },
  { category: "news", template: (n) => `${n} latest news` },
  { category: "financials", template: (n) => `${n} revenue funding financial performance growth` },
  { category: "competition", template: (n) => `${n} competitors market position industry` },
  { category: "risks", template: (n) => `${n} controversy lawsuit risk regulatory issues criticism` },
];

export async function researchNode(state: GraphStateType) {
  const name = state.entity?.resolvedName ?? state.companyInput;

  const queries =
    state.researchRound === 0
      ? BASE_QUERIES.map((q) => ({ category: q.category, query: q.template(name) }))
      : state.followUpQueries;

  const resultsByQuery = await Promise.all(
    queries.map((q) =>
      tavilySearch(q.query, q.category as ResearchCategory).catch((err) => {
        console.error(`Search failed for "${q.query}":`, err);
        return [];
      })
    )
  );

  const sources = resultsByQuery.flat();

  return {
    sources,
    researchRound: state.researchRound + 1,
    followUpQueries: [],
    trace: [
      `Research round ${state.researchRound + 1}: ran ${queries.length} searches, found ${sources.length} sources`,
    ],
  };
}
