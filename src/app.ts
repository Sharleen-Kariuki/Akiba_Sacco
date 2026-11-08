import { createInitialContext, handleKeypadEvent, AppContext } from './fsm.js';
import { dictonary } from './dictionary.js';
import { KeypadKey, Language, ScreenState } from './types.js';
import {
  initSessionTimeout,
  notifyActivity,
  isTimeoutPopupOpen,
  dismissTimeoutPopupAndContinue,
  dismissTimeoutPopupAndReset,
} from './timeout.js';
import { renderAllKeypads } from './keypad.js';
import { getMenu, formatMenu } from './menus.js';
import { initDataTable, recordSessionLog, startNewSession, recordTransaction, getTransactions } from './logger.js';
import { renderPhoneHandsets } from './phone.js';
import { getValidatedStatementPages } from './statement.js';

interface PhoneState {
  lang: Language;
  ctx: AppContext;
  screenEl: HTMLDivElement | null;
  footerEl: HTMLDivElement | null;
}

// Dynamically instantiate the dual phones from the HTML template
const renderedPhones = renderPhoneHandsets();

const phones: Record<Language, PhoneState> = {
  en: {
    lang: 'en',
    ctx: { ...createInitialContext(), language: 'en' },
    screenEl: renderedPhones.en.screenEl,
    footerEl: renderedPhones.en.footerEl,
  },
  sw: {
    lang: 'sw',
    ctx: { ...createInitialContext(), language: 'sw' },
    screenEl: renderedPhones.sw.screenEl,
    footerEl: renderedPhones.sw.footerEl,
  },
};

export interface FooterLabels {
  left: string;
  center: string;
  right: string;
}

/**
 * Computes the Nokia 1280 softkey labels (Left, Center, Right) based on current screen state and language.
 */
export function getFooterLabels(state: ScreenState, lang: Language): FooterLabels {
  const t = dictonary[lang];
  const hasBuffer = 'buffer' in state && typeof state.buffer === 'string' && state.buffer.length > 0;

  switch (state.state) {
    case 'dialing':
      if (hasBuffer) {
        return {
          left: t.footerCall,
          center: '',
          right: t.footerClear,
        };
      }
      return {
        left: t.footerMenu,
        center: '',
        right: t.footerGoto,
      };

    case 'main-menu':
      if (hasBuffer) {
        return {
          left: t.footerSelect,
          center: '',
          right: t.footerClear,
        };
      }
      return {
        left: t.footerSelect,
        center: '',
        right: t.footerExit,
      };

    case 'withdraw-menu':
      if (hasBuffer) {
        return {
          left: t.footerSelect,
          center: '',
          right: t.footerClear,
        };
      }
      return {
        left: t.footerSelect,
        center: '',
        right: t.footerBack,
      };

    case 'enter-phone-number':
    case 'enter-amount':
      if (hasBuffer) {
        return {
          left: t.footerOk,
          center: '',
          right: t.footerClear,
        };
      }
      return {
        left: t.footerOk,
        center: '',
        right: t.footerBack,
      };

    case 'confirmation':
      if ((state as any).message) {
        return {
          left: t.footerOk,
          center: '',
          right: t.footerExit,
        };
      }
      if (hasBuffer) {
        return {
          left: t.footerOk,
          center: '',
          right: t.footerClear,
        };
      }
      return {
        left: t.footerOk,
        center: '',
        right: t.footerBack,
      };

    case 'balance-screen':
      return {
        left: t.footerOk,
        center: '',
        right: t.footerBack,
      };

    case 'statement-screen': {
      const txns = getTransactions(lang);
      const pages = getValidatedStatementPages(txns, lang);
      const statTotalPages = pages.length;
      const rawPage = (state as any).page || 0;
      const statPage = Math.min(Math.max(0, rawPage), statTotalPages - 1);
      const moreHint = lang === 'sw' ? '9:Zaidi' : '9:More';
      const backHint = lang === 'sw' ? '0:Rudi' : '0:Back';
      return {
        left: moreHint,
        center: `${statPage + 1}/${statTotalPages}`,
        right: backHint,
      };
    }

    default:
      return {
        left: t.footerOk,
        center: '',
        right: t.footerBack,
      };
  }
}

