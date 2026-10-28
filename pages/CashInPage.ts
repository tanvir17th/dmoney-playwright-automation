import { expect } from "@playwright/test";
import { money } from "../utils/testData";
import { BasePage } from "./BasePage";

export interface CashInResult {
    transactionId: string;
    summary: string;
}

/** Cash In form used both by SYSTEM (deposit to an Agent) and by Agents (deposit to a Customer). */
export class CashInPage extends BasePage {
    readonly receiverPhone = this.page.getByLabel(/Customer Phone Number/);
    readonly amount = this.page.getByLabel(/Amount \(BDT\)/);
    readonly submitButton = this.page.getByRole("button", { name: /Cash In/ });
    readonly transactionId = this.page.locator("main").getByText(/^TXN[A-Z0-9]+$/);

    async goto(): Promise<void> {
        await this.page.goto("/agent/cash-in");
    }

    async submit(phone: string, amount: number): Promise<void> {
        await this.receiverPhone.fill(phone);
        await this.amount.fill(String(amount));
        await this.submitButton.click();
    }

    async cashIn(phone: string, amount: number, successMessage: string): Promise<CashInResult> {
        await this.submit(phone, amount);
        await expect(this.page.getByText(successMessage, { exact: true })).toBeVisible();
        await expect(this.page.locator("main")).toContainText(`৳ ${money(amount)}`);
        return {
            transactionId: (await this.transactionId.innerText()).trim(),
            summary: await this.page.locator("main").innerText(),
        };
    }

    /** Reads the "CURRENT BALANCE" shown in the success summary after an Agent Cash In. */
    static currentBalance(summary: string): number | undefined {
        const match = summary.match(/CURRENT BALANCE\s*৳\s*([\d.]+)/i);
        return match ? Number(match[1]) : undefined;
    }
}
