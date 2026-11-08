# Akiba SACCO — Nokia 1280 USSD Web Emulator

An authentic dual-handset web emulator of the **Akiba SACCO USSD service (`*144#`)**, designed to replicate the hardware and software experience of a monochrome **Nokia 1280 (Series 30)** handset.

The emulator features side-by-side English and Kiswahili handsets, genuine softkey navigation, strict USSD protocol guardrails, paginated mini-statements, configurable session timeouts, and a real-time audit logging engine powered by DataTables.

---

## Table of Contents

- [Features](#features)
- [Project Architecture](#project-architecture)
- [Directory Structure](#directory-structure)
- [Getting Started](#getting-started)
- [How It Works](#how-it-works)
  - [1. Finite State Machine (FSM)](#1-finite-state-machine-fsm)
  - [2. Dual Handset Dynamic Factory](#2-dual-handset-dynamic-factory)
  - [3. Softkey Navigation & Nokia 1280 Layout](#3-softkey-navigation--nokia-1280-layout)
  - [4. Transaction Lifecycle & Mini Statements](#4-transaction-lifecycle--mini-statements)
  - [5. Session Timeout Engine](#5-session-timeout-engine)
  - [6. Audit Trail & DataTables Analytics](#6-audit-trail--datatables-analytics)
- [Validation & Security Guardrails](#validation--security-guardrails)
- [Keypad & Hardware Controls](#keypad--hardware-controls)
- [Extending the Project](#extending-the-project)
- [License](#license)

---

## Features

- **Authentic Nokia 1280 Emulation**: Accurately styled phone chassis, bezel pinstripe, earpiece, 160×128 monochrome LCD screen with battery/signal header, and interactive softkeys.
- **Dual Multilingual Handsets**: English (`#phone-en`) and Kiswahili (`#phone-sw`) running side-by-side with fully independent session contexts.
- **Nokia Series 30 Softkey Navigation**:
  - **Idle Standby**: Left = `Menu` (`Menyu`), Right = `Go to` (`Nenda`).
  - **Dialing**: Left = `Call` (`Piga`), Right = `Clear` (`Futa`).
  - **Root Main Menu**: Left = `Select` (`Chagua`), Right = `Exit` (`Toka`).
  - **Submenus & Inputs**: Left = `OK` / `Select`, Right = `Back` (`Rudi`) or `Clear`.
  - **Mini Statements**: Left = `9:More` (`9:Zaidi`), Right = `0:Back` (`0:Rudi`).
- **Full USSD Banking Workflows**:
  - `1. Balance Enquiry` (`Taarifa ya Salio`) — live balance display with two-decimal currency formatting.
  - `2. Withdraw Money` (`Toa Pesa`) — withdrawal to own number or custom 10-digit Kenyan phone number (`07...` or `01...`).
  - `3. Mini Statements` (`Reporti`) — up to 3 transactions per screen with strict 182-character USSD adherence, overflow validation, and cyclic pagination (`9:More`, `0:Back`).
- **DRY & Modular HTML5 Architecture**: Zero HTML markup duplication — dual phones are instantiated dynamically from a single `<template id="phone-template">`.
- **Configurable Session Timeouts**: Outside toggle pills (`5s`, `10s`, `20s`) with authentic text-based timeout notices (no annoying popups).
- **Session Audit Trail**: Integrated DataTables displaying session IDs, timestamps, transacted values, status badges, and expandable child event drawers.

---

## Project Architecture

```
┌────────────────────────────────────────────────────────┐
│                      index.html                        │
│   ┌─────────────────────┐   ┌───────────────────────┐  │
│   │  Timeout Pill Group │   │  #phone-template      │  │
│   └──────────┬──────────┘   └──────────┬────────────┘  │
└──────────────┼─────────────────────────┼───────────────┘
               │                         ▼
               │                src/phone.ts (Handset Factory)
               │                 ├── #phone-en (English)
               │                 └── #phone-sw (Kiswahili)
               │
               ▼
┌────────────────────────────────────────────────────────┐
│                      src/app.ts                        │
│    (DOM Orchestration, Click Delegation, LCD Render)   │
└──────────────┬─────────────────────────┬───────────────┘
               ▼                         ▼
      src/fsm.ts (Core FSM)      src/logger.ts (Audit Engine)
      ├── State Transitions      ├── Session Log History
      ├── Kenyan Phone Validator ├── Transaction Store
      ├── Amount & Balance Guard └── DataTables Controller
      └── History Stack (Back)
               │
               ▼
      src/menus.ts (Tree)  ◄──►  src/dictionary.ts (EN / SW)
```

---

## Directory Structure

```
akiba_sacco2/
├── index.html            # Main HTML document with phone template & audit table
├── styles.css            # Retro Nokia 1280 chassis, LCD pixel typography & layout
├── package.json          # Project metadata, build & watch scripts
├── tsconfig.json         # TypeScript compiler configuration (ESNext, Strict)
├── README.md             # Project documentation (this file)
│
├── DataTables/           # Standalone local DataTables assets
│   ├── datatables.min.css
│   └── datatables.min.js
│
├── src/                  # TypeScript source files
│   ├── app.ts            # Entry point: renders LCD, softkey labels & event handlers
│   ├── dictionary.ts     # Multilingual dictionary: English and Kiswahili strings
│   ├── fsm.ts            # Finite State Machine: transitions, validation, and history
│   ├── keypad.ts         # Numeric keypad grid generator (1-9, *, 0, #)
│   ├── logger.ts         # In-memory store, transaction recorder, and DataTables logic
│   ├── menus.ts          # Declarative USSD menu tree definitions
│   ├── phone.ts          # Handset factory: clones template & mounts phones
│   ├── timeout.ts        # Inactivity timeout timer & retro LCD status bar
│   └── types.ts          # TypeScript interfaces, unions, and state definitions
│
└── dist/                 # Compiled JavaScript output (ES Modules)
    ├── app.js
    ├── dictionary.js
    ├── fsm.js
    ├── keypad.js
    ├── logger.js
    ├── menus.js
    ├── phone.js
    ├── timeout.js
    └── types.js
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 16 or newer recommended)
- A modern web browser (Chrome, Firefox, Edge, Safari)

### 1. Installation

Clone or extract the project to your local machine, then open your terminal in the project directory:

```bash
npm install
```

### 2. Compiling TypeScript

Compile the TypeScript source files from `src/` into `dist/`:

```bash
# Single build
npm run build

# Continuous watch mode during development
npm run watch
```

### 3. Running the Emulator

Since the project uses standard ES Modules (`type="module"`), run a local web server (do not open `index.html` directly via `file://`):

**Option A — VS Code Live Server:**
Right-click `index.html` and select **"Open with Live Server"**.

**Option B — Python 3 built-in server:**
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

**Option C — Node `npx serve`:**
```bash
npx serve .
```

---

## How It Works

### 1. Finite State Machine (FSM)
File: [`src/fsm.ts`](file:///c:/Users/USER/OneDrive/Desktop/Sky/frontend/akiba_sacco2/src/fsm.ts)

All screen transitions and user inputs are handled deterministically via pure functions:
- State is modeled as a discriminated union: `dialing`, `main-menu`, `withdraw-menu`, `enter-phone-number`, `enter-amount`, `confirmation`, `balance-screen`, and `statement-screen`.
- Back navigation uses an immutable history stack (`history: ScreenState[]`).
- Pressing `0` (or the Right Softkey) pops history to restore previous screens with zero state corruption.

### 2. Dual Handset Dynamic Factory
File: [`src/phone.ts`](file:///c:/Users/USER/OneDrive/Desktop/Sky/frontend/akiba_sacco2/src/phone.ts)

Instead of hardcoding hundreds of lines of duplicate markup in `index.html`, `src/phone.ts` reads the `<template id="phone-template">` and clones it for each configured language in `PHONE_CONFIGS`:
- Automatically binds unique DOM IDs (`phone-en`, `phone-sw`, `screen-content-en`, `screen-footer-sw`).
- Configures language-specific accessibility labels on buttons (`Call / Piga`, `Back / Rudi`, `End / Kata`).
- Injects instances before the instruction manual panel.

### 3. Softkey Navigation & Nokia 1280 Layout
File: [`src/app.ts`](file:///c:/Users/USER/OneDrive/Desktop/Sky/frontend/akiba_sacco2/src/app.ts)

The Nokia 1280 screen contains a dedicated `.screen-footer` positioned directly above the physical hardware buttons. The labels update dynamically based on the current screen state:
- **Standby Screen**:
  - Left Softkey = `Menu` (`Menyu`): Directly dials `*144#` and opens the SACCO main menu.
  - Right Softkey = `Go to` (`Nenda`): Pre-fills `*144#` into the dial buffer for editing or manual call.
- **Root Menu (`main-menu`)**:
  - Right Softkey = `Exit` (`Toka`): Immediately terminates the USSD session back to the dialer.
- **Editing Buffers**:
  - Right Softkey = `Clear` (`Futa`): Acts as backspace, erasing one digit at a time.

Both the physical hardware keys on the keypad casing and the labels on the LCD screen are clickable.

### 4. Transaction Lifecycle & Mini Statements
Files: [`src/logger.ts`](file:///c:/Users/USER/OneDrive/Desktop/Sky/frontend/akiba_sacco2/src/logger.ts) & [`src/fsm.ts`](file:///c:/Users/USER/OneDrive/Desktop/Sky/frontend/akiba_sacco2/src/fsm.ts)

1. When a withdrawal is confirmed (`1. Confirm` + `OK`), `app.ts` records the transaction once via `recordTransaction(phone, amount, phoneId)`.
2. `recordTransaction` assigns an auto-incrementing reference (`TXN-1001`), generates a timestamp (`DD/MM HH:mm`), masks recipient digits (`0712***789`), and prepends it to a rolling in-memory store capped at 50 records.
3. In `statement-screen`, records are paginated (1 record per screen) to strictly respect the **182-character USSD protocol limit**.
4. Pressing `9` (or Left Softkey `9:More`) cycles through transaction pages. Pressing `0` (or Right Softkey `0:Back`) returns to the main menu.

### 5. Session Timeout Engine
File: [`src/timeout.ts`](file:///c:/Users/USER/OneDrive/Desktop/Sky/frontend/akiba_sacco2/src/timeout.ts)

- Monitors user activity independently per handset.
- Inactivity duration can be toggled in real time via the top pill bar (`5s`, `10s`, `20s`).
- On expiration, active sessions are terminated, an audit log event is recorded with status `TIMEOUT`, and the LCD displays a clean text notice:
  - English: `Session timed out.\nUse *144#`
  - Kiswahili: `Muda wa kipindi umekwisha.\nTumia *144#`

### 6. Audit Trail & DataTables Analytics
File: [`src/logger.ts`](file:///c:/Users/USER/OneDrive/Desktop/Sky/frontend/akiba_sacco2/src/logger.ts)

- Logs every interaction step with timestamps, target pages, user values, and session states (`ACTIVE`, `SUCCESS`, `ERROR`, `TIMEOUT`, `TERMINATED`).
- Metric ribbon cards track total sessions initiated, active sessions, total events, and cumulative value transacted.
- Dropdown filters allow real-time filtering by device (`en` / `sw`), session status, or target menu page.
- Expandable (+) drawers reveal granular event timelines for any selected session.

---

## Validation & Security Guardrails

| Guardrail | Rule | Description |
|---|---|---|
| **USSD Service Code** | `*144#` | Only the official Akiba SACCO code connects; any other input triggers `Invalid USSD Code`. |
| **Kenyan Phone Validator** | `/^(07\|01)[0-9]{8}$/` | Must be exactly 10 digits starting with `07` or `01`. Buffer capped at 10 digits. |
| **Minimum Amount** | `KES 50` | Blocks micro-transactions and zero/negative amounts. |
| **Maximum Amount** | `KES 70,000` | Aligned with standard CBK mobile money single-transaction regulations. |
| **Balance Protection** | `amount <= balance` | Blocks overdrafts before confirmation. Starting balance: **KES 15,250.00**. |
| **USSD Size Cap** | `< 182 characters` | Mini-statements use compact labels (~104 characters) to ensure no cellular packet truncation. |
| **Rolling Store Cap** | `MAX_TXN_HISTORY = 50` | Prevents memory leaks by discarding transactions beyond the 50 most recent. |

---

## Keypad & Hardware Controls

| Physical Button | Standby / Dialer | Menu Screen | Input Screen | Statement Screen |
|---|---|---|---|---|
| **Left Softkey** | `Menu` (Open SACCO) | `Select` (Submit option) | `OK` (Submit input) | `9:More` (Next transaction) |
| **Navi-Ring (Center OK)** | Dial / Confirm | `Select` (Submit option) | `OK` (Submit input) | Next transaction |
| **Right Softkey** | `Go to` (Prefill `*144#`) | `Exit` (Terminate session) | `Clear` / `Back` | `0:Back` (Return to menu) |
| **Green Call Key** | Initiate Call / Dial | Submit option | Submit input | Submit / Cycle |
| **Red End Key** | Reset / Clear buffer | Terminate session | Terminate session | Terminate session |
| **Numeric Keys (0-9)** | Type USSD code | Select menu choice | Type phone / amount | `9`: Next, `0`: Back |
| **Star (*) & Hash (#)** | USSD characters | Invalid input alert | Invalid input alert | Invalid input alert |

---

## Extending the Project

### Adding a New Menu
Edit [`src/menus.ts`](file:///c:/Users/USER/OneDrive/Desktop/Sky/frontend/akiba_sacco2/src/menus.ts) and add a new entry to `MENUS`:

```typescript
'loans-menu': {
  id: 'loans-menu',
  title: {
    en: 'Akiba Loans',
    sw: 'Mikopo ya Akiba'
  },
  showBack: true,
  options: {
    '1': {
      key: '1',
      label: { en: 'Request Loan', sw: 'Omba Mkopo' },
      onSelect: (ctx) => ({ state: 'request-loan', buffer: '' })
    }
  }
}
```

### Adding Another Handset Language
1. Add translations in [`src/dictionary.ts`](file:///c:/Users/USER/OneDrive/Desktop/Sky/frontend/akiba_sacco2/src/dictionary.ts) and update `Language` in [`src/types.ts`](file:///c:/Users/USER/OneDrive/Desktop/Sky/frontend/akiba_sacco2/src/types.ts).
2. Add a configuration entry in `PHONE_CONFIGS` inside [`src/phone.ts`](file:///c:/Users/USER/OneDrive/Desktop/Sky/frontend/akiba_sacco2/src/phone.ts).
3. The handset will automatically render side-by-side with its own independent session!

---

## License

This project is created for demonstration, educational, and testing purposes as part of the Akiba SACCO USSD Banking Emulator interface.
