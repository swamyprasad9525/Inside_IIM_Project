import type { FinalDecision, EntityResolution } from "@/lib/types";

interface DecisionCardProps {
  entity: EntityResolution;
  decision: FinalDecision;
}

export function DecisionCard({ entity, decision }: DecisionCardProps) {
  const isInvest = decision.verdict === "INVEST";

  return (
    <div className="w-full max-w-2xl rounded-xl border border-black/10 p-6 dark:border-white/15">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{entity.resolvedName}</h2>
          <p className="text-sm text-black/50 dark:text-white/50">
            {entity.sector} · {entity.isPublic ? `Public${entity.tickerGuess ? ` (${entity.tickerGuess})` : ""}` : "Private"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${
            isInvest
              ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400"
              : "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400"
          }`}
        >
          {decision.verdict}
        </span>
      </div>

      <p className="mt-3 text-xs uppercase tracking-wide text-black/40 dark:text-white/40">
        Confidence: {decision.confidence}
      </p>

      <p className="mt-4 text-sm leading-relaxed">{decision.thesis}</p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
            Reasons for
          </p>
          <ul className="space-y-1 text-sm">
            {decision.topReasonsFor.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
            Reasons against
          </p>
          <ul className="space-y-1 text-sm">
            {decision.topReasonsAgainst.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </div>
      </div>

      {decision.keyRisks.length > 0 && (
        <div className="mt-5">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
            Key risks
          </p>
          <ul className="space-y-1 text-sm">
            {decision.keyRisks.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
