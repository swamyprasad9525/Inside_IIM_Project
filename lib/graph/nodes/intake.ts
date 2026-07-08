import { z } from "zod";
import { structuredCall } from "@/lib/llm";
import type { GraphStateType } from "@/lib/graph/state";

const EntitySchema = z.object({
  resolvedName: z.string(),
  sector: z.string(),
  isPublic: z.boolean(),
  tickerGuess: z.string().nullable(),
  notes: z.string(),
});

export async function intakeNode(state: GraphStateType) {
  const entity = await structuredCall(
    EntitySchema,
    "You resolve a possibly ambiguous or loosely-typed company name into a specific, well-known company entity for investment research. If the name is ambiguous (e.g. a common word), pick the most likely well-known company and explain the assumption in notes.",
    `Company name provided by user: "${state.companyInput}"\n\nReturn JSON: { resolvedName, sector, isPublic, tickerGuess (stock ticker or null if private/unknown), notes }`,
    { fast: true }
  );

  return {
    entity,
    trace: [
      `Resolved "${state.companyInput}" -> ${entity.resolvedName} (${entity.sector}, ${
        entity.isPublic ? "public" : "private"
      })`,
    ],
  };
}
