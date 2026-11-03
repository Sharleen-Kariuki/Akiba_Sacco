// Discriminated union types for different states of messages
export type Language = 'en' | 'sw';

export interface Translations {
    dialingPrompt: string;
    mainMenuTitle: string;
    mainMenuOption1: string;
    mainMenuOption2: string;
    balanceTitle: string;
    balanceAmount: (val: number) => string;
    withdrawMenuTitle: string;
    withdrawOption1: string;
    withdrawOption2: string;
    enterPhonePrompt: string;
    enterAmountPrompt: string;
    confirmTitle: string;
    confirmPrompt: (amount: number, phone: string) => string;
    confirmAction: string;
    cancelAction: string;
    successWithdraw: (amount: number, phone: string) => string;
    errorInvalidUssd: string;
    errorInvalidPhone: string;
    errorInvalidAmount: string;
    errorInsufficientBalance: string;
    errorInvalidInput: string;
    errorInvalidChoice: string;
}

export type KeypadKey = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '*' | '0' | '#' | 'call' | 'end' | 'back' | 'ok';

export type DailScreenState = {
    state: 'dialing';
    buffer: string;
    error?: string;
};

export type MainMenuState = {
    state: 'main-menu';
    buffer?: string;
    error?: string;
    options?: string[];
};

export type BalanceScreenState = {
    state: 'balance-screen';
    balance: number;
    error?: string;
};

export type WithdrawMenuState = {
    state: 'withdraw-menu';
    buffer?: string;
    error?: string;
    options?: string[];
};

export type EnterPhoneNumberState = {
    state: 'enter-phone-number';
    buffer: string;
    error?: string;
};

export type EnterAmountState = {
    state: 'enter-amount';
    recipientType: 'MY_NUMBER' | 'OTHER_NUMBER';
    recipientPhone?: string;
    buffer: string;
    error?: string;
};

export type ConfirmationState = {
    state: 'confirmation';
    recipientType: 'MY_NUMBER' | 'OTHER_NUMBER';
    recipientPhone: string;
    amount: number;
    message?: string;
    error?: string;
};

export type GenericMenuState = {
    state: string;
    buffer?: string;
    error?: string;
    [key: string]: any;
};

export type ScreenState =
    | DailScreenState
    | MainMenuState
    | BalanceScreenState
    | WithdrawMenuState
    | EnterPhoneNumberState
    | EnterAmountState
    | ConfirmationState
    | GenericMenuState;

export interface AppContext {
    current: ScreenState;
    history: ScreenState[];
    userBalance: number;
    userOwnPhone: string;
    language: Language;
}
