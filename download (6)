/**
 * Cheap, dependency-free ticker candidate extraction. This is deliberately a
 * RECALL-oriented pre-filter, not the source of truth: the LLM re-extracts in
 * context and FMP validates that a symbol actually exists. So we tolerate some
 * false positives here and let downstream stages prune them.
 */

// High-frequency ALL-CAPS words on finance subs that are NOT tickers.
const STOPWORDS = new Set([
  "A", "I", "AI", "AN", "AND", "ARE", "AT", "BE", "BY", "CEO", "CFO", "COO",
  "DD", "DCF", "EPS", "ER", "ETF", "EU", "EV", "FAQ", "FED", "FOMO", "FUD",
  "FY", "GDP", "IMO", "IPO", "IRA", "IRS", "IT", "ITM", "LOL", "M&A", "NYSE",
  "OK", "OTC", "P", "PE", "PR", "PT", "Q1", "Q2", "Q3", "Q4", "ROE", "ROIC",
  "RSI", "SEC", "SP", "TA", "THE", "TLDR", "TO", "US", "USA", "USD", "WSB",
  "YOLO", "YOY", "YTD", "EBITDA", "FCF", "GAAP", "LDC", "REIT", "TAM", "WACC",
]);

const CASHTAG = /\$([A-Za-z]{1,5})(?:\.[A-Za-z])?\b/g;
const ALLCAPS = /\b([A-Z]{1,5})\b/g;

export interface TickerExtraction {
  /** Ordered by confidence: cashtags first, then frequency of bare symbols. */
  candidates: string[];
  /** Best single guess (first candidate), or null. */
  primary: string | null;
  /** True if at least one explicit cashtag ($XYZ) was present. */
  hadCashtag: boolean;
}

export function extractTickers(text: string): TickerExtraction {
  const counts = new Map<string, number>();
  const order: string[] = [];
  let hadCashtag = false;

  const bump = (raw: string, weight: number) => {
    const sym = raw.toUpperCase();
    if (sym.length < 1 || sym.length > 5) return;
    if (STOPWORDS.has(sym)) return;
    if (!counts.has(sym)) order.push(sym);
    counts.set(sym, (counts.get(sym) ?? 0) + weight);
  };

  for (const m of text.matchAll(CASHTAG)) {
    hadCashtag = true;
    bump(m[1], 100); // cashtags are strong signals
  }
  for (const m of text.matchAll(ALLCAPS)) {
    bump(m[1], 1);
  }

  const candidates = order.sort((a, b) => (counts.get(b)! - counts.get(a)!));
  return { candidates, primary: candidates[0] ?? null, hadCashtag };
}
