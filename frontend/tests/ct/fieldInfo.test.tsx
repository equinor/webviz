import { expect, test } from "@playwright/experimental-ct-react";

import { Field } from "@lib/components/Field";

test.describe("Field.Info", () => {
    test("has an accessible trigger and supports click, keyboard, and Escape", async ({ mount, page }) => {
        await mount(<Field.Info>Discounted values use the selected valuation date.</Field.Info>);

        const trigger = page.getByRole("button", { name: "More information" });
        await expect(trigger).toBeVisible();

        await trigger.click();
        await expect(page.getByText("Discounted values use the selected valuation date.")).toBeVisible();

        await trigger.press("Escape");
        await expect(page.getByText("Discounted values use the selected valuation date.")).not.toBeVisible();

        await trigger.press("Enter");
        await expect(page.getByText("Discounted values use the selected valuation date.")).toBeVisible();
    });
});