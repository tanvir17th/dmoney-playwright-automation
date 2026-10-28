import { test } from "@playwright/test";
import { Journey } from "../flows/journey";
import { verifyGmailConnection } from "../utils/gmail";

// Smoke suite: critical positive flows only.
test.describe.serial("dMoney smoke suite", { tag: "@smoke" }, () => {
    const journey = new Journey();

    test.beforeAll(async () => {
        await verifyGmailConnection();
    });

    test("Customer and Agent register successfully with pending status", async ({ page }) => {
        await journey.registerUser(page, journey.customer);
        await journey.registerUser(page, journey.agent);
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

    test("Agent logs in with Gmail OTP and has exactly 2000 Tk", async ({ page }) => {
        await journey.loginAgent(page);
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

    test("Agent resets password and logs in with the new password", async ({ page }) => {
        await journey.resetAgentPassword(page);
        await journey.loginAgent(page);
    });
});
