import type { CaseArgument } from "@/lib/types";

export function CaseCard({ caseArg }: { caseArg: CaseArgument }) {
  const isBull = caseArg.stance === "bull";

  return (
    <div
      className={`clay clay-tilt flex-1 p-6 ${isBull ? "" : "tilt-right"}`}
      style={{ background: isBull ? "var(--clay-mint)" : "var(--clay-peach)", opacity: 0.9 }}
    >
      <h3
        className={`mb-2 text-xs font-extrabold uppercase tracking-wide ${
          isBull ? "text-[var(--clay-mint-dark)]" : "text-[var(--clay-peach-dark)]"
        }`}
      >
        {isBull ? "Bull case" : "Bear case"}
      </h3>
      <p className="text-sm leading-relaxed text-[#3d2b28]">{caseArg.summary}</p>
      <ul className="mt-3 space-y-1 text-sm text-[#3d2b28]">
        {caseArg.points.map((p, i) => (
          <li key={i}>
            • {p.claim} <span className="text-[#3d2b28]/40">[{p.sourceIds.join(", ")}]</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
