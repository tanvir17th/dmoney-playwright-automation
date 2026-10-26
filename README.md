<div align="center">


# 💸 dMoney Playwright E2E Automation Suite

**Comprehensive End-to-End (E2E) automation test suite for the dMoney Web Portal**

Built with 🚀 Playwright + 🟦 TypeScript

</div>

---

> 📌 This suite covers critical functional flows including user registration, admin activation, deposits, Cash In, OTP verification, statement earth, and password resets—incorporating actual **Gmail IMAP automation** for verifying dynamic OTPs and reset links.

<div align="center">

### 🎬 Demo & Results

[![📹 Watch Full Execution Video](https://img.shields.io/badge/📹_Full_Execution_Video-Google_Drive-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://drive.google.com/file/d/1PGOHjLJ0z_IfgEhFAssIQB0Om8TOgtv6/view?usp=sharing)
[![🖼️ View Test Screenshots](https://img.shields.io/badge/🖼️_Test_Screenshots-Google_Drive-34A853?style=for-the-badge&logo=googlephotos&logoColor=white)](https://drive.google.com/drive/folders/1qEuH8lYWR-X2_R7gCJo0N58sEz5HhDXN?usp=sharing)
[![✅ Smoke Tests](https://img.shields.io/badge/✅_Smoke_Tests-Passed_100%25-22C55E?style=for-the-badge)]()
[![✅ Regression Tests](https://img.shields.io/badge/✅_Regression_Tests-Passed_100%25-22C55E?style=for-the-badge)]()

</div>

---


## 📋 Table of Contents

- [🔍 Project Overview](#-project-overview)
- [🛠️ Technology Stack](#️-technology-stack)
- [⚙️ Prerequisites & Setup](#️-prerequisites--setup)
- [🏃 Running the Tests](#-running-the-tests)
- [📊 Test Execution Results](#-test-execution-results)
- [🗂️ Project Structure](#️-project-structure)
- [🚫 GitIgnore & Organization](#-gitignore--organization)

---

## 🔍 Project Overview

<div align="center">

<img src="https://images.pexels.com/photos/6406691/pexels-photo-6406691.jpeg?auto=compress&cs=tinysrgb&h=650&w=940" alt="Digital Wallet - dMoney Portal" width="80%" />

</div>

This automation framework demonstrates a fully automated SDET capability from end-to-end:

| # | Flow | Description |
|---|------|-------------|
| 🧑‍💼 | **User Onboarding** | Dynamically registers Customer and Agent accounts with unique emails, phones, and NIDs. |
| 🔐 | **Admin Activation** | Logs in as Admin, filters/searches for pending accounts, and activates them. |
| 💰 | **System Deposit** | Logs in as System account and funds the Agent account. |
| 📧 | **Gmail IMAP OTP Verification** | Connects to Gmail via IMAP after Agent login to fetch and fill the live 4-digit OTP. |
| 💵 | **Cash In Transaction** | Agent performs Cash In to the Customer account. |
| 📄 | **Self Statements & CSV Export** | Filters statements by date range and exports the transaction table to a CSV file. |
| 🔑 | **Password Reset Flow** | Triggers password reset, fetches the reset link from Gmail via IMAP, updates the password, and verifies login with new vs. wrong credentials. |

---

## 🛠️ Technology Stack

<div align="center">

| Tool | Purpose |
|------|---------|
| ![Playwright](https://img.shields.io/badge/Playwright-Test_Harness-2EAD33?style=flat-square&logo=playwright&logoColor=white) | Test Harness (TypeScript) |
| ![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat-square&logo=node.js&logoColor=white) | Runtime Language |
| ![IMAP](https://img.shields.io/badge/imap--simple-IMAP_Library-0066CC?style=flat-square&logo=gmail&logoColor=white) | Gmail IMAP + mailparser |
| ![dotenv](https://img.shields.io/badge/dotenv-Env_Management-8A6900?style=flat-square&logo=dotenv&logoColor=white) | Environment Variables |

</div>

---

## ⚙️ Prerequisites & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/dmoney-playwright-automation.git
cd dmoney-playwright-automation
```

### 2️⃣ Install Dependencies

```bash
npm install
npx playwright install
```

### 3️⃣ Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Use the base Gmail account that receives mail for the generated +tag aliases.
GMAIL_USER=your.base.account@gmail.com

# Create a Google app password and keep the real value in the ignored .env file.
GMAIL_APP_PASSWORD=your-16-character-app-password
```

---

## 🏃 Running the Tests

### 🟢 Smoke Test Suite (Positive Flows Only)

Contains only critical positive test cases:

```bash
npx playwright test tests/dmoney-journey.spec.ts -g "@smoke" --headed
```

### 🔁 Regression Test Suite (Full End-to-End Suite)

```bash
npx playwright test tests/dmoney-journey.spec.ts -g "@regression" --headed
```

---

## 📊 Test Execution Results

### 🟢 Smoke Test Result

> **Status:** ✅ **Passed** — Smoke test suite passing 100% positive flows (registration, activation, system deposit, IMAP OTP fetch, Cash In, and statement export).

### 🔁 Regression Test Result

> **Status:** ✅ **Passed** — Complete Regression suite covering all **20 validations** including negative password checks, IMAP password reset links, and post-reset authentication.

### 🎥 Video Demonstration

> **Headed Automation Recording:** 📹 [Watch Full Video on Google Drive](https://drive.google.com/file/d/1PGOHjLJ0z_IfgEhFAssIQB0Om8TOgtv6/view?usp=sharing)

>**Screenshot:** 🖼️ [Screenshots on Google Drive](https://drive.google.com/file/d/1PGOHjLJ0z_IfgEhFAssIQB0Om8TOgtv6/view?usp=sharing)

---

## 🗂️ Project Structure

```
📦 dmoney-playwright-automation
├── 📂 tests/
│   └── 📄 dmoney-journey.spec.ts    # Main E2E test suite
├── 📄 playwright.config.ts          # Playwright configuration
├── 📄 .env                           # Local environment variables (not committed)
└── 📄 README.md                      # Project documentation
```

---

## 🚫 GitIgnore & Organization

The following necessary files and folders are ignored via `.gitignore`:

| Path | Description |
|------|-------------|
| 📁 `node_modules/` | Installed dependencies |
| 📁 `test-results/` | Raw test artifacts |
| 📁 `playwright-report/` | HTML test report |
| 📁 `blob-report/` | Blob report output |
| 📄 `.env` | Local environment variables |
| 📄 `*.csv` | Generated CSV exports |

---

<div align="center">

### 👤 Author

**Md Tanvir Ahamed**

✉️ [ahamedmdtanvir06@gmail.com](mailto:ahamedmdtanvir06@gmail.com)

---

*Built with ❤️, 🚀 Playwright, and 🟦 TypeScript*

</div>
