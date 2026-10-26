# dMoney Playwright E2E Automation Suite

Comprehensive End-to-End (E2E) automation test suite for the **dMoney Web Portal**, built using Playwright and TypeScript. This suite covers critical functional flows including user registration, admin activation, deposits, Cash In, OTP verification, statement earthing, and password resets—incorporating actual Gmail IMAP automation for verifying dynamic OTPs and reset links.


**Full Test Execution Video Recording:** [Watch on Google Drive](https://drive.google.com/file/d/1PGOHjLJ0z_IfgEhFAssIQB0Om8TOgtv6/view?usp=sharing)

**Full Test Screenshots Folder:** [View on Google Drive](https://drive.google.com/drive/folders/1qEuH8lYWR-X2_R7gCJo0N58sEz5HhDXN?usp=sharing)

## Project Overview

This automation framework demonstrates a fully automated SDET capability from end-to-end:

- **User Onboarding:** Dynamically registers Customer and Agent accounts with unique emails, phones, and NIDs.
- **Admin Activation:** Logs in as Admin, filters/searches for pending accounts, and activates them.
- **System Deposit:** Logs in as System account and funds the Agent account.
- **Gmail IMAP OTP Verification:** Connects to Gmail via IMAP after Agent login to fetch and fill the live 4-digit OTP.
- **Cash In Transaction:** Agent performs Cash In to the Customer account.
- **Self Statements & CSV Export:** Filters statements by date range and exports the transaction table to a CSV file.
- **Password Reset Flow:** Triggers password reset, fetches the reset link from Gmail via IMAP, updates the password, and verifies login with new vs. wrong credentials.

## Technology Stack

- **Test Harness:** Playwright (TypeScript)
- **Language:** Node.js (v18+)
- **EMAIL/IMAP Library:** imap-simple, mailparser
- **Environment Management:** dotenv

## Prerequisites & Setup

### Clone the Repository:

```bash
git clone https://github.com/your-username/dmoney-playwright-automation.git
cd dmoney-playwright-automation
```

### Install Dependencies:

```bash
npm install
npx playwright install
```

### Configure Environment Variables:

Create a `.env` file in the root directory:

```env
GMAIL_USER=ahamedmdtanvir06+11@gmail.com
GMAIL_APP_PASSWORD=kktcnscgshkmkanw
```

## Running the Tests

### 1. Smoke Test Suite (Positive Flows Only)

Contains only critical positive test cases:

```bash
npx playwright test tests/dmoney-journey.spec.ts -g "@smoke" --headed
```

### 2. Regression Test Suite (Full End-to-End Suite)

```bash
npx playwright test tests/dmoney-journey.spec.ts -g "@regression" --headed
```

## Test Execution Results & Screenshots

### Smoke Test Result

**Status:** Passed. Smoke test suite passing 100% positive flows (registration, activation, system deposit, IMAP OTP fetch, Cash In, and statement export).

### Regression Test Result

**Status:** Passed. Complete Regression suite covering all 20 validations including negative password checks, IMAP password reset links, and post-reset authentication.

### Video Demonstration

**Headed Automation Recording:** [Watch Full Video on Google Drive](https://drive.google.com/)

## GitIgnore & Project Organization

The following necessary files and folders are ignored via `.gitignore`:

- `node_modules/`
- `test-results/`
- `playwright-report/`
- `blob-report/`
- `.env`
- Generated `*.csv` files

## Project Structure

- `tests/dmoney-journey.spec.ts`: Main E2E test suite
- `playwright.config.ts`: Playwright configuration
- `.env`: Local environment variables (not committed)
- `README.md`: Project documentation

---

**Author:** Md Tanvir Ahamed

**Email:** ahamedmdtanvir06@gmail.com
