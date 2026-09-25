import { CostProfileEditorHarness } from "./support/CostProfileEditorHarness";
import { expect, test } from "./support/offlineComponentTest";

test("previews year-keyed costs without committing until Apply", async ({ mount, page }) => {
    await mount(
        <CostProfileEditorHarness
            initialCostProfile={[
                { year: 2016, capex: 7, opex: 0 },
                { year: 2020, capex: 100, opex: 20 },
                { year: 2021, capex: 30, opex: 2 },
            ]}
        />,
    );
    const committed = page.getByTestId("committed-cost-profile");
    const original = await committed.textContent();
    await page.getByRole("button", { name: "Paste costs...", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Paste costs", exact: true });
    await expect(dialog.getByRole("button", { name: "Apply", exact: true })).toBeDisabled();
    await dialog.getByRole("textbox").fill("2022\t50\t5\n2020\t\t10");
    await expect(dialog.getByRole("table", { name: "Cost paste preview" })).toBeVisible();
    await expect(committed).toHaveText(original!);
    await expect(page.getByTestId("cost-schedule-ready")).toHaveText("ready");
    await dialog.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(committed).toHaveText(
        '[{"year":2016,"capex":7,"opex":0},{"year":2020,"capex":0,"opex":10},{"year":2021,"capex":30,"opex":2},{"year":2022,"capex":50,"opex":5}]',
    );
});

test("rejects malformed, duplicate, excluded and negative regular paste without changing costs", async ({
    mount,
    page,
}) => {
    await mount(<CostProfileEditorHarness />);
    const original = await page.getByTestId("committed-cost-profile").textContent();
    await page.getByRole("button", { name: "Paste costs...", exact: true }).click();
    const dialog = page.getByRole("dialog");
    for (const [text, error] of [
        ["Year\tCAPEX\tOPEX", "numeric costs"],
        ["2020\t1", "three tab-separated columns"],
        ["2020\t1,000\t0", "numeric costs"],
        ["2020\t1\t0\n2020\t2\t0", "appears more than once"],
        ["2019\t1\t0", "outside the cost years"],
        ["2020\t-1\t0", "zero or greater"],
    ]) {
        await dialog.getByRole("textbox").fill(text);
        await expect(dialog.getByRole("alert")).toContainText(error);
        await expect(dialog.getByRole("button", { name: "Apply", exact: true })).toBeDisabled();
        await expect(page.getByTestId("committed-cost-profile")).toHaveText(original!);
        await expect(page.getByTestId("cost-schedule-ready")).toHaveText("ready");
    }
});

test("Cancel and Escape discard a valid preview and restore focus", async ({ mount, page }) => {
    await mount(<CostProfileEditorHarness />);
    const original = await page.getByTestId("committed-cost-profile").textContent();
    const trigger = page.getByRole("button", { name: "Paste costs...", exact: true });
    for (const action of ["Cancel", "Escape"]) {
        await trigger.click();
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("textbox").fill("2020\t3\t4");
        await expect(dialog.getByRole("table")).toBeVisible();
        if (action === "Cancel") await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
        else await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await expect(page.getByTestId("committed-cost-profile")).toHaveText(original!);
    }
    await trigger.click();
    await expect(page.getByRole("dialog").getByRole("textbox")).toHaveValue("");
});

test("revalidates a preview against changed years, loading and ensemble identity", async ({ mount, page }) => {
    const component = await mount(<CostProfileEditorHarness />);
    const original = await page.getByTestId("committed-cost-profile").textContent();
    await page.getByRole("button", { name: "Paste costs...", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").fill("2022\t3\t4");
    await expect(dialog.getByRole("button", { name: "Apply", exact: true })).toBeEnabled();
    await component.update(<CostProfileEditorHarness endYear={2021} />);
    await expect(dialog.getByRole("alert")).toContainText("outside the cost years 2020-2021");
    await expect(dialog.getByRole("button", { name: "Apply", exact: true })).toBeDisabled();
    await component.update(<CostProfileEditorHarness isHorizonLoading />);
    await expect(dialog.getByRole("alert")).toContainText("Cost years must be available");
    await component.update(<CostProfileEditorHarness ensembleKey="regular-b" />);
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Paste costs...", exact: true }).click();
    await expect(dialog.getByRole("textbox")).toHaveValue("");
    await expect(page.getByTestId("committed-cost-profile")).toHaveText(original!);
    await dialog.getByRole("textbox").fill("2020\t3\t4");
    await component.update(<CostProfileEditorHarness ensembleKey="regular-b" startYear={null} />);
    await expect(dialog).toHaveCount(0);
    await component.update(<CostProfileEditorHarness ensembleKey="regular-b" />);
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Paste costs...", exact: true }).click();
    await expect(dialog.getByRole("textbox")).toHaveValue("");
    await expect(page.getByTestId("committed-cost-profile")).toHaveText(original!);
});

test("allows signed delta preview but revalidates when the cost rules change", async ({ mount, page }) => {
    const component = await mount(<CostProfileEditorHarness isDelta />);
    await page.getByRole("button", { name: "Paste costs...", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").fill("2020\t-40\t-5");
    await expect(dialog.getByRole("button", { name: "Apply", exact: true })).toBeEnabled();
    await component.update(<CostProfileEditorHarness isDelta={false} />);
    await expect(dialog.getByRole("button", { name: "Apply", exact: true })).toBeDisabled();
    await component.update(<CostProfileEditorHarness isDelta />);
    await dialog.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(page.getByTestId("committed-cost-profile")).toHaveText('[{"year":2020,"capex":-40,"opex":-5}]');
});

test("names each editable cost input by its year and shows no step buttons", async ({ mount, page }) => {
    await mount(<CostProfileEditorHarness />);

    await expect(page.getByRole("textbox", { name: "CAPEX 2020", exact: true })).toHaveValue("100");
    await expect(page.getByRole("button", { name: /^(Increase|Decrease)$/ })).toHaveCount(0);
    const opex2021 = page.getByRole("textbox", { name: "OPEX 2021", exact: true });
    await opex2021.click();
    await page.keyboard.type("1250.5");
    await opex2021.blur();
    await expect(opex2021).toHaveValue("1,250.5");
    await expect(page.getByTestId("committed-cost-profile")).toHaveText(
        '[{"year":2020,"capex":100,"opex":0},{"year":2021,"capex":0,"opex":1250.5}]',
        { timeout: 2_000 },
    );
    await page.keyboard.press("Tab");
    await expect(page.getByRole("textbox", { name: "CAPEX 2022", exact: true })).toBeFocused();
});

test("accepts signed delta costs typed into a field without step buttons", async ({ mount, page }) => {
    await mount(<CostProfileEditorHarness isDelta />);

    const capex2021 = page.getByRole("textbox", { name: "CAPEX 2021", exact: true });
    await capex2021.click();
    await page.keyboard.type("-40");
    await capex2021.blur();
    await expect(page.getByTestId("committed-cost-profile")).toHaveText(
        '[{"year":2020,"capex":100,"opex":0},{"year":2021,"capex":-40,"opex":0}]',
        { timeout: 2_000 },
    );
    await expect(page.getByRole("status").filter({ hasText: "No non-zero costs included." })).toHaveCount(0);
});

test("shows neutral zero-cost context until an included cost is entered", async ({ mount, page }) => {
    const zeroNotice = page.getByRole("status").filter({ hasText: "No non-zero costs included." });
    await mount(<CostProfileEditorHarness initialCostProfile={[]} />);
    await expect(zeroNotice).toBeVisible();

    const opex2020 = page.getByRole("textbox", { name: "OPEX 2020", exact: true });
    await opex2020.click();
    await page.keyboard.type("5");
    await opex2020.blur();
    await expect(zeroNotice).toHaveCount(0);
});

test("does not count an excluded stored entry as an included cost", async ({ mount, page }) => {
    await mount(<CostProfileEditorHarness initialCostProfile={[{ year: 2016, capex: 7, opex: 0 }]} />);
    await expect(page.getByRole("status").filter({ hasText: "No non-zero costs included." })).toBeVisible();
    await expect(
        page.getByText("Costs entered for 2016 are outside 2020-2022. They are kept but not used."),
    ).toBeVisible();
});

test("does not treat signed cancellation or an invalid draft as zero costs", async ({ mount, page }) => {
    const zeroNotice = page.getByRole("status").filter({ hasText: "No non-zero costs included." });
    const component = await mount(
        <CostProfileEditorHarness
            isDelta
            initialCostProfile={[
                { year: 2020, capex: 100, opex: 0 },
                { year: 2021, capex: -100, opex: 0 },
            ]}
        />,
    );
    await expect(page.getByRole("textbox", { name: "CAPEX 2021", exact: true })).toHaveValue("-100");
    await expect(zeroNotice).toHaveCount(0);

    await component.update(
        <CostProfileEditorHarness
            isDelta={false}
            initialCostProfile={[
                { year: 2020, capex: 100, opex: 0 },
                { year: 2021, capex: -100, opex: 0 },
            ]}
        />,
    );
    await expect(page.getByRole("alert")).toHaveText("Investment and operating costs must be zero or greater.");
    await expect(zeroNotice).toHaveCount(0);
});

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
    const component = await mount(
        <CostProfileEditorHarness initialCostProfile={[{ year: 2020, capex: -100, opex: 0 }]} isDelta />,
    );

    await expect(page.getByTestId("cost-schedule-ready")).toHaveText("ready");
    await component.update(
        <CostProfileEditorHarness initialCostProfile={[{ year: 2020, capex: -100, opex: 0 }]} isDelta={false} />,
    );

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
    await expect(
        page.getByText("Costs entered for 2016 are outside 2018-2019. They are kept but not used."),
    ).toBeVisible();
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
