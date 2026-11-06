import { Language } from './types.js';

export interface PhoneConfig {
  id: Language;
  name: string;
  callLabel: string;
  backLabel: string;
  endLabel: string;
}

export const PHONE_CONFIGS: PhoneConfig[] = [
  {
    id: 'en',
    name: 'English',
    callLabel: 'Call / Dialing',
    backLabel: 'Right Softkey (Back)',
    endLabel: 'End / Power',
  },
  {
    id: 'sw',
    name: 'Kiswahili',
    callLabel: 'Call / Piga',
    backLabel: 'Right Softkey (Rudi)',
    endLabel: 'End / Kata',
  },
];

export interface RenderedPhone {
  id: Language;
  casingEl: HTMLElement;
  screenEl: HTMLDivElement | null;
  footerEl: HTMLDivElement | null;
}

/**
 * Instantiates the Nokia 1280 phone handset DOM elements from #phone-template
 * for all configured languages, inserting them into .phones-container.
 */
export function renderPhoneHandsets(containerSelector = '.phones-container'): Record<Language, RenderedPhone> {
  const container = document.querySelector<HTMLElement>(containerSelector);
  if (!container) {
    throw new Error(`renderPhoneHandsets: Container "${containerSelector}" not found.`);
  }

  const template = document.getElementById('phone-template') as HTMLTemplateElement | null;
  const manualPanel = container.querySelector('.manual-panel');
  const result: Partial<Record<Language, RenderedPhone>> = {};

  for (const config of PHONE_CONFIGS) {
    let casingEl: HTMLElement;

    if (template && template.content && template.content.firstElementChild) {
      casingEl = template.content.firstElementChild.cloneNode(true) as HTMLElement;
    } else {
      casingEl = createFallbackPhoneElement();
    }

    // Configure identifiers and accessibility labels
    casingEl.id = `phone-${config.id}`;
    casingEl.dataset.phoneId = config.id;
    casingEl.setAttribute('aria-label', `Nokia 1280 USSD Emulator ${config.name}`);

    // Bind screen content & footer IDs for consistency
    const screenEl = casingEl.querySelector<HTMLDivElement>('.screen-content');
    if (screenEl) {
      screenEl.id = `screen-content-${config.id}`;
    }

    const footerEl = casingEl.querySelector<HTMLDivElement>('.screen-footer');
    if (footerEl) {
      footerEl.id = `screen-footer-${config.id}`;
    }

    // Accessible button labels per language
    const callBtn = casingEl.querySelector('.btn-call');
    if (callBtn) callBtn.setAttribute('aria-label', config.callLabel);

    const backBtn = casingEl.querySelector('.btn-soft[data-action="back"]');
    if (backBtn) backBtn.setAttribute('aria-label', config.backLabel);

    const endBtn = casingEl.querySelector('.btn-end');
    if (endBtn) endBtn.setAttribute('aria-label', config.endLabel);

    // Insert before manual panel if present, otherwise append
    if (manualPanel) {
      container.insertBefore(casingEl, manualPanel);
    } else {
      container.appendChild(casingEl);
    }

    result[config.id] = {
      id: config.id,
      casingEl,
      screenEl,
      footerEl,
    };
  }

  return result as Record<Language, RenderedPhone>;
}

function createFallbackPhoneElement(): HTMLElement {
  const div = document.createElement('div');
  div.className = 'phone-casing';
  div.innerHTML = `
    <section class="screen-housing">
      <div class="bezel-inner-frame">
        <div class="earpiece-slot" aria-hidden="true"></div>
        <div class="nokia-brand" aria-hidden="true">NOKIA</div>
        <div class="lcd-viewport" aria-live="polite" role="status">
          <div class="screen-content"></div>
          <div class="screen-footer" aria-label="Softkey Navigation Bar">
            <span class="footer-left" data-action="soft-left"></span>
            <span class="footer-center" data-action="ok"></span>
            <span class="footer-right" data-action="back"></span>
          </div>
        </div>
      </div>
    </section>
    <section class="keypad-chassis" aria-label="Physical Keypad">
      <div class="control-cluster">
        <div class="key-wing key-wing-left">
          <button type="button" class="btn btn-soft" data-action="soft-left" aria-label="Left Softkey"><span class="bar-icon"></span></button>
          <button type="button" class="btn btn-call" data-action="call" aria-label="Call / Dialing"><span class="call-icon"></span></button>
        </div>
        <div class="navi-ring-wrapper">
          <button type="button" class="btn btn-navi" data-action="ok" aria-label="Select / OK"><div class="navi-ring-cutout"></div></button>
        </div>
        <div class="key-wing key-wing-right">
          <button type="button" class="btn btn-soft" data-action="back" aria-label="Right Softkey"><span class="bar-icon"></span></button>
          <button type="button" class="btn btn-end" data-action="end" aria-label="End / Power"><span class="end-icon"></span></button>
        </div>
      </div>
      <div class="numeric-grid" role="group" aria-label="Numeric Keys"></div>
    </section>
  `;
  return div;
}

