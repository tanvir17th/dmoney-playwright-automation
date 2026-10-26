import { test, expect } from "@playwright/test";
import * as fs from "fs";
import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import * as dotenv from "dotenv";

dotenv.config();

const agentName = "Tanvir ahamed";
const GMAIL_USER = process.env.GMAIL_USER?.trim();
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

function getGmailConfig() {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        throw new Error("Set GMAIL_USER and GMAIL_APP_PASSWORD in the ignored .env file.");
    }

    return {
        imap: {
            user: GMAIL_USER,
            password: GMAIL_APP_PASSWORD,
            host: "imap.gmail.com",
            port: 993,
            tls: true,
            authTimeout: 10000,
            tlsOptions: { rejectUnauthorized: false }
        }
    };
}

async function verifyGmailConnection(): Promise<void> {
    let connection: any = null;
    try {
        connection = await imaps.connect(getGmailConfig());
        await connection.openBox("INBOX");
    } catch (error) {
        if (connection) {
            try { await connection.end(); } catch (_) { }
        }
        throw new Error(`Unable to access Gmail IMAP. Check GMAIL_USER and create a valid Google app password: ${error instanceof Error ? error.message : String(error)}`);
    }
    await connection.end();
}

async function fetchLatestOtpFromGmail(recipientEmail: string, timeoutMs = 45000): Promise<string> {
    const config = getGmailConfig();
    const startTime = Date.now();
    let lastError: unknown;
    console.log("Fetching OTP from Gmail inbox...");
    while (Date.now() - startTime < timeoutMs) {
        let connection: any = null;
        try {
            connection = await imaps.connect(config);
            await connection.openBox("INBOX");
            const searchCriteria = [["SINCE", new Date(Date.now() - 5 * 60 * 1000).toDateString()]];
            const fetchOptions = { bodies: ["HEADER", "TEXT", ""], markSeen: false };
            const messages = await connection.search(searchCriteria, fetchOptions);
            if (messages.length > 0) {
                messages.sort((a: any, b: any) => b.attributes.uid - a.attributes.uid);
                for (const msg of messages.slice(0, 5)) {
                    const allParts = msg.parts.find((part: any) => part.which === "");
                    if (!allParts) continue;
                    const parsed = await simpleParser(allParts.body);
                    const text = (parsed.text || "") + " " + (parsed.html || "");
                    const toAddresses = Array.isArray(parsed.to) ? parsed.to : parsed.to?.value || [];
                    const recipients = toAddresses.map((recipient: any) => recipient.address?.toLowerCase());
                    if (!recipients.includes(recipientEmail.toLowerCase())) continue;
                    if (!parsed.date || Date.now() - parsed.date.getTime() > 2 * 60 * 1000) continue;
                    if (!/(otp|verification)/i.test(`${parsed.subject || ""} ${text}`)) continue;
                    const match = text.match(/(?:otp|verification(?:\s+code)?|one[- ]time code)[^\d]{0,30}(\d{4})/i);
                    if (match) {
                        console.log("Matching recent OTP email found.");
                        await connection.end();
                        return match[1];
                    }
                }
            }
            await connection.end();
        } catch (err) {
            lastError = err;
            if (connection) {
                try { await connection.end(); } catch (_) { }
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    const detail = lastError instanceof Error ? ` Last IMAP error: ${lastError.message}` : "";
    throw new Error(`OTP fetch timeout: No matching OTP found in recent Gmail messages.${detail}`);
}

async function activateUser(page: any, userEmail: string) {
    await page.locator('a[href*="/users"]').or(page.getByText("User List")).first().click();
    const searchType = page.getByRole("combobox").first();
    if (await searchType.isVisible().catch(() => false)) {
        const nativeSearchType = page.locator("select").first();
        if (await nativeSearchType.isVisible().catch(() => false)) {
            await nativeSearchType.selectOption({ label: "Email" }).catch(() => {});
        } else {
            await searchType.click();
            const emailOption = page.getByRole("option", { name: /email/i }).first();
            if (await emailOption.isVisible().catch(() => false)) {
                await emailOption.click();
            }
        }
    }

    const searchInput = page.getByPlaceholder(/search|email|phone/i).first();
    if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill(userEmail);
        await page.keyboard.press("Enter");
    }

    const row = page.locator("tbody tr").filter({ hasText: userEmail }).first();
    await expect(row).toBeVisible({ timeout: 15000 });

    const viewBtn = row.locator("button, a").filter({ hasText: /VIEW|edit|action/i }).first();
    await viewBtn.scrollIntoViewIfNeeded();
    await viewBtn.click();
    await page.waitForTimeout(1000);

    const editBtn = page.getByRole("button", { name: "Edit User", exact: true });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const statusDropdown = page.locator('div[role="combobox"]').last();
    await expect(statusDropdown).toBeEnabled();
    await statusDropdown.click();
    await page.getByRole("option", { name: "Active", exact: true }).click();

    const saveBtn = page.getByRole("button", { name: "Save Changes", exact: true });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await expect(page.getByText("User updated successfully", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("ACTIVE", { exact: true }).first()).toBeVisible({ timeout: 10000 });
}

test.describe("dMoney E2E Automation Suite", () => {
    test.beforeEach(async () => {
        await verifyGmailConnection();
    });

    test("Critical Positive Flow - Registration, Activation, Deposit and Statement @smoke @regression", async ({ page }) => {
        test.setTimeout(180000);
        const suffix = Math.floor(10000000 + Math.random() * 90000000);
        const agentEmail = "ahamedmdtanvir06+" + suffix + "@gmail.com";
        const agentPhone = "01705" + Math.floor(100000 + Math.random() * 900000);
        const agentPassword = "Password@123";
        const agentNid = "199" + Math.floor(1000000 + Math.random() * 9000000);

        const freshCustPhone = "01805" + Math.floor(100000 + Math.random() * 900000);
        const freshCustEmail = "customer_" + suffix + "@gmail.com";

        await page.setViewportSize({ width: 1400, height: 900 });

        await page.goto("https://dmoneyportal.roadtocareer.net/register");
        const custInputs = page.locator("input");
        await custInputs.nth(0).fill("Customer " + suffix);
        await custInputs.nth(1).fill(freshCustEmail);
        await custInputs.nth(2).fill("Password@123");
        await custInputs.nth(3).fill(freshCustPhone);
        await custInputs.nth(4).fill("198" + Math.floor(1000000 + Math.random() * 9000000));

        const custDropdown = page.locator('div[role="combobox"]').first();
        await custDropdown.click();
        const customerRoleOption = page.getByRole("option", { name: /Customer/i });
        await customerRoleOption.click();
        await expect(custDropdown).toContainText("Customer");
        const customerSubmit = page.locator('button[type="submit"]');
        await customerSubmit.click();
        await expect(customerSubmit).toBeEnabled({ timeout: 30000 });

        await page.goto("https://dmoneyportal.roadtocareer.net/register");
        const inputs = page.locator("input");
        await inputs.nth(0).fill(agentName);
        await inputs.nth(1).fill(agentEmail);
        await inputs.nth(2).fill(agentPassword);
        await inputs.nth(3).fill(agentPhone);
        await inputs.nth(4).fill(agentNid);

        const dropdownBox = page.locator('div[role="combobox"]').first();
        await dropdownBox.click();
        const agentRoleOption = page.getByRole("option", { name: /Agent/i });
        await agentRoleOption.click();
        await expect(dropdownBox).toContainText("Agent");
        const agentSubmit = page.locator('button[type="submit"]');
        await agentSubmit.click();
        await expect(agentSubmit).toBeEnabled({ timeout: 30000 });

        await page.goto("https://dmoneyportal.roadtocareer.net/login");
        await page.locator("input").nth(0).fill("admin@dmoney.com");
        await page.locator("input").nth(1).fill("1234");
        await page.getByRole("button", { name: /login|sign in/i }).click();
        await expect(page).toHaveURL(/.*profile|.*dashboard|.*admin/i, { timeout: 15000 });

        await activateUser(page, freshCustEmail);
        await activateUser(page, agentEmail);

        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        await page.goto("https://dmoneyportal.roadtocareer.net/login");
        await page.locator("input").nth(0).fill("system@dmoney.com");
        await page.locator("input").nth(1).fill("1234");
        await page.getByRole("button", { name: /login|sign in/i }).click();
        await expect(page).toHaveURL(/.*profile|.*dashboard|.*agent/i, { timeout: 15000 });

        await page.getByText("Cash In", { exact: true }).or(page.locator('a[href*="cash-in"]')).first().click();
        await page.getByPlaceholder(/account|phone|receiver|number/i).or(page.locator("input").nth(0)).fill(agentPhone);
        await page.getByPlaceholder(/amount/i).or(page.locator("input").nth(1)).fill("2000");
        await page.getByRole("button", { name: /cash in|deposit|send|submit/i }).click();
        await expect(page.getByText(/success|completed|submitted|successful/i).first()).toBeVisible({ timeout: 10000 });
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        await page.goto("https://dmoneyportal.roadtocareer.net/login");
        await page.locator("input").nth(0).fill(agentEmail);
        await page.locator("input").nth(1).fill(agentPassword);
        await page.getByRole("button", { name: /login|sign in/i }).click();

        const otpInput = page.getByPlaceholder(/Enter 4-Digit OTP/i).or(page.locator('input[type="text"]')).first();
        await otpInput.waitFor({ state: "visible", timeout: 8000 });
        const loginOtp = await fetchLatestOtpFromGmail(agentEmail);
        await otpInput.fill(loginOtp);
        await page.getByRole("button", { name: /Verify OTP/i }).or(page.getByText(/Verify OTP/i)).first().click();
        await expect(page).toHaveURL(/.*profile|.*dashboard|.*agent/i, { timeout: 15000 });

        await page.getByText("Cash In", { exact: true }).or(page.locator('a[href*="cash-in"]')).first().click();
        const transferInputs = page.locator("input");
        await transferInputs.nth(0).fill(freshCustPhone);
        await transferInputs.nth(1).fill("500");
        await page.getByRole("button", { name: /cash in|deposit|send|submit/i }).or(page.locator('button[type="submit"]')).first().click();
        await expect(page.getByText(/success|created|submitted|successful/i).first()).toBeVisible({ timeout: 10000 });

        await page.getByText("Self Statement", { exact: true }).or(page.locator('a[href*="statement"]')).first().click();
        await page.waitForTimeout(2000);

        await page.evaluate(() => {
            const inputs = document.querySelectorAll("input");
            if (inputs.length >= 2) {
                inputs[0].value = "10/01/2026";
                inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
                inputs[0].dispatchEvent(new Event("change", { bubbles: true }));

                inputs[1].value = "10/11/2026";
                inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
                inputs[1].dispatchEvent(new Event("change", { bubbles: true }));
            }
        });
        await page.waitForTimeout(2000);

        await expect(page.locator("body")).toContainText(/500/);
    });
});