import type { FinalDecision, EntityResolution, SelfReview } from "@/lib/types";

interface DecisionCardProps {
  entity: EntityResolution;
  decision: FinalDecision;
  selfReview: SelfReview;
}

const CONFIDENCE_STYLES: Record<FinalDecision["confidence"], string> = {
  High: "bg-[var(--clay-mint)]/60 text-[var(--clay-mint-dark)]",
  Medium: "bg-[var(--clay-peach)]/60 text-[var(--clay-peach-dark)]",
  Low: "bg-[var(--clay-lavender)] text-[var(--foreground)]/60",
};

export function DecisionCard({ entity, decision, selfReview }: DecisionCardProps) {
  const isInvest = decision.verdict === "INVEST";

  return (
    <div className="clay w-full max-w-2xl p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold">{entity.resolvedName}</h2>
          <p className="text-sm text-[var(--foreground)]/50">
            {entity.sector} ·{" "}
            {entity.isPublic ? `Public${entity.tickerGuess ? ` (${entity.tickerGuess})` : ""}` : "Private"}
          </p>
        </div>
        <span
          className={`clay-btn shrink-0 px-5 py-2 text-sm font-extrabold text-white ${
            isInvest
              ? "bg-gradient-to-br from-[var(--clay-mint-dark)] to-[#2f8f57]"
              : "bg-gradient-to-br from-[var(--clay-peach-dark)] to-[#d9603a]"
          }`}
        >
          {isInvest ? "INVEST" : "PASS"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${CONFIDENCE_STYLES[decision.confidence]}`}
        >
          Confidence: {decision.confidence}
        </span>
        {selfReview.wasRevised && (
          <span
            className="rounded-full bg-[var(--clay-purple)]/20 px-3 py-1 text-xs font-bold text-[var(--clay-purple-dark)]"
            title={selfReview.note ?? undefined}
          >
            ✓ Self-reviewed and revised
          </span>
        )}
      </div>

      <p className="mt-4 text-sm leading-relaxed">{decision.thesis}</p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="clay-inset p-4">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--clay-mint-dark)]">
            Reasons for
          </p>
          <ul className="space-y-1 text-sm">
            {decision.topReasonsFor.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </div>
        <div className="clay-inset p-4">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--clay-peach-dark)]">
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
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--foreground)]/50">
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
