import type { SourceItem } from "@/lib/types";
import { computeSimpleDcf } from "@/lib/valuation";

const SEC_USER_AGENT = "InsideIIM-Investment-Research-Agent (student project; contact via GitHub)";

let tickerToCikCache: Map<string, string> | null = null;

async function loadTickerToCikMap(): Promise<Map<string, string>> {
  if (tickerToCikCache) return tickerToCikCache;

  const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
    headers: { "User-Agent": SEC_USER_AGENT },
  });
  if (!res.ok) throw new Error(`Failed to load SEC ticker map (${res.status})`);

  const data = (await res.json()) as Record<
    string,
    { cik_str: number; ticker: string; title: string }
  >;

  const map = new Map<string, string>();
  for (const entry of Object.values(data)) {
    map.set(entry.ticker.toUpperCase(), String(entry.cik_str).padStart(10, "0"));
  }
  tickerToCikCache = map;
  return map;
}

interface XbrlFact {
  val: number;
  fy: number;
  fp: string;
  form: string;
}

interface CompanyFacts {
  facts?: {
    "us-gaap"?: Record<string, { units: Record<string, XbrlFact[]> }>;
  };
}

function extractAnnualSeries(
  facts: CompanyFacts,
  conceptNames: string[]
): { fy: number; val: number }[] {
  for (const concept of conceptNames) {
    const usd = facts.facts?.["us-gaap"]?.[concept]?.units?.USD;
    if (!usd) continue;

    const annual = usd.filter((f) => f.form === "10-K" && f.fp === "FY");
    if (annual.length === 0) continue;

    const byYear = new Map<number, number>();
    for (const f of annual) byYear.set(f.fy, f.val);

    return Array.from(byYear.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(-5)
      .map(([fy, val]) => ({ fy, val }));
  }
  return [];
}

/**
 * Pulls real multi-year financials directly from SEC filings (10-K XBRL data) via the
 * official, free data.sec.gov API — grounding the "financial health" rubric factor in
 * primary-source data instead of just LLM-summarized news snippets. Also derives a
 * simplified illustrative DCF from the historical net income trend as a rough sanity check.
 */
export async function getEdgarFinancials(ticker: string): Promise<SourceItem | null> {
  try {
    const map = await loadTickerToCikMap();
    const cik = map.get(ticker.toUpperCase());
    if (!cik) return null;

    const res = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, {
      headers: { "User-Agent": SEC_USER_AGENT },
    });
    if (!res.ok) return null;

    const facts = (await res.json()) as CompanyFacts;

    const revenue = extractAnnualSeries(facts, [
      "Revenues",
      "RevenueFromContractWithCustomerExcludingAssessedTax",
    ]);
    const netIncome = extractAnnualSeries(facts, ["NetIncomeLoss"]);

    if (revenue.length === 0 && netIncome.length === 0) return null;

    const lines: string[] = ["Multi-year financials from SEC 10-K filings (USD):"];
    if (revenue.length) {
      lines.push(
        "Revenue by fiscal year: " +
          revenue.map((r) => `FY${r.fy}: $${r.val.toLocaleString()}`).join(", ")
      );
    }
    if (netIncome.length) {
      lines.push(
        "Net income by fiscal year: " +
          netIncome.map((r) => `FY${r.fy}: $${r.val.toLocaleString()}`).join(", ")
      );
    }

    if (netIncome.length >= 2) {
      const first = netIncome[0].val;
      const last = netIncome[netIncome.length - 1].val;
      const years = netIncome[netIncome.length - 1].fy - netIncome[0].fy;
      if (first > 0 && years > 0) {
        const cagr = Math.pow(last / first, 1 / years) - 1;
        const dcf = computeSimpleDcf({ latestFcf: last, growthRate: cagr });
        lines.push(
          `Illustrative simplified DCF (not a rigorous valuation): estimated intrinsic enterprise value ≈ $${Math.round(
            dcf.presentValue
          ).toLocaleString()}. ${dcf.assumptions}`
        );
      }
    }

    return {
      id: `edgar-${ticker}`,
      title: `${ticker} — multi-year financials (SEC EDGAR)`,
      url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}`,
      snippet: lines.join("\n"),
      category: "financials",
    };
  } catch {
    return null;
  }
}
