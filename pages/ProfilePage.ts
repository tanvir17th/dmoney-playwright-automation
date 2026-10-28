import { expect } from "@playwright/test";
import { money } from "../utils/testData";
import { BasePage } from "./BasePage";

export class ProfilePage extends BasePage {
    readonly balance = this.page.getByLabel("Current Balance (BDT)");

    async goto(): Promise<void> {
        await this.page.goto("/profile");
    }

    async expectBalance(amount: number): Promise<void> {
        await expect(this.balance).toHaveValue(money(amount));
    }
}
