import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ForgotPasswordPage extends BasePage {
    readonly identifier = this.page.getByLabel("Email or Phone Number");
    readonly sendButton = this.page.getByRole("button", { name: /Send Reset Link/ });

    async requestReset(email: string): Promise<void> {
        await this.page.goto("/forgot-password");
        await this.identifier.fill(email);
        await this.sendButton.click();
        await expect(this.alert("A password reset link has been sent to your registered Gmail address")).toBeVisible();
    }
}
