import { tavilySearch } from "@/lib/search";
import { getCompanyFinancials, resolveTicker } from "@/lib/financials";
import { getEdgarFinancials } from "@/lib/edgar";
import type { GraphStateType } from "@/lib/graph/state";
import type { ResearchCategory, SourceItem } from "@/lib/types";

async function fetchFinancialSources(
  companyName: string,
  tickerGuess: string | null
): Promise<SourceItem[]> {
  const ticker = await resolveTicker(companyName, tickerGuess);
  if (!ticker) return [];

  const [alphaVantageSource, edgarSource] = await Promise.all([
    getCompanyFinancials(ticker),
    getEdgarFinancials(ticker),
  ]);

  return [alphaVantageSource, edgarSource].filter((s): s is SourceItem => s !== null);
}

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

  const shouldFetchFinancials =
    state.researchRound === 0 && state.entity?.isPublic && !!state.entity?.tickerGuess;

  const [resultsByQuery, financialSources] = await Promise.all([
    Promise.all(
      queries.map((q) =>
        tavilySearch(q.query, q.category as ResearchCategory).catch((err) => {
          console.error(`Search failed for "${q.query}":`, err);
          return [];
        })
      )
    ),
    shouldFetchFinancials
      ? fetchFinancialSources(state.entity!.resolvedName, state.entity!.tickerGuess)
      : Promise.resolve([]),
  ]);

  const sources = resultsByQuery.flat().concat(financialSources);

  return {
    sources,
    researchRound: state.researchRound + 1,
    followUpQueries: [],
    trace: [
      `Research round ${state.researchRound + 1}: ran ${queries.length} searches${
        financialSources.length ? ` + ${financialSources.length} verified financial source(s)` : ""
      }, found ${sources.length} sources`,
    ],
  };
}
