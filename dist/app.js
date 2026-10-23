"use strict";
// TypeScript implementation for Nokia Phone USSD & Interactive Screen
var PhoneState;
(function (PhoneState) {
    PhoneState["STANDBY"] = "STANDBY";
    PhoneState["LOADING"] = "LOADING";
    PhoneState["CHOOSE_LANGUAGE"] = "CHOOSE_LANGUAGE";
    PhoneState["MAIN_MENU"] = "MAIN_MENU";
    PhoneState["BALANCE_ENQUIRY"] = "BALANCE_ENQUIRY";
    PhoneState["WITHDRAW_MENU"] = "WITHDRAW_MENU";
    PhoneState["WITHDRAW_MY_NUMBER_AMOUNT"] = "WITHDRAW_MY_NUMBER_AMOUNT";
    PhoneState["WITHDRAW_OTHER_NUMBER_PHONE"] = "WITHDRAW_OTHER_NUMBER_PHONE";
    PhoneState["WITHDRAW_OTHER_NUMBER_AMOUNT"] = "WITHDRAW_OTHER_NUMBER_AMOUNT";
    PhoneState["CONFIRMATION"] = "CONFIRMATION";
})(PhoneState || (PhoneState = {}));
var Language;
(function (Language) {
    Language["ENGLISH"] = "en";
    Language["KISWAHILI"] = "sw";
})(Language || (Language = {}));
const CONTENT = {
    [Language.ENGLISH]: {
        name: "English",
        menuTitle: "Akiba Sacco Menu",
        section1Name: "1: Balance Enquiry",
        section1Detail: "Airtime Bal. 0.48KSH.\nExpire: 08-01-2027.",
        section2Name: "2: Withdraw Money",
        withdrawTitle: "Withdraw Menu",
        withdrawOption1: "1: My Number",
        withdrawOption2: "2: Other Number",
        enterAmountTitle: "Enter Amount",
        enterAmountPrompt: "Enter amount to\nwithdraw (KES):",
        enterPhoneTitle: "Enter Phone No.",
        enterPhonePrompt: "Enter recipient\nphone number:",
        confirmTitle: "Confirmed",
        confirmMyNumber: (amount, phone, ref) => `KES ${amount} withdrawn\nto ${phone}.\nRef: ${ref}`,
        confirmOtherNumber: (amount, phone, ref) => `KES ${amount} sent\nto ${phone}.\nRef: ${ref}`,
        backText: "0: Back",
        footerPrompt: "Reply 1 or 2"
    },
    [Language.KISWAHILI]: {
        name: "Kiswahili",
        menuTitle: "Menyu Kuu",
        section1Name: "1: Chunguza Salio",
        section1Detail: "Salio la muda wa maongezi:\n0.48 KSH.\nMwisho: 08-01-2027.",
        section2Name: "2: Toa Pesa",
        withdrawTitle: "Menyu ya Kutoa",
        withdrawOption1: "1: Nambari Yangu",
        withdrawOption2: "2: Nambari Nyingine",
        enterAmountTitle: "Weka Kiasi",
        enterAmountPrompt: "Weka kiasi cha\nkutoa (KES):",
        enterPhoneTitle: "Weka Nambari",
        enterPhonePrompt: "Weka nambari ya\nmpokeaji:",
        confirmTitle: "Imethibitishwa",
        confirmMyNumber: (amount, phone, ref) => `KES ${amount} zimetolewa\nkwa ${phone}.\nKumb: ${ref}`,
        confirmOtherNumber: (amount, phone, ref) => `KES ${amount} zimetumwa\nkwa ${phone}.\nKumb: ${ref}`,
        backText: "0: Rudi",
        footerPrompt: "Jibu 1 au 2"
    }
};
class NokiaPhone {
    constructor() {
        this.currentInput = "";
        this.state = PhoneState.STANDBY;
        this.selectedLanguage = Language.ENGLISH;
        this.myPhoneNumber = "0712345678";
        this.tempRecipientPhone = "";
        this.tempAmount = "";
        this.screenElement = document.getElementById("screen");
        this.screenBody = document.querySelector(".screen-body");
        this.screenInput = document.getElementById("screen-input");
        this.keyElements = document.querySelectorAll(".number");
        this.init();
    }
    init() {
        this.setupKeypadListeners();
        this.setupScreenClickListener();
        this.setupKeyboardListeners();
        this.showStandby();
    }
    setupScreenClickListener() {
        if (!this.screenElement)
            return;
        this.screenElement.addEventListener("click", () => {
            if (this.state === PhoneState.STANDBY) {
                this.currentInput = "*144#";
                this.renderInput();
            }
            else if (this.state === PhoneState.CONFIRMATION || this.state === PhoneState.BALANCE_ENQUIRY) {
                this.showMainMenu();
            }
        });
    }
    setupKeypadListeners() {
        this.keyElements.forEach((key) => {
            key.addEventListener("click", () => {
                const keyValue = key.innerText.trim();
                this.handleInput(keyValue);
            });
        });
    }
    setupKeyboardListeners() {
        window.addEventListener("keydown", (e) => {
            if (/^[0-9*#]$/.test(e.key)) {
                this.handleInput(e.key);
            }
            else if (e.key === "Enter") {
                this.handleInput("CALL");
            }
            else if (e.key === "Backspace") {
                this.handleInput("BACK");
            }
            else if (e.key === "Escape") {
                this.handleInput("END");
            }
        });
    }
    handleInput(key) {
        if (this.state === PhoneState.LOADING) {
            return; // Ignore inputs while loading
        }
        if (key === "CALL") {
            this.handleCallAction();
            return;
        }
        if (key === "BACK") {
            this.handleBackAction();
            return;
        }
        if (key === "END") {
            this.handleEndAction();
            return;
        }
        // Add character to current input buffer (max 12 chars)
        if (this.currentInput.length < 12) {
            this.currentInput += key;
            this.renderInput();
        }
    }
    handleBackAction() {
        // If there is text in the buffer, delete the last character
        if (this.currentInput.length > 0) {
            this.currentInput = this.currentInput.slice(0, -1);
            if (this.state === PhoneState.STANDBY && this.currentInput.length === 0) {
                this.showStandby();
            }
            else {
                this.renderInput();
            }
            return;
        }
        // If buffer is empty, navigate back in menus
        switch (this.state) {
            case PhoneState.CONFIRMATION:
            case PhoneState.BALANCE_ENQUIRY:
                this.showMainMenu();
                break;
            case PhoneState.WITHDRAW_OTHER_NUMBER_AMOUNT:
                this.showWithdrawOtherNumberPhone();
                break;
            case PhoneState.WITHDRAW_OTHER_NUMBER_PHONE:
            case PhoneState.WITHDRAW_MY_NUMBER_AMOUNT:
                this.showWithdrawMenu();
                break;
            case PhoneState.WITHDRAW_MENU:
                this.showMainMenu();
                break;
            case PhoneState.MAIN_MENU:
                this.showChooseLanguage();
                break;
            case PhoneState.CHOOSE_LANGUAGE:
                this.showStandby();
                break;
            case PhoneState.STANDBY:
                break;
        }
    }
    handleEndAction() {
        this.currentInput = "";
        this.tempRecipientPhone = "";
        this.tempAmount = "";
        if (this.state !== PhoneState.STANDBY) {
            this.renderContent("Session Ended", "Call terminated", "Standby");
            setTimeout(() => {
                this.showStandby();
            }, 900);
        }
        else {
            this.showStandby();
        }
    }
    handleCallAction() {
        const input = this.currentInput.trim();
        this.currentInput = "";
        switch (this.state) {
            case PhoneState.STANDBY:
                this.processStandbyCall(input);
                break;
            case PhoneState.CHOOSE_LANGUAGE:
                this.processLanguageSelection(input);
                break;
            case PhoneState.MAIN_MENU:
                this.processMainMenuSelection(input);
                break;
            case PhoneState.BALANCE_ENQUIRY:
                this.showMainMenu();
                break;
            case PhoneState.WITHDRAW_MENU:
                this.processWithdrawMenuSelection(input);
                break;
            case PhoneState.WITHDRAW_MY_NUMBER_AMOUNT:
                this.processMyNumberAmount(input);
                break;
            case PhoneState.WITHDRAW_OTHER_NUMBER_PHONE:
                this.processOtherNumberPhone(input);
                break;
            case PhoneState.WITHDRAW_OTHER_NUMBER_AMOUNT:
                this.processOtherNumberAmount(input);
                break;
            case PhoneState.CONFIRMATION:
                this.showMainMenu();
                break;
        }
        if (this.screenInput && this.state !== PhoneState.STANDBY && this.state !== PhoneState.LOADING) {
            this.screenInput.innerText = "";
        }
    }
    /**
     * Step 1: User enters *144# and presses CALL
     */
    processStandbyCall(dialed) {
        if (dialed === "*144#") {
            this.showLoadingIcon(() => {
                this.showChooseLanguage();
            });
        }
        else if (dialed === "") {
            this.renderContent("Standby", "Enter *144#\nthen press CALL", "Type *144#");
        }
        else {
            this.renderContent("Invalid USSD", `Unknown code: ${dialed}\nUse: *144#`, "Press *144#");
        }
    }
    /**
     * Step 2: Show loading spinner icon
     */
    showLoadingIcon(onComplete, message = "USSD Running...") {
        this.state = PhoneState.LOADING;
        if (this.screenBody) {
            this.screenBody.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 18px;"></i>
                    <span style="font-size: 10px; font-weight: bold;">${message}</span>
                </div>
            `;
        }
        if (this.screenInput) {
            this.screenInput.innerText = "Please wait";
        }
        setTimeout(() => {
            onComplete();
        }, 1100);
    }
    /**
     * Step 3: Choose Language (1 for English, 2 for Kiswahili)
     */
    showChooseLanguage() {
        this.state = PhoneState.CHOOSE_LANGUAGE;
        this.renderContent("Select Language / Chagua Lugha", "1: English\n2: Kiswahili", "Reply 1 or 2");
    }
    /**
     * Step 4: Process Language Selection
     */
    processLanguageSelection(choice) {
        if (choice === "1") {
            this.selectedLanguage = Language.ENGLISH;
            this.showMainMenu();
        }
        else if (choice === "2") {
            this.selectedLanguage = Language.KISWAHILI;
            this.showMainMenu();
        }
        else {
            this.renderContent("Invalid Choice / Batili", "1: English\n2: Kiswahili", "Enter 1 or 2");
        }
    }
    /**
     * Step 5: Main Menu with two sections in preferred language
     */
    showMainMenu() {
        this.state = PhoneState.MAIN_MENU;
        const langData = CONTENT[this.selectedLanguage];
        this.renderContent(langData.menuTitle, `${langData.section1Name}\n${langData.section2Name}\n${langData.backText}`, langData.footerPrompt);
    }
    /**
     * Step 6: Process Main Menu options (1. Balance, 2. Withdraw Money)
     */
    processMainMenuSelection(choice) {
        const langData = CONTENT[this.selectedLanguage];
        if (choice === "1") {
            this.state = PhoneState.BALANCE_ENQUIRY;
            this.renderContent(langData.section1Name.replace(/^\d+:\s*/, ""), `${langData.section1Detail}\n${langData.backText}`, langData.backText);
        }
        else if (choice === "2") {
            this.showWithdrawMenu();
        }
        else if (choice === "0") {
            this.showChooseLanguage();
        }
        else {
            this.renderContent(langData.menuTitle, `Invalid Option\n${langData.section1Name}\n${langData.section2Name}`, langData.footerPrompt);
        }
    }
    /**
     * Step 7: Withdraw Menu (1. My Number, 2. Other Number)
     */
    showWithdrawMenu() {
        this.state = PhoneState.WITHDRAW_MENU;
        const langData = CONTENT[this.selectedLanguage];
        this.renderContent(langData.withdrawTitle, `${langData.withdrawOption1}\n${langData.withdrawOption2}\n${langData.backText}`, langData.footerPrompt);
    }
    processWithdrawMenuSelection(choice) {
        if (choice === "1") {
            this.showWithdrawMyNumberAmount();
        }
        else if (choice === "2") {
            this.showWithdrawOtherNumberPhone();
        }
        else if (choice === "0") {
            this.showMainMenu();
        }
        else {
            const langData = CONTENT[this.selectedLanguage];
            this.renderContent(langData.withdrawTitle, `Invalid Option\n${langData.withdrawOption1}\n${langData.withdrawOption2}`, langData.footerPrompt);
        }
    }
    /**
     * Option 1: Enter amount for My Number
     */
    showWithdrawMyNumberAmount() {
        this.state = PhoneState.WITHDRAW_MY_NUMBER_AMOUNT;
        this.currentInput = "";
        this.renderInput();
    }
    processMyNumberAmount(amountInput) {
        const amount = amountInput.replace(/[^0-9]/g, "");
        if (amount === "" || parseInt(amount) <= 0) {
            this.renderContent(CONTENT[this.selectedLanguage].enterAmountTitle, "Enter valid amount!\ne.g. 500", "Amount & CALL");
            return;
        }
        this.tempAmount = amount;
        this.showLoadingIcon(() => {
            this.showConfirmation(this.myPhoneNumber, this.tempAmount, true);
        }, "Processing...");
    }
    /**
     * Option 2: Enter phone number for Other Number
     */
    showWithdrawOtherNumberPhone() {
        this.state = PhoneState.WITHDRAW_OTHER_NUMBER_PHONE;
        this.currentInput = "";
        this.renderInput();
    }
    processOtherNumberPhone(phoneInput) {
        const phone = phoneInput.trim();
        if (phone.length < 9) {
            this.renderContent(CONTENT[this.selectedLanguage].enterPhoneTitle, "Invalid phone no.!\nEnter 10 digits", "Phone & CALL");
            return;
        }
        this.tempRecipientPhone = phone;
        this.showWithdrawOtherNumberAmount();
    }
    showWithdrawOtherNumberAmount() {
        this.state = PhoneState.WITHDRAW_OTHER_NUMBER_AMOUNT;
        this.currentInput = "";
        this.renderInput();
    }
    processOtherNumberAmount(amountInput) {
        const amount = amountInput.replace(/[^0-9]/g, "");
        if (amount === "" || parseInt(amount) <= 0) {
            this.renderContent(CONTENT[this.selectedLanguage].enterAmountTitle, "Enter valid amount!\ne.g. 1000", "Amount & CALL");
            return;
        }
        this.tempAmount = amount;
        this.showLoadingIcon(() => {
            this.showConfirmation(this.tempRecipientPhone, this.tempAmount, false);
        }, "Processing...");
    }
    /**
     * Confirmation Screen
     */
    showConfirmation(phone, amount, isMyNumber) {
        this.state = PhoneState.CONFIRMATION;
        const langData = CONTENT[this.selectedLanguage];
        const ref = "QK" + Math.floor(100000 + Math.random() * 900000);
        const confirmationText = isMyNumber
            ? langData.confirmMyNumber(amount, phone, ref)
            : langData.confirmOtherNumber(amount, phone, ref);
        this.renderContent(langData.confirmTitle, `${confirmationText}\n${langData.backText}`, langData.backText);
    }
    showStandby() {
        this.state = PhoneState.STANDBY;
        this.currentInput = "";
        this.tempRecipientPhone = "";
        this.tempAmount = "";
        this.renderContent("Akiba School", "USSD Service\nDial *144#", "Dial *144#");
    }
    renderInput() {
        if (this.state === PhoneState.LOADING) {
            return;
        }
        if (this.state === PhoneState.STANDBY) {
            if (this.currentInput.length > 0) {
                // Clear the standby text and show big right-aligned dialer digits
                if (this.screenBody) {
                    this.screenBody.innerHTML = `
                        <div class="dialer-screen">
                            <span class="dialer-digits">${this.currentInput}</span>
                        </div>
                    `;
                }
                if (this.screenInput) {
                    this.screenInput.innerText = "";
                }
            }
            else {
                this.showStandby();
            }
        }
        else if (this.state === PhoneState.WITHDRAW_MY_NUMBER_AMOUNT) {
            const langData = CONTENT[this.selectedLanguage];
            this.renderDialerInputScreen(langData.enterAmountTitle, `To: ${this.myPhoneNumber}`, this.currentInput, "Amount & CALL");
        }
        else if (this.state === PhoneState.WITHDRAW_OTHER_NUMBER_PHONE) {
            const langData = CONTENT[this.selectedLanguage];
            this.renderDialerInputScreen(langData.enterPhoneTitle, "10-digit number", this.currentInput, "Phone & CALL");
        }
        else if (this.state === PhoneState.WITHDRAW_OTHER_NUMBER_AMOUNT) {
            const langData = CONTENT[this.selectedLanguage];
            this.renderDialerInputScreen(langData.enterAmountTitle, `To: ${this.tempRecipientPhone}`, this.currentInput, "Amount & CALL");
        }
        else {
            if (this.screenInput) {
                this.screenInput.innerText = this.currentInput;
            }
        }
    }
    renderDialerInputScreen(title, subPrompt, value, footerHint) {
        if (!this.screenBody)
            return;
        const isLong = value.length > 5;
        const digitClass = isLong ? "dialer-digits phone-digits" : "dialer-digits";
        const displayValue = value.length > 0 ? value : "_";
        this.screenBody.innerHTML = `
            <div class="dialer-screen">
                <div class="dialer-prompt-header">
                    <h4>${title}</h4>
                    <div class="dialer-subprompt">${subPrompt}</div>
                </div>
                <span class="${digitClass}">${displayValue}</span>
            </div>
        `;
        if (this.screenInput) {
            this.screenInput.innerText = footerHint;
        }
    }
    renderContent(title, bodyText, footerHint) {
        if (this.screenBody) {
            const formattedLines = bodyText
                .split("\n")
                .map((line) => `<div style="margin: 1px 0;">${line}</div>`)
                .join("");
            this.screenBody.innerHTML = `
                <h4>${title}</h4>
                <div style="margin-top: 3px; font-size: 9.5px; width: 100%;">${formattedLines}</div>
            `;
        }
        if (footerHint && this.screenInput && this.currentInput === "") {
            this.screenInput.innerText = footerHint;
            setTimeout(() => {
                if (this.screenInput && this.currentInput === "" && this.screenInput.innerText === footerHint) {
                    this.screenInput.innerText = "";
                }
            }, 3000);
        }
    }
}
// Initialize on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    new NokiaPhone();
});
