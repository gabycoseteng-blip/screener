import { log, withRetry } from "../util/log.js";

const BASE = "https://financialmodelingprep.com/stable";
const apiKey = () => process.env.FMP_API_KEY;

async function fmp<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const key = apiKey();
  if (!key) {
    log.warn("FMP_API_KEY not set; skipping enrichment");
    return null;
  }
  const qs = new URLSearchParams({ ...params, apikey: key }).toString();
  try {
    const res = await withRetry(() => fetch(`${BASE}/${path}?${qs}`), { label: `fmp-${path}` });
    if (!res.ok) {
      log.warn("fmp request failed", { path, status: res.status });
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    log.warn("fmp request errored", { path, error: String(err) });
    return null;
  }
}

export interface CompanyProfile {
  symbol: string;
  companyName?: string;
  sector?: string;
  industry?: string;
  price?: number;
}

/**
 * Validate a ticker and fetch sector/industry/price in one call. A null return
 * means "not a real, resolvable US equity symbol" → we drop the ticker.
 */
export async function getProfile(ticker: string): Promise<CompanyProfile | null> {
  const data = await fmp<CompanyProfile[]>("profile", { symbol: ticker.toUpperCase() });
  if (!data || data.length === 0) return null;
  const p = data[0];
  return {
    symbol: p.symbol,
    companyName: p.companyName,
    sector: p.sector,
    industry: p.industry,
    price: p.price,
  };
}

/** Closing price on/just-before a date (for forward-return outcome tracking). */
export async function getCloseOnOrBefore(ticker: string, isoDate: string): Promise<number | null> {
  const data = await fmp<{ historical?: { date: string; close: number }[] }>(
    "historical-price-eod/light",
    { symbol: ticker.toUpperCase(), from: isoDate, to: isoDate },
  );
  const hist = (data as any)?.historical ?? (Array.isArray(data) ? data : null);
  if (!hist || hist.length === 0) return null;
  return hist[0].close ?? null;
}
