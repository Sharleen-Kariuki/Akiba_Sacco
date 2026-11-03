import { createInitialContext, handleKeypadEvent } from './fsm.js';
import { dictonary } from './dictionary.js';
import { initSessionTimeout, notifyActivity, isTimeoutPopupOpen, dismissTimeoutPopupAndContinue, dismissTimeoutPopupAndReset, } from './timeout.js';
import { renderAllKeypads } from './keypad.js';
import { getMenu, formatMenu } from './menus.js';
import { initDataTable, recordSessionLog, startNewSession } from './logger.js';
const phones = {
    en: {
        lang: 'en',
        ctx: { ...createInitialContext(), language: 'en' },
        screenEl: document.getElementById('screen-content-en'),
    },
    sw: {
        lang: 'sw',
        ctx: { ...createInitialContext(), language: 'sw' },
        screenEl: document.getElementById('screen-content-sw'),
    },
};
function getPageTitle(state) {
    const map = {
        dialing: 'Dialer',
        'main-menu': 'Main Menu',
        'withdraw-menu': 'Withdraw Menu',
        'balance-screen': 'Balance Screen',
        'enter-phone-number': 'Enter Phone Number',
        'enter-amount': 'Enter Amount',
        confirmation: 'Confirmation',
        'timeout-alert': 'Timeout Alert',
    };
    return map[state] || state;
}
function renderLCD(phone) {
    if (!phone.screenEl)
        return;
    const { ctx } = phone;
    const { current, language } = ctx;
    const t = dictonary[language];
    let output = '';
    // Automatically renders menu title, options, active input buffer, and error validation
    const menu = getMenu(current.state);
    if (menu) {
        const buffer = current.buffer;
        const error = current.error;
        phone.screenEl.textContent = formatMenu(menu, language, buffer, error);
        return;
    }
    // Specific screens
    switch (current.state) {
        case 'dialing':
            output = current.error
                ? `${current.error}\n\n[Back]`
                : current.buffer && current.buffer.length > 0
                    ? `${current.buffer}\n\n[Dial]`
                    : t.dialingPrompt;
            break;
        case 'balance-screen':
            output = current.error
                ? `${current.error}\n\n[Back]`
                : `${t.balanceTitle}\n${t.balanceAmount(current.balance)}\n\n0. ${t.backOption}\n> ${current.buffer || ''}`;
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
                    : `${t.confirmPrompt(current.amount, current.recipientPhone)}\n> ${current.buffer || ''}`;
            break;
    }
    phone.screenEl.textContent = output;
}
// Analyzes keypad interactions and records detailed session audit log entries
function logUserInteraction(phoneId, key, prevState, nextState) {
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
        if (key === 'call' || key === 'ok') {
            const dialBuffer = prevState.buffer || '';
            if (nextState.state === 'main-menu') {
                // Start fresh session identifier upon successful dialing
                startNewSession(phoneId);
                recordSessionLog(phoneId, 'Dialer', 'Session Initiated (*144#)', dialBuffer, 'ACTIVE');
            }
            else if (nextState.error) {
                recordSessionLog(phoneId, 'Dialer', 'Invalid USSD Code Dialed', dialBuffer || '[Empty]', 'ERROR');
            }
        }
        return;
    }
    // Menu interactions (Main Menu, Withdraw Menu, etc.)
    const menu = getMenu(prevState.state);
    if (menu) {
        if (key === 'ok' || key === 'call') {
            const typedKey = prevState.buffer || '';
            if (typedKey === '0') {
                recordSessionLog(phoneId, prevTitle, `Navigated Back to ${getPageTitle(nextState.state)} via [0] + [OK]`, '0 (Back)', 'ACTIVE');
                return;
            }
            if (nextState.error) {
                recordSessionLog(phoneId, prevTitle, 'Invalid Menu Option Attempted', typedKey || '[Empty]', 'ERROR');
            }
            else {
                const selectedOpt = menu.options[typedKey];
                const optLabel = selectedOpt?.label?.[phoneId] || selectedOpt?.label?.en || `Option ${typedKey}`;
                recordSessionLog(phoneId, prevTitle, `Selected Option ${typedKey}: ${optLabel}`, typedKey, 'ACTIVE');
            }
        }
        else if (key === '*' || key === '#') {
            recordSessionLog(phoneId, prevTitle, `Non-Functional Key Pressed (${key})`, key, 'ERROR');
        }
        return;
    }
    //  Enter Phone Number screen
    if (prevState.state === 'enter-phone-number') {
        if (key === 'ok' || key === 'call') {
            const phoneBuffer = prevState.buffer || '';
            if (phoneBuffer === '0') {
                recordSessionLog(phoneId, 'Enter Phone Number', `Navigated Back to ${getPageTitle(nextState.state)} via [0] + [OK]`, '0 (Back)', 'ACTIVE');
                return;
            }
            if (nextState.error) {
                recordSessionLog(phoneId, 'Enter Phone Number', 'Invalid Phone Number (10 digits starting 07/01)', phoneBuffer || '[Empty]', 'ERROR');
            }
            else {
                recordSessionLog(phoneId, 'Enter Phone Number', 'Recipient Phone Number Submitted', phoneBuffer, 'ACTIVE');
            }
        }
        return;
    }
    // Enter Amount screen
    if (prevState.state === 'enter-amount') {
        if (key === 'ok' || key === 'call') {
            const amtBuffer = prevState.buffer || '';
            if (amtBuffer === '0') {
                recordSessionLog(phoneId, 'Enter Amount', `Navigated Back to ${getPageTitle(nextState.state)} via [0] + [OK]`, '0 (Back)', 'ACTIVE');
                return;
            }
            if (nextState.error) {
                recordSessionLog(phoneId, 'Enter Amount', nextState.error, `KES ${amtBuffer || 0}`, 'ERROR');
            }
            else {
                recordSessionLog(phoneId, 'Enter Amount', 'Withdrawal Amount Submitted', `KES ${amtBuffer}`, 'ACTIVE');
            }
        }
        return;
    }
    //  Confirmation screen
    if (prevState.state === 'confirmation') {
        // If user was viewing final message and clicked to reset
        if (prevState.message) {
            recordSessionLog(phoneId, 'Confirmation', 'Session Closed After Completion', '[Close]', 'SUCCESS');
            return;
        }
        if (key === 'ok' || key === 'call') {
            const choice = prevState.buffer || '';
            if (choice === '0') {
                recordSessionLog(phoneId, 'Confirmation', `Navigated Back to ${getPageTitle(nextState.state)} via [0] + [OK]`, '0 (Back)', 'ACTIVE');
                return;
            }
            if (choice === '1' && nextState.message) {
                const amt = nextState.amount;
                const phone = nextState.recipientPhone;
                recordSessionLog(phoneId, 'Confirmation', `Transaction Confirmed: Sent KES ${amt} to ${phone}`, `KES ${amt} -> ${phone}`, 'SUCCESS');
            }
            else if (choice === '2') {
                recordSessionLog(phoneId, 'Confirmation', 'Transaction Cancelled by User', '2 (Cancel)', 'TERMINATED');
            }
            else if (nextState.error) {
                recordSessionLog(phoneId, 'Confirmation', 'Invalid Confirmation Choice (Enter 1 or 2)', choice || '[Empty]', 'ERROR');
            }
        }
        return;
    }
    //  Balance screen back navigation
    if (prevState.state === 'balance-screen') {
        if (key === 'ok' || key === 'call') {
            const buf = prevState.buffer || '';
            recordSessionLog(phoneId, 'Balance Screen', `Navigated Back to ${getPageTitle(nextState.state)} via [0] + [OK]`, buf || '0 (Back)', 'ACTIVE');
            return;
        }
        if (key === 'back') {
            recordSessionLog(phoneId, 'Balance Screen', 'Returned to Main Menu', '[Back]', 'ACTIVE');
            return;
        }
    }
    //  General Back navigation across screens
    if (key === 'back' && prevState.state !== nextState.state) {
        recordSessionLog(phoneId, prevTitle, `Navigated Back to ${getPageTitle(nextState.state)}`, '[Back]', 'ACTIVE');
    }
}
// Independent Keypad Event Delegation for each phone
document.addEventListener('click', (event) => {
    const target = event.target;
    const button = target.closest('button');
    if (!button)
        return;
    const phoneCasing = button.closest('.phone-casing');
    if (!phoneCasing)
        return;
    const phoneId = phoneCasing.dataset.phoneId;
    if (!phoneId || !phones[phoneId])
        return;
    let rawKey = button.dataset.key || button.dataset.action;
    // Map left softkey to 'ok' for intuitive Nokia select/confirm action
    if (rawKey === 'soft-left') {
        rawKey = 'ok';
    }
    const key = rawKey;
    if (!key)
        return;
    // Intercept events if the "Are you there?" timeout alert popup is active
    if (isTimeoutPopupOpen(phoneId)) {
        if (key === 'ok') {
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
    isSessionActive: (phoneId) => {
        const phone = phones[phoneId];
        if (!phone)
            return false;
        // An active session is any state beyond idle dialing
        return phone.ctx.current.state !== 'dialing';
    },
    onResetToDialing: (phoneId) => {
        const phone = phones[phoneId];
        if (!phone)
            return;
        phone.ctx = {
            ...createInitialContext(),
            language: phoneId,
        };
        renderLCD(phone);
    },
});
// Initialize DataTable 
initDataTable();
// Initial mount for both English and Kiswahili screens
renderLCD(phones.en);
renderLCD(phones.sw);
