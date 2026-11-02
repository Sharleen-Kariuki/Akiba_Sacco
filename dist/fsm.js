import { dictonary } from './dictionary.js';
export function createInitialContext() {
    return {
        current: { state: 'dailing', buffer: '' },
        history: [],
        userBalance: 15250.00,
        userOwnPhone: '0700123456',
        language: 'en'
    };
}
// Phone validator: 10 digits starting with 07 or 01
export function isValidKenyanPhone(phone) {
    return /^(07|01)[0-9]{8}$/.test(phone);
}
// Amount validator: whole positive number >= 50
export function isValidAmount(amountStr) {
    if (!/^[1-9][0-9]*$/.test(amountStr))
        return null;
    const num = parseInt(amountStr, 10);
    return num >= 50 ? num : null;
}
export function handleKeypadEvent(ctx, key) {
    const { current, history, userBalance, userOwnPhone, language } = ctx;
    const t = dictonary[language];
    // Global Session Reset: Red End Key terminates session back to dialing
    if (key === 'end') {
        return {
            ...ctx,
            current: { state: 'dailing', buffer: '' },
            history: []
        };
    }
    // If in confirmation state with success message, any key resets to dialer
    if (current.state === 'confirmation' && current.message) {
        if (key === 'back' || key === 'ok' || key === 'call' || key === '1' || key === '2') {
            return {
                ...ctx,
                current: { state: 'dailing', buffer: '' },
                history: []
            };
        }
    }
    // Global Back Button Handling
    if (key === 'back') {
        // 1. If an error is currently displayed, Back dismisses the error
        if ('error' in current && current.error) {
            return {
                ...ctx,
                current: { ...current, error: undefined }
            };
        }
        // 2. If in an input screen with buffered characters, Back acts as Backspace
        if ((current.state === 'dailing' ||
            current.state === 'enter-phone-number' ||
            current.state === 'enter-amount') &&
            current.buffer.length > 0) {
            return {
                ...ctx,
                current: { ...current, buffer: current.buffer.slice(0, -1) }
            };
        }
        // 3. Otherwise, pop history stack to return to the previous screen
        if (history.length > 0) {
            const nextHistory = [...history];
            const previousState = nextHistory.pop();
            return {
                ...ctx,
                current: previousState,
                history: nextHistory
            };
        }
        return ctx;
    }
    // Screen-Specific Transitions
    switch (current.state) {
        case 'dailing': {
            if (key === 'call') {
                if (current.buffer === '*144#') {
                    return {
                        ...ctx,
                        current: { state: 'main-menu' },
                        history: [current]
                    };
                }
                else {
                    return {
                        ...ctx,
                        current: { ...current, error: t.errorInvalidUssd }
                    };
                }
            }
            if (key !== 'ok') {
                return {
                    ...ctx,
                    current: { state: 'dailing', buffer: current.buffer + key, error: undefined }
                };
            }
            return ctx;
        }
        case 'main-menu': {
            if (key === '1') {
                return {
                    ...ctx,
                    current: { state: 'balance-screen', balance: userBalance },
                    history: [...history, current]
                };
            }
            if (key === '2') {
                return {
                    ...ctx,
                    current: { state: 'withdraw-menu' },
                    history: [...history, current]
                };
            }
            return ctx;
        }
        case 'balance-screen': {
            if (key === 'ok') {
                return {
                    ...ctx,
                    current: { state: 'main-menu' },
                    history: history.length > 0 ? history.slice(0, -1) : []
                };
            }
            return ctx;
        }
        case 'withdraw-menu': {
            if (key === '1') {
                return {
                    ...ctx,
                    current: {
                        state: 'enter-amount',
                        recipientType: 'MY_NUMBER',
                        recipientPhone: userOwnPhone,
                        buffer: ''
                    },
                    history: [...history, current]
                };
            }
            if (key === '2') {
                return {
                    ...ctx,
                    current: { state: 'enter-phone-number', buffer: '' },
                    history: [...history, current]
                };
            }
            return ctx;
        }
        case 'enter-phone-number': {
            if (key === 'ok') {
                if (isValidKenyanPhone(current.buffer)) {
                    return {
                        ...ctx,
                        current: {
                            state: 'enter-amount',
                            recipientType: 'OTHER_NUMBER',
                            recipientPhone: current.buffer,
                            buffer: ''
                        },
                        history: [...history, current]
                    };
                }
                else {
                    return {
                        ...ctx,
                        current: { ...current, error: t.errorInvalidPhone }
                    };
                }
            }
            if (/^[0-9]$/.test(key) && current.buffer.length < 10) {
                return {
                    ...ctx,
                    current: { ...current, buffer: current.buffer + key, error: undefined }
                };
            }
            return ctx;
        }
        case 'enter-amount': {
            if (key === 'ok') {
                const validated = isValidAmount(current.buffer);
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
                        recipientType: current.recipientType,
                        recipientPhone: current.recipientPhone || userOwnPhone,
                        amount: validated
                    },
                    history: [...history, current]
                };
            }
            if (/^[0-9]$/.test(key) && current.buffer.length < 7) {
                return {
                    ...ctx,
                    current: {
                        ...current,
                        buffer: current.buffer + key,
                        error: undefined
                    }
                };
            }
            return ctx;
        }
        case 'confirmation': {
            if (current.message) {
                return {
                    ...ctx,
                    current: { state: 'dailing', buffer: '' },
                    history: []
                };
            }
            if (key === '1') {
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
            if (key === '2') {
                return {
                    ...ctx,
                    current: { state: 'dailing', buffer: '' },
                    history: []
                };
            }
            return ctx;
        }
        default:
            return ctx;
    }
}
