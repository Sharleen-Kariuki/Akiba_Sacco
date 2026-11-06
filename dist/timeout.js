import { recordSessionLog } from './logger.js';
// Configurable session timeout: 5s, 10s, or 20s (default 10s)
let inactivityDelaySeconds = 10;
let INACTIVITY_DELAY_MS = inactivityDelaySeconds * 1000;
const phoneTimeouts = {
    en: {
        phoneId: 'en',
        inactivityTimer: null,
    },
    sw: {
        phoneId: 'sw',
        inactivityTimer: null,
    },
};
let timeoutOptions = null;
/**
 * Injects the retro status bar (signal and battery) into the LCD viewports
 */
export function injectStatusBar() {
    const lcdViewports = document.querySelectorAll('.lcd-viewport');
    lcdViewports.forEach((lcdViewport, index) => {
        if (!lcdViewport.querySelector('.status-bar')) {
            const statusBar = document.createElement('div');
            statusBar.className = 'status-bar';
            const signal = document.createElement('div');
            signal.className = 'signal';
            signal.innerHTML = `<i class="fas fa-signal"></i> <span>${index === 0 ? '3G' : '2G'}</span>`;
            const battery = document.createElement('div');
            battery.className = 'battery';
            battery.innerHTML = `<i class="fas fa-battery-full"></i>`;
            statusBar.appendChild(signal);
            statusBar.appendChild(battery);
            lcdViewport.prepend(statusBar);
        }
    });
}
/**
 * Initializes session timeout handling with custom callbacks
 */
export function initSessionTimeout(options) {
    timeoutOptions = options;
    injectStatusBar();
    initTimeoutToggleUI();
}
// Backward-compatibility alias
export const setupSessionTimeout = initSessionTimeout;
/**
 * Sets session timeout to 5, 10, or 20 seconds
 */
export function setSessionTimeoutSeconds(seconds) {
    if (seconds !== 5 && seconds !== 10 && seconds !== 20)
        return;
    inactivityDelaySeconds = seconds;
    INACTIVITY_DELAY_MS = seconds * 1000;
    // Restart active timers on phones currently in a session
    ['en', 'sw'].forEach((phoneId) => {
        if (timeoutOptions?.isSessionActive(phoneId)) {
            notifyActivity(phoneId);
        }
    });
    // Update badge UI
    const badge = document.getElementById('timeout-badge');
    if (badge) {
        badge.textContent = `Active: ${seconds}s`;
    }
}
/**
 * Returns currently active session timeout in seconds
 */
export function getSessionTimeoutSeconds() {
    return inactivityDelaySeconds;
}
/**
 * Initializes outside toggle buttons (5s, 10s, 20s)
 */
export function initTimeoutToggleUI() {
    const pillButtons = document.querySelectorAll('.btn-timeout-pill');
    pillButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const seconds = parseInt(btn.getAttribute('data-timeout') || '10', 10);
            setSessionTimeoutSeconds(seconds);
            pillButtons.forEach((b) => {
                b.classList.remove('active');
                b.setAttribute('aria-checked', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-checked', 'true');
        });
    });
}
/**
 * Notifies user activity on a specific phone to restart the timeout timer
 */
export function notifyActivity(phoneId) {
    const state = phoneTimeouts[phoneId];
    if (!state)
        return;
    // Clear existing inactivity timer
    if (state.inactivityTimer) {
        clearTimeout(state.inactivityTimer);
        state.inactivityTimer = null;
    }
    // Only start the timeout if the phone currently has an active session
    if (timeoutOptions?.isSessionActive(phoneId)) {
        state.inactivityTimer = setTimeout(() => {
            dismissTimeoutPopupAndReset(phoneId);
        }, INACTIVITY_DELAY_MS);
    }
}
/**
 * Checks if a timeout alert is active (kept for backward compatibility, returns false as popups are disabled)
 */
export function isTimeoutPopupOpen(_phoneId) {
    return false;
}
export function dismissTimeoutPopupAndContinue(phoneId) {
    notifyActivity(phoneId);
    return true;
}
/**
 * Timeout expired: logs audit event and triggers reset to dialer with pure text display
 */
export function dismissTimeoutPopupAndReset(phoneId) {
    const state = phoneTimeouts[phoneId];
    if (!state)
        return;
    if (state.inactivityTimer) {
        clearTimeout(state.inactivityTimer);
        state.inactivityTimer = null;
    }
    // Log timeout expiry
    recordSessionLog(phoneId, 'Timeout Alert', `Session Timed Out (${inactivityDelaySeconds}s Inactivity Expiry)`, 'Auto-Reset to Dialer', 'TIMEOUT');
    // Trigger state reset callback to return to dialing state with text-based message
    if (timeoutOptions?.onResetToDialing) {
        timeoutOptions.onResetToDialing(phoneId);
    }
}
