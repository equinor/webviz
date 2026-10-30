import { expect, test } from "@playwright/experimental-ct-react";

import { Combobox } from "@lib/components/Combobox";
import { Setting } from "@lib/components/Setting";

test("sort-method help is unambiguous beside a combobox trigger", async ({ mount, page }) => {
    await mount(
        <Setting.Field
            label="Parameter sort method"
            help={{ title: "Parameter Sorting Methods", content: "Entropy and KL divergence" }}
        >
            <Combobox items={[{ value: "entropy", label: "Entropy Reduction" }]} value="entropy" />
        </Setting.Field>,
    );
    const row = page.locator(".setting-row").filter({ hasText: "Parameter sort method" });
    await row.getByRole("button", { name: "More information", exact: true }).click();
    await expect(page.getByText("Parameter Sorting Methods", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Parameter Sorting Methods", { exact: true })).toBeHidden();
});
