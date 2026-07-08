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
  "4. region": string;
  "9. matchScore": string;
}

/**
 * LLM-guessed tickers can be stale (e.g. Zomato -> "ZOMATO.NS" after it rebranded to
 * Eternal Limited). Cross-checks the guess against Alpha Vantage's symbol search and
 * prefers a high-confidence match over blindly trusting the LLM. Used for both the
 * Alpha Vantage overview and the SEC EDGAR lookup so they stay consistent.
 */
export async function resolveTicker(
  companyName: string,
  tickerGuess: string | null
): Promise<string | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return tickerGuess;

  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(
        companyName
      )}&apikey=${apiKey}`
    );
    if (!res.ok) return tickerGuess;

    const data = (await res.json()) as { bestMatches?: SymbolSearchMatch[] };
    const matches = data.bestMatches ?? [];
    if (matches.length === 0) return tickerGuess;

    // If the LLM's own ticker guess appears anywhere in the results, trust it over Alpha
    // Vantage's fuzzy text ranking — AV's search sometimes only surfaces foreign listings
    // (e.g. searching "Alphabet Inc." can return only UK/Frankfurt CDRs, no GOOGL at all)
    // even when a US listing with the guessed ticker exists.
    const guessMatch = tickerGuess
      ? matches.find((m) => m["1. symbol"].toUpperCase() === tickerGuess.toUpperCase())
      : undefined;
    if (guessMatch) return guessMatch["1. symbol"];

    // Otherwise, multiple listings (e.g. a US stock cross-listed in Frankfurt/Sao Paulo)
    // often tie for the top match score. Prefer the US listing among ties, since that's
    // what Alpha Vantage's OVERVIEW endpoint and SEC EDGAR both have real coverage for.
    const bestScore = Math.max(...matches.map((m) => parseFloat(m["9. matchScore"])));
    const topMatches = matches.filter((m) => parseFloat(m["9. matchScore"]) === bestScore);
    const best = topMatches.find((m) => m["4. region"] === "United States") ?? topMatches[0];

    return bestScore >= 0.6 ? best["1. symbol"] : tickerGuess;
  } catch {
    return tickerGuess;
  }
}
