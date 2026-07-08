import type { SourceItem } from "@/lib/types";

export function SourcesList({ sources }: { sources: SourceItem[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="w-full max-w-2xl rounded-xl border border-black/10 p-6 dark:border-white/15">
      <h3 className="mb-3 text-sm font-semibold">Sources</h3>
      <ul className="space-y-2 text-sm">
        {sources.map((s) => (
          <li key={s.id}>
            <span className="text-black/30 dark:text-white/30">[{s.id}]</span>{" "}
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-black/70 dark:hover:text-white/70"
            >
              {s.title}
            </a>{" "}
            <span className="text-xs text-black/40 dark:text-white/40">({s.category})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
