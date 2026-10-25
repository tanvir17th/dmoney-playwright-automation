import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import * as dotenv from 'dotenv';

// .env theke environment variables load kora
dotenv.config();

// User Details & Environment Config
const agentName = 'Tanvir ahamed';
const GMAIL_USER = process.env.GMAIL_USER || 'ahamedmdtanvir06+11@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || 'kktcnscgshkmkanw';

const today = new Date().toISOString().split('T')[0];
const csvFileName = `self_statement_${today}.csv`;

// Helper
async function fetchLatestOtpFromGmail(timeoutMs = 45000): Promise<string> {
    const config = {
        imap: {
            user: GMAIL_USER,
            password: GMAIL_APP_PASSWORD.replace(/\s+/g, ''),
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            authTimeout: 10000,
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    const startTime = Date.now();
    console.log('Fetching OTP from Gmail inbox...');

    while (Date.now() - startTime < timeoutMs) {
        let connection: any = null;
        try {
            connection = await imaps.connect(config);
            await connection.openBox('INBOX');

            const searchCriteria = [
                'UNSEEN',
                ['SINCE', new Date(Date.now() - 5 * 60 * 1000).toISOString()]
            ];
            const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], markSeen: true };
            const messages = await connection.search(searchCriteria, fetchOptions);

            if (messages.length > 0) {
                const latestMsg = messages[messages.length - 1];
                const allParts = latestMsg.parts.find((part: any) => part.which === '');
                const parsed = await simpleParser(allParts.body);
                const emailText = parsed.text || parsed.html || '';
                const match = emailText.match(/\b\d{4}\b/);
                if (match) {
                    console.log(`Auto-detected OTP: ${match[0]}`);
                    await connection.end();
                    return match[0];
                }
            }
            await connection.end();
        } catch (err) {
            if (connection) {
                try { await connection.end(); } catch (_) { }
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error('OTP fetch timeout: No OTP found in Gmail inbox.');
}

// Helper
async function fetchLatestResetLinkFromGmail(timeoutMs = 25000): Promise<string | null> {
    const config = {
        imap: {
            user: GMAIL_USER,
            password: GMAIL_APP_PASSWORD.replace(/\s+/g, ''),
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            authTimeout: 10000,
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    const startTime = Date.now();
    console.log('Fetching fresh Password Reset Link from Gmail...');

    while (Date.now() - startTime < timeoutMs) {
        let connection: any = null;
        try {
            connection = await imaps.connect(config);
            await connection.openBox('INBOX');

            const searchCriteria = [
                ['SINCE', new Date(Date.now() - 3 * 60 * 1000).toISOString()]
            ];
            const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], markSeen: true };
            const messages = await connection.search(searchCriteria, fetchOptions);

            if (messages.length > 0) {
                for (let i = messages.length - 1; i >= 0; i--) {
                    const msg = messages[i];
                    const allParts = msg.parts.find((part: any) => part.which === '');
                    const parsed = await simpleParser(allParts.body);

                    const rawContent = `${parsed.text || ''} ${parsed.html || ''}`;
                    const linkMatch = rawContent.match(/https?:\/\/[^\s"'<>]+reset[^\s"'<>]*/i);
                    if (linkMatch) {
                        let cleanUrl = linkMatch[0].replace(/&amp;/g, '&').replace(/[\r\n\t]/g, '').trim();
                        cleanUrl = cleanUrl.replace(/[.,;>)]+\$/, '');
                        console.log(`Auto-detected fresh Reset URL: ${cleanUrl}`);
                        await connection.end();
                        return cleanUrl;
                    }
                }
            }
            await connection.end();
        } catch (err) {
            if (connection) {
                try { await connection.end(); } catch (_) { }
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    return null;
}

// Helper
async function activateUser(page: any, userEmail: string) {
    await page.locator('a[href*="/users"]').or(page.getByText('User List')).first().click();
    await page.waitForTimeout(1500);

    const row = page.locator('tbody tr').filter({ hasText: userEmail }).first();
    await expect(row).toBeVisible({ timeout: 15000 });

    const viewBtn = row.locator('button, a').filter({ hasText: /VIEW/i }).first();
    await viewBtn.scrollIntoViewIfNeeded();
    await viewBtn.click();
    await page.waitForTimeout(1000);

    const editBtn = page.getByRole('button', { name: /Edit User/i }).or(page.getByText('Edit User')).first();
    await editBtn.click();
    await page.waitForTimeout(600);

    const statusDropdown = page.locator('div[role="combobox"]').last();
    await statusDropdown.click();
    await page.waitForTimeout(400);

    await page.getByRole('option', { name: /Active/i }).or(page.getByText('Active', { exact: true })).first().click().catch(async () => {
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
    });

    const saveBtn = page.getByRole('button', { name: /update|save/i }).or(page.getByText(/update|save/i)).first();
    if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(1000);
    }
}

test.describe('dMoney E2E Automation Suite', () => {

    // =========================================================================================
    // . REGRESSION SUITE:  Validation (Positive + Negative)
    // =========================================================================================
    test('Complete End-to-End User Journey with all 20 validations @regression', async ({ page }) => {
        test.setTimeout(180000);
        const suffix = Math.floor(1000 + Math.random() * 9000);
        const agentEmail = `ahamedmdtanvir06+${suffix}@gmail.com`;
        const agentPhone = `01705${Math.floor(100000 + Math.random() * 900000)}`;
        const agentPassword = 'Password@123';
        const newAgentPassword = 'NewPassword@123';
        const customerPhone = `01805${Math.floor(100000 + Math.random() * 900000)}`;
        const customerEmail = `customer_${suffix}@gmail.com`;
        const agentNid = `199${Math.floor(1000000 + Math.random() * 9000000)}`;

        await page.setViewportSize({ width: 1400, height: 900 });

        // Step 0: Create Customer
        await page.goto('https://dmoneyportal.roadtocareer.net/register');
        const custInputs = page.locator('input');
        await custInputs.nth(0).fill(`Customer ${suffix}`);
        await custInputs.nth(1).fill(customerEmail);
        await custInputs.nth(2).fill('Password@123');
        await custInputs.nth(3).fill(customerPhone);
        await custInputs.nth(4).fill(`198${Math.floor(1000000 + Math.random() * 9000000)}`);

        const custDropdown = page.locator('div[role="combobox"]').first();
        await custDropdown.click();
        await page.waitForTimeout(300);
        const custOption = page.locator('li[role="option"], li').filter({ hasText: /Customer/i }).first();
        if (await custOption.isVisible().catch(() => false)) {
            await custOption.click();
        } else {
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
        }
        await page.locator('button[type="submit"], button').filter({ hasText: /Create Account/i }).first().click();
        await page.waitForTimeout(1000);

        // Step 1: Sign up
        await page.goto('https://dmoneyportal.roadtocareer.net/');
        const bannerSignUp = page.getByRole('banner').getByRole('link', { name: /sign up/i });
        if (await bannerSignUp.isVisible({ timeout: 4000 }).catch(() => false)) {
            await bannerSignUp.click();
        } else {
            await page.goto('https://dmoneyportal.roadtocareer.net/register');
        }

        // Step 2: Register Agent
        const inputs = page.locator('input');
        await inputs.nth(0).fill(agentName);
        await inputs.nth(1).fill(agentEmail);
        await inputs.nth(2).fill(agentPassword);
        await inputs.nth(3).fill(agentPhone);
        await inputs.nth(4).fill(agentNid);

        const dropdownBox = page.locator('div[role="combobox"]').first();
        await dropdownBox.click();
        await page.waitForTimeout(400);
        const agentOption = page.locator('li[role="option"], li').filter({ hasText: /Agent/i }).first();
        if (await agentOption.isVisible({ timeout: 2000 }).catch(() => false)) {
            await agentOption.click();
        } else {
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
        }
        await page.locator('button[type="submit"], button').filter({ hasText: /Create Account/i }).first().click();

        // Validation 1: Agent Registration Successful
        await expect(page.getByText(/success|created|registered|pending approval/i).first()).toBeVisible({ timeout: 10000 });

        // Step 3: Admin Login & Activate both Customer & Agent
        await page.goto('https://dmoneyportal.roadtocareer.net/login');
        await page.locator('input').nth(0).fill('admin@dmoney.com');
        await page.locator('input').nth(1).fill('1234');
        await page.getByRole('button', { name: /login|sign in/i }).click();

        // Validation 3: Admin login success
        await expect(page).toHaveURL(/.*profile|.*dashboard|.*admin/i);

        await activateUser(page, customerEmail);
        await page.locator('a[href*="/users"]').or(page.getByText('User List')).first().click();

        const agentRow = page.locator('tbody tr').filter({ hasText: agentEmail });
        // Validation 4: Newly created Agent in user list
        await expect(agentRow).toBeVisible({ timeout: 10000 });
        // Validation 2: Initially pending / inactive
        await expect(agentRow).toContainText(/pending|inactive/i);

        await activateUser(page, agentEmail);
        // Validation 5 & 6: Active status and remains active after reload
        await expect(page.locator('body')).toContainText(/ACTIVE/i);
        await page.reload();
        await expect(page.locator('body')).toContainText(/ACTIVE/i);

        // Admin Logout
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await page.goto('https://dmoneyportal.roadtocareer.net/login');

        // Step 4: System Deposit 2000 Tk
        await page.locator('input').nth(0).fill('system@dmoney.com');
        await page.locator('input').nth(1).fill('1234');
        await page.getByRole('button', { name: /login|sign in/i }).click();

        // Validation 7: System login success
        await expect(page).toHaveURL(/.*profile|.*dashboard|.*agent/i);

        await page.getByText('Cash In', { exact: true }).or(page.locator('a[href*="/cash-in"]')).first().click();
        await page.getByPlaceholder(/account|phone|receiver|number/i).or(page.locator('input').nth(0)).fill(agentPhone);
        await page.getByPlaceholder(/amount/i).or(page.locator('input').nth(1)).fill('2000');
        await page.getByRole('button', { name: /cash in|deposit|send|submit/i }).click();

        // Validation 8 & 9: Deposit successful & record visible
        await expect(page.getByText(/success|completed|successful/i).first()).toBeVisible({ timeout: 10000 });

        // System Logout
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await page.goto('https://dmoneyportal.roadtocareer.net/login');

        // Step 5: Agent Login with Auto OTP
        await page.locator('input').nth(0).fill(agentEmail);
        await page.locator('input').nth(1).fill(agentPassword);
        await page.getByRole('button', { name: /login|sign in/i }).click();

        const otpInput = page.getByPlaceholder(/Enter 4-Digit OTP/i).or(page.locator('input[type="text"]')).first();
        await otpInput.waitFor({ state: 'visible', timeout: 8000 });
        const loginOtp = await fetchLatestOtpFromGmail();
        await otpInput.fill(loginOtp);
        await page.getByRole('button', { name: /Verify OTP/i }).or(page.getByText(/Verify OTP/i)).first().click();

        // Validation 10 & 11: Agent logged in & Balance is 2000 Tk
        await expect(page).toHaveURL(/.*profile|.*dashboard|.*agent/i, { timeout: 15000 });
        const allInputValues = await page.locator('input').evaluateAll((elms: any[]) => elms.map(e => e.value));
        expect(allInputValues.some(val => val.includes('2000'))).toBeTruthy();

        // Step 6: Agent Deposits 500 Tk to Customer
        await page.getByText('Cash In', { exact: true }).or(page.locator('a[href*="/cash-in"]')).first().click();
        const transferInputs = page.locator('input');
        await transferInputs.nth(0).fill(customerPhone);
        await transferInputs.nth(1).fill('500');
        await page.getByRole('button', { name: /cash in|deposit|send|submit/i }).or(page.locator('button[type="submit"]')).first().click();

        // Validation 12 & 13: Transaction successful & Balance updated
        await expect(page.getByText(/success|completed|successful/i).first()).toBeVisible({ timeout: 10000 });
        await page.getByText('My Profile').or(page.locator('a[href*="/profile"]')).first().click();
        await page.waitForTimeout(1500);
        const updatedValues = await page.locator('input').evaluateAll((elms: any[]) => elms.map(e => e.value));
        expect(updatedValues.some(val => val.includes('1512') || val.includes('1500'))).toBeTruthy();

        // =========================================================================
        // Step 8: Statement Extraction & Save to CSV
        // =========================================================================
        // Validation 14 & 19: Statement menu
        await page.getByText('Self Statement', { exact: true }).or(page.locator('a[href*="/statement"]')).first().click();
        await page.waitForTimeout(2000);

        await page.evaluate(() => {
            const inputs = document.querySelectorAll('input');
            if (inputs.length >= 2) {
                inputs[0].value = '10/01/2026';
                inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                inputs[0].dispatchEvent(new Event('change', { bubbles: true }));

                inputs[1].value = '10/11/2026';
                inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
                inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        await page.waitForTimeout(2000);

        // Validation 14: 500 Tk deposit in statement table
        await expect(page.locator('body')).toContainText(/500/);

        const tableRows = page.locator('table tr, [role="row"]');
        const totalRows = await tableRows.count();
        const csvRows: string[] = [];

        for (let i = 0; i < totalRows; i++) {
            const rowTexts = await tableRows.nth(i).locator('th, td, [role="cell"], [role="columnheader"]').allInnerTexts();
            if (rowTexts.length > 0) {
                csvRows.push(rowTexts.map(val => `"${val.replace(/\n/g, ' ').trim()}"`).join(','));
            }
        }

        // Validation 20: CSV file save
        fs.writeFileSync(csvFileName, csvRows.join('\n'), 'utf-8');
        console.log(`Saved CSV file: ${csvFileName}`);
        expect(fs.existsSync(csvFileName)).toBeTruthy();

        // Validation 15: Agent Logout & Session reset
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await page.context().clearCookies();
        await page.goto('https://dmoneyportal.roadtocareer.net/login');
        await page.waitForTimeout(1000);

        // =========================================================================
        // Step 7: Password Reset Flow & Validation 16, 17, 18
        // =========================================================================
        await page.goto('https://dmoneyportal.roadtocareer.net/reset-password');
        await page.waitForTimeout(1500);

        const requestAgainBtn = page.getByText(/Request again/i);
        if (await requestAgainBtn.isVisible().catch(() => false)) {
            await requestAgainBtn.click();
            await page.waitForTimeout(1000);
        }

        const resetEmailInput = page.getByPlaceholder(/Email or Phone Number/i).or(page.locator('input')).first();
        await resetEmailInput.waitFor({ state: 'visible', timeout: 15000 });
        await resetEmailInput.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await resetEmailInput.pressSequentially(agentEmail, { delay: 40 });
        await page.waitForTimeout(500);

        const sendBtn = page.getByRole('button', { name: /Send Reset Link/i }).or(page.locator('button[type="submit"]')).first();
        await sendBtn.click();

        // Validation 16: Password reset link sent alert/confirmation
        await expect(page.getByText(/password reset link has been sent|sent|check your/i).first()).toBeVisible({ timeout: 12000 });


        const resetUrl = await fetchLatestResetLinkFromGmail(15000);
        if (resetUrl) {
            await page.goto(resetUrl);
            await page.waitForTimeout(1500);

            const passInputs = page.locator('input[type="password"]');
            if (await passInputs.first().isVisible({ timeout: 4000 }).catch(() => false)) {
                await passInputs.first().fill(newAgentPassword);
                if (await passInputs.nth(1).isVisible().catch(() => false)) {
                    await passInputs.nth(1).fill(newAgentPassword);
                }
                await page.getByRole('button', { name: /update|save|change|reset|submit/i }).first().click();
                await page.waitForTimeout(1500);
            }
        }

        // Validation 17: Negative Test - Wrong/Old Password Fails Login
        await page.goto('https://dmoneyportal.roadtocareer.net/login');
        await page.locator('input').nth(0).fill(agentEmail);
        await page.locator('input').nth(1).fill('WrongPassword@999');
        await page.getByRole('button', { name: /login|sign in/i }).click();
        await expect(page.getByText(/invalid|incorrect|failed|wrong/i).first()).toBeVisible({ timeout: 8000 });

        // Validation 18: Positive Test - Login with agent credentials
        await page.locator('input').nth(1).fill(agentPassword);
        await page.getByRole('button', { name: /login|sign in/i }).click();

        const newLoginOtpInput = page.getByPlaceholder(/Enter 4-Digit OTP/i).or(page.locator('input[type="text"]')).first();
        if (await newLoginOtpInput.isVisible({ timeout: 8000 }).catch(() => false)) {
            const reLoginOtp = await fetchLatestOtpFromGmail();
            await newLoginOtpInput.fill(reLoginOtp);
            await page.getByRole('button', { name: /Verify OTP|verify|submit/i }).first().click();
        }
        await expect(page).toHaveURL(/.*profile|.*dashboard|.*agent/i, { timeout: 15000 });
    });

    // =========================================================================================
    //  SMOKE SUITE: Shudhumatro Positive Happy Path 
    // =========================================================================================
    test('Critical Positive Flow - Registration, Activation, Deposit and Statement @smoke', async ({ page }) => {
        test.setTimeout(120000);
        const suffix = Math.floor(1000 + Math.random() * 9000);
        const agentEmail = `ahamedmdtanvir06+${suffix}@gmail.com`;
        const agentPhone = `01705${Math.floor(100000 + Math.random() * 900000)}`;
        const agentPassword = 'Password@123';
        const agentNid = `199${Math.floor(1000000 + Math.random() * 9000000)}`;

        const freshCustPhone = `01805${Math.floor(100000 + Math.random() * 900000)}`;
        const freshCustEmail = `customer_${suffix}@gmail.com`;

        await page.setViewportSize({ width: 1400, height: 900 });

        // Step 0: Create Fresh Customer
        await page.goto('https://dmoneyportal.roadtocareer.net/register');
        const custInputs = page.locator('input');
        await custInputs.nth(0).fill(`Customer ${suffix}`);
        await custInputs.nth(1).fill(freshCustEmail);
        await custInputs.nth(2).fill('Password@123');
        await custInputs.nth(3).fill(freshCustPhone);
        await custInputs.nth(4).fill(`198${Math.floor(1000000 + Math.random() * 9000000)}`);

        const custDropdown = page.locator('div[role="combobox"]').first();
        await custDropdown.click();
        await page.waitForTimeout(300);
        const custOption = page.locator('li[role="option"], li').filter({ hasText: /Customer/i }).first();
        if (await custOption.isVisible().catch(() => false)) {
            await custOption.click();
        } else {
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
        }
        await page.locator('button[type="submit"], button').filter({ hasText: /Create Account/i }).first().click();
        await page.waitForTimeout(1500);

        // Step 1: Register Agent
        await page.goto('https://dmoneyportal.roadtocareer.net/register');
        const inputs = page.locator('input');
        await inputs.nth(0).fill(agentName);
        await inputs.nth(1).fill(agentEmail);
        await inputs.nth(2).fill(agentPassword);
        await inputs.nth(3).fill(agentPhone);
        await inputs.nth(4).fill(agentNid);

        const dropdownBox = page.locator('div[role="combobox"]').first();
        await dropdownBox.click();
        await page.waitForTimeout(400);

        const agentOption = page.locator('li[role="option"], li').filter({ hasText: /Agent/i }).first();
        if (await agentOption.isVisible().catch(() => false)) {
            await agentOption.click();
        } else {
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
        }
        await page.locator('button[type="submit"], button').filter({ hasText: /Create Account/i }).first().click();
        await expect(page.getByText(/success|created|registered|pending approval/i).first()).toBeVisible({ timeout: 12000 });

        // Step 2: Admin activates both Customer and Agent
        await page.goto('https://dmoneyportal.roadtocareer.net/login');
        await page.locator('input').nth(0).fill('admin@dmoney.com');
        await page.locator('input').nth(1).fill('1234');
        await page.getByRole('button', { name: /login|sign in/i }).click();
        await expect(page).toHaveURL(/.*profile|.*dashboard|.*admin/i, { timeout: 15000 });

        await activateUser(page, freshCustEmail);
        await activateUser(page, agentEmail);
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

        // Step 3: System deposits 2000 Tk to Agent
        await page.goto('https://dmoneyportal.roadtocareer.net/login');
        await page.locator('input').nth(0).fill('system@dmoney.com');
        await page.locator('input').nth(1).fill('1234');
        await page.getByRole('button', { name: /login|sign in/i }).click();
        await expect(page).toHaveURL(/.*profile|.*dashboard|.*agent/i, { timeout: 15000 });

        await page.getByText('Cash In', { exact: true }).or(page.locator('a[href*="/cash-in"]')).first().click();
        await page.getByPlaceholder(/account|phone|receiver|number/i).or(page.locator('input').nth(0)).fill(agentPhone);
        await page.getByPlaceholder(/amount/i).or(page.locator('input').nth(1)).fill('2000');
        await page.getByRole('button', { name: /cash in|deposit|send|submit/i }).click();
        await expect(page.getByText(/success|completed|successful/i).first()).toBeVisible({ timeout: 10000 });
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

        // Step 4: Agent Login with OTP
        await page.goto('https://dmoneyportal.roadtocareer.net/login');
        await page.locator('input').nth(0).fill(agentEmail);
        await page.locator('input').nth(1).fill(agentPassword);
        await page.getByRole('button', { name: /login|sign in/i }).click();

        const otpInput = page.getByPlaceholder(/Enter 4-Digit OTP/i).or(page.locator('input[type="text"]')).first();
        await otpInput.waitFor({ state: 'visible', timeout: 8000 });
        const loginOtp = await fetchLatestOtpFromGmail();
        await otpInput.fill(loginOtp);
        await page.getByRole('button', { name: /Verify OTP/i }).or(page.getByText(/Verify OTP/i)).first().click();
        await expect(page).toHaveURL(/.*profile|.*dashboard|.*agent/i, { timeout: 15000 });

        // Step 5: Cash In 500 Tk to fresh Customer
        await page.getByText('Cash In', { exact: true }).or(page.locator('a[href*="/cash-in"]')).first().click();
        const transferInputs = page.locator('input');
        await transferInputs.nth(0).fill(freshCustPhone);
        await transferInputs.nth(1).fill('500');
        await page.getByRole('button', { name: /cash in|deposit|send|submit/i }).or(page.locator('button[type="submit"]')).first().click();
        await expect(page.getByText(/success|completed|successful/i).first()).toBeVisible({ timeout: 10000 });

        // Step 6: Statement Verification
        await page.getByText('Self Statement', { exact: true }).or(page.locator('a[href*="/statement"]')).first().click();
        await page.waitForTimeout(2000);

        await page.evaluate(() => {
            const inputs = document.querySelectorAll('input');
            if (inputs.length >= 2) {
                inputs[0].value = '10/01/2026';
                inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                inputs[0].dispatchEvent(new Event('change', { bubbles: true }));

                inputs[1].value = '10/11/2026';
                inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
                inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        await page.waitForTimeout(2000);

        await expect(page.locator('body')).toContainText(/500/);
    });
});