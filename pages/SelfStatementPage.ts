import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export type StatementRow = Record<string, string>;

export interface StatementTable {
    headers: string[];
    rows: StatementRow[];
}

export class SelfStatementPage extends BasePage {
    readonly fromDate = this.page.getByLabel("From Date");
    readonly toDate = this.page.getByLabel("To Date");
    readonly summary = this.page.getByText(/^Showing \d+ of \d+ total transaction/);
    readonly table = this.page.locator("main table");

    async goto(): Promise<void> {
        await this.page.goto("/agent/self-statement");
        await expect(this.page.getByRole("heading", { name: /Transaction History/ })).toBeVisible();
    }

    /** Dates are YYYY-MM-DD; the summary line confirms the filter was applied. */
    async filterByDateRange(from: string, to: string): Promise<void> {
        await this.fromDate.fill(from);
        await this.toDate.fill(to);
        await expect(this.summary).toContainText(`from ${from} to ${to}`);
    }

    async readTable(): Promise<StatementTable> {
        return this.table.evaluate((table: HTMLTableElement) => {
            const headers = [...table.querySelectorAll("thead th")].map((th) => (th as HTMLElement).innerText.trim());
            const rows = [...table.querySelectorAll("tbody tr")]
                .map((tr) => [...tr.querySelectorAll("td")].map((td) => td.innerText.trim()))
                .filter((cells) => cells.length === headers.length)
                .map((cells) => Object.fromEntries(headers.map((header, i) => [header, cells[i]])));
            return { headers, rows };
        });
    }

    /** Waits until the transaction is listed and returns its row. */
    async waitForTransaction(transactionId: string): Promise<StatementRow> {
        let row: StatementRow | undefined;
        await expect
            .poll(
                async () => {
                    row = (await this.readTable()).rows.find((r) => r["Transaction ID"] === transactionId);
                    return row;
                },
                { message: `Transaction ${transactionId} should appear in the self statement` }
            )
            .toBeDefined();
        return row!;
    }
}
