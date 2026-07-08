import type { RubricResult } from "@/lib/types";

export function RubricBreakdown({ rubric }: { rubric: RubricResult }) {
  return (
    <div className="w-full max-w-2xl rounded-xl border border-black/10 p-6 dark:border-white/15">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Rubric breakdown</h3>
        <span className="text-sm text-black/50 dark:text-white/50">
          Overall: {rubric.overallWeightedScore.toFixed(1)} / 5
        </span>
      </div>
      <div className="space-y-3">
        {rubric.factors.map((f, i) => (
          <div key={i}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{f.factor}</span>
              <span className="text-black/50 dark:text-white/50">{f.score} / 5</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10">
              <div
                className="h-1.5 rounded-full bg-foreground"
                style={{ width: `${(f.score / 5) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-black/60 dark:text-white/50">{f.justification}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
