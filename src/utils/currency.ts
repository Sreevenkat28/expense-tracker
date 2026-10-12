/**
 * Currency utilities for precise integer-cent arithmetic.
 * Avoids JavaScript floating-point errors (e.g. 0.1 + 0.2 = 0.30000000000000004).
 */

/**
 * Converts a dollar amount (e.g. 19.99 or "19.99") to integer cents (1999).
 */
export function dollarsToCents(amount: number | string): number {
  if (typeof amount === 'string') {
    // Strip dollar signs, spaces, and commas
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
 * Formats integer cents into a localized currency string (e.g. $1,250.00).
 * Handles negative amounts cleanly (e.g. -$45.20).
 */
export function formatCurrency(cents: number, showSign: boolean = false): string {
  if (isNaN(cents)) cents = 0;
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const dollars = absCents / 100;

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);

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
