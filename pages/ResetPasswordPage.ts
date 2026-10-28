import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ResetPasswordPage extends BasePage {
    readonly newPassword = this.page.getByLabel(/^New Password/);
    readonly confirmPassword = this.page.getByLabel(/^Confirm New Password/);
    readonly resetButton = this.page.getByRole("button", { name: /Reset Password/ });

    async resetPassword(resetLink: string, password: string): Promise<void> {
        await this.page.goto(resetLink);
        await this.newPassword.fill(password);
        await this.confirmPassword.fill(password);
        await this.resetButton.click();
        await expect(this.alert("Your password has been reset successfully")).toBeVisible();
        await expect(this.page).toHaveURL(/\/login$/);
    }
}
