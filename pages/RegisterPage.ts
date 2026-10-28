import { Response } from "@playwright/test";
import { TestUser } from "../utils/testData";
import { BasePage } from "./BasePage";

export class RegisterPage extends BasePage {
    readonly name = this.page.getByLabel("Full Name");
    readonly email = this.page.getByLabel("Email Address");
    readonly password = this.page.getByLabel("Password");
    readonly phone = this.page.getByLabel("Phone Number");
    readonly nid = this.page.getByLabel("National ID (NID)");
    readonly submitButton = this.page.getByRole("button", { name: /Create Account/ });

    async goto(): Promise<void> {
        await this.page.goto("/register");
    }

    async fill(user: TestUser): Promise<void> {
        await this.name.fill(user.name);
        await this.email.fill(user.email);
        await this.password.fill(user.password);
        await this.phone.fill(user.phone);
        await this.nid.fill(user.nid);
        await this.choose("Account Type (Role)", new RegExp(user.role));
    }

    async submit(): Promise<void> {
        await this.submitButton.click();
    }

    /** Fills and submits the form, returning the backend response to the registration request. */
    async register(user: TestUser): Promise<Response> {
        await this.fill(user);
        const response = this.page.waitForResponse(
            (res) => res.url().includes("/user/register") && res.request().method() === "POST"
        );
        await this.submit();
        return response;
    }
}
