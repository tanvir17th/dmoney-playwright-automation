import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

type Status = "Pending" | "Active";

export class UserDetailsPage extends BasePage {
    readonly editButton = this.page.getByRole("button", { name: "Edit User", exact: true });
    readonly saveButton = this.page.getByRole("button", { name: "Save Changes", exact: true });
    readonly statusSelect = this.select("Account Status");

    async expectStatus(status: Status): Promise<void> {
        await expect(this.statusSelect).toHaveText(status);
        await expect(this.page.locator("main").getByText(status.toUpperCase(), { exact: true })).toBeVisible();
    }

    async activate(): Promise<void> {
        await this.editButton.click();
        await expect(this.saveButton).toBeVisible();
        await this.choose("Account Status", "Active");
        await this.saveButton.click();
        await expect(this.alert("User updated successfully").first()).toBeVisible();
    }
}
