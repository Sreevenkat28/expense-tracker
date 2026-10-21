/**
 * Currency utilities for precise integer-cent arithmetic and multi-currency formatting.
 * Avoids JavaScript floating-point errors (e.g. 0.1 + 0.2 = 0.30000000000000004).
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', name: 'USD ($)', locale: 'en-US' },
  { code: 'INR', symbol: '₹', name: 'INR (₹)', locale: 'en-IN' },
  { code: 'EUR', symbol: '€', name: 'EUR (€)', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'GBP (£)', locale: 'en-GB' },
  { code: 'CAD', symbol: 'CA$', name: 'CAD ($)', locale: 'en-CA' },
  { code: 'AUD', symbol: 'AU$', name: 'AUD ($)', locale: 'en-AU' },
  { code: 'JPY', symbol: '¥', name: 'JPY (¥)', locale: 'ja-JP' },
  { code: 'AED', symbol: 'AED', name: 'AED (د.إ)', locale: 'en-AE' },
];

let globalCurrency = 'USD';
try {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('app_currency_code') : null;
  if (saved && SUPPORTED_CURRENCIES.some(c => c.code === saved)) {
    globalCurrency = saved;
  }
} catch {}

export function setGlobalCurrency(code: string): void {
  if (SUPPORTED_CURRENCIES.some(c => c.code === code)) {
    globalCurrency = code;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('app_currency_code', code);
      }
    } catch {}
  }
}

export function getGlobalCurrency(): string {
  return globalCurrency;
}

export function getCurrencyInfo(code: string = globalCurrency): CurrencyInfo {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) || SUPPORTED_CURRENCIES[0];
}

/**
 * Converts a dollar amount (e.g. 19.99 or "19.99") to integer cents (1999).
 */
export function dollarsToCents(amount: number | string): number {
  if (typeof amount === 'string') {
    const clean = amount.replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
  }
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

/**
 * Converts integer cents (1999) to dollar float (19.99).
 */
export function centsToDollars(cents: number): number {
  if (isNaN(cents)) return 0;
  return cents / 100;
}

/**
 * Formats integer cents into a localized multi-currency string (e.g. $1,250.00, ₹1,250.00, €1.250,00).
 * Defaults to the active app currency.
 * Handles negative amounts cleanly.
 */
export function formatCurrency(
  cents: number,
  showSign: boolean = false,
  currencyCode?: string
): string {
  if (isNaN(cents)) cents = 0;
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const val = absCents / 100;

  const targetCode = currencyCode || globalCurrency || 'USD';
  const info = getCurrencyInfo(targetCode);
  const isZeroDecimal = targetCode === 'JPY';

  const formatted = new Intl.NumberFormat(info.locale, {
    style: 'currency',
    currency: info.code,
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
    maximumFractionDigits: isZeroDecimal ? 0 : 2,
  }).format(val);

  if (isNegative) {
    return `-${formatted}`;
  }
  if (showSign && cents > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

/**
 * Validates whether an amount string is a valid positive financial value.
 */
export function isValidAmount(amountStr: string): { valid: boolean; error?: string; cents?: number } {
  if (!amountStr || amountStr.trim() === '') {
    return { valid: false, error: 'Amount is required' };
  }

  const clean = amountStr.replace(/[^0-9.-]/g, '');
  const num = parseFloat(clean);

  if (isNaN(num)) {
    return { valid: false, error: 'Please enter a valid number' };
  }
  if (num <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }
  if (num > 100000000) {
    return { valid: false, error: 'Amount exceeds maximum allowable limit' };
  }

  const cents = Math.round(num * 100);
  return { valid: true, cents };
}
