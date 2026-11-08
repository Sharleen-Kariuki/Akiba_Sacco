import { ScreenState, KeypadKey, Language, AppContext } from './types.js';
import { dictonary } from './dictionary.js';
import { getMenu } from './menus.js';
import { getTransactions } from './logger.js';
import { getValidatedStatementPages } from './statement.js';

export type { AppContext } from './types.js';
export { renderKeypad, renderAllKeypads } from './keypad.js';
export { MENUS, getMenu, formatMenu } from './menus.js';

export function createInitialContext(): AppContext {
  return {
    current: { state: 'dialing', buffer: '' },
    history: [],
    userBalance: 15250.00,
    userOwnPhone: '0700123456',
    language: 'en'
  };
}

// Phone validator: 10 digits starting with 07 or 01
export function isValidKenyanPhone(phone: string): boolean {
  return /^(07|01)[0-9]{8}$/.test(phone);
}

// Amount validator: whole positive number >= 50 and <= 70,000 (CBK mobile money daily cap)
const MIN_WITHDRAWAL = 50;
const MAX_WITHDRAWAL = 70_000;

export function isValidAmount(amountStr: string): number | null {
  if (!/^[1-9][0-9]*$/.test(amountStr)) return null;
  const num = parseInt(amountStr, 10);
  return num >= MIN_WITHDRAWAL && num <= MAX_WITHDRAWAL ? num : null;
}

