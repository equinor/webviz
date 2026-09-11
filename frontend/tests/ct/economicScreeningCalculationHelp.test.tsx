import { expect, test } from "@playwright/experimental-ct-react";

import { CalculationHelpDialog } from "@modules/EconomicScreening/view/components/calculationHelpDialog";

test("opens the calculation guide and returns focus after Escape", async ({ mount, page }) => {
    await mount(<CalculationHelpDialog />);

    const action = page.getByRole("button", { name: "How calculations work" });
    await action.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "How calculations work" });
    await expect(dialog).toBeVisible();
    await expect(page.getByText("Worked example", { exact: true })).toBeVisible();
    await expect(dialog.locator("pre").last()).toContainText("411.57 USD");
    await expect(dialog.locator("pre").last()).toContainText("-0.37143 USD/Sm3");

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "How calculations work" })).toBeHidden();
    await expect(action).toBeFocused();
});
