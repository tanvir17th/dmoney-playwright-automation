import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class AdminDepositPage extends BasePage {
    readonly accountPhone = this.page.getByLabel(/SYSTEM Account Phone Number/);
    readonly amount = this.page.getByLabel(/Amount \(BDT\)/);
    readonly depositButton = this.page.getByRole("button", { name: /deposit to system/i });
    readonly transactionId = this.page.locator("main").getByText(/^TXN[A-Z0-9]+$/);

    async goto(): Promise<void> {
        await this.page.goto("/admin/deposit");
    }

    /** Deposits into the SYSTEM account and returns the transaction ID shown on success. */
    async depositToSystem(amount: number): Promise<string> {
        await this.accountPhone.fill("SYSTEM");
        await this.amount.fill(String(amount));
        await this.depositButton.click();
        await expect(this.alert("Deposit to SYSTEM account successful")).toBeVisible();
        return (await this.transactionId.innerText()).trim();
    }
}
