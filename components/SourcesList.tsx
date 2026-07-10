import type { SourceItem } from "@/lib/types";

export function SourcesList({ sources }: { sources: SourceItem[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="clay w-full max-w-2xl p-7">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--clay-purple-dark)]">
        Sources
      </h3>
      <ul className="space-y-2 text-sm">
        {sources.map((s) => (
          <li key={s.id} className="clay-inset px-3 py-2">
            <span className="text-[var(--foreground)]/30">[{s.id}]</span>{" "}
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-[var(--clay-purple-dark)]"
            >
              {s.title}
            </a>{" "}
            <span className="text-xs text-[var(--foreground)]/40">({s.category})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
