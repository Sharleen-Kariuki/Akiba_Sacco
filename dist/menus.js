export const MENUS = {
    'main-menu': {
        id: 'main-menu',
        title: {
            en: 'Akiba SACCO',
            sw: 'Akiba SACCO'
        },
        showBack: false,
        options: {
            '1': {
                key: '1',
                label: {
                    en: 'Balance Enquiry',
                    sw: 'Taarifa ya Salio'
                },
                onSelect: (ctx) => ({
                    state: 'balance-screen',
                    balance: ctx.userBalance
                })
            },
            '2': {
                key: '2',
                label: {
                    en: 'Withdraw Money',
                    sw: 'Toa Pesa'
                },
                onSelect: () => ({
                    state: 'withdraw-menu',
                    buffer: ''
                })
            },
            '3': {
                key: '3',
                label: {
                    en: 'Statements',
                    sw: 'Reporti'
                },
                onSelect: (ctx) => ({
                    state: 'statement-screen',
                    balance: ctx.userBalance,
                    page: 0
                })
            },
        }
    },
    'withdraw-menu': {
        id: 'withdraw-menu',
        title: {
            en: 'Withdraw Money',
            sw: 'Toa Pesa'
        },
        showBack: true,
        options: {
            '1': {
                key: '1',
                label: {
                    en: 'My Number',
                    sw: 'Namba Yangu'
                },
                onSelect: (ctx) => ({
                    state: 'enter-amount',
                    recipientType: 'MY_NUMBER',
                    recipientPhone: ctx.userOwnPhone,
                    buffer: ''
                })
            },
            '2': {
                key: '2',
                label: {
                    en: 'Other Number',
                    sw: 'Namba Nyingine'
                },
                onSelect: () => ({
                    state: 'enter-phone-number',
                    buffer: ''
                })
            }
        }
    }
};
/**
 * Retrieves a menu by state name
 */
export function getMenu(stateName) {
    return MENUS[stateName];
}
/**
 * Formats a menu definition into the text displayed on the Nokia LCD screen
 * Includes title, options, active input buffer, and error if present
 */
export function formatMenu(menu, lang, buffer, error) {
    if (error) {
        return `${error}\n\n[Back]`;
    }
    const title = menu.title[lang] || menu.title.en;
    const lines = [title];
    for (const optKey of Object.keys(menu.options)) {
        const opt = menu.options[optKey];
        const label = opt.label[lang] || opt.label.en;
        lines.push(`${opt.key}. ${label}`);
    }
    if (menu.showBack) {
        lines.push(`0. ${lang === 'sw' ? 'Rudi' : 'Back'}`);
    }
    // Display user input buffer
    if (buffer && buffer.length > 0) {
        lines.push(`> ${buffer}`);
    }
    else {
        lines.push('> _');
    }
    return lines.join('\n');
}
/**
 * Programmatically register a new menu
 */
export function registerMenu(menu) {
    MENUS[menu.id] = menu;
}
/**
 * Programmatically add or update a menu option
 */
export function addMenuOption(menuId, option) {
    if (MENUS[menuId]) {
        MENUS[menuId].options[option.key] = option;
    }
}
/**
 * Programmatically remove an option from a menu
 */
export function removeMenuOption(menuId, optionKey) {
    if (MENUS[menuId]) {
        delete MENUS[menuId].options[optionKey];
    }
}
