import { expect, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class UserListPage extends BasePage {
    readonly searchEmail = this.page.getByPlaceholder("e.g., user@example.com");
    readonly searchButton = this.page.getByRole("button", { name: "Search", exact: true });

    async goto(): Promise<void> {
        await this.page.goto("/admin/users");
        await expect(this.page.getByRole("heading", { name: "User List" })).toBeVisible();
    }

    row(email: string): Locator {
        return this.page.locator("tbody tr").filter({ hasText: email });
    }

    async searchByEmail(email: string): Promise<Locator> {
        await this.choose("Search Type", "Search by Email");
        await this.searchEmail.fill(email);
        await this.searchButton.click();
        const row = this.row(email);
        await expect(row).toHaveCount(1);
        return row;
    }

    async expectStatus(email: string, status: "PENDING" | "ACTIVE"): Promise<void> {
        const row = await this.searchByEmail(email);
        await expect(row.getByText(status, { exact: true })).toBeVisible();
    }

    async openUser(email: string): Promise<void> {
        const row = await this.searchByEmail(email);
        await row.getByRole("button", { name: "View", exact: true }).click();
        await expect(this.page).toHaveURL(/\/admin\/users\/\d+$/);
    }
}