export function handleKeypadEvent(ctx: AppContext, key: KeypadKey): AppContext {
  const { current, history, userBalance, userOwnPhone, language } = ctx;
  const t = dictonary[language];

  // Global Session Reset: Red End Key terminates session back to dialing
  if (key === 'end') {
    return {
      ...ctx,
      current: { state: 'dialing', buffer: '' },
      history: []
    };
  }

  // If in confirmation state with success message, any key resets to dialer
  if (current.state === 'confirmation' && current.message) {
    if (key === 'back' || key === 'ok' || key === 'call' || key === 'soft-left' || key === '1' || key === '2') {
      return {
        ...ctx,
        current: { state: 'dialing', buffer: '' },
        history: []
      };
    }
  }

  // Left Softkey (Menu / Select / OK / Next)
  if (key === 'soft-left') {
    if (current.state === 'dialing' && (!current.buffer || current.buffer.length === 0)) {
      // "Menu" on idle standby screen opens the USSD main menu
      return {
        ...ctx,
        current: { state: 'main-menu', buffer: '' },
        history: [{ state: 'dialing', buffer: '' }]
      };
    }
    // On all other states or when dial buffer has input, soft-left acts as 'ok' / Select
    key = 'ok';
  }

  // Global Back / Exit / Clear / Go to Handling
  if (key === 'back') {
    // 1. If an error is currently displayed, Back dismisses the error
    if ('error' in current && current.error) {
      return {
        ...ctx,
        current: { ...current, error: undefined }
      };
    }

    // 2. If on dialing standby with empty buffer, Right Softkey is "Go to": prefill *144#
    if (current.state === 'dialing' && (!current.buffer || current.buffer.length === 0)) {
      return {
        ...ctx,
        current: { state: 'dialing', buffer: '*144#', error: undefined }
      };
    }

    // 3. If in an input screen OR menu with buffered characters, Back acts as "Clear" (Backspace)
    if ('buffer' in current && typeof current.buffer === 'string' && current.buffer.length > 0) {
      return {
        ...ctx,
        current: { ...current, buffer: current.buffer.slice(0, -1) }
      };
    }

    // 4. If on the USSD main-menu with empty buffer, Right Softkey is "Exit": terminates USSD session
    if (current.state === 'main-menu') {
      return {
        ...ctx,
        current: { state: 'dialing', buffer: '' },
        history: []
      };
    }

    // 5. Otherwise, pop history stack to return to the previous screen
    if (history.length > 0) {
      const nextHistory = [...history];
      const previousState = nextHistory.pop()!;
      return {
        ...ctx,
        current: previousState,
        history: nextHistory
      };
    }

    return ctx;
  }

  // 1. Scalable Object-Driven Menu Transitions:
  // When on a menu, the user types an option key (displays on screen), then presses OK to submit
  const menu = getMenu(current.state);
  if (menu) {
    // Submit the chosen option via OK or Call
    if (key === 'ok' || key === 'call') {
      const typedKey = (current as any).buffer || '';
      if (!typedKey) {
        return {
          ...ctx,
          current: {
            ...current,
            error: t.errorInvalidChoice
          }
        };
      }

      // Backward navigation via key '0' then 'OK'
      if (typedKey === '0') {
        if (history.length > 0) {
          const nextHistory = [...history];
          const previousState = nextHistory.pop()!;
          return {
            ...ctx,
            current: { ...previousState, buffer: '', error: undefined },
            history: nextHistory
          };
        } else {
          return {
            ...ctx,
            current: { state: 'dialing', buffer: '' },
            history: []
          };
        }
      }

      const selectedOption = menu.options[typedKey];
      if (selectedOption) {
        const nextState = selectedOption.onSelect(ctx);
        return {
          ...ctx,
          current: nextState,
          history: [...history, { ...current, buffer: '' }]
        };
      } else {
        // Unknown or invalid option entered
        return {
          ...ctx,
          current: {
            ...current,
            buffer: '',
            error: t.errorInvalidChoice
          }
        };
      }
    }

    // Type option digit (display choice on screen before submission)
    if (/^[0-9]$/.test(key)) {
      const currentBuffer = (current as any).buffer || '';
      if (currentBuffer.length < 2) {
        return {
          ...ctx,
          current: {
            ...current,
            buffer: currentBuffer + key,
            error: undefined
          }
        };
      }
      return ctx;
    }

    // Keys without functionality on menus (e.g. *, #) trigger invalid input validation
    return {
      ...ctx,
      current: {
        ...current,
        error: t.errorInvalidInput
      }
    };
  }

  // 2. Specific Screen Transitions
  switch (current.state) {
    case 'dialing': {
      const dialBuffer = (current as any).buffer || '';
      if (key === 'call' || key === 'ok') {
        if (!dialBuffer || dialBuffer === '*144#') {
          return {
            ...ctx,
            current: { state: 'main-menu', buffer: '' },
            history: [{ state: 'dialing', buffer: '' }]
          };
        } else {
          return {
            ...ctx,
            current: { ...current, error: t.errorInvalidUssd }
          };
        }
      }
      if (/^[0-9*#]$/.test(key)) {
        return {
          ...ctx,
          current: { state: 'dialing', buffer: dialBuffer + key, error: undefined }
        };
      }
      return {
        ...ctx,
        current: { ...current, error: t.errorInvalidInput }
      };
    }

    case 'balance-screen': {
      const buffer = (current as any).buffer || '';
      if (key === 'ok' || key === 'call') {
        if (history.length > 0) {
          const nextHistory = [...history];
          const previousState = nextHistory.pop()!;
          return {
            ...ctx,
            current: { ...previousState, buffer: '', error: undefined },
            history: nextHistory
          };
        }
        return {
          ...ctx,
          current: { state: 'main-menu', buffer: '' },
          history: []
        };
      }
      if (key === '0') {
        return {
          ...ctx,
          current: { ...current, buffer: '0', error: undefined }
        };
      }
      return {
        ...ctx,
        current: { ...current, error: t.errorInvalidInput }
      };
    }

    case 'enter-phone-number': {
      const phoneBuffer = (current as any).buffer || '';
      if (key === 'ok' || key === 'call') {
        // Backward navigation: type 0 then OK
        if (phoneBuffer === '0') {
          if (history.length > 0) {
            const nextHistory = [...history];
            const previousState = nextHistory.pop()!;
            return {
              ...ctx,
              current: { ...previousState, buffer: '', error: undefined },
              history: nextHistory
            };
          }
        }
        if (isValidKenyanPhone(phoneBuffer)) {
          return {
            ...ctx,
            current: {
              state: 'enter-amount',
              recipientType: 'OTHER_NUMBER',
              recipientPhone: phoneBuffer,
              buffer: ''
            },
            history: [...history, current]
          };
        } else {
          return {
            ...ctx,
            current: { ...current, error: t.errorInvalidPhone }
          };
        }
      }
      if (/^[0-9]$/.test(key) && phoneBuffer.length < 10) {
        return {
          ...ctx,
          current: { ...current, buffer: phoneBuffer + key, error: undefined }
        };
      }
      return {
        ...ctx,
        current: { ...current, error: t.errorInvalidInput }
      };
    }

    case 'enter-amount': {
      const amountBuffer = (current as any).buffer || '';
      if (key === 'ok' || key === 'call') {
        // Backward navigation: type 0 then OK
        if (amountBuffer === '0') {
          if (history.length > 0) {
            const nextHistory = [...history];
            const previousState = nextHistory.pop()!;
            return {
              ...ctx,
              current: { ...previousState, buffer: '', error: undefined },
              history: nextHistory
            };
          }
        }
        const validated = isValidAmount(amountBuffer);
        if (validated === null) {
          return {
            ...ctx,
            current: { ...current, error: t.errorInvalidAmount }
          };
        }
        if (validated > userBalance) {
          return {
            ...ctx,
            current: { ...current, error: t.errorInsufficientBalance }
          };
        }
        return {
          ...ctx,
          current: {
            state: 'confirmation',
            recipientType: (current as any).recipientType,
            recipientPhone: (current as any).recipientPhone || userOwnPhone,
            amount: validated,
            buffer: ''
          },
          history: [...history, current]
        };
      }
      if (/^[0-9]$/.test(key) && amountBuffer.length < 7) {
        return {
          ...ctx,
          current: {
            ...current,
            buffer: amountBuffer + key,
            error: undefined
          }
        };
      }
      return {
        ...ctx,
        current: { ...current, error: t.errorInvalidInput }
      };
    }

    case 'confirmation': {
      if (current.message) {
        return {
          ...ctx,
          current: { state: 'dialing', buffer: '' },
          history: []
        };
      }
      const choice = (current as any).buffer || '';
      if (key === 'ok' || key === 'call') {
        // Backward navigation: type 0 then OK
        if (choice === '0') {
          if (history.length > 0) {
            const nextHistory = [...history];
            const previousState = nextHistory.pop()!;
            return {
              ...ctx,
              current: { ...previousState, buffer: '', error: undefined },
              history: nextHistory
            };
          }
        }
        if (choice === '1') {
          const newBalance = userBalance - current.amount;
          return {
            ...ctx,
            userBalance: newBalance,
            current: {
              state: 'confirmation',
              recipientType: current.recipientType,
              recipientPhone: current.recipientPhone,
              amount: current.amount,
              message: t.successWithdraw(current.amount, current.recipientPhone)
            },
            history: []
          };
        }
        if (choice === '2') {
          return {
            ...ctx,
            current: { state: 'dialing', buffer: '' },
            history: []
          };
        }
        return {
          ...ctx,
          current: { ...current, error: t.errorInvalidChoice }
        };
      }
      if (/^[0-2]$/.test(key)) {
        return {
          ...ctx,
          current: { ...current, buffer: key, error: undefined }
        };
      }
      return {
        ...ctx,
        current: { ...current, error: t.errorInvalidInput }
      };
    }

    case 'statement-screen': {
      const page = (current as any).page || 0;
      const txns = getTransactions(language);
      const pages = getValidatedStatementPages(txns, language);
      const totalPages = pages.length;

      // 9 (or OK/Call) = scroll to next page (cycles through all pages: 1 -> 2 -> 3 -> 1)
      if (key === '9' || key === 'ok' || key === 'call') {
        const nextPage = totalPages > 1 ? (page + 1) % totalPages : 0;
        return { ...ctx, current: { ...current, page: nextPage } };
      }

      // 0 = navigate back to previous menu
      if (key === '0') {
        if (history.length > 0) {
          const nextHistory = [...history];
          const previousState = nextHistory.pop()!;
          return { ...ctx, current: { ...previousState, buffer: '', error: undefined }, history: nextHistory };
        }
        return { ...ctx, current: { state: 'main-menu', buffer: '' }, history: [] };
      }

      return ctx;
    }

    default:
      return {
        ...ctx,
        current: { ...current, error: t.errorInvalidInput }
      };
  }
}
