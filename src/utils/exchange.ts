/**
 * Exchange rates for switching the display currency.
 * Live rates come from open.er-api.com (free, no key, updated daily). They are cached for 12 hours,
 * and an approximate built-in table is used when offline so switching always works.
 */
import { SUPPORTED_CURRENCIES } from './currency';

export type Rates = Record<string, number>; // units of each currency per 1 USD

export interface RateSnapshot {
  rates: Rates;
  updatedAt: number | null; // ms timestamp of the live data, null for the built-in table
  source: 'live' | 'cached' | 'fallback';
}

const CACHE_KEY = 'expense_tracker_fx_rates_v1';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const RATES_URL = 'https://open.er-api.com/v6/latest/USD';

// Approximate, only used until live rates load or when offline
export const FALLBACK_RATES: Rates = {
  USD: 1,
  INR: 95,
  EUR: 0.89,
  GBP: 0.75,
  CAD: 1.4,
  AUD: 1.42,
  JPY: 157,
  AED: 3.6725,
};

function readCache(): { rates: Rates; updatedAt: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rates: Rates; updatedAt: number };
    return parsed && parsed.rates && typeof parsed.updatedAt === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

/** Best rates available right now without waiting for the network. */
export function getCachedRates(): RateSnapshot {
  const cached = readCache();
  if (cached) return { rates: { ...FALLBACK_RATES, ...cached.rates }, updatedAt: cached.updatedAt, source: 'cached' };
  return { rates: FALLBACK_RATES, updatedAt: null, source: 'fallback' };
}

/** Fetches fresh rates when the cache is older than 12 hours; otherwise returns the cache. */
export async function loadRates(
  fetchImpl: typeof fetch = (...args) => fetch(...args),
  now: number = Date.now()
): Promise<RateSnapshot> {
  const cached = readCache();
  if (cached && now - cached.updatedAt < CACHE_TTL_MS) {
    return { rates: { ...FALLBACK_RATES, ...cached.rates }, updatedAt: cached.updatedAt, source: 'cached' };
  }
  try {
    const res = await fetchImpl(RATES_URL);
    if (!res.ok) throw new Error(`rates ${res.status}`);
    const json = (await res.json()) as { result?: string; rates?: Rates };
    if (json.result !== 'success' || !json.rates) throw new Error('bad rates payload');
    const rates: Rates = {};
    for (const c of SUPPORTED_CURRENCIES) {
      const r = json.rates[c.code];
      if (typeof r === 'number' && r > 0) rates[c.code] = r;
    }
    if (!rates.USD) rates.USD = 1;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, updatedAt: now }));
    } catch {}
    return { rates: { ...FALLBACK_RATES, ...rates }, updatedAt: now, source: 'live' };
  } catch {
    return getCachedRates();
  }
}

/** Converts integer cents from one currency to another at the given rates. */
export function convertCents(cents: number, from: string, to: string, rates: Rates): number {
  if (!cents || from === to) return cents;
  const rFrom = rates[from] ?? FALLBACK_RATES[from] ?? 1;
  const rTo = rates[to] ?? FALLBACK_RATES[to] ?? 1;
  return Math.round((cents * rTo) / rFrom);
}

/** "1 USD = 95.00 INR" style text for the header. */
export function describeRate(base: string, target: string, rates: Rates): string {
  const one = convertCents(100000, base, target, rates) / 100000;
  return `1 ${base} = ${one.toLocaleString('en-US', { maximumFractionDigits: one < 10 ? 4 : 2 })} ${target}`;
}
