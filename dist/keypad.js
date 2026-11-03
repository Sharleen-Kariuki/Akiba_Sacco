export const NUMERIC_KEYPAD_CONFIG = [
    { key: '1' },
    { key: '2', symbols: 'abc' },
    { key: '3', symbols: 'def' },
    { key: '4', symbols: 'ghi' },
    { key: '5', symbols: 'jkl' },
    { key: '6', symbols: 'mno' },
    { key: '7', symbols: 'pqrs' },
    { key: '8', symbols: 'tuv' },
    { key: '9', symbols: 'wxyz' },
    { key: '*', symbols: '+' },
    { key: '0', symbols: '_' },
    { key: '#', symbols: '?' },
];
/**
 * Creates a single numeric button element with digit and subscript symbols
 */
export function createKeypadButton(config) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-num';
    button.dataset.key = config.key;
    const digitSpan = document.createElement('span');
    digitSpan.className = 'digit';
    digitSpan.textContent = config.key;
    button.appendChild(digitSpan);
    if (config.symbols) {
        const symbolsSpan = document.createElement('span');
        symbolsSpan.className = 'symbols';
        symbolsSpan.textContent = config.symbols;
        button.appendChild(symbolsSpan);
    }
    return button;
}
/**
 * Renders the 3x4 numeric keypad into the designated phone or grid container
 * @param target Either a container element ID (e.g. 'phone-en'), or an HTMLElement
 */
export function renderKeypad(target) {
    const container = typeof target === 'string' ? document.getElementById(target) : target;
    if (!container) {
        console.error(`renderKeypad: Target element "${target}" not found.`);
        return;
    }
    // Find or create the .numeric-grid element within the keypad chassis
    let grid = container.classList.contains('numeric-grid')
        ? container
        : container.querySelector('.numeric-grid');
    if (!grid) {
        const chassis = container.classList.contains('keypad-chassis')
            ? container
            : container.querySelector('.keypad-chassis');
        grid = document.createElement('div');
        grid.className = 'numeric-grid';
        grid.setAttribute('role', 'group');
        grid.setAttribute('aria-label', 'Numeric Keys');
        if (chassis) {
            chassis.appendChild(grid);
        }
        else {
            container.appendChild(grid);
        }
    }
    // Clear any existing content to prevent duplicates
    grid.innerHTML = '';
    // Render buttons
    NUMERIC_KEYPAD_CONFIG.forEach((config) => {
        grid.appendChild(createKeypadButton(config));
    });
}
/**
 * Renders keypads for all phones on the page
 */
export function renderAllKeypads() {
    const phones = document.querySelectorAll('.phone-casing');
    if (phones.length > 0) {
        phones.forEach((phone) => renderKeypad(phone));
    }
    else {
        renderKeypad('phone-en');
        renderKeypad('phone-sw');
    }
}
