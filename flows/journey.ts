import { expect, Page, test, TestInfo } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { AdminDepositPage } from "../pages/AdminDepositPage";
import { CashInPage } from "../pages/CashInPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { LoginPage } from "../pages/LoginPage";
import { ProfilePage } from "../pages/ProfilePage";
import { RegisterPage } from "../pages/RegisterPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { SelfStatementPage } from "../pages/SelfStatementPage";
import { UserDetailsPage } from "../pages/UserDetailsPage";
import { UserListPage } from "../pages/UserListPage";
import { env } from "../utils/env";
import { isoDate, writeCsv } from "../utils/files";
import { fetchPasswordResetLink, inboxPosition } from "../utils/gmail";
import { AMOUNTS, createUser, money, NEW_AGENT_PASSWORD, TestUser } from "../utils/testData";

/**
 * State shared by the serial tests of one end-to-end journey:
 * register Customer + Agent -> Admin activates -> Admin funds SYSTEM -> SYSTEM funds Agent
 * -> Agent Cash In to Customer -> Self Statement CSV -> Agent password reset.
 */
export class Journey {
    readonly customer: TestUser = createUser("Customer");
    readonly agent: TestUser = createUser("Agent");
    adminDepositTxnId = "";
    systemDepositTxnId = "";
    cashInTxnId = "";

    get agentBalanceAfterTopUp(): number {
        return AMOUNTS.systemToAgent;
    }

    get agentBalanceAfterCashIn(): number {
        return AMOUNTS.systemToAgent - AMOUNTS.cashIn + AMOUNTS.cashIn * AMOUNTS.cashInCommissionRate;
    }

    async registerUser(page: Page, user: TestUser): Promise<void> {
        await test.step(`Register ${user.role} ${user.email}`, async () => {
            const registerPage = new RegisterPage(page);
            await registerPage.goto();
            const response = await registerPage.register(user);

            expect(response.status()).toBe(201);
            expect((await response.json()).user).toMatchObject({
                email: user.email,
                phone_number: user.phone,
                role: user.role,
                status: "pending",
            });
            await expect(
                registerPage.alert("Registration successful. Your account is pending approval by an admin.")
            ).toBeVisible();
            await expect(page).toHaveURL(/\/login$/);
        });
    }

    async activateUsers(page: Page, users: TestUser[]): Promise<void> {
        await new LoginPage(page).login(env.adminEmail, env.adminPassword);
        const userList = new UserListPage(page);
        const details = new UserDetailsPage(page);

        for (const user of users) {
            await test.step(`Admin activates ${user.role} ${user.email}`, async () => {
                await userList.goto();
                await userList.expectStatus(user.email, "PENDING");
                await userList.openUser(user.email);
                await details.expectStatus("Pending");

                await details.activate();
                await page.reload();
                await details.expectStatus("Active");

                await userList.goto();
                await userList.expectStatus(user.email, "ACTIVE");
            });
        }
    }

    async adminDepositsToSystem(page: Page): Promise<void> {
        await test.step(`Admin deposits ${AMOUNTS.adminToSystem} Tk to SYSTEM`, async () => {
            await new LoginPage(page).login(env.adminEmail, env.adminPassword);
            const depositPage = new AdminDepositPage(page);
            await depositPage.goto();
            this.adminDepositTxnId = await depositPage.depositToSystem(AMOUNTS.adminToSystem);
            expect(this.adminDepositTxnId).toMatch(/^TXN[A-Z0-9]+$/);
        });
    }

    async systemDepositsToAgent(page: Page): Promise<void> {
        await new LoginPage(page).login(env.systemEmail, env.systemPassword);

        await test.step(`SYSTEM deposits ${AMOUNTS.systemToAgent} Tk to Agent`, async () => {
            const cashInPage = new CashInPage(page);
            await cashInPage.goto();
            const result = await cashInPage.cashIn(this.agent.phone, AMOUNTS.systemToAgent, "SYSTEM deposit to Agent successful");
            this.systemDepositTxnId = result.transactionId;
            expect(this.systemDepositTxnId).toMatch(/^TXN[A-Z0-9]+$/);
        });

        await test.step("SYSTEM statement records the Admin and Agent deposits", async () => {
            const statement = new SelfStatementPage(page);
            await statement.goto();
            await statement.filterByDateRange(isoDate(-1), isoDate(1));

            expect(await statement.waitForTransaction(this.systemDepositTxnId)).toMatchObject({
                "Sender Account": "SYSTEM",
                "Receiver Account": this.agent.phone,
                Type: "System Deposit to Agent",
                Debit: money(AMOUNTS.systemToAgent),
            });
            if (this.adminDepositTxnId) {
                expect(await statement.waitForTransaction(this.adminDepositTxnId)).toMatchObject({
                    "Receiver Account": "SYSTEM",
                    Type: "Admin Deposit",
                    Credit: money(AMOUNTS.adminToSystem),
                });
            }
        });
    }

