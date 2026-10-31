// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export interface ParsedAmount {
  raw: string;
  value: number; // positive = outflow/charge, negative = inflow/credit
  isExplicitNegative: boolean;
  currencySymbol?: string | undefined;
}

export function parseFlexibleAmount(
  rawStr: string,
  isOutflowPositive: boolean = true,
): number | null {
  if (!rawStr || typeof rawStr !== 'string') return null;
  let str = rawStr.trim();
  if (str === '' || str === '-' || str === '--') return null;

  let isNegative = false;

  // 1. Parentheses: (12.34)
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  }

  // 2. Trailing minus or DR / CR
  if (str.endsWith('-')) {
    isNegative = true;
    str = str.slice(0, -1).trim();
  } else if (/\bDR\b/i.test(str) || str.endsWith('DR') || str.endsWith('dr')) {
    isNegative = true;
    str = str.replace(/\bDR\b/i, '').replace(/dr$/i, '').trim();
  } else if (/\bCR\b/i.test(str) || str.endsWith('CR') || str.endsWith('cr')) {
    isNegative = false;
    str = str.replace(/\bCR\b/i, '').replace(/cr$/i, '').trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  } else if (str.startsWith('+')) {
    isNegative = false;
    str = str.slice(1).trim();
  }

  // 3. Remove currency codes and symbols
  str = str.replace(/\b(?:USD|CAD|AUD|EUR|GBP|INR|Rs\.?)\b/gi, '').trim();
  str = str.replace(/[$€£₹¥]/g, '').trim();

  if (!str) return null;

  // Check again for leading minus if after currency (e.g. $-10.99)
  if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  // 4. Determine decimal separator and thousands separator
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');

  let normalized = '';

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // European format: 1.234,56
      // Dots and spaces are thousands separators, comma is decimal
      const intPart = str.slice(0, lastComma).replace(/[.\s]/g, '');
      const decPart = str.slice(lastComma + 1).replace(/\s/g, '');
      normalized = `${intPart}.${decPart}`;
    } else {
      // Standard format: 1,234.56 or Indian lakh: 1,23,456.78
      // Commas and spaces are thousands separators, dot is decimal
      const intPart = str.slice(0, lastDot).replace(/[,\s]/g, '');
      const decPart = str.slice(lastDot + 1).replace(/\s/g, '');
      normalized = `${intPart}.${decPart}`;
    }
  } else if (lastComma !== -1) {
    // Only comma present: e.g. 12,50 (decimal) or 1,234 (thousands) or 1,234,567
    const countCommas = (str.match(/,/g) || []).length;
    const digitsAfterComma = str.length - 1 - lastComma;
    if (countCommas === 1 && digitsAfterComma === 2) {
      // Decimal: 12,50 or 1234,56
      normalized = str.replace(/\s/g, '').replace(',', '.');
    } else if (countCommas === 1 && digitsAfterComma === 3 && lastComma <= 3) {
      // Thousands: 1,000
      normalized = str.replace(/[,\s]/g, '');
    } else if (countCommas > 1) {
      // Thousands: 1,234,567
      normalized = str.replace(/[,\s]/g, '');
    } else {
      normalized = str.replace(/\s/g, '').replace(',', '.');
    }
  } else if (lastDot !== -1) {
    // Only dot present: e.g. 12.50 (decimal) or 1.234 (European thousands)
    const countDots = (str.match(/\./g) || []).length;
    if (countDots > 1) {
      normalized = str.replace(/[.\s]/g, '');
    } else {
      normalized = str.replace(/\s/g, '');
    }
  } else {
    // No dot, no comma
    normalized = str.replace(/\s/g, '');
  }

  const num = parseFloat(normalized);
  if (isNaN(num)) return null;

  if (isOutflowPositive) {
    return isNegative ? -num : num;
  } else {
    return isNegative ? num : -num;
  }
}
