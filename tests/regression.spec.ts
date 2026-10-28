import { expect, test } from "@playwright/test";
import { Journey } from "../flows/journey";
import { CashInPage } from "../pages/CashInPage";
import { LOGIN_FAILED_MESSAGE, LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { fetchLoginOtp, inboxPosition, verifyGmailConnection } from "../utils/gmail";
import { AMOUNTS, createUser } from "../utils/testData";

// Regression suite: the complete journey with positive and negative validations.
test.describe.serial("dMoney regression suite", { tag: "@regression" }, () => {
    const journey = new Journey();

    test.beforeAll(async () => {
        await verifyGmailConnection();
    });

    test("Registration is rejected when required fields are empty", async ({ page }) => {
        const registerPage = new RegisterPage(page);
        await registerPage.goto();
        await registerPage.submit();
        await expect(registerPage.alert("All fields are required.")).toBeVisible();
        await expect(page).toHaveURL(/\/register$/);
    });

    test("Registration is rejected for a non-Gmail address", async ({ page }) => {
        const registerPage = new RegisterPage(page);
        await registerPage.goto();
        await registerPage.fill({ ...createUser("Customer"), email: `qa.${Date.now()}@yahoo.com` });
        await registerPage.submit();
        await expect(registerPage.alert("Only Gmail addresses (@gmail.com) are allowed for registration.")).toBeVisible();
        await expect(page).toHaveURL(/\/register$/);
    });

    test("Customer and Agent register successfully with pending status", async ({ page }) => {
        await journey.registerUser(page, journey.customer);
        await journey.registerUser(page, journey.agent);
    });

    test("Registration is rejected for an already registered email", async ({ page }) => {
        const registerPage = new RegisterPage(page);
        await registerPage.goto();
        const response = await registerPage.register({ ...createUser("Agent"), email: journey.agent.email });
        expect(response.status()).not.toBe(201);
        await expect(registerPage.alert("An account with this email already exists")).toBeVisible();
        await expect(page).toHaveURL(/\/register$/);
    });

    test("Admin activates the pending Customer and Agent", async ({ page }) => {
        await journey.activateUsers(page, [journey.customer, journey.agent]);
    });

    test("Admin deposits to SYSTEM", async ({ page }) => {
        await journey.adminDepositsToSystem(page);
    });

    test("SYSTEM deposits 2000 Tk to the Agent and records the transaction", async ({ page }) => {
        await journey.systemDepositsToAgent(page);
    });

    test("Agent login is rejected with a wrong password", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.submitCredentials(journey.agent.email, "wrong-password");
        await expect(loginPage.alert(LOGIN_FAILED_MESSAGE)).toBeVisible();
        await expect(loginPage.otpInput).toBeHidden();
    });

    test("Agent login is rejected with an invalid OTP", async ({ page }) => {
        const loginPage = new LoginPage(page);
        const fromUid = await inboxPosition();
        await loginPage.submitOtpStep(journey.agent.email, journey.agent.password);
        // Wait for the real OTP so the wrong code is guaranteed to differ and this email
        // cannot arrive late and be mistaken for the next test's OTP.
        const realOtp = await fetchLoginOtp(journey.agent.email, fromUid);
        const wrongOtp = String((Number(realOtp) + 1) % 10_000).padStart(4, "0");
        await loginPage.otpInput.fill(wrongOtp);
        await loginPage.verifyOtpButton.click();
        await expect(loginPage.alert("Invalid OTP. Please try again.")).toBeVisible();
        await expect(page).toHaveURL(/\/login$/);
    });

    test("Agent logs in with Gmail OTP and has exactly 2000 Tk", async ({ page }) => {
        await journey.loginAgent(page);
        await journey.verifyAgentBalance(page, journey.agentBalanceAfterTopUp);
    });

    test("Cash In above the Agent balance is rejected and the balance is unchanged", async ({ page }) => {
        await journey.loginAgent(page);
        const cashInPage = new CashInPage(page);
        await cashInPage.goto();
        await cashInPage.submit(journey.customer.phone, AMOUNTS.systemToAgent + 1);
        await expect(cashInPage.alert("Insufficient balance")).toBeVisible();
        await expect(page.getByText("Deposit successful", { exact: true })).toBeHidden();
        await journey.verifyAgentBalance(page, journey.agentBalanceAfterTopUp);
    });

    test("Agent Cash In to Customer updates balance and self statement", async ({ page }) => {
        await journey.loginAgent(page);
        await journey.agentCashInToCustomer(page);
    });

    test("Agent self statement is exported to self_statement_<date>.csv", async ({ page }, testInfo) => {
        await journey.loginAgent(page);
        await journey.exportSelfStatement(page, testInfo);
    });

    test("Agent resets password; old password fails and new password works", async ({ page }) => {
        const oldPassword = await journey.resetAgentPassword(page);

        await test.step("Old password is rejected", async () => {
            const loginPage = new LoginPage(page);
            await loginPage.submitCredentials(journey.agent.email, oldPassword);
            await expect(loginPage.alert(LOGIN_FAILED_MESSAGE)).toBeVisible();
            await expect(loginPage.otpInput).toBeHidden();
        });

        await journey.loginAgent(page);
    });
});