    async loginAgent(page: Page): Promise<void> {
        await test.step("Agent logs in with the OTP from Gmail", async () => {
            await new LoginPage(page).loginWithOtp(this.agent.email, this.agent.password);
        });
    }

    async verifyAgentBalance(page: Page, expected: number): Promise<void> {
        await test.step(`Agent balance is exactly ${money(expected)} Tk`, async () => {
            const profile = new ProfilePage(page);
            await profile.goto();
            await profile.expectBalance(expected);
        });
    }

    async agentCashInToCustomer(page: Page): Promise<void> {
        await test.step(`Agent Cash In ${AMOUNTS.cashIn} Tk to Customer`, async () => {
            const cashInPage = new CashInPage(page);
            await cashInPage.goto();
            const result = await cashInPage.cashIn(this.customer.phone, AMOUNTS.cashIn, "Deposit successful");
            this.cashInTxnId = result.transactionId;
            expect(this.cashInTxnId).toMatch(/^TXN[A-Z0-9]+$/);
            expect(CashInPage.currentBalance(result.summary)).toBe(this.agentBalanceAfterCashIn);
        });

        await this.verifyAgentBalance(page, this.agentBalanceAfterCashIn);

        await test.step("Cash In appears in the Agent self statement", async () => {
            const statement = new SelfStatementPage(page);
            await statement.goto();
            await statement.filterByDateRange(isoDate(-1), isoDate(1));
            expect(await statement.waitForTransaction(this.cashInTxnId)).toMatchObject(this.expectedCashInRow());
        });
    }

    async exportSelfStatement(page: Page, testInfo: TestInfo): Promise<string> {
        const statement = new SelfStatementPage(page);

        const table = await test.step("Read the Agent self statement table", async () => {
            await statement.goto();
            await statement.filterByDateRange(isoDate(-1), isoDate(1));
            await statement.waitForTransaction(this.cashInTxnId);
            return statement.readTable();
        });

        await test.step("Statement contains exactly the SYSTEM top-up and the Cash In", async () => {
            expect(table.headers).toEqual([
                "Transaction ID",
                "Sender Account",
                "Receiver Account",
                "Type",
                "Debit",
                "Credit",
                "Balance",
                "Date",
            ]);
            expect(table.rows).toHaveLength(2);
            expect(table.rows).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        "Transaction ID": this.systemDepositTxnId,
                        "Sender Account": "SYSTEM",
                        "Receiver Account": this.agent.phone,
                        Type: "Top-up from SYSTEM",
                        Credit: money(AMOUNTS.systemToAgent),
                        Balance: money(this.agentBalanceAfterTopUp),
                    }),
                    expect.objectContaining(this.expectedCashInRow()),
                ])
            );
        });

        return test.step("Save the statement as self_statement_<date>.csv", async () => {
            const csvPath = path.join("exports", `self_statement_${isoDate()}.csv`);
            writeCsv(csvPath, table.headers, table.rows);

            const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n");
            expect(lines[0]).toBe(table.headers.join(","));
            expect(lines).toHaveLength(table.rows.length + 1);
            expect(lines.some((line) => line.startsWith(`${this.cashInTxnId},`))).toBe(true);

            await testInfo.attach(path.basename(csvPath), { path: csvPath, contentType: "text/csv" });
            return csvPath;
        });
    }

    async resetAgentPassword(page: Page): Promise<string> {
        const oldPassword = this.agent.password;
        await test.step("Agent resets password using the emailed link", async () => {
            const fromUid = await inboxPosition();
            await new ForgotPasswordPage(page).requestReset(this.agent.email);
            const resetLink = await fetchPasswordResetLink(this.agent.email, fromUid);
            await new ResetPasswordPage(page).resetPassword(resetLink, NEW_AGENT_PASSWORD);
            this.agent.password = NEW_AGENT_PASSWORD;
        });
        return oldPassword;
    }

    private expectedCashInRow() {
        return {
            "Transaction ID": this.cashInTxnId,
            "Sender Account": this.agent.phone,
            "Receiver Account": this.customer.phone,
            Debit: money(AMOUNTS.cashIn),
            Credit: money(AMOUNTS.cashIn * AMOUNTS.cashInCommissionRate),
            Balance: money(this.agentBalanceAfterCashIn),
        };
    }
}
