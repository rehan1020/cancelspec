// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export class SeededRng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  next(): number {
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)]!;
  }
}

export interface SyntheticSubscription {
  serviceId: string;
  merchantDescriptor: string;
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  amount: number;
  currency: string;
  startMonthOffset?: number;
  endMonthOffset?: number;
  priceChangeMonth?: number;
  newAmount?: number;
  skipMonth?: number;
}

export interface StatementConfig {
  seed: number;
  region: 'US' | 'UK' | 'EU' | 'IN';
  months: number;
  startDate: string; // YYYY-MM-DD
  delimiter: string;
  dateFormat: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'DD-MM-YYYY';
  layout: 'single-signed' | 'debit-credit';
  decimalSeparator: '.' | ',';
  hasPreamble?: boolean;
  hasSummary?: boolean;
  subscriptions: SyntheticSubscription[];
}

export interface ExpectedResult {
  merchantKey: string;
  serviceId: string;
  cadence: string;
  chargeCount: number;
  typicalAmount: number;
  currency: string;
}

export interface GeneratedStatement {
  csvText: string;
  expected: ExpectedResult[];
  totalRows: number;
}

function formatDate(date: Date, format: StatementConfig['dateFormat']): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${y}-${m}-${d}`;
    case 'MM/DD/YYYY':
      return `${m}/${d}/${y}`;
    case 'DD/MM/YYYY':
      return `${d}/${m}/${y}`;
    case 'DD-MM-YYYY':
      return `${d}-${m}-${y}`;
  }
}

function formatAmount(
  amount: number,
  decimalSep: '.' | ',',
  isLakh: boolean = false,
): string {
  const fixed = Math.abs(amount).toFixed(2);
  const [intPart, decPart] = fixed.split('.');

  let formattedInt = '';
  if (isLakh && intPart && intPart.length > 3) {
    // Indian Lakh grouping: 1,23,456
    const lastThree = intPart.slice(-3);
    const otherNumbers = intPart.slice(0, -3);
    const withCommas = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedInt = `${withCommas},${lastThree}`;
  } else if (intPart) {
    formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, decimalSep === ',' ? '.' : ',');
  }

  return `${formattedInt}${decimalSep}${decPart}`;
}

export function generateSyntheticStatement(config: StatementConfig): GeneratedStatement {
  const rng = new SeededRng(config.seed);
  const start = new Date(config.startDate);
  const expected: ExpectedResult[] = [];

  interface RawRow {
    date: Date;
    description: string;
    amount: number; // negative for charges, positive for credits
  }

  const rows: RawRow[] = [];

  // 1. Generate recurring subscriptions
  for (const sub of config.subscriptions) {
    let chargesGenerated = 0;
    let typicalAmount = sub.amount;

    const startOffset = sub.startMonthOffset || 0;
    const endOffset = sub.endMonthOffset ?? config.months;

    switch (sub.cadence) {
      case 'monthly': {
        const dayOfMonth = rng.int(1, 28);
        for (let m = startOffset; m < endOffset; m++) {
          if (sub.skipMonth !== undefined && m === sub.skipMonth) {
            continue;
          }
          const d = new Date(start);
          d.setUTCMonth(d.getUTCMonth() + m);
          d.setUTCDate(dayOfMonth + rng.int(-1, 1));

          let amt = sub.amount;
          if (sub.priceChangeMonth !== undefined && m >= sub.priceChangeMonth && sub.newAmount !== undefined) {
            amt = sub.newAmount;
            typicalAmount = sub.newAmount;
          }

          rows.push({
            date: d,
            description: sub.merchantDescriptor,
            amount: -amt,
          });
          chargesGenerated++;
        }
        break;
      }

      case 'weekly': {
        const totalWeeks = Math.floor((config.months * 30.4) / 7);
        const startWeek = Math.floor((startOffset * 30.4) / 7);
        const endWeek = Math.min(totalWeeks, Math.floor((endOffset * 30.4) / 7));

        for (let w = startWeek; w < endWeek; w++) {
          const d = new Date(start);
          d.setUTCDate(d.getUTCDate() + w * 7 + rng.int(0, 1));
          rows.push({
            date: d,
            description: sub.merchantDescriptor,
            amount: -sub.amount,
          });
          chargesGenerated++;
        }
        break;
      }

      case 'biweekly': {
        const totalPeriods = Math.floor((config.months * 30.4) / 14);
        for (let p = 0; p < totalPeriods; p++) {
          const d = new Date(start);
          d.setUTCDate(d.getUTCDate() + p * 14 + rng.int(-1, 1));
          rows.push({
            date: d,
            description: sub.merchantDescriptor,
            amount: -sub.amount,
          });
          chargesGenerated++;
        }
        break;
      }

      case 'quarterly': {
        const totalQuarters = Math.floor(config.months / 3);
        for (let q = 0; q < totalQuarters; q++) {
          const d = new Date(start);
          d.setUTCMonth(d.getUTCMonth() + q * 3);
          d.setUTCDate(15 + rng.int(-2, 2));
          rows.push({
            date: d,
            description: sub.merchantDescriptor,
            amount: -sub.amount,
          });
          chargesGenerated++;
        }
        break;
      }

      case 'semiannual': {
        const totalHalves = Math.floor(config.months / 6);
        for (let h = 0; h < totalHalves; h++) {
          const d = new Date(start);
          d.setUTCMonth(d.getUTCMonth() + h * 6);
          d.setUTCDate(10 + rng.int(-2, 2));
          rows.push({
            date: d,
            description: sub.merchantDescriptor,
            amount: -sub.amount,
          });
          chargesGenerated++;
        }
        break;
      }

      case 'annual': {
        const totalYears = Math.floor(config.months / 12);
        for (let y = 0; y < Math.max(1, totalYears); y++) {
          const d = new Date(start);
          d.setUTCFullYear(d.getUTCFullYear() + y);
          d.setUTCDate(12 + rng.int(-1, 1));
          rows.push({
            date: d,
            description: sub.merchantDescriptor,
            amount: -sub.amount,
          });
          chargesGenerated++;
        }
        break;
      }
    }

    // Clean merchant key expectation
    const cleanKey = sub.merchantDescriptor
      .replace(/[^A-Z0-9\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join(' ');

    expected.push({
      merchantKey: cleanKey,
      serviceId: sub.serviceId,
      cadence: sub.cadence,
      chargeCount: chargesGenerated,
      typicalAmount,
      currency: sub.currency,
    });
  }

  // 2. Generate noise transactions (groceries, salary, fuel, transfers)
  const noiseDescriptors = {
    US: [
      'WALMART SUPERCENTER #1234',
      'SHELL OIL 456782',
      'WHOLE FOODS MARKET',
      'TARGET T-0982',
      'PAYROLL DIRECT DEP ACME CORP',
      'ATM CASH WITHDRAWAL #9812',
      'TRADER JOES #512',
      'UBER TRIP HELP.UBER.COM',
      'STARBUCKS STORE 1283',
    ],
    UK: [
      'TESCO STORES 2918',
      'SAINSBURYS S/MKTS',
      'BP CONNECT 1289',
      'SALARY CREDIT - TECH LTD',
      'TFL TRAVEL CHARGE',
      'BOOTS PHARMACY',
      'MARKS & SPENCER',
      'CO-OP FOOD 4812',
    ],
    EU: [
      'CARREFOUR HYPERMARCHE',
      'TOTAL ENERGIES RELAIS',
      'SALAIRE VIREMENT SEPA',
      'LIDL 2918 PARIS',
      'METRO BILLET DISTRIB',
      'PHARMACIE CENTRALE',
      'BOULANGERIE ARTISAN',
    ],
    IN: [
      'UPI/SWIGGY/PAYTM/TXN4912',
      'RELIANCE RETAIL LTD',
      'INDIAN OIL CORP PETROL',
      'SALARY CREDIT/INFOSYS LTD',
      'DMART SUPERMARKET',
      'METRO CARD RECHARGE',
      'APOLLO PHARMACY UPI',
    ],
  };

  const regionalNoise = noiseDescriptors[config.region];
  const noiseCount = rng.int(200, 400);

  const totalDays = config.months * 30;
  for (let i = 0; i < noiseCount; i++) {
    const dayOffset = rng.int(0, totalDays);
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + dayOffset);

    const desc = rng.pick(regionalNoise);
    const isCredit = desc.includes('SALARY') || desc.includes('PAYROLL') || desc.includes('SALAIRE');
    const amt = isCredit ? rng.float(2500, 4500) : rng.float(5, 120);

    rows.push({
      date: d,
      description: desc,
      amount: isCredit ? amt : -amt,
    });
  }

  // Sort chronologically
  rows.sort((a, b) => a.date.getTime() - b.date.getTime());

  // 3. Render CSV/TSV
  const lines: string[] = [];

  if (config.hasPreamble) {
    lines.push(`Account Statement for Account #XXXX-1234`);
    lines.push(`Period: ${config.startDate} to ${formatDate(rows[rows.length - 1]!.date, 'YYYY-MM-DD')}`);
    lines.push(``);
  }

  // Header row
  if (config.layout === 'debit-credit') {
    lines.push(['Date', 'Description', 'Debit', 'Credit'].join(config.delimiter));
  } else {
    lines.push(['Date', 'Description', 'Amount'].join(config.delimiter));
  }

  for (const r of rows) {
    const dateStr = formatDate(r.date, config.dateFormat);
    const isLakh = config.region === 'IN';

    // Quote description if it contains delimiter or quotes
    let desc = r.description;
    if (desc.includes(config.delimiter) || desc.includes('"')) {
      desc = `"${desc.replace(/"/g, '""')}"`;
    }

    if (config.layout === 'debit-credit') {
      const debitStr = r.amount < 0 ? formatAmount(r.amount, config.decimalSeparator, isLakh) : '';
      const creditStr = r.amount > 0 ? formatAmount(r.amount, config.decimalSeparator, isLakh) : '';
      lines.push([dateStr, desc, debitStr, creditStr].join(config.delimiter));
    } else {
      const sign = r.amount < 0 ? '-' : '';
      const amtStr = `${sign}${formatAmount(r.amount, config.decimalSeparator, isLakh)}`;
      lines.push([dateStr, desc, amtStr].join(config.delimiter));
    }
  }

  if (config.hasSummary) {
    lines.push(``);
    lines.push(`TOTAL TRANSACTIONS: ${rows.length}`);
    lines.push(`END OF STATEMENT`);
  }

  return {
    csvText: lines.join('\n') + '\n',
    expected,
    totalRows: rows.length,
  };
}
