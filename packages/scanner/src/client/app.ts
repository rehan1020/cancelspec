// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { clearElement, createStore, el, LiveAnnouncer } from '@cancelspec/ui';
import { parseStatementIntake } from '../intake.js';
import type { DetectedSubscription } from '../types.js';
import type { WorkerInMessage, WorkerOutMessage } from '../worker.js';
import type {
  ColumnMappingChoices,
  SortColumn,
  SortDirection,
  ToolState,
} from './types.js';

export interface AppOptions {
  workerUrl?: string | undefined;
  githubRepoUrl?: string | undefined;
}

export function createScannerApp(container: HTMLElement, options: AppOptions = {}) {
  const workerUrl = options.workerUrl || '/scripts/scanner-worker.js';
  const githubRepoUrl =
    options.githubRepoUrl || 'https://github.com/cancelspec/cancelspec';

  const announcer = new LiveAnnouncer();
  let activeWorker: Worker | null = null;

  const initialChoices: ColumnMappingChoices = {
    dateCol: 0,
    descCol: 1,
    mode: 'single',
    amountCol: 2,
    debitCol: 2,
    creditCol: 3,
    isDayFirst: true,
    isOutflowPositive: true,
    currency: 'USD',
  };

  const store = createStore<ToolState>({
    screen: 'intake',
    fileName: null,
    fileText: null,
    previewRows: [],
    headers: [],
    mapping: null,
    mappingChoices: initialChoices,
    scanProgress: { stage: 'Initializing', percent: 0 },
    scanResult: null,
    excludedSubIds: new Set<string>(),
    cancelledSubIds: new Set<string>(),
    sortColumn: 'annual',
    sortDirection: 'desc',
    errorMessage: null,
    suggestModalSub: null,
  });

  function terminateWorker() {
    if (activeWorker) {
      activeWorker.terminate();
      activeWorker = null;
    }
  }

  function resetState() {
    terminateWorker();
    store.reset();
    announcer.announce('Scanner reset. Ready for a new statement.');
  }

  function handleFileSelected(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      store.setState({
        screen: 'error',
        errorMessage: 'The selected file exceeds the 20 MB size limit.',
      });
      announcer.announce('Error: File exceeds 20 MB size limit.', 'assertive');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text || text.trim().length === 0) {
        store.setState({
          screen: 'error',
          errorMessage: 'The selected statement file appears to be empty.',
        });
        announcer.announce('Error: File is empty.', 'assertive');
        return;
      }

      try {
        const intake = parseStatementIntake(text);
        if (intake.rows.length === 0) {
          store.setState({
            screen: 'error',
            errorMessage: 'No transaction rows could be parsed from this file.',
          });
          announcer.announce('Error: No transactions found.', 'assertive');
          return;
        }

        const previewRows = intake.rows.slice(0, 5);
        store.setState({
          fileName: file.name,
          fileText: text,
          previewRows,
          headers: intake.headers,
        });

        // Start scanning in worker
        startScan(text);
      } catch (err) {
        store.setState({
          screen: 'error',
          errorMessage: 'Failed to read statement. Please check file format.',
        });
        announcer.announce('Error parsing statement.', 'assertive');
      }
    };

    reader.onerror = () => {
      store.setState({
        screen: 'error',
        errorMessage: 'Could not read the statement file from your device.',
      });
      announcer.announce('Error reading file.', 'assertive');
    };

    reader.readAsText(file);
  }

  function startScan(text: string, manualChoices?: ColumnMappingChoices) {
    terminateWorker();

    store.setState({
      screen: 'scanning',
      scanProgress: { stage: 'Starting analysis...', percent: 5 },
      errorMessage: null,
    });
    announcer.announce('Analyzing statement in Web Worker...');

    try {
      activeWorker = new Worker(workerUrl, { type: 'module' });
    } catch {
      // Fallback if module worker fails
      try {
        activeWorker = new Worker(workerUrl);
      } catch (err) {
        store.setState({
          screen: 'error',
          errorMessage: 'Browser Web Worker initialization failed.',
        });
        return;
      }
    }

    activeWorker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;
      if (!msg) return;

      switch (msg.type) {
        case 'SCAN_PROGRESS':
          store.setState({
            scanProgress: { stage: msg.stage, percent: msg.percent },
          });
          announcer.announce(msg.stage);
          break;

        case 'MAPPING_REQUIRED':
          store.setState({
            screen: 'mapping',
            mapping: msg.suggestedMapping,
            headers: msg.headers,
            previewRows: msg.previewRows,
            mappingChoices: {
              dateCol: msg.suggestedMapping.dateCol,
              descCol: msg.suggestedMapping.descCol,
              mode:
                msg.suggestedMapping.debitCol !== undefined
                  ? 'split'
                  : 'single',
              amountCol: msg.suggestedMapping.amountCol ?? 2,
              debitCol: msg.suggestedMapping.debitCol ?? 2,
              creditCol: msg.suggestedMapping.creditCol ?? 3,
              isDayFirst: true,
              isOutflowPositive: true,
              currency: 'USD',
            },
          });
          announcer.announce(
            'Column mapping required. Please confirm column assignments.',
          );
          break;

        case 'SCAN_COMPLETE':
          store.setState({
            screen: 'results',
            scanResult: msg.result,
          });
          announcer.announce(
            `Scan complete. Found ${msg.result.subscriptions.length} recurring subscriptions.`,
          );
          terminateWorker();
          break;

        case 'SCAN_ERROR':
          store.setState({
            screen: 'error',
            errorMessage: msg.error,
          });
          announcer.announce(`Scan error: ${msg.error}`, 'assertive');
          terminateWorker();
          break;
      }
    };

    activeWorker.onerror = () => {
      store.setState({
        screen: 'error',
        errorMessage: 'An error occurred during statement processing.',
      });
      announcer.announce('Worker error.', 'assertive');
      terminateWorker();
    };

    const inMsg: WorkerInMessage = {
      type: 'SCAN_START',
      text,
      options: manualChoices
        ? {
            columnMapping: {
              dateCol: manualChoices.dateCol,
              descCol: manualChoices.descCol,
              amountCol:
                manualChoices.mode === 'single'
                  ? manualChoices.amountCol
                  : undefined,
              debitCol:
                manualChoices.mode === 'split'
                  ? manualChoices.debitCol
                  : undefined,
              creditCol:
                manualChoices.mode === 'split'
                  ? manualChoices.creditCol
                  : undefined,
              confidence: 1.0,
            },
            isDayFirst: manualChoices.isDayFirst,
            isOutflowPositive: manualChoices.isOutflowPositive,
            currency: manualChoices.currency,
          }
        : undefined,
    };

    activeWorker.postMessage(inMsg);
  }

  // Render functions
  function renderIntake(): HTMLElement {
    const fileInput = el('input', {
      type: 'file',
      id: 'statement-file-input',
      accept: '.csv,.tsv,.txt',
      'aria-label': 'Select bank statement file',
      style: 'margin-bottom: 1rem; display: block; margin-left: auto; margin-right: auto;',
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        handleFileSelected(fileInput.files[0]);
      }
    });

    const dropZone = el(
      'div',
      {
        className: 'dropzone card',
        tabindex: 0,
        role: 'button',
        'aria-label': 'Drag and drop statement file here or click to select',
        style:
          'border: 2px dashed var(--border-color); border-radius: 8px; padding: 3rem 1.5rem; text-align: center; margin: 1.5rem 0; cursor: pointer;',
      },
      fileInput,
      el(
        'p',
        { style: 'margin: 0; color: var(--text-muted); font-size: 0.95rem;' },
        'Drag and drop your statement file (.csv, .tsv, .txt) here, or click to browse.',
      ),
      el(
        'p',
        { style: 'margin-top: 0.5rem; color: var(--text-muted); font-size: 0.8rem;' },
        'Up to 20 MB. Handled 100% locally in your browser memory.',
      ),
    );

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--primary)';
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = 'var(--border-color)';
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--border-color)';
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });

    dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    return el(
      'section',
      { 'aria-labelledby': 'intake-heading' },
      el('h2', { id: 'intake-heading' }, '1. Drop in your bank statement'),
      el(
        'div',
        { className: 'banner banner-success', role: 'region', 'aria-label': 'Zero-data guarantee' },
        el('strong', {}, 'Zero-Data Guarantee: '),
        'No statement data leaves your device. Parsing and recurring charge detection happen offline inside an in-browser Web Worker. Nothing is written to cookies or storage.',
      ),
      dropZone,
      el(
        'p',
        { style: 'text-align: center; margin-top: 2rem;' },
        el('span', { style: 'color: var(--text-muted);' }, 'Prefer not to upload a statement? '),
        el('a', { href: '/services/' }, 'Browse all cancellation guides by hand'),
      ),
    );
  }

  function renderMapping(state: ToolState): HTMLElement {
    const choices = { ...(state.mappingChoices || initialChoices) };

    const dateSelect = el('select', { id: 'mapping-date-col', 'aria-label': 'Date column' });
    const descSelect = el('select', { id: 'mapping-desc-col', 'aria-label': 'Description column' });
    const amountModeSelect = el('select', { id: 'mapping-mode', 'aria-label': 'Amount layout mode' });
    const amountSelect = el('select', { id: 'mapping-amount-col', 'aria-label': 'Amount column' });
    const debitSelect = el('select', { id: 'mapping-debit-col', 'aria-label': 'Debit column' });
    const creditSelect = el('select', { id: 'mapping-credit-col', 'aria-label': 'Credit column' });
    const dayFirstSelect = el('select', { id: 'mapping-day-first', 'aria-label': 'Date format' });
    const outflowSignSelect = el('select', { id: 'mapping-polarity', 'aria-label': 'Sign convention' });
    const currencySelect = el('select', { id: 'mapping-currency', 'aria-label': 'Currency' });

    // Populate columns
    state.headers.forEach((h, idx) => {
      const sample = state.previewRows[0]?.[idx] || '';
      const label = `Col ${idx + 1}: ${h || 'Untitled'} (${sample.slice(0, 15)})`;

      dateSelect.appendChild(el('option', { value: idx, selected: idx === choices.dateCol }, label));
      descSelect.appendChild(el('option', { value: idx, selected: idx === choices.descCol }, label));
      amountSelect.appendChild(el('option', { value: idx, selected: idx === choices.amountCol }, label));
      debitSelect.appendChild(el('option', { value: idx, selected: idx === choices.debitCol }, label));
      creditSelect.appendChild(el('option', { value: idx, selected: idx === choices.creditCol }, label));
    });

    amountModeSelect.appendChild(el('option', { value: 'single', selected: choices.mode === 'single' }, 'Single signed amount column'));
    amountModeSelect.appendChild(el('option', { value: 'split', selected: choices.mode === 'split' }, 'Separate Debit / Credit columns'));

    dayFirstSelect.appendChild(el('option', { value: 'true', selected: choices.isDayFirst }, 'DD/MM/YYYY (Day first)'));
    dayFirstSelect.appendChild(el('option', { value: 'false', selected: !choices.isDayFirst }, 'MM/DD/YYYY (Month first)'));

    outflowSignSelect.appendChild(el('option', { value: 'false', selected: !choices.isOutflowPositive }, 'Negative numbers are charges (-15.00)'));
    outflowSignSelect.appendChild(el('option', { value: 'true', selected: choices.isOutflowPositive }, 'Positive numbers are charges (+15.00)'));

    ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'].forEach((cur) => {
      currencySelect.appendChild(el('option', { value: cur, selected: cur === choices.currency }, cur));
    });

    const splitFields = el(
      'div',
      { id: 'split-fields-container', style: choices.mode === 'split' ? '' : 'display: none;' },
      el('div', { className: 'form-group' }, el('label', { for: 'mapping-debit-col' }, 'Debit column (Charges / Outflow)'), debitSelect),
      el('div', { className: 'form-group' }, el('label', { for: 'mapping-credit-col' }, 'Credit column (Credits / Deposits)'), creditSelect),
    );

    const singleFields = el(
      'div',
      { id: 'single-fields-container', style: choices.mode === 'single' ? '' : 'display: none;' },
      el('div', { className: 'form-group' }, el('label', { for: 'mapping-amount-col' }, 'Amount column'), amountSelect),
      el('div', { className: 'form-group' }, el('label', { for: 'mapping-polarity' }, 'Sign convention'), outflowSignSelect),
    );

    amountModeSelect.addEventListener('change', () => {
      const mode = amountModeSelect.value as 'single' | 'split';
      choices.mode = mode;
      splitFields.style.display = mode === 'split' ? '' : 'display: none;';
      singleFields.style.display = mode === 'single' ? '' : 'display: none;';
    });

    // Preview table
    const tableHeaderRow = el(
      'tr',
      {},
      ...state.headers.map((h, i) => el('th', { scope: 'col' }, `${h || 'Col ' + (i + 1)}`)),
    );
    const tableBody = el(
      'tbody',
      {},
      ...state.previewRows.map((row) =>
        el('tr', {}, ...row.map((cell) => el('td', {}, cell))),
      ),
    );
    const previewTable = el(
      'div',
      { style: 'overflow-x: auto; margin: 1.5rem 0; max-height: 250px;' },
      el('table', { className: 'table' }, el('thead', {}, tableHeaderRow), tableBody),
    );

    const confirmBtn = el('button', { className: 'btn btn-primary', type: 'button' }, 'Confirm & Run Scan');
    confirmBtn.addEventListener('click', () => {
      choices.dateCol = parseInt(dateSelect.value, 10);
      choices.descCol = parseInt(descSelect.value, 10);
      choices.mode = amountModeSelect.value as 'single' | 'split';
      choices.amountCol = parseInt(amountSelect.value, 10);
      choices.debitCol = parseInt(debitSelect.value, 10);
      choices.creditCol = parseInt(creditSelect.value, 10);
      choices.isDayFirst = dayFirstSelect.value === 'true';
      choices.isOutflowPositive = outflowSignSelect.value === 'true';
      choices.currency = currencySelect.value;

      store.setState({ mappingChoices: choices });
      if (state.fileText) {
        startScan(state.fileText, choices);
      }
    });

    const cancelBtn = el('button', { className: 'btn btn-outline', type: 'button', style: 'margin-left: 0.5rem;' }, 'Cancel');
    cancelBtn.addEventListener('click', resetState);

    return el(
      'section',
      { 'aria-labelledby': 'mapping-heading' },
      el('h2', { id: 'mapping-heading' }, 'Review Column Mapping'),
      el('p', {}, 'We detected your file columns. Please verify or adjust assignments if necessary:'),
      previewTable,
      el('div', { className: 'form-group' }, el('label', { for: 'mapping-date-col' }, 'Date column'), dateSelect),
      el('div', { className: 'form-group' }, el('label', { for: 'mapping-day-first' }, 'Date format'), dayFirstSelect),
      el('div', { className: 'form-group' }, el('label', { for: 'mapping-desc-col' }, 'Description / Merchant column'), descSelect),
      el('div', { className: 'form-group' }, el('label', { for: 'mapping-mode' }, 'Amount layout mode'), amountModeSelect),
      singleFields,
      splitFields,
      el('div', { className: 'form-group' }, el('label', { for: 'mapping-currency' }, 'Statement currency'), currencySelect),
      el('div', { style: 'margin-top: 1.5rem;' }, confirmBtn, cancelBtn),
    );
  }

  function renderScanning(state: ToolState): HTMLElement {
    const pct = state.scanProgress.percent;
    const bar = el('div', {
      role: 'progressbar',
      'aria-valuenow': pct,
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-label': 'Statement scan progress',
      style: `height: 12px; border-radius: 6px; background-color: var(--primary); width: ${pct}%; transition: width 0.2s ease;`,
    });

    const track = el(
      'div',
      {
        style:
          'background-color: var(--border-color); border-radius: 6px; height: 12px; overflow: hidden; margin: 1.5rem 0;',
      },
      bar,
    );

    const cancelBtn = el(
      'button',
      { className: 'btn btn-outline btn-sm', type: 'button', style: 'margin-top: 1rem;' },
      'Cancel Scan',
    );
    cancelBtn.addEventListener('click', resetState);

    return el(
      'section',
      { className: 'card', 'aria-labelledby': 'scan-progress-heading', style: 'text-align: center; padding: 2.5rem 1rem;' },
      el('h2', { id: 'scan-progress-heading' }, 'Analyzing statement...'),
      track,
      el('p', { style: 'color: var(--text-muted);' }, state.scanProgress.stage),
      cancelBtn,
    );
  }

  function sortSubscriptions(
    subs: DetectedSubscription[],
    col: SortColumn,
    dir: SortDirection,
  ): DetectedSubscription[] {
    const mult = dir === 'asc' ? 1 : -1;
    return [...subs].sort((a, b) => {
      switch (col) {
        case 'service':
          return mult * a.merchantKey.localeCompare(b.merchantKey);
        case 'cadence':
          return mult * a.cadence.localeCompare(b.cadence);
        case 'amount':
          return mult * (a.typicalAmount - b.typicalAmount);
        case 'annual':
          return mult * (a.annualizedCost - b.annualizedCost);
        case 'difficulty': {
          const diffA = a.topMatch?.difficulty ?? 0;
          const diffB = b.topMatch?.difficulty ?? 0;
          return mult * (diffA - diffB);
        }
      }
    });
  }

  function renderResults(state: ToolState): HTMLElement {
    if (!state.scanResult) return el('div');

    const activeSubs = state.scanResult.subscriptions.filter(
      (s) => !state.excludedSubIds.has(s.id),
    );

    const likelySubs = activeSubs.filter((s) => s.tier === 'likely');
    const possibleSubs = activeSubs.filter((s) => s.tier === 'possible');

    // Calculate active annualized totals
    const activeTotals = new Map<string, number>();
    for (const sub of activeSubs) {
      if (!activeTotals.has(sub.currency)) {
        activeTotals.set(sub.currency, 0);
      }
      if (!state.cancelledSubIds.has(sub.id)) {
        activeTotals.set(sub.currency, activeTotals.get(sub.currency)! + sub.annualizedCost);
      }
    }

    const totalsPills = Array.from(activeTotals.entries()).map(([cur, tot]) =>
      el(
        'span',
        { className: 'badge badge-primary', style: 'font-size: 1.1rem; padding: 0.5rem 1rem; margin-right: 0.5rem;' },
        `${cur} ${tot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / yr`,
      ),
    );

    const printChecklistBtn = el(
      'button',
      { className: 'btn btn-primary', type: 'button' },
      'View & Print Checklist',
    );
    printChecklistBtn.addEventListener('click', () => {
      store.setState({ screen: 'checklist' });
      announcer.announce('Switched to printable checklist view.');
    });

    const copyChecklistBtn = el(
      'button',
      { className: 'btn btn-outline', type: 'button', style: 'margin-left: 0.5rem;' },
      'Copy Summary',
    );
    copyChecklistBtn.addEventListener('click', () => {
      const summaryText = buildSummaryText(activeSubs, state.cancelledSubIds);
      navigator.clipboard?.writeText(summaryText).then(() => {
        announcer.announce('Checklist copied to clipboard!');
      });
    });

    const scanAnotherBtn = el(
      'button',
      { className: 'btn btn-outline', type: 'button', style: 'margin-left: 0.5rem;' },
      'Scan Another Statement',
    );
    scanAnotherBtn.addEventListener('click', resetState);

    const summaryCard = el(
      'div',
      { className: 'card', style: 'margin-bottom: 2rem;' },
      el('h2', {}, 'Scan Summary'),
      el(
        'p',
        {},
        `Detected ${activeSubs.length} recurring subscriptions in ${state.scanResult.totalRowsProcessed} statement rows.`,
      ),
      el('div', { style: 'margin: 1rem 0;' }, ...totalsPills),
      el('div', { style: 'margin-top: 1.5rem;' }, printChecklistBtn, copyChecklistBtn, scanAnotherBtn),
    );

    const sortedLikely = sortSubscriptions(likelySubs, state.sortColumn, state.sortDirection);
    const sortedPossible = sortSubscriptions(possibleSubs, state.sortColumn, state.sortDirection);

    const likelyTable = renderSubscriptionTable(sortedLikely, state, 'Likely Subscriptions');

    const possibleSection =
      sortedPossible.length > 0
        ? el(
            'details',
            { className: 'card', style: 'margin-top: 2rem;' },
            el(
              'summary',
              { style: 'cursor: pointer; font-weight: bold; font-size: 1.1rem;' },
              `Possible Subscriptions (${sortedPossible.length} items) — review single annual or variable charges`,
            ),
            renderSubscriptionTable(sortedPossible, state, 'Possible Subscriptions'),
          )
        : el('div');

    const modal = state.suggestModalSub ? renderSuggestModal(state.suggestModalSub, githubRepoUrl) : el('div');

    return el(
      'section',
      { 'aria-labelledby': 'results-heading' },
      el('h1', { id: 'results-heading', className: 'sr-only' }, 'Subscription Results'),
      summaryCard,
      likelyTable,
      possibleSection,
      modal,
    );
  }

  function renderSubscriptionTable(
    subs: DetectedSubscription[],
    state: ToolState,
    captionText: string,
  ): HTMLElement {
    if (subs.length === 0) {
      return el('p', { style: 'color: var(--text-muted);' }, 'No subscriptions in this category.');
    }

    const sortHeader = (label: string, col: SortColumn) => {
      const isCurrent = state.sortColumn === col;
      const sortAria = isCurrent ? (state.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';
      const arrow = isCurrent ? (state.sortDirection === 'asc' ? ' ↑' : ' ↓') : '';

      const btn = el('button', {
        type: 'button',
        className: 'btn-ghost',
        style: 'font-weight: bold; padding: 0.25rem 0.5rem;',
        'aria-label': `Sort by ${label}`,
      }, `${label}${arrow}`);

      btn.addEventListener('click', () => {
        if (state.sortColumn === col) {
          store.setState({ sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc' });
        } else {
          store.setState({ sortColumn: col, sortDirection: 'desc' });
        }
      });

      return el('th', { scope: 'col', 'aria-sort': sortAria }, btn);
    };

    const header = el(
      'tr',
      {},
      sortHeader('Service / Descriptor', 'service'),
      sortHeader('Cadence', 'cadence'),
      sortHeader('Charge', 'amount'),
      sortHeader('Annual Cost', 'annual'),
      sortHeader('Difficulty', 'difficulty'),
      el('th', { scope: 'col' }, 'Actions'),
    );

    const rows = subs.map((sub) => {
      const isCancelled = state.cancelledSubIds.has(sub.id);

      const titleCell = el(
        'td',
        {},
        el(
          'strong',
          { style: isCancelled ? 'text-decoration: line-through; color: var(--text-muted);' : '' },
          sub.topMatch ? sub.topMatch.serviceName : sub.merchantKey,
        ),
        sub.topMatch
          ? el('span', { className: 'badge badge-success', style: 'margin-left: 0.5rem; font-size: 0.75rem;' }, 'Verified')
          : el('span', { className: 'badge badge-warning', style: 'margin-left: 0.5rem; font-size: 0.75rem;' }, 'Unmatched'),
        sub.isOverdue
          ? el('div', { style: 'color: var(--danger); font-size: 0.8rem; margin-top: 0.25rem;' }, 'May have ended (charge overdue)')
          : null,
      );

      const cadenceCell = el('td', {}, el('span', { className: 'badge' }, sub.cadence));

      const amountCell = el(
        'td',
        {},
        `${sub.currency} ${sub.typicalAmount.toFixed(2)}`,
        el('div', { style: 'color: var(--text-muted); font-size: 0.8rem;' }, `${sub.chargeCount} charges`),
      );

      const annualCell = el(
        'td',
        { style: isCancelled ? 'text-decoration: line-through; color: var(--text-muted);' : 'font-weight: bold;' },
        `${sub.currency} ${sub.annualizedCost.toFixed(2)}`,
      );

      const difficultyCell = el('td', {});
      if (sub.topMatch) {
        difficultyCell.appendChild(
          el(
            'span',
            { className: `badge difficulty-${sub.topMatch.difficulty}` },
            `Difficulty ${sub.topMatch.difficulty}/5`,
          ),
        );
      } else {
        difficultyCell.textContent = '—';
      }

      // Action buttons
      const actionsCell = el('td', {});

      if (sub.topMatch) {
        const cancelLink = el(
          'a',
          {
            href: `/services/${sub.topMatch.region.toLowerCase()}/${sub.topMatch.serviceId}/`,
            target: '_blank',
            rel: 'noopener',
            className: 'btn btn-primary btn-sm',
            style: 'margin-right: 0.4rem; margin-bottom: 0.25rem;',
          },
          'See how to cancel ',
          el('span', { className: 'sr-only' }, '(opens in new tab)'),
        );
        actionsCell.appendChild(cancelLink);
      } else {
        const suggestBtn = el(
          'button',
          {
            type: 'button',
            className: 'btn btn-outline btn-sm',
            style: 'margin-right: 0.4rem; margin-bottom: 0.25rem;',
          },
          'Suggest playbook',
        );
        suggestBtn.addEventListener('click', () => {
          store.setState({ suggestModalSub: sub });
        });
        actionsCell.appendChild(suggestBtn);
      }

      const notSubBtn = el(
        'button',
        {
          type: 'button',
          className: 'btn btn-ghost btn-sm',
          style: 'margin-right: 0.4rem; margin-bottom: 0.25rem;',
          title: 'Exclude this item from results',
        },
        'Not a subscription',
      );
      notSubBtn.addEventListener('click', () => {
        const nextExcluded = new Set(state.excludedSubIds);
        nextExcluded.add(sub.id);
        store.setState({ excludedSubIds: nextExcluded });
        announcer.announce(`Removed ${sub.merchantKey} from subscriptions.`);
      });
      actionsCell.appendChild(notSubBtn);

      const cancelledBtn = el(
        'button',
        {
          type: 'button',
          className: 'btn btn-ghost btn-sm',
          style: 'margin-bottom: 0.25rem;',
          title: isCancelled ? 'Unmark cancelled' : 'Mark as already cancelled',
        },
        isCancelled ? 'Undo cancel' : 'Already cancelled',
      );
      cancelledBtn.addEventListener('click', () => {
        const nextCancelled = new Set(state.cancelledSubIds);
        if (isCancelled) {
          nextCancelled.delete(sub.id);
          announcer.announce(`Restored ${sub.merchantKey} to active subscriptions.`);
        } else {
          nextCancelled.add(sub.id);
          announcer.announce(`Marked ${sub.merchantKey} as already cancelled.`);
        }
        store.setState({ cancelledSubIds: nextCancelled });
      });
      actionsCell.appendChild(cancelledBtn);

      return el('tr', { className: isCancelled ? 'row-cancelled' : '' }, titleCell, cadenceCell, amountCell, annualCell, difficultyCell, actionsCell);
    });

    return el(
      'div',
      { style: 'overflow-x: auto; margin-top: 1.5rem;' },
      el('table', { className: 'table' }, el('caption', { className: 'sr-only' }, captionText), el('thead', {}, header), el('tbody', {}, ...rows)),
    );
  }

  function renderSuggestModal(sub: DetectedSubscription, githubRepoUrl: string): HTMLElement {
    const issueTitle = `Playbook request: ${sub.merchantKey} (${sub.cadence})`;
    const issueBody = `### Subscription Details\n- Clean Merchant Key: ${sub.merchantKey}\n- Cadence Bucket: ${sub.cadence}\n- Typical Amount: ${sub.currency} ${sub.typicalAmount.toFixed(2)}\n\n*(Notice: No personal or account information has been attached.)*`;

    const issueUrl = `${githubRepoUrl}/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;

    const closeBtn = el('button', { className: 'btn btn-outline btn-sm', type: 'button' }, 'Close');
    closeBtn.addEventListener('click', () => store.setState({ suggestModalSub: null }));

    const openLink = el(
      'a',
      {
        href: issueUrl,
        target: '_blank',
        rel: 'noopener',
        className: 'btn btn-primary btn-sm',
        style: 'margin-right: 0.5rem;',
      },
      'Open GitHub Issue (opens in new tab)',
    );

    return el(
      'div',
      {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'suggest-modal-title',
        style:
          'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000;',
      },
      el(
        'div',
        { className: 'card', style: 'max-width: 550px; width: 90%; background: var(--bg-card); padding: 2rem;' },
        el('h2', { id: 'suggest-modal-title' }, 'Suggest Playbook to Community'),
        el(
          'p',
          { style: 'font-size: 0.9rem; color: var(--text-muted);' },
          'Privacy check: The link below carries only the cleaned merchant key and cadence. No bank details, dates, or amounts from your statement are transmitted.',
        ),
        el('pre', { style: 'background: var(--bg-code); padding: 1rem; border-radius: 4px; overflow-x: auto; font-size: 0.85rem;' }, `Merchant: ${sub.merchantKey}\nCadence: ${sub.cadence}`),
        el('div', { style: 'margin-top: 1.5rem; text-align: right;' }, openLink, closeBtn),
      ),
    );
  }

  function renderChecklist(state: ToolState): HTMLElement {
    if (!state.scanResult) return el('div');

    const activeSubs = state.scanResult.subscriptions.filter(
      (s) => !state.excludedSubIds.has(s.id),
    );

    const backBtn = el('button', { className: 'btn btn-outline', type: 'button' }, '← Back to Table View');
    backBtn.addEventListener('click', () => store.setState({ screen: 'results' }));

    const printBtn = el('button', { className: 'btn btn-primary', type: 'button', style: 'margin-left: 0.5rem;' }, 'Print Checklist');
    printBtn.addEventListener('click', () => window.print());

    const copyBtn = el('button', { className: 'btn btn-outline', type: 'button', style: 'margin-left: 0.5rem;' }, 'Copy Text');
    copyBtn.addEventListener('click', () => {
      const summaryText = buildSummaryText(activeSubs, state.cancelledSubIds);
      navigator.clipboard?.writeText(summaryText).then(() => {
        announcer.announce('Checklist copied to clipboard!');
      });
    });

    const items = activeSubs.map((sub) => {
      const isCancelled = state.cancelledSubIds.has(sub.id);
      const checkbox = el('input', {
        type: 'checkbox',
        id: `check-${sub.id}`,
        checked: isCancelled,
        style: 'margin-right: 0.75rem; transform: scale(1.3); cursor: pointer;',
      });

      checkbox.addEventListener('change', () => {
        const nextCancelled = new Set(state.cancelledSubIds);
        if (checkbox.checked) {
          nextCancelled.add(sub.id);
        } else {
          nextCancelled.delete(sub.id);
        }
        store.setState({ cancelledSubIds: nextCancelled });
      });

      const label = el(
        'label',
        {
          for: `check-${sub.id}`,
          style: `cursor: pointer; ${isCancelled ? 'text-decoration: line-through; color: var(--text-muted);' : ''}`,
        },
        el('strong', {}, sub.topMatch ? sub.topMatch.serviceName : sub.merchantKey),
        ` — ${sub.currency} ${sub.typicalAmount.toFixed(2)} / ${sub.cadence} (${sub.currency} ${sub.annualizedCost.toFixed(2)}/yr)`,
        sub.topMatch
          ? el(
              'a',
              {
                href: `/services/${sub.topMatch.region.toLowerCase()}/${sub.topMatch.serviceId}/`,
                target: '_blank',
                rel: 'noopener',
                style: 'margin-left: 1rem; font-size: 0.85rem;',
              },
              'How to cancel →',
            )
          : null,
      );

      return el('li', { style: 'list-style: none; margin: 1rem 0; display: flex; align-items: center;' }, checkbox, label);
    });

    return el(
      'section',
      { className: 'card checklist-view', 'aria-labelledby': 'checklist-heading' },
      el('h1', { id: 'checklist-heading' }, 'Cancellation Checklist'),
      el('p', { style: 'color: var(--text-muted);' }, 'Check off items as you cancel them. This list is kept in browser memory and prints cleanly.'),
      el('div', { className: 'no-print', style: 'margin: 1.5rem 0;' }, backBtn, printBtn, copyBtn),
      el('ul', { style: 'padding-left: 0; margin-top: 1.5rem;' }, ...items),
    );
  }

  function renderError(state: ToolState): HTMLElement {
    const retryBtn = el('button', { className: 'btn btn-primary', type: 'button' }, 'Try Again');
    retryBtn.addEventListener('click', resetState);

    return el(
      'section',
      { className: 'card banner banner-danger', 'aria-labelledby': 'error-heading', style: 'padding: 2rem;' },
      el('h2', { id: 'error-heading' }, 'Scanning Error'),
      el('p', {}, state.errorMessage || 'An error occurred while parsing the statement.'),
      el('p', { style: 'font-size: 0.9rem; color: var(--text-muted);' }, 'Please verify that your file is an uncorrupted CSV, TSV, or TXT bank statement.'),
      el('div', { style: 'margin-top: 1.5rem;' }, retryBtn),
    );
  }

  function buildSummaryText(subs: DetectedSubscription[], cancelledIds: Set<string>): string {
    let out = `CancelSpec Subscription Checklist\nGenerated: ${new Date().toISOString().split('T')[0]}\n\n`;

    const active = subs.filter((s) => !cancelledIds.has(s.id));
    const cancelled = subs.filter((s) => cancelledIds.has(s.id));

    out += `ACTIVE SUBSCRIPTIONS (${active.length}):\n`;
    for (const sub of active) {
      const name = sub.topMatch ? sub.topMatch.serviceName : sub.merchantKey;
      out += `[ ] ${name} - ${sub.currency} ${sub.typicalAmount.toFixed(2)}/${sub.cadence} (${sub.currency} ${sub.annualizedCost.toFixed(2)}/yr)\n`;
    }

    if (cancelled.length > 0) {
      out += `\nALREADY CANCELLED (${cancelled.length}):\n`;
      for (const sub of cancelled) {
        const name = sub.topMatch ? sub.topMatch.serviceName : sub.merchantKey;
        out += `[x] ${name}\n`;
      }
    }

    return out;
  }

  // Master render loop
  function render() {
    clearElement(container);
    const state = store.getState();

    switch (state.screen) {
      case 'intake':
        container.appendChild(renderIntake());
        break;
      case 'mapping':
        container.appendChild(renderMapping(state));
        break;
      case 'scanning':
        container.appendChild(renderScanning(state));
        break;
      case 'results':
        container.appendChild(renderResults(state));
        break;
      case 'checklist':
        container.appendChild(renderChecklist(state));
        break;
      case 'error':
        container.appendChild(renderError(state));
        break;
    }
  }

  // Subscribe and initial render
  const unsubscribe = store.subscribe(render);
  render();

  return {
    store,
    announcer,
    destroy() {
      terminateWorker();
      unsubscribe();
      announcer.destroy();
      clearElement(container);
    },
  };
}