function getPageTitle(state: string): string {
  const map: Record<string, string> = {
    dialing: 'Dialer',
    'main-menu': 'Main Menu',
    'withdraw-menu': 'Withdraw Menu',
    'balance-screen': 'Balance Screen',
    'enter-phone-number': 'Enter Phone Number',
    'enter-amount': 'Enter Amount',
    confirmation: 'Confirmation',
    'timeout-alert': 'Timeout Alert',
    'statement-screen': 'Mini Statement',
  };
  return map[state] || state;
}

function renderLCD(phone: PhoneState): void {
  const { ctx, screenEl, footerEl } = phone;
  const { current, language } = ctx;
  const t = dictonary[language];

  // Update Nokia 1280 softkey labels in the bottom footer
  if (footerEl) {
    const labels = getFooterLabels(current, language);
    const leftEl = footerEl.querySelector('.footer-left');
    const centerEl = footerEl.querySelector('.footer-center');
    const rightEl = footerEl.querySelector('.footer-right');
    if (leftEl) leftEl.textContent = labels.left;
    if (centerEl) centerEl.textContent = labels.center;
    if (rightEl) rightEl.textContent = labels.right;
  }

  if (!screenEl) return;

  let output = '';

  // Automatically renders menu title, options, active input buffer, and error validation
  const menu = getMenu(current.state);
  if (menu) {
    const buffer = (current as any).buffer;
    const error = (current as any).error;
    screenEl.textContent = formatMenu(menu, language, buffer, error);
    return;
  }

  // Specific screens
  switch (current.state) {
    case 'dialing':
      output = current.error
        ? `${current.error}\n\n[Back]`
        : current.buffer && current.buffer.length > 0
          ? `${current.buffer}`
          : t.dialingPrompt;
      break;

    case 'balance-screen':
      output = current.error
        ? `${current.error}\n\n[Back]`
        : `${t.balanceTitle}\n${t.balanceAmount(current.balance)}\n\n0. ${t.backOption}\n> ${(current as any).buffer || ''}`;
      break;

    case 'enter-phone-number':
      output = current.error
        ? `${current.error}\n\n[Back]`
        : `${t.enterPhonePrompt}\n0. ${t.backOption}\n> ${current.buffer || ''}`;
      break;

    case 'enter-amount':
      output = current.error
        ? `${current.error}\n\n[Back]`
        : `${t.enterAmountPrompt}\n0. ${t.backOption}\n> KES ${current.buffer || ''}`;
      break;

    case 'confirmation':
      output = current.error
        ? `${current.error}\n\n[Back]`
        : current.message
          ? `${current.message}\n\n[Back]`
          : `${t.confirmPrompt(current.amount, current.recipientPhone)}\n> ${(current as any).buffer || ''}`;
      break;

    case 'statement-screen': {
      const txns = getTransactions(language);
      const pages = getValidatedStatementPages(txns, language);
      const rawPage = (current as any).page || 0;
      const activePageIndex = Math.min(Math.max(0, rawPage), pages.length - 1);
      output = pages[activePageIndex].displayText;
      break;
    }
  }

  if (screenEl) {
    screenEl.textContent = output;
  }
}

// Analyzes keypad interactions and records detailed session audit log entries

