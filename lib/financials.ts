import type { SourceItem } from "@/lib/types";

interface AlphaVantageOverview {
  Symbol?: string;
  Name?: string;
  MarketCapitalization?: string;
  PERatio?: string;
  EPS?: string;
  RevenueTTM?: string;
  ProfitMargin?: string;
  OperatingMarginTTM?: string;
  ReturnOnEquityTTM?: string;
  QuarterlyRevenueGrowthYOY?: string;
  QuarterlyEarningsGrowthYOY?: string;
  "52WeekHigh"?: string;
  "52WeekLow"?: string;
  Note?: string;
  Information?: string;
}

/**
 * Fetches real fundamentals from Alpha Vantage's free OVERVIEW endpoint (official API,
 * 25 requests/day free tier) and packages them as a SourceItem so they flow through the
 * existing synthesize/rubric pipeline like any other source, but grounded in real numbers
 * instead of LLM-summarized news snippets.
 */
export async function getCompanyFinancials(ticker: string): Promise<SourceItem | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(
        ticker
      )}&apikey=${apiKey}`
    );
    if (!res.ok) return null;

    const data = (await res.json()) as AlphaVantageOverview;
    if (!data.Symbol || data.Note || data.Information) {
      return null;
    }

    const lines = [
      `Market Cap: ${data.MarketCapitalization ?? "N/A"}`,
      `P/E Ratio: ${data.PERatio ?? "N/A"}`,
      `EPS: ${data.EPS ?? "N/A"}`,
      `Revenue (TTM): ${data.RevenueTTM ?? "N/A"}`,
      `Profit Margin: ${data.ProfitMargin ?? "N/A"}`,
      `Operating Margin (TTM): ${data.OperatingMarginTTM ?? "N/A"}`,
      `Return on Equity (TTM): ${data.ReturnOnEquityTTM ?? "N/A"}`,
      `Quarterly Revenue Growth YoY: ${data.QuarterlyRevenueGrowthYOY ?? "N/A"}`,
      `Quarterly Earnings Growth YoY: ${data.QuarterlyEarningsGrowthYOY ?? "N/A"}`,
      `52-Week High/Low: ${data["52WeekHigh"] ?? "N/A"} / ${data["52WeekLow"] ?? "N/A"}`,
    ];

    return {
      id: `fin-${ticker}`,
      title: `${data.Name ?? ticker} — verified financial overview (Alpha Vantage)`,
      url: `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}`,
      snippet: lines.join("\n"),
      category: "financials",
    };
  } catch {
    return null;
  }
}

interface SymbolSearchMatch {
  "1. symbol": string;
  "9. matchScore": string;
}

/**
 * LLM-guessed tickers can be stale (e.g. Zomato -> "ZOMATO.NS" after it rebranded to
 * Eternal Limited). Cross-checks the guess against Alpha Vantage's symbol search and
 * prefers a high-confidence match over blindly trusting the LLM.
 */
async function findBestTicker(companyName: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(
        companyName
      )}&apikey=${apiKey}`
    );
    if (!res.ok) return null;

    const data = (await res.json()) as { bestMatches?: SymbolSearchMatch[] };
    const matches = data.bestMatches ?? [];
    if (matches.length === 0) return null;

    const best = matches.reduce((a, b) =>
      parseFloat(b["9. matchScore"]) > parseFloat(a["9. matchScore"]) ? b : a
    );

    return parseFloat(best["9. matchScore"]) >= 0.6 ? best["1. symbol"] : null;
  } catch {
    return null;
  }
}

export async function fetchVerifiedFinancials(
  companyName: string,
  tickerGuess: string | null
): Promise<SourceItem | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return null;

  const verifiedTicker = await findBestTicker(companyName, apiKey);
  const ticker = verifiedTicker ?? tickerGuess;
  if (!ticker) return null;

  return getCompanyFinancials(ticker);
}
