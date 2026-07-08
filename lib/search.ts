import type { ResearchCategory, SourceItem } from "@/lib/types";

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `src-${idCounter}`;
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

export async function tavilySearch(
  query: string,
  category: ResearchCategory,
  maxResults = 4
): Promise<SourceItem[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TAVILY_API_KEY is not set. Get a free key at tavily.com and add it to .env.local to enable web research."
    );
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: maxResults,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tavily search failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { results?: TavilyResult[] };
  const results = data.results ?? [];

  return results
    .map((r) => ({
      id: nextId(),
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 800) ?? "",
      category,
    }))
    .filter((s) => !isLowQualitySource(s));
}

const JUNK_TITLE_PATTERN =
  /^(menu|home|login|sign in|sign up|cookie policy|privacy policy|terms of service|search|404|not found)$/i;

function isLowQualitySource(s: SourceItem): boolean {
  const title = s.title?.trim() ?? "";
  const snippet = s.snippet?.trim() ?? "";
  if (title.length < 4) return true;
  if (JUNK_TITLE_PATTERN.test(title)) return true;
  if (snippet.length < 30) return true;
  return false;
}