function logUserInteraction(
  phoneId: Language,
  key: KeypadKey,
  prevState: ScreenState,
  nextState: ScreenState
): void {
  const prevTitle = getPageTitle(prevState.state);

  //Red End Key pressed
  if (key === 'end') {
    if (prevState.state !== 'dialing') {
      recordSessionLog(phoneId, prevTitle, 'Session Terminated via Red End Key', '[End Key]', 'TERMINATED');
    }
    return;
  }

  //  Dialer Screen interactions
  if (prevState.state === 'dialing') {
    if (key === 'soft-left' || key === 'call' || key === 'ok') {
      const dialBuffer = (prevState as any).buffer || '';
      if (nextState.state === 'main-menu') {
        // Start fresh session identifier upon successful dialing
        startNewSession(phoneId);
        const method = key === 'soft-left' ? 'via Menu Key' : 'via Call/OK';
        recordSessionLog(phoneId, 'Dialer', `Session Initiated (*144#) ${method}`, dialBuffer || '*144#', 'ACTIVE');
      } else if (nextState.error) {
        recordSessionLog(phoneId, 'Dialer', 'Invalid USSD Code Dialed', dialBuffer || '[Empty]', 'ERROR');
      }
    } else if (key === 'back' && !(prevState as any).buffer) {
      recordSessionLog(phoneId, 'Dialer', 'Quick Dial (*144#) pre-filled via Go to Key', 'Go to', 'ACTIVE');
    }
    return;
  }

  // Clear action when Back is pressed while buffer is populated
  if (key === 'back' && (prevState as any).buffer && (prevState as any).buffer.length > 0) {
    recordSessionLog(phoneId, prevTitle, 'Character deleted via Clear Key', 'Clear', 'ACTIVE');
    return;
  }

  // Exit action on Main Menu
  if (prevState.state === 'main-menu' && key === 'back' && !(prevState as any).buffer) {
    recordSessionLog(phoneId, 'Main Menu', 'Session Terminated via Exit Key', 'Exit', 'TERMINATED');
    return;
  }

  // Menu interactions (Main Menu, Withdraw Menu, etc.)
  const menu = getMenu(prevState.state);
  if (menu) {
    if (key === 'ok' || key === 'call') {
      const typedKey = (prevState as any).buffer || '';
      if (typedKey === '0') {
        recordSessionLog(phoneId, prevTitle, `Navigated Back to ${getPageTitle(nextState.state)} via [0] + [OK]`, '0 (Back)', 'ACTIVE');
        return;
      }
      if (nextState.error) {
        recordSessionLog(phoneId, prevTitle, 'Invalid Menu Option Attempted', typedKey || '[Empty]', 'ERROR');
      } else {
        const selectedOpt = menu.options[typedKey];
        const optLabel = selectedOpt?.label?.[phoneId] || selectedOpt?.label?.en || `Option ${typedKey}`;
        recordSessionLog(phoneId, prevTitle, `Selected Option ${typedKey}: ${optLabel}`, typedKey, 'ACTIVE');
      }
    } else if (key === '*' || key === '#') {
      recordSessionLog(phoneId, prevTitle, `Non-Functional Key Pressed (${key})`, key, 'ERROR');
    }
    return;
  }

  //  Enter Phone Number screen
  if (prevState.state === 'enter-phone-number') {
    if (key === 'ok' || key === 'call') {
      const phoneBuffer = (prevState as any).buffer || '';
      if (phoneBuffer === '0') {
        recordSessionLog(phoneId, 'Enter Phone Number', `Navigated Back to ${getPageTitle(nextState.state)} via [0] + [OK]`, '0 (Back)', 'ACTIVE');
        return;
      }
      if (nextState.error) {
        recordSessionLog(phoneId, 'Enter Phone Number', 'Invalid Phone Number (10 digits starting 07/01)', phoneBuffer || '[Empty]', 'ERROR');
      } else {
        recordSessionLog(phoneId, 'Enter Phone Number', 'Recipient Phone Number Submitted', phoneBuffer, 'ACTIVE');
      }
    }
    return;
  }

  // Enter Amount screen
  if (prevState.state === 'enter-amount') {
    if (key === 'ok' || key === 'call') {
      const amtBuffer = (prevState as any).buffer || '';
      if (amtBuffer === '0') {
        recordSessionLog(phoneId, 'Enter Amount', `Navigated Back to ${getPageTitle(nextState.state)} via [0] + [OK]`, '0 (Back)', 'ACTIVE');
        return;
      }
      if (nextState.error) {
        recordSessionLog(phoneId, 'Enter Amount', nextState.error, `KES ${amtBuffer || 0}`, 'ERROR');
      } else {
        recordSessionLog(phoneId, 'Enter Amount', 'Withdrawal Amount Submitted', `KES ${amtBuffer}`, 'ACTIVE');
      }
    }
    return;
  }

  //  Confirmation screen
  if (prevState.state === 'confirmation') {
    // If user was viewing final message and clicked to reset
    if ((prevState as any).message) {
      recordSessionLog(phoneId, 'Confirmation', 'Session Closed After Completion', '[Close]', 'SUCCESS');
      return;
    }

    if (key === 'ok' || key === 'call') {
      const choice = (prevState as any).buffer || '';
      if (choice === '0') {
        recordSessionLog(phoneId, 'Confirmation', `Navigated Back to ${getPageTitle(nextState.state)} via [0] + [OK]`, '0 (Back)', 'ACTIVE');
        return;
      }
      if (choice === '1' && (nextState as any).message) {
        const amt = (nextState as any).amount;
        const phone = (nextState as any).recipientPhone;
        recordSessionLog(phoneId, 'Confirmation', `Transaction Confirmed: Sent KES ${amt} to ${phone}`, `KES ${amt} -> ${phone}`, 'SUCCESS');
        // Persist to statement store
        recordTransaction(phone, amt, phoneId);
      } else if (choice === '2') {
        recordSessionLog(phoneId, 'Confirmation', 'Transaction Cancelled by User', '2 (Cancel)', 'TERMINATED');
      } else if (nextState.error) {
        recordSessionLog(phoneId, 'Confirmation', 'Invalid Confirmation Choice (Enter 1 or 2)', choice || '[Empty]', 'ERROR');
      }
    }
    return;
  }

  //  Balance screen back navigation
  if (prevState.state === 'balance-screen') {
    if (key === 'ok' || key === 'call') {
      const buf = (prevState as any).buffer || '';
      recordSessionLog(phoneId, 'Balance Screen', `Navigated Back to ${getPageTitle(nextState.state)} via [0] + [OK]`, buf || '0 (Back)', 'ACTIVE');
      return;
    }
    if (key === 'back') {
      recordSessionLog(phoneId, 'Balance Screen', 'Returned to Main Menu', '[Back]', 'ACTIVE');
      return;
    }
  }

  // Statement screen navigation
  if (prevState.state === 'statement-screen') {
    if (key === '9') {
      const page = (nextState as any).page || 0;
      recordSessionLog(phoneId, 'Mini Statement', `Viewed Page ${page + 1} via [9:More]`, '9 (More)', 'ACTIVE');
      return;
    }
    if (key === '0' || (key === 'back' && nextState.state !== prevState.state)) {
      recordSessionLog(phoneId, 'Mini Statement', 'Returned to Main Menu via [0:Back]', '0 (Back)', 'ACTIVE');
      return;
    }
  }

  //  General Back navigation across screens
  if (key === 'back' && prevState.state !== nextState.state) {
    recordSessionLog(phoneId, prevTitle, `Navigated Back to ${getPageTitle(nextState.state)}`, '[Back]', 'ACTIVE');
  }
}

