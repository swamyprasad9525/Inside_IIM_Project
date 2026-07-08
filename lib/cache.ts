import type { ResearchReport } from "@/lib/types";

interface CacheEntry {
  report: ResearchReport;
  cachedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Process-local in-memory cache. Fine for a single dev/demo instance; on serverless
// deployments (e.g. Vercel) each instance has its own cache, so this is a best-effort
// speedup, not a guarantee. A real production deployment would use a shared store
// (Redis, Vercel KV) instead.
const cache = new Map<string, CacheEntry>();

function normalizeKey(company: string): string {
  return company.trim().toLowerCase();
}

export function getCachedReport(company: string): ResearchReport | null {
  const entry = cache.get(normalizeKey(company));
  if (!entry) return null;

  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    cache.delete(normalizeKey(company));
    return null;
  }

  return entry.report;
}

export function setCachedReport(company: string, report: ResearchReport): void {
  cache.set(normalizeKey(company), { report, cachedAt: Date.now() });
}
