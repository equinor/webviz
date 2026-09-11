import { expect, test } from "@playwright/experimental-ct-react";

import { CostProfileEditorHarness } from "./support/CostProfileEditorHarness";

test("keeps a repaired cost schedule unavailable until its debounced commit", async ({ mount, page }) => {
    await mount(<CostProfileEditorHarness />);

    const yearInput = page.getByRole("textbox").first();
    await expect(page.getByTestId("cost-schedule-ready")).toHaveText("ready");
    await expect(page.getByTestId("committed-cost-year")).toHaveText("2020");

    await yearInput.click();
    await yearInput.press("ControlOrMeta+A");
    await yearInput.press("Backspace");
    await yearInput.blur();
    await expect(page.getByTestId("cost-schedule-ready")).toHaveText("pending");

    await yearInput.fill("2021");
    await yearInput.blur();
    await expect(page.getByTestId("cost-schedule-ready")).toHaveText("pending");
    await expect(page.getByTestId("committed-cost-year")).toHaveText("2020");

    await expect(page.getByTestId("cost-schedule-ready")).toHaveText("ready", { timeout: 2_000 });
    await expect(page.getByTestId("committed-cost-year")).toHaveText("2021");
});

test("revalidates signed Delta costs when switched to a regular ensemble", async ({ mount, page }) => {
    const component = await mount(<CostProfileEditorHarness initialCostProfile={[{ year: 2020, capex: -100, opex: 0 }]} isDelta />);

    await expect(page.getByTestId("cost-schedule-ready")).toHaveText("ready");
    await component.update(<CostProfileEditorHarness initialCostProfile={[{ year: 2020, capex: -100, opex: 0 }]} isDelta={false} />);

    await expect(page.getByTestId("cost-schedule-ready")).toHaveText("pending");
    await expect(page.getByText("Investment and operating costs must be zero or greater.")).toBeVisible();
});

test("displays calendar years without locale grouping", async ({ mount, page }) => {
    await mount(<CostProfileEditorHarness initialCostProfile={[{ year: 2018, capex: 0, opex: 0 }]} />);

    await expect(page.getByRole("textbox").first()).toHaveValue("2018");
});
