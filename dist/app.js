import { createInitialContext, handleKeypadEvent } from './fsm.js';
import { dictonary } from './dictionary.js';
import { setupSessionTimeout } from './timeout.js';
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
    }
};
function renderLCD(phone) {
    if (!phone.screenEl)
        return;
    const { ctx } = phone;
    const { current, language } = ctx;
    const t = dictonary[language];
    let output = '';
    switch (current.state) {
        case 'dailing':
            output = current.error
                ? `${current.error}\n\n[Back]`
                : current.buffer.length > 0
                    ? `${current.buffer}\n\n[Dial]`
                    : t.dailingPrompt;
            break;
        case 'main-menu':
            output = `${t.mainMenuTitle}\n${t.mainMenuOption1}\n${t.mainMenuOption2}`;
            break;
        case 'balance-screen':
            output = `${t.balanceTitle}\n${t.balanceAmount(current.balance)}\n\n[Back]`;
            break;
        case 'withdraw-menu':
            output = `${t.withdrawMenuTitle}\n${t.withdrawOption1}\n${t.withdrawOption2}\n\n[Back]`;
            break;
        case 'enter-phone-number':
            output = current.error
                ? `${current.error}\n\n[Back]`
                : `${t.enterPhonePrompt}\n> ${current.buffer}`;
            break;
        case 'enter-amount':
            output = current.error
                ? `${current.error}\n\n[Back]`
                : `${t.enterAmountPrompt}\n> KES ${current.buffer}`;
            break;
        case 'confirmation':
            output = current.message
                ? `${current.message}\n\n[Back]`
                : t.confirmPrompt(current.amount, current.recipientPhone);
            break;
    }
    phone.screenEl.textContent = output;
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
    const key = (button.dataset.key || button.dataset.action);
    if (!key)
        return;
    const p = phones[phoneId];
    p.ctx = handleKeypadEvent(p.ctx, key);
    renderLCD(p);
});
// Initial mount for both English and Kiswahili phones
setupSessionTimeout();
renderLCD(phones.en);
renderLCD(phones.sw);
