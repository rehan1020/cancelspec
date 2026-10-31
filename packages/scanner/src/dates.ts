// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

export function inferDayFirst(dateStrings: string[]): boolean {
  let valuesAboveTwelveFirst = 0;
  let valuesAboveTwelveSecond = 0;

  for (const str of dateStrings) {
    const parts = str.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
    if (parts) {
      const p1 = parseInt(parts[1]!, 10);
      const p2 = parseInt(parts[2]!, 10);

      if (p1 > 12 && p2 <= 12) {
        valuesAboveTwelveFirst++; // Must be DD/MM
      } else if (p2 > 12 && p1 <= 12) {
        valuesAboveTwelveSecond++; // Must be MM/DD
      }
    }
  }

  if (valuesAboveTwelveFirst > valuesAboveTwelveSecond) return true;
  if (valuesAboveTwelveSecond > valuesAboveTwelveFirst) return false;

  // Default to day-first per section 6 if ambiguous
  return true;
}

export function parseFlexibleDate(
  rawStr: string,
  isDayFirst: boolean = true,
): Date | null {
  if (!rawStr || typeof rawStr !== 'string') return null;
  const str = rawStr.trim();

  // 1. ISO: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1]!, 10);
    const m = parseInt(isoMatch[2]!, 10);
    const d = parseInt(isoMatch[3]!, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(Date.UTC(y, m - 1, d));
    }
  }

  // 2. Named month: e.g. "15-Jan-2026", "15 Jan 2026", "Jan 15, 2026"
  const namedMatch = str.match(/(\d{1,2})[-/\s]+([a-zA-Z]{3,9})[-/\s,]+(\d{2,4})/);
  if (namedMatch) {
    const d = parseInt(namedMatch[1]!, 10);
    const mStr = namedMatch[2]!.toLowerCase();
    let y = parseInt(namedMatch[3]!, 10);
    if (y < 100) y += 2000;
    const m = MONTH_NAMES[mStr];
    if (m && d >= 1 && d <= 31) {
      return new Date(Date.UTC(y, m - 1, d));
    }
  }

  const namedMonthFirst = str.match(/([a-zA-Z]{3,9})[-/\s]+(\d{1,2})[-/\s,]+(\d{2,4})/);
  if (namedMonthFirst) {
    const mStr = namedMonthFirst[1]!.toLowerCase();
    const d = parseInt(namedMonthFirst[2]!, 10);
    let y = parseInt(namedMonthFirst[3]!, 10);
    if (y < 100) y += 2000;
    const m = MONTH_NAMES[mStr];
    if (m && d >= 1 && d <= 31) {
      return new Date(Date.UTC(y, m - 1, d));
    }
  }

  // 3. Numeric: DD/MM/YYYY or MM/DD/YYYY
  const numMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (numMatch) {
    let p1 = parseInt(numMatch[1]!, 10);
    let p2 = parseInt(numMatch[2]!, 10);
    let y = parseInt(numMatch[3]!, 10);
    if (y < 100) y += 2000;

    let day = isDayFirst ? p1 : p2;
    let month = isDayFirst ? p2 : p1;

    // Disambiguate if one exceeds 12
    if (p1 > 12 && p2 <= 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12 && p1 <= 12) {
      day = p2;
      month = p1;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(y, month - 1, day));
    }
  }

  return null;
}