// Independent Keypad & Softkey Event Delegation for each phone
document.addEventListener('click', (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const button = target.closest('button, [data-action]') as HTMLElement | null;
  if (!button) return;

  const phoneCasing = button.closest('.phone-casing') as HTMLElement | null;
  if (!phoneCasing) return;

  const phoneId = phoneCasing.dataset.phoneId as Language | undefined;
  if (!phoneId || !phones[phoneId]) return;

  const rawKey = button.dataset.key || button.dataset.action;
  const key = rawKey as KeypadKey | undefined;
  if (!key) return;

  // Intercept events if the "Are you there?" timeout alert popup is active
  if (isTimeoutPopupOpen(phoneId)) {
    if (key === 'ok' || key === 'soft-left') {
      dismissTimeoutPopupAndContinue(phoneId);
      return;
    }
    if (key === 'end') {
      dismissTimeoutPopupAndReset(phoneId);
      return;
    }
    // Block other inputs until user confirms presence or popup expires
    return;
  }

  const p = phones[phoneId];
  const prevState = { ...p.ctx.current };

  p.ctx = handleKeypadEvent(p.ctx, key);
  const nextState = p.ctx.current;

  renderLCD(p);

  // Record structured audit log for this user interaction
  logUserInteraction(phoneId, key, prevState, nextState);

  // Notify phone activity to reset/start the 30-second timeout timer
  notifyActivity(phoneId);
});

// Render keypads dynamically for all phones
renderAllKeypads();

// Initialize session timeout and status bar
initSessionTimeout({
  isSessionActive: (phoneId: Language) => {
    const phone = phones[phoneId];
    if (!phone) return false;
    // An active session is any state beyond idle dialing
    return phone.ctx.current.state !== 'dialing';
  },
  onResetToDialing: (phoneId: Language) => {
    const phone = phones[phoneId];
    if (!phone) return;
    const timeoutMsg = phoneId === 'sw' ? 'Muda wa kipindi umekwisha.\nTumia *144#' : 'Session timed out.\nUse *144#';
    phone.ctx = {
      ...createInitialContext(),
      language: phoneId,
      current: {
        state: 'dialing',
        buffer: '',
        error: timeoutMsg,
      },
    };
    renderLCD(phone);
  },
});

// Initialize DataTable 
initDataTable();

// Initial mount for both English and Kiswahili screens
renderLCD(phones.en);
renderLCD(phones.sw);
