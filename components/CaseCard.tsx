import type { CaseArgument, SourceItem } from "@/lib/types";

interface CaseCardProps {
  caseArg: CaseArgument;
  sources: SourceItem[];
}

export function CaseCard({ caseArg, sources }: CaseCardProps) {
  const isBull = caseArg.stance === "bull";
  const sourceById = new Map(sources.map((s) => [s.id, s]));

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
            • {p.claim}{" "}
            <span className="text-[#3d2b28]/40">
              [
              {p.sourceIds.map((id, j) => {
                const source = sourceById.get(id);
                return (
                  <span key={id}>
                    {j > 0 && ", "}
                    {source ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-[#3d2b28]"
                        title={source.title}
                      >
                        {id}
                      </a>
                    ) : (
                      id
                    )}
                  </span>
                );
              })}
              ]
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
