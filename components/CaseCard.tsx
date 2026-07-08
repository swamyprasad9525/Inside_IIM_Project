import type { CaseArgument } from "@/lib/types";

export function CaseCard({ caseArg }: { caseArg: CaseArgument }) {
  const isBull = caseArg.stance === "bull";

  return (
    <div className="flex-1 rounded-xl border border-black/10 p-5 dark:border-white/15">
      <h3
        className={`mb-2 text-xs font-semibold uppercase tracking-wide ${
          isBull ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
        }`}
      >
        {isBull ? "Bull case" : "Bear case"}
      </h3>
      <p className="text-sm leading-relaxed">{caseArg.summary}</p>
      <ul className="mt-3 space-y-1 text-sm">
        {caseArg.points.map((p, i) => (
          <li key={i}>
            • {p.claim}{" "}
            <span className="text-black/30 dark:text-white/30">
              [{p.sourceIds.join(", ")}]
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
