# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/dmoney-journey.spec.ts >> dMoney E2E Automation Suite >> Complete End-to-End User Journey with all 20 validations @regression
- Location: tests/dmoney-journey.spec.ts:166:9

# Error details

```
Error: OTP fetch timeout: No OTP found in Gmail inbox.
```

# Page snapshot

```yaml
- generic [active] [ref=f7e1]:
  - alert [ref=f7e2]
  - generic [ref=f7e3]:
    - banner [ref=f7e4]:
      - generic [ref=f7e5]:
        - paragraph [ref=f7e7]: Agent Dashboard
        - button [ref=f7e8] [cursor=pointer]
        - generic [ref=f7e12] [cursor=pointer]:
          - generic [ref=f7e13]: A
          - generic [ref=f7e14]:
            - paragraph [ref=f7e15]: Tanvir
            - paragraph [ref=f7e16]: Agent
    - navigation [ref=f7e19]:
      - generic [ref=f7e21]:
        - generic [ref=f7e22]:
          - generic [ref=f7e23]: D
          - generic [ref=f7e24]:
            - paragraph [ref=f7e25]: dMoney
            - paragraph [ref=f7e26]: QA PRACTICE LAB
        - generic [ref=f7e28]:
          - generic [ref=f7e29]: A
          - generic [ref=f7e30]:
            - paragraph [ref=f7e31]: Logged in as
            - paragraph [ref=f7e32]: Agent
        - paragraph [ref=f7e34]: Navigation
        - list [ref=f7e35]:
          - link "Cash In" [ref=f7e36] [cursor=pointer]:
            - /url: /agent/cash-in
          - link "Payment" [ref=f7e42] [cursor=pointer]:
            - /url: /agent/payment
          - link "Self Statement" [ref=f7e48] [cursor=pointer]:
            - /url: /agent/self-statement
        - generic [ref=f7e55]:
          - link "My Profile" [ref=f7e56] [cursor=pointer]:
            - /url: /profile
          - paragraph [ref=f7e65]: dMoney v2.0 · QA Platform
    - main [ref=f7e66]:
      - generic [ref=f7e68]:
        - generic [ref=f7e73]:
          - paragraph [ref=f7e74]: Cash In
          - paragraph [ref=f7e75]: Deposit funds into a customer's wallet
        - generic [ref=f7e79]:
          - generic [ref=f7e80]:
            - generic:
              - text: Customer Phone Number
              - generic [aria-hidden]: "*"
            - generic [ref=f7e81]:
              - textbox "Customer Phone Number" [ref=f7e82]:
                - /placeholder: Enter customer's phone number
              - group [aria-hidden]:
                - generic: Customer Phone Number *
          - generic [ref=f7e83]:
            - generic:
              - text: Amount (BDT)
              - generic [aria-hidden]: "*"
            - generic [ref=f7e84]:
              - spinbutton "Amount (BDT)" [ref=f7e85]
              - group [aria-hidden]:
                - generic: Amount (BDT) *
          - button "Cash In →" [ref=f7e86] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import * as fs from 'fs';
  3   | import imaps from 'imap-simple';
  4   | import { simpleParser } from 'mailparser';
  5   | import * as dotenv from 'dotenv';
  6   | 
  7   | // .env theke environment variables load kora
  8   | dotenv.config();
  9   | 
  10  | // User Details & Environment Config
  11  | const agentName = 'Tanvir ahamed';
  12  | const GMAIL_USER = process.env.GMAIL_USER || 'ahamedmdtanvir06+11@gmail.com';
  13  | const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || 'kktcnscgshkmkanw';
  14  | 
  15  | const today = new Date().toISOString().split('T')[0];
  16  | const csvFileName = `self_statement_${today}.csv`;
  17  | 
  18  | // Helper
  19  | async function fetchLatestOtpFromGmail(timeoutMs = 45000): Promise<string> {
  20  |     const config = {
  21  |         imap: {
  22  |             user: GMAIL_USER,
  23  |             password: GMAIL_APP_PASSWORD.replace(/\s+/g, ''),
  24  |             host: 'imap.gmail.com',
  25  |             port: 993,
  26  |             tls: true,
  27  |             authTimeout: 10000,
  28  |             tlsOptions: { rejectUnauthorized: false }
  29  |         }
  30  |     };
  31  | 
  32  |     const startTime = Date.now();
  33  |     console.log('Fetching OTP from Gmail inbox...');
  34  | 
  35  |     while (Date.now() - startTime < timeoutMs) {
  36  |         let connection: any = null;
  37  |         try {
  38  |             connection = await imaps.connect(config);
  39  |             await connection.openBox('INBOX');
  40  | 
  41  |             const searchCriteria = [
  42  |                 'UNSEEN',
  43  |                 ['SINCE', new Date(Date.now() - 5 * 60 * 1000).toISOString()]
  44  |             ];
  45  |             const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], markSeen: true };
  46  |             const messages = await connection.search(searchCriteria, fetchOptions);
  47  | 
  48  |             if (messages.length > 0) {
  49  |                 const latestMsg = messages[messages.length - 1];
  50  |                 const allParts = latestMsg.parts.find((part: any) => part.which === '');
  51  |                 const parsed = await simpleParser(allParts.body);
  52  |                 const emailText = parsed.text || parsed.html || '';
  53  |                 const match = emailText.match(/\b\d{4}\b/);
  54  |                 if (match) {
  55  |                     console.log(`Auto-detected OTP: ${match[0]}`);
  56  |                     await connection.end();
  57  |                     return match[0];
  58  |                 }
  59  |             }
  60  |             await connection.end();
  61  |         } catch (err) {
  62  |             if (connection) {
  63  |                 try { await connection.end(); } catch (_) { }
  64  |             }
  65  |         }
  66  |         await new Promise((resolve) => setTimeout(resolve, 2000));
  67  |     }
> 68  |     throw new Error('OTP fetch timeout: No OTP found in Gmail inbox.');
      |           ^ Error: OTP fetch timeout: No OTP found in Gmail inbox.
  69  | }
  70  | 
  71  | // Helper
  72  | async function fetchLatestResetLinkFromGmail(timeoutMs = 25000): Promise<string | null> {
  73  |     const config = {
  74  |         imap: {
  75  |             user: GMAIL_USER,
  76  |             password: GMAIL_APP_PASSWORD.replace(/\s+/g, ''),
  77  |             host: 'imap.gmail.com',
  78  |             port: 993,
  79  |             tls: true,
  80  |             authTimeout: 10000,
  81  |             tlsOptions: { rejectUnauthorized: false }
  82  |         }
  83  |     };
  84  | 
  85  |     const startTime = Date.now();
  86  |     console.log('Fetching fresh Password Reset Link from Gmail...');
  87  | 
  88  |     while (Date.now() - startTime < timeoutMs) {
  89  |         let connection: any = null;
  90  |         try {
  91  |             connection = await imaps.connect(config);
  92  |             await connection.openBox('INBOX');
  93  | 
  94  |             const searchCriteria = [
  95  |                 ['SINCE', new Date(Date.now() - 3 * 60 * 1000).toISOString()]
  96  |             ];
  97  |             const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], markSeen: true };
  98  |             const messages = await connection.search(searchCriteria, fetchOptions);
  99  | 
  100 |             if (messages.length > 0) {
  101 |                 for (let i = messages.length - 1; i >= 0; i--) {
  102 |                     const msg = messages[i];
  103 |                     const allParts = msg.parts.find((part: any) => part.which === '');
  104 |                     const parsed = await simpleParser(allParts.body);
  105 | 
  106 |                     const rawContent = `${parsed.text || ''} ${parsed.html || ''}`;
  107 |                     const linkMatch = rawContent.match(/https?:\/\/[^\s"'<>]+reset[^\s"'<>]*/i);
  108 |                     if (linkMatch) {
  109 |                         let cleanUrl = linkMatch[0].replace(/&amp;/g, '&').replace(/[\r\n\t]/g, '').trim();
  110 |                         cleanUrl = cleanUrl.replace(/[.,;>)]+\$/, '');
  111 |                         console.log(`Auto-detected fresh Reset URL: ${cleanUrl}`);
  112 |                         await connection.end();
  113 |                         return cleanUrl;
  114 |                     }
  115 |                 }
  116 |             }
  117 |             await connection.end();
  118 |         } catch (err) {
  119 |             if (connection) {
  120 |                 try { await connection.end(); } catch (_) { }
  121 |             }
  122 |         }
  123 |         await new Promise((resolve) => setTimeout(resolve, 2000));
  124 |     }
  125 |     return null;
  126 | }
  127 | 
  128 | // Helper
  129 | async function activateUser(page: any, userEmail: string) {
  130 |     await page.locator('a[href*="/users"]').or(page.getByText('User List')).first().click();
  131 |     await page.waitForTimeout(1500);
  132 | 
  133 |     const row = page.locator('tbody tr').filter({ hasText: userEmail }).first();
  134 |     await expect(row).toBeVisible({ timeout: 15000 });
  135 | 
  136 |     const viewBtn = row.locator('button, a').filter({ hasText: /VIEW/i }).first();
  137 |     await viewBtn.scrollIntoViewIfNeeded();
  138 |     await viewBtn.click();
  139 |     await page.waitForTimeout(1000);
  140 | 
  141 |     const editBtn = page.getByRole('button', { name: /Edit User/i }).or(page.getByText('Edit User')).first();
  142 |     await editBtn.click();
  143 |     await page.waitForTimeout(600);
  144 | 
  145 |     const statusDropdown = page.locator('div[role="combobox"]').last();
  146 |     await statusDropdown.click();
  147 |     await page.waitForTimeout(400);
  148 | 
  149 |     await page.getByRole('option', { name: /Active/i }).or(page.getByText('Active', { exact: true })).first().click().catch(async () => {
  150 |         await page.keyboard.press('ArrowDown');
  151 |         await page.keyboard.press('Enter');
  152 |     });
  153 | 
  154 |     const saveBtn = page.getByRole('button', { name: /update|save/i }).or(page.getByText(/update|save/i)).first();
  155 |     if (await saveBtn.isVisible().catch(() => false)) {
  156 |         await saveBtn.click();
  157 |         await page.waitForTimeout(1000);
  158 |     }
  159 | }
  160 | 
  161 | test.describe('dMoney E2E Automation Suite', () => {
  162 | 
  163 |     // =========================================================================================
  164 |     // . REGRESSION SUITE:  Validation (Positive + Negative)
  165 |     // =========================================================================================
  166 |     test('Complete End-to-End User Journey with all 20 validations @regression', async ({ page }) => {
  167 |         test.setTimeout(180000);
  168 |         const suffix = Math.floor(1000 + Math.random() * 9000);
```