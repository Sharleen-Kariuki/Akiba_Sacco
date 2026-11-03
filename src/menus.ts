import { AppContext, ScreenState, Language } from './types.js';

export interface MenuOption {
  key: string;                                   // Dial trigger digit, e.g. "1", "2", "3"
  label: Record<Language, string>;               // Multilingual display label e.g. { en: "...", sw: "..." }
  onSelect: (ctx: AppContext) => ScreenState;    // State transition callback
}

export interface MenuDefinition {
  id: string;                                    // Unique menu ID matching the screen state name
  title: Record<Language, string>;               // Menu title header
  showBack?: boolean;                            // Whether to display "[Back]" at the bottom
  options: Record<string, MenuOption>;           // Keyed by digit: { '1': option1, '2': option2, ... }
}

export const MENUS: Record<string, MenuDefinition> = {
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
        onSelect: (ctx: AppContext): ScreenState => ({
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
        onSelect: (): ScreenState => ({
          state: 'withdraw-menu',
          buffer: ''
        })
      }
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
        onSelect: (ctx: AppContext): ScreenState => ({
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
        onSelect: (): ScreenState => ({
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
export function getMenu(stateName: string): MenuDefinition | undefined {
  return MENUS[stateName];
}

/**
 * Formats a menu definition into the text displayed on the Nokia LCD screen
 * Includes title, options, active input buffer, and error if present
 */
export function formatMenu(
  menu: MenuDefinition,
  lang: Language,
  buffer?: string,
  error?: string
): string {
  if (error) {
    return `${error}\n\n[Back]`;
  }

  const title = menu.title[lang] || menu.title.en;
  const lines: string[] = [title];

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
  } else {
    lines.push('> _');
  }

  return lines.join('\n');
}

/**
 * Programmatically register a new menu
 */
export function registerMenu(menu: MenuDefinition): void {
  MENUS[menu.id] = menu;
}

/**
 * Programmatically add or update a menu option
 */
export function addMenuOption(menuId: string, option: MenuOption): void {
  if (MENUS[menuId]) {
    MENUS[menuId].options[option.key] = option;
  }
}

/**
 * Programmatically remove an option from a menu
 */
export function removeMenuOption(menuId: string, optionKey: string): void {
  if (MENUS[menuId]) {
    delete MENUS[menuId].options[optionKey];
  }
}
