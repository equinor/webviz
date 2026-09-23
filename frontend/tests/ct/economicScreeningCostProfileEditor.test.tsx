import { expect, test } from "@playwright/experimental-ct-react";

import { CostProfileEditorHarness } from "./support/CostProfileEditorHarness";

test("keeps an edited cost schedule unavailable until its debounced commit", async ({ mount, page }) => {
    await mount(<CostProfileEditorHarness />);

    const capex2021 = page.getByRole("textbox").nth(2);
    await expect(page.getByTestId("cost-schedule-ready")).toHaveText("ready");

    await capex2021.fill("50");
    await capex2021.blur();
    await expect(page.getByTestId("cost-schedule-ready")).toHaveText("pending");
    await expect(page.getByTestId("committed-cost-profile")).toHaveText('[{"year":2020,"capex":100,"opex":0}]');

    await expect(page.getByTestId("cost-schedule-ready")).toHaveText("ready", { timeout: 2_000 });
    await expect(page.getByTestId("committed-cost-profile")).toHaveText(
        '[{"year":2020,"capex":100,"opex":0},{"year":2021,"capex":50,"opex":0}]',
    );
});

test("revalidates signed Delta costs when switched to a regular ensemble", async ({ mount, page }) => {
    const component = await mount(<CostProfileEditorHarness initialCostProfile={[{ year: 2020, capex: -100, opex: 0 }]} isDelta />);

    await expect(page.getByTestId("cost-schedule-ready")).toHaveText("ready");
    await component.update(<CostProfileEditorHarness initialCostProfile={[{ year: 2020, capex: -100, opex: 0 }]} isDelta={false} />);

    await expect(page.getByTestId("cost-schedule-ready")).toHaveText("pending");
    await expect(page.getByText("Investment and operating costs must be zero or greater.")).toBeVisible();
});

test("generates read-only calendar years without locale grouping and keeps excluded costs", async ({ mount, page }) => {
    await mount(
        <CostProfileEditorHarness
            initialCostProfile={[
                { year: 2016, capex: 7, opex: 0 },
                { year: 2018, capex: 0, opex: 0 },
            ]}
            startYear={2018}
            endYear={2019}
        />,
    );

    await expect(page.getByRole("cell", { name: "2018", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "2019", exact: true })).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveCount(4);
    await expect(page.getByText("Costs entered for 2016 are outside 2018-2019. They are kept but not used.")).toBeVisible();
    await expect(page.getByTestId("committed-cost-profile")).toContainText('{"year":2016,"capex":7,"opex":0}');
});

test("rejects a pasted year outside the generated cost years", async ({ mount, page }) => {
    await mount(<CostProfileEditorHarness />);

    const capex2020 = page.getByRole("textbox").first();
    await capex2020.focus();
    await page.evaluate(() => {
        const data = new DataTransfer();
        data.setData("text", "2021\t10\t1\n2030\t5\t0");
        document.activeElement?.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true }));
    });

    await expect(page.getByRole("alert")).toHaveText("Pasted year 2030 is outside the cost years 2020-2022.");
    await expect(page.getByTestId("committed-cost-profile")).toHaveText('[{"year":2020,"capex":100,"opex":0}]');
});
