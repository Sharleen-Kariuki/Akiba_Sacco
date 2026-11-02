// Disriminated union types for different states of messages
export type Language = 'en' | 'sw';

export interface Translations {
    dailingPrompt: string;
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

}



export type KeypadKey = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '*' | '0' | '#' | 'call' | 'end' | 'back' | 'ok';

type DailScreenState = {
    state: 'dailing'
    buffer: string;
    error?: string;
}
type MainMenuState = {
    state: 'main-menu'
    options?: string[];
}
type BalanceScreenState = {
    state: 'balance-screen'
    balance: number;
}

type WithdrawMenuState = {
    state: "withdraw-menu"
    options?: string[];
}
type EnterPhoneNumberState = {
    state: 'enter-phone-number'
    buffer: string;
    error?: string;
}
type EnterAmountState = {
    state: 'enter-amount'
    recipientType: 'MY_NUMBER' | 'OTHER_NUMBER';
    recipientPhone?: string;
    buffer: string;
    error?: string;
}
type ConfirmationState = {
    state: 'confirmation'
    recipientType: 'MY_NUMBER' | 'OTHER_NUMBER';
    recipientPhone: string;
    amount: number;
    message?: string;
}



export type ScreenState = DailScreenState | MainMenuState | BalanceScreenState | WithdrawMenuState | EnterPhoneNumberState | EnterAmountState | ConfirmationState;