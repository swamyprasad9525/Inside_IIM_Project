"use client";

import { useEffect, useState } from "react";
import type { RubricResult } from "@/lib/types";

function RubricBar({ score }: { score: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth((score / 5) * 100), 80);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="clay-inset h-2.5 w-full overflow-hidden p-0.5">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[var(--clay-purple)] to-[var(--clay-mint-dark)] transition-[width] duration-1000 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function RubricBreakdown({ rubric }: { rubric: RubricResult }) {
  return (
    <div className="clay w-full max-w-2xl p-7">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--clay-purple-dark)]">
          Rubric breakdown
        </h3>
        <span className="clay-inset px-3 py-1 text-sm font-bold">
          {rubric.overallWeightedScore.toFixed(1)} / 5
        </span>
      </div>
      <div className="space-y-4">
        {rubric.factors.map((f, i) => (
          <div key={i}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-semibold">{f.factor}</span>
              <span className="text-[var(--foreground)]/50">{f.score} / 5</span>
            </div>
            <RubricBar score={f.score} />
            <p className="mt-1 text-xs text-[var(--foreground)]/60">{f.justification}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
