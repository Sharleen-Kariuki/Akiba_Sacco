import { Language } from './types.js';
import { recordSessionLog } from './logger.js';

export interface SessionTimeoutOptions {
  onResetToDialing: (phoneId: Language) => void;
  isSessionActive: (phoneId: Language) => boolean;
}

interface PhoneTimeoutState {
  phoneId: Language;
  inactivityTimer: ReturnType<typeof setTimeout> | null;
  popupTimer: ReturnType<typeof setTimeout> | null;
  countdownInterval: ReturnType<typeof setInterval> | null;
  isPopupActive: boolean;
  popupElement: HTMLElement | null;
}

const INACTIVITY_DELAY_MS = 30 * 1000; // 30 seconds
const POPUP_DURATION_SECONDS = 5;       // 5 seconds

const phoneTimeouts: Record<Language, PhoneTimeoutState> = {
  en: {
    phoneId: 'en',
    inactivityTimer: null,
    popupTimer: null,
    countdownInterval: null,
    isPopupActive: false,
    popupElement: null,
  },
  sw: {
    phoneId: 'sw',
    inactivityTimer: null,
    popupTimer: null,
    countdownInterval: null,
    isPopupActive: false,
    popupElement: null,
  },
};

let timeoutOptions: SessionTimeoutOptions | null = null;

/**
 * Injects the retro status bar (signal and battery) into the LCD viewports
 */
export function injectStatusBar(): void {
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
export function initSessionTimeout(options: SessionTimeoutOptions): void {
  timeoutOptions = options;
  injectStatusBar();
}

// Backward-compatibility alias
export const setupSessionTimeout = initSessionTimeout;

/**
 * Notifies user activity on a specific phone to restart the 30-second timer
 */
export function notifyActivity(phoneId: Language): void {
  const state = phoneTimeouts[phoneId];
  if (!state) return;

  // If popup is currently active, activity is governed by the popup response
  if (state.isPopupActive) return;

  // Clear existing inactivity timer
  if (state.inactivityTimer) {
    clearTimeout(state.inactivityTimer);
    state.inactivityTimer = null;
  }

  // Only start the 30s timeout if the phone currently has an active session
  if (timeoutOptions?.isSessionActive(phoneId)) {
    state.inactivityTimer = setTimeout(() => {
      showTimeoutPopup(phoneId);
    }, INACTIVITY_DELAY_MS);
  }
}

/**
 * Checks if the "Are you there?" popup is currently displayed for a phone
 */
export function isTimeoutPopupOpen(phoneId: Language): boolean {
  return phoneTimeouts[phoneId]?.isPopupActive || false;
}

/**
 * Displays the 5-second "Are you there?" alert popup on the phone's LCD screen
 */
function showTimeoutPopup(phoneId: Language): void {
  const state = phoneTimeouts[phoneId];
  if (!state || state.isPopupActive) return;

  const phoneCasing = document.getElementById(`phone-${phoneId}`);
  const lcdViewport = phoneCasing?.querySelector('.lcd-viewport');
  if (!lcdViewport) return;

  state.isPopupActive = true;

  // Bilingual text support
  const alertText = phoneId === 'sw' ? 'Upo hapo?' : 'Are you there?';
  let secondsRemaining = POPUP_DURATION_SECONDS;

  // Create popup dialog
  const popup = document.createElement('div');
  popup.className = 'timeout-popup';
  popup.setAttribute('role', 'alertdialog');
  popup.setAttribute('aria-label', alertText);

  popup.innerHTML = `
    <div class="popup-title">${alertText}</div>
    <div class="popup-timer">(${secondsRemaining}s)</div>
    <button type="button" class="popup-btn-ok">[OK]</button>
  `;

  // Clicking the on-screen [OK] button continues the process
  const okBtn = popup.querySelector('.popup-btn-ok') as HTMLButtonElement;
  okBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    dismissTimeoutPopupAndContinue(phoneId);
  });

  lcdViewport.appendChild(popup);
  state.popupElement = popup;

  // Log timeout alert
  recordSessionLog(phoneId, 'Timeout Alert', 'Inactivity Warning ("Are you there?")', '5s Countdown', 'ACTIVE');

  // 1-second countdown interval to update the display
  state.countdownInterval = setInterval(() => {
    secondsRemaining--;
    const timerEl = popup.querySelector('.popup-timer');
    if (timerEl) {
      timerEl.textContent = `(${secondsRemaining}s)`;
    }
  }, 1000);

  // 5-second expiration timer: if no OK is pressed, reset to dialing state
  state.popupTimer = setTimeout(() => {
    dismissTimeoutPopupAndReset(phoneId);
  }, POPUP_DURATION_SECONDS * 1000);
}

/**
 * User confirmed presence by pressing OK: dismiss popup and continue process
 */
export function dismissTimeoutPopupAndContinue(phoneId: Language): boolean {
  const state = phoneTimeouts[phoneId];
  if (!state || !state.isPopupActive) return false;

  cleanupPopup(state);

  // Log confirmation
  recordSessionLog(phoneId, 'Timeout Alert', 'Presence Confirmed by User [OK]', 'Session Resumed', 'ACTIVE');

  // Restart 30-second timer to continue the active session
  notifyActivity(phoneId);
  return true;
}

/**
 * Timeout expired without OK: dismiss popup and reset phone to dialing state
 */
export function dismissTimeoutPopupAndReset(phoneId: Language): void {
  const state = phoneTimeouts[phoneId];
  if (!state) return;

  cleanupPopup(state);

  // Log timeout expiry
  recordSessionLog(phoneId, 'Timeout Alert', 'Session Timed Out (Inactivity Expiry)', 'Auto-Reset to Dialer', 'TIMEOUT');

  // Trigger state reset callback to return to dialing state
  if (timeoutOptions?.onResetToDialing) {
    timeoutOptions.onResetToDialing(phoneId);
  }
}

/**
 * Helper to remove popup elements and clear interval/timer handles
 */
function cleanupPopup(state: PhoneTimeoutState): void {
  state.isPopupActive = false;

  if (state.inactivityTimer) {
    clearTimeout(state.inactivityTimer);
    state.inactivityTimer = null;
  }

  if (state.popupTimer) {
    clearTimeout(state.popupTimer);
    state.popupTimer = null;
  }

  if (state.countdownInterval) {
    clearInterval(state.countdownInterval);
    state.countdownInterval = null;
  }

  if (state.popupElement) {
    state.popupElement.remove();
    state.popupElement = null;
  }
}
