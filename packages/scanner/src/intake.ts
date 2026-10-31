// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export interface RawTable {
  headerRowIndex: number;
  headers: string[];
  rows: string[][];
  delimiter: string;
}

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_ROWS = 200_000;

export function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

export function detectDelimiter(lines: string[]): string {
  const candidates = [',', '\t', ';', '|'];
  const sample = lines.slice(0, 50).filter((l) => l.trim().length > 0);

  if (sample.length === 0) return ',';

  let bestDelimiter = ',';
  let bestScore = -1;

  for (const delim of candidates) {
    const counts = sample.map((line) => line.split(delim).length);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    if (avg <= 1) continue;

    // Standard deviation / consistency check
    const variance =
      counts.reduce((acc, c) => acc + Math.pow(c - avg, 2), 0) / counts.length;
    const consistency = avg / (1 + variance);

    if (consistency > bestScore) {
      bestScore = consistency;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

export function parseDelimitedText(
  text: string,
  explicitDelimiter?: string,
): string[][] {
  const clean = stripBom(text);
  if (clean.length > MAX_BYTES) {
    throw new Error('File exceeds maximum size limit of 20 MB.');
  }

  const delimiter =
    explicitDelimiter || detectDelimiter(clean.split(/\r?\n/).slice(0, 50));

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = clean.length;

  while (i < len) {
    const char = clean[i]!;

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && clean[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < len && clean[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
          if (rows.length >= MAX_ROWS) break;
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
          if (rows.length >= MAX_ROWS) break;
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function parseStatementIntake(
  text: string,
  explicitDelimiter?: string,
): RawTable {
  const rawRows = parseDelimitedText(text, explicitDelimiter);
  if (rawRows.length === 0) {
    throw new Error('Statement file is empty.');
  }

  // Find header row: look for row with >= 3 non-empty columns containing common banking header words
  const headerKeywords = [
    'date',
    'datum',
    'time',
    'desc',
    'description',
    'details',
    'merchant',
    'payee',
    'amount',
    'betrag',
    'montant',
    'debit',
    'credit',
    'balance',
    'withdrawal',
    'deposit',
  ];

  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(25, rawRows.length); r++) {
    const row = rawRows[r]!;
    const lowerRow = row.map((cell) => cell.toLowerCase());
    const matches = lowerRow.filter((cell) =>
      headerKeywords.some((kw) => cell.includes(kw)),
    );

    if (matches.length >= 2 && row.length >= 3) {
      headerRowIndex = r;
      break;
    }
  }

  const headers = rawRows[headerRowIndex] || [];
  const dataRows: string[][] = [];

  // Filter out trailing summary lines (e.g. "TOTAL: 100", "END OF STATEMENT")
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r]!;
    if (row.length < 2) continue;

    const rowStr = row.join(' ').toUpperCase();
    if (
      rowStr.includes('TOTAL') ||
      rowStr.includes('CLOSING BALANCE') ||
      rowStr.includes('END OF STATEMENT')
    ) {
      continue;
    }
    dataRows.push(row);
  }

  const delimiter = explicitDelimiter || detectDelimiter(text.split(/\r?\n/).slice(0, 50));

  return {
    headerRowIndex,
    headers,
    rows: dataRows,
    delimiter,
  };
}
