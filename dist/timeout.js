let timeout;
let countdownInterval;
let remainingTime = 1 * 60; // 1 minutes in seconds
let confirmationTimeout;
// Function to handle session timeout
export function handleSessionTimeout() {
    // Inject a custom confirmation dialog into both screens
    const lcdViewports = document.querySelectorAll(".lcd-viewport");
    lcdViewports.forEach((lcdViewport) => {
        // Check if the confirmation dialog already exists
        if (!lcdViewport.querySelector(".confirmation-dialog")) {
            // Create the confirmation dialog container
            const dialog = document.createElement("div");
            dialog.className = "confirmation-dialog";
            dialog.innerHTML = `
        <p>Are you still there?</p>
        <button class="btn-stay-active">Stay Active</button>
        <button class="btn-redirect">Go to Dial Prompt</button>
      `;
            // Append the dialog to the viewport
            lcdViewport.appendChild(dialog);
            // Add event listeners for the buttons
            const stayActiveButton = dialog.querySelector(".btn-stay-active");
            const redirectButton = dialog.querySelector(".btn-redirect");
            stayActiveButton.addEventListener("click", () => {
                // User clicked "Stay Active"
                resetTimeout();
                dialog.remove(); // Remove the dialog
            });
            redirectButton.addEventListener("click", () => {
                // User clicked "Go to Dial Prompt"
                redirectToDialPrompt();
                dialog.remove(); // Remove the dialog
            });
            // Automatically redirect after 15 seconds if no action is taken
            confirmationTimeout = setTimeout(() => {
                redirectToDialPrompt();
                dialog.remove(); // Remove the dialog
            }, 15 * 1000); // 15 seconds
        }
    });
}
// Function to redirect to the dial prompt
function redirectToDialPrompt() {
    // Logic to redirect to the dial prompt
    const lcdViewports = document.querySelectorAll(".lcd-viewport");
    lcdViewports.forEach((lcdViewport) => {
        const screenContent = lcdViewport.querySelector(".screen-content");
        if (screenContent) {
            screenContent.textContent = "Dial: *144#"; // Update the screen content
        }
    });
}
// Function to update the visible countdown
function updateCountdownDisplay(countdownElement) {
    if (countdownElement) {
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        countdownElement.textContent = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    }
}
// Function to reset the timeout and countdown
export function resetTimeout() {
    clearTimeout(timeout);
    clearInterval(countdownInterval);
    remainingTime = 1 * 60; // Reset to 1 minutes
    // Update all countdown displays immediately
    const countdownElements = document.querySelectorAll(".session-countdown");
    countdownElements.forEach((element) => updateCountdownDisplay(element));
    // Start the countdown interval
    countdownInterval = setInterval(() => {
        remainingTime--;
        countdownElements.forEach((element) => updateCountdownDisplay(element));
        if (remainingTime <= 0) {
            clearInterval(countdownInterval);
        }
    }, 1000);
    // Set the timeout for session expiration
    timeout = setTimeout(handleSessionTimeout, 3 * 60 * 1000); // 3 minutes
}
// Function to inject the status bar and countdown timer into the DOM
export function injectStatusBar() {
    const lcdViewports = document.querySelectorAll(".lcd-viewport"); // Select all viewports
    lcdViewports.forEach((lcdViewport, index) => {
        // Check if the status bar already exists to avoid duplicates
        if (!lcdViewport.querySelector(".status-bar")) {
            // Create the status bar container
            const statusBar = document.createElement("div");
            statusBar.className = "status-bar";
            // Create the signal and 3G section
            const signal = document.createElement("div");
            signal.className = "signal";
            signal.innerHTML = `<i class="fas fa-signal"></i> <span>${index === 0 ? "3G" : "2G"}</span>`; // 3G for the first phone, 2G for the second
            const statusBar1 = document.createElement("div");
            statusBar1.className = "status-bar";
            // Create the signal and 2G section
            const signal1 = document.createElement("div");
            signal1.className = "signal";
            signal1.innerHTML = `<i class="fas fa-signal"></i> <span>2G</span>`;
            // Create the battery section
            const battery = document.createElement("div");
            battery.className = "battery";
            battery.innerHTML = `<i class="fas fa-battery-full"></i>`;
            // Append signal, countdown, and battery to the status bar
            statusBar.appendChild(signal);
            statusBar.appendChild(signal1);
            statusBar.appendChild(battery);
            // Inject the status bar into the LCD viewport
            lcdViewport.prepend(statusBar);
        }
    });
}
// Function to set up session timeout listeners
export function setupSessionTimeout() {
    injectStatusBar(); // Inject the status bar dynamically
    window.onload = resetTimeout;
    document.onmousemove = resetTimeout;
    document.onkeypress = resetTimeout;
    document.onscroll = resetTimeout;
    // Initialize the countdown display
    const countdownElements = document.querySelectorAll(".session-countdown");
    countdownElements.forEach((element) => updateCountdownDisplay(element));
}
