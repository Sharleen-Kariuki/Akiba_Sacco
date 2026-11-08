import { Language } from './types.js';
import { TransactionRecord } from './logger.js';

export interface ValidatedStatementPage {
  pageNumber: number;        // 1-indexed (e.g. 1)
  totalPages: number;        // Total number of pages (e.g. 2)
  transactions: TransactionRecord[];
  formattedLines: string[];
  displayText: string;       // Exact string rendered in screen-content
  charCount: number;         // Total character count, guaranteed <= 182
}

/** USSD Protocol hard maximum characters allowed per payload */
export const USSD_MAX_CHARACTERS = 182;

/** Target maximum transactions to show per single page */
export const MAX_TRANSACTIONS_PER_PAGE = 3;

/** Maximum visual wrapped lines allowed on the Nokia 1280 screen */
export const MAX_LINES_PER_SCREEN = 7;

/** Approximate characters per line before word wrapping on the 160px screen */
export const CHARS_PER_SCREEN_LINE = 24;

/**
 * Validates individual transaction record fields to ensure
 * they cannot break display formatting or overflow screen buffers.
 */
export function validateTransactionRecord(tx: Partial<TransactionRecord>): {
  ref: string;
  date: string;
  amount: number;
  formattedLine: string;
} {
  // 1. Sanitize & validate reference (e.g. TXN-1001)
  const rawRef = typeof tx.ref === 'string' ? tx.ref.trim() : '';
  const ref = rawRef.length > 0 ? rawRef.slice(0, 10) : 'TXN-0000';

  // 2. Sanitize & validate date (e.g. 06-11-2026 16:30)
  const rawDate = typeof tx.date === 'string' ? tx.date.trim() : '';
  const date = rawDate.length > 0 ? rawDate.slice(0, 16) : '01-01-2026 00:00';

  // 3. Sanitize & validate amount (non-negative number, formatted without fractions)
  const numAmount = typeof tx.amount === 'number' && !isNaN(tx.amount) && isFinite(tx.amount)
    ? Math.max(0, Math.round(tx.amount))
    : 0;

  // Format line: TXN-1001 |  06-11-2026 16:30 |  600
  const formattedLine = `${ref} |  ${date} |  ${numAmount}`;

  return { ref, date, amount: numAmount, formattedLine };
}

/**
 * Validates and chunks transactions into pages adhering to:
 * 1. Target up to 3 transactions per page
 * 2. Strict 182-character USSD payload limit
 * 3. Physical 7-line vertical display limit on the Nokia 1280 screen
 */
export function getValidatedStatementPages(
  transactions: TransactionRecord[],
  language: Language
): ValidatedStatementPage[] {
  const title = language === 'sw' ? 'Taarifa za Miamala' : 'Mini Statement';

  // 1. Empty state handling
  if (!transactions || transactions.length === 0) {
    const emptyMsg = language === 'sw' ? 'Hakuna miamala bado.' : 'No transactions yet.';
    const header = `${title} (1/1)`;
    const displayText = `${header}\n\n${emptyMsg}`;
    return [
      {
        pageNumber: 1,
        totalPages: 1,
        transactions: [],
        formattedLines: [],
        displayText,
        charCount: displayText.length,
      },
    ];
  }

  // 2. Pre-validate and measure all transaction records
  const validatedItems = transactions.map((t) => {
    const validated = validateTransactionRecord(t);
    // Calculate how many lines this wrapped item takes (~24 chars per line)
    const visualLines = Math.max(1, Math.ceil(validated.formattedLine.length / CHARS_PER_SCREEN_LINE));
    return {
      record: t,
      validated,
      visualLines,
    };
  });

  // 3. Chunking loop with strict multi-factor overflow validation
  interface RawPage {
    transactions: TransactionRecord[];
    formattedLines: string[];
    visualLinesCount: number;
    textLength: number;
  }

  const rawPages: RawPage[] = [];
  let currentPage: RawPage = {
    transactions: [],
    formattedLines: [],
    visualLinesCount: 1, // Reserved for header line
    textLength: 30,      // Reserved for header text
  };

  for (const item of validatedItems) {
    const countCheck = currentPage.transactions.length >= MAX_TRANSACTIONS_PER_PAGE;
    const linesCheck = (currentPage.visualLinesCount + item.visualLines) > MAX_LINES_PER_SCREEN;
    const itemChars = item.validated.formattedLine.length + 1; // +1 for newline separator
    const charsCheck = (currentPage.textLength + itemChars) > USSD_MAX_CHARACTERS;

    // If adding this transaction causes ANY overflow and page is not empty, push and start new page
    if ((countCheck || linesCheck || charsCheck) && currentPage.transactions.length > 0) {
      rawPages.push(currentPage);
      currentPage = {
        transactions: [item.record],
        formattedLines: [item.validated.formattedLine],
        visualLinesCount: 1 + item.visualLines,
        textLength: 30 + itemChars,
      };
    } else {
      currentPage.transactions.push(item.record);
      currentPage.formattedLines.push(item.validated.formattedLine);
      currentPage.visualLinesCount += item.visualLines;
      currentPage.textLength += itemChars;
    }
  }

  if (currentPage.transactions.length > 0) {
    rawPages.push(currentPage);
  }

  const totalPages = Math.max(1, rawPages.length);

  // 4. Build final validated pages with headers
  return rawPages.map((page, index) => {
    const pageNumber = index + 1;
    const header = `${title} (${pageNumber}/${totalPages})`;
    const body = page.formattedLines.join('\n');
    let displayText = `${header}\n${body}`;

    // Ultimate hard guarantee against USSD protocol buffer overflow
    if (displayText.length > USSD_MAX_CHARACTERS) {
      displayText = displayText.slice(0, USSD_MAX_CHARACTERS);
    }

    return {
      pageNumber,
      totalPages,
      transactions: page.transactions,
      formattedLines: page.formattedLines,
      displayText,
      charCount: displayText.length,
    };
  });
}

