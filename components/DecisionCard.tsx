import type { FinalDecision, EntityResolution, SelfReview } from "@/lib/types";

interface DecisionCardProps {
  entity: EntityResolution;
  decision: FinalDecision;
  selfReview: SelfReview;
}

const CONFIDENCE_STYLES: Record<FinalDecision["confidence"], string> = {
  High: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  Medium: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Low: "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/50",
};

export function DecisionCard({ entity, decision, selfReview }: DecisionCardProps) {
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${CONFIDENCE_STYLES[decision.confidence]}`}
        >
          Confidence: {decision.confidence}
        </span>
        {selfReview.wasRevised && (
          <span
            className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
            title={selfReview.note ?? undefined}
          >
            ✓ Self-reviewed and revised for accuracy
          </span>
        )}
      </div>

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
