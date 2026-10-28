import { expect } from "@playwright/test";
import { fetchLoginOtp, inboxPosition } from "../utils/gmail";
import { BasePage } from "./BasePage";

export const LOGIN_FAILED_MESSAGE = "Login failed. Please input correct email/phone number or password.";

export class LoginPage extends BasePage {
    readonly identifier = this.page.getByLabel("Email or Phone Number");
    readonly password = this.page.getByLabel("Password");
    readonly loginButton = this.page.getByRole("button", { name: /Login/ });
    readonly otpInput = this.page.getByLabel(/4-Digit OTP/);
    readonly verifyOtpButton = this.page.getByRole("button", { name: /Verify OTP/ });

    async goto(): Promise<void> {
        await this.page.goto("/login");
    }

    async submitCredentials(identifier: string, password: string): Promise<void> {
        await this.goto();
        await this.identifier.fill(identifier);
        await this.password.fill(password);
        await this.loginButton.click();
    }

    /** Admin and SYSTEM accounts log straight in without an OTP. */
    async login(identifier: string, password: string): Promise<void> {
        await this.submitCredentials(identifier, password);
        await expect(this.page).toHaveURL(/\/profile$/);
    }

    /** Logs in a user whose login requires the 4-digit OTP emailed to them. */
    async loginWithOtp(email: string, password: string): Promise<void> {
        const fromUid = await inboxPosition();
        await this.submitOtpStep(email, password);
        await this.otpInput.fill(await fetchLoginOtp(email, fromUid));
        await this.verifyOtpButton.click();
        await expect(this.page).toHaveURL(/\/profile$/);
    }

    /** Submits credentials and waits for the OTP prompt without completing it. */
    async submitOtpStep(email: string, password: string): Promise<void> {
        await this.submitCredentials(email, password);
        await expect(this.page.getByText("OTP sent to your registered email address", { exact: true })).toBeVisible();
        await expect(this.otpInput).toBeVisible();
    }
}
