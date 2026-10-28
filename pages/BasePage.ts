import { Locator, Page } from "@playwright/test";

export abstract class BasePage {
    constructor(protected readonly page: Page) {}

    /** Toast / inline alert containing the given text (Next.js also renders an empty route-announcer alert). */
    alert(text: string | RegExp): Locator {
        return this.page.getByRole("alert").filter({ hasText: text });
    }

    /** MUI Select rendered as role=combobox inside the form control that owns the given label. */
    protected select(label: string): Locator {
        return this.page
            .locator(".MuiFormControl-root")
            .filter({ has: this.page.locator("label", { hasText: label }) })
            .getByRole("combobox");
    }

    protected async choose(label: string, option: string | RegExp): Promise<void> {
        await this.select(label).click();
        await this.page.getByRole("option", { name: option }).click();
    }
}
