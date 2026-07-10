import { z } from "zod";
import { structuredCall } from "@/lib/llm";
import { getCompanyFinancials, resolveTicker } from "@/lib/financials";
import type { GraphStateType } from "@/lib/graph/state";

const PeerSchema = z.object({
  peerCompanyName: z.string().nullable(),
  peerTickerGuess: z.string().nullable(),
});

/**
 * Names the closest publicly-traded competitor and fetches its financial snapshot, so the
 * "market position" rubric factor can be grounded in an actual side-by-side comparison
 * instead of just qualitative claims about competitors from news snippets.
 */
export async function peerNode(state: GraphStateType) {
  if (!state.entity?.isPublic) {
    return { trace: ["Peer comparison skipped: company is not public"] };
  }

  try {
    const { peerCompanyName, peerTickerGuess } = await structuredCall(
      PeerSchema,
      "You identify the single closest publicly-traded competitor to a given company, for investment comparison purposes. Return null if you cannot confidently name one.",
      `Company: ${state.entity.resolvedName} (${state.entity.sector})\n\nReturn JSON: { peerCompanyName: string or null if unsure, peerTickerGuess: string (stock ticker) or null }`,
      { tier: "fast" }
    );

    if (!peerCompanyName) {
      return { trace: ["Peer comparison: no confident competitor identified"] };
    }

    const ticker = await resolveTicker(peerCompanyName, peerTickerGuess);
    if (!ticker) {
      return { trace: [`Peer comparison: could not resolve a ticker for ${peerCompanyName}`] };
    }

    const peerSource = await getCompanyFinancials(ticker);
    if (!peerSource) {
      return { trace: [`Peer comparison: could not fetch financials for ${peerCompanyName}`] };
    }

    return {
      sources: [
        {
          ...peerSource,
          id: `peer-${peerSource.id}`,
          title: `${peerSource.title} [peer comparison]`,
          category: "competition" as const,
        },
      ],
      trace: [`Peer comparison: fetched financial snapshot for ${peerCompanyName} (${ticker})`],
    };
  } catch (err) {
    return {
      trace: [
        `Peer comparison skipped due to an error: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      ],
    };
  }
}
