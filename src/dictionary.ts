// English and Swahili String Dictionaries
import { Language, Translations } from "./types.js";

export const dictonary: Record<Language, Translations> = {
    en: {
        dialingPrompt: "Akiba SACCO\n Dail *144#",
        mainMenuTitle: "Akiba SACCO",
        mainMenuOption1: "1. Balance Enquiry",
        mainMenuOption2: "2. Withdraw Money",
        balanceTitle: "Akiba Balance:",
        balanceAmount: (val) => `KES ${val.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`,
        withdrawMenuTitle: "Withdraw Money",
        withdrawOption1: "1. My Number",
        withdrawOption2: "2. Other Number",
        enterPhonePrompt: "Enter Phone Number:\n(e.g. 0712345678)",
        enterAmountPrompt: "Enter Amount (KES):",
        confirmTitle: "Confirm Transfer",
        confirmPrompt: (amount, phone) => `Withdraw KES ${amount}\nto ${phone}?\n1. Confirm\n2. Cancel\n0. Back`,
        confirmAction: "1. Confirm",
        cancelAction: "2. Cancel",
        successWithdraw: (amount, phone) => `Transferred KES ${amount}\nto ${phone} successfully.`,
        errorInvalidUssd: "Invalid USSD Code.\nUse *144#",
        errorInvalidPhone: "Invalid Phone.\nMust be 10 digits\n(07... or 01...)",
        errorInvalidAmount: "Invalid Amount.\nMin: KES 50",
        errorInsufficientBalance: "Failed:\nInsufficient balance.",
        errorInvalidInput: "Invalid input.\nTry again.",
        errorInvalidChoice: "Invalid choice.\nTry again.",
        backOption: "Back"
    },
    sw: {
        dialingPrompt: "Akiba SACCO\nPiga *144#",
        mainMenuTitle: "Akiba SACCO",
        mainMenuOption1: "1. Taarifa ya Salio",
        mainMenuOption2: "2. Toa Pesa",
        balanceTitle: "Salio la Akiba:",
        balanceAmount: (val) => `KES ${val.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`,
        withdrawMenuTitle: "Toa Pesa",
        withdrawOption1: "1. Namba Yangu",
        withdrawOption2: "2. Namba Nyingine",
        enterPhonePrompt: "Weka Namba ya Simu:\n(mfano 0712345678)",
        enterAmountPrompt: "Weka Kiasi (KES):",
        confirmTitle: "Thibitisha Uhamisho",
        confirmPrompt: (amount, phone) => `Toa KES ${amount}\nkwenda ${phone}?\n1. Thibitisha\n2. Ghairi\n0. Rudi`,
        confirmAction: "1. Thibitisha",
        cancelAction: "2. Ghairi",
        successWithdraw: (amount, phone) => `Umetuma KES ${amount}\nkwenda ${phone} kikamilifu.`,
        errorInvalidUssd: "Nambari sio sahihi.\nTumia *144#",
        errorInvalidPhone: "Namba sio sahihi.\nTariki 10 (07/01)",
        errorInvalidAmount: "Kiasi sio sahihi.\nKiwango cha chini: 50",
        errorInsufficientBalance: "Imeshindikana:\nSalio haitoshi.",
        errorInvalidInput: "Ingizo sio sahihi.\nJaribu tena.",
        errorInvalidChoice: "Chaguo sio sahihi.\nJaribu tena.",
        backOption: "Rudi"
    }
};

export const dictionary = dictonary;
