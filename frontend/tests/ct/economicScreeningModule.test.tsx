import type { Page } from "@playwright/test";

import { EARLY_MEASURE_CHANNEL_ID_MAP, MEASURE_CHANNEL_ID_MAP } from "@modules/EconomicScreening/channelDefs";
import {
    CashFlowProfileType,
    EarlyEconomicMeasure,
    EconomicMeasure,
    ResultMode,
} from "@modules/EconomicScreening/typesAndEnums";

import { makeSeriesFromMonthlyVolumes } from "./support/economicScreeningConnectedFixtures";
import { EconomicScreeningModuleHarness } from "./support/EconomicScreeningModuleHarness";
import { expect, test } from "./support/offlineComponentTest";

const REALIZATIONS = [3, 8, 21];
const SCREENSHOT_DIR = "test-results/economic-screening-b2";

// Full Settings and View mounts with plotly exceed the 10 s default when the machine is loaded.
test.describe.configure({ timeout: 30_000 });

type SourceFixtureState = {
    vectorDataRequests: string[];
    unexpectedApiRequests: string[];
};

function monthStartUtcMs(year: number, month: number): number {
    return Date.UTC(year, month - 1, 1);
}

/**
 * API-shaped monthly cumulative series for 2030-2031 with source-aligned coverage. With
 * `partialLastMonth`, the source ends mid-December 2031, so that month is only partly covered.
 */
function monthlySeries(realization: number, monthlyVolume: number, partialLastMonth = false) {
    const timestampsUtcMs = Array.from({ length: 25 }, (_, index) => monthStartUtcMs(2030, index + 1));
    const values = [0];
    for (let month = 0; month < 24; month++) {
        values.push(values[month] + monthlyVolume * (1 + (month % 12) / 24));
    }
    const sourceEnd = partialLastMonth ? timestampsUtcMs[23] + 15 * 86_400_000 : timestampsUtcMs[24];
    return {
        realization,
        unit: "SM3",
        isRate: false,
        timestampsUtcMs,
        values,
        sourceCoverage: {
            interpolationMethod: "LINEAR",
            sources: [
                {
                    role: "REGULAR",
                    firstTimestampUtcMs: timestampsUtcMs[0],
                    lastTimestampUtcMs: sourceEnd,
                    sampleCount: 25,
                    maxSampleGapMs: 31 * 86_400_000,
                },
            ],
            intervals: timestampsUtcMs.slice(0, 24).map((start, index) => {
                const isPartial = partialLastMonth && index === 23;
                return {
                    status: isPartial ? "PARTIAL" : "SOURCE_ALIGNED",
                    supportedStartUtcMs: start,
                    supportedEndUtcMs: isPartial ? sourceEnd : timestampsUtcMs[index + 1],
                };
            }),
        },
    };
}

/** Serves the module's own API requests from fixtures on the loopback component-test origin. */
async function routeSourceFixtures(
    page: Page,
    options: {
        failSalesGas?: boolean;
        partialOilRealization?: number;
        vectorNames?: string[];
        seriesFor?: (vectorName: string) => unknown[];
    } = {},
): Promise<SourceFixtureState> {
    const state: SourceFixtureState = { vectorDataRequests: [], unexpectedApiRequests: [] };
    // Registered first so the specific fixture routes below take precedence.
    await page.route(
        (url) => url.pathname.startsWith("/api/"),
        (route) => {
            state.unexpectedApiRequests.push(route.request().url());
            return route.abort();
        },
    );
    await page.route(
        (url) => url.pathname.startsWith("/api/timeseries/vector_list/"),
        (route) =>
            route.fulfill({
                json: (options.vectorNames ?? ["FOPT", "FGST"]).map((name) => ({
                    name,
                    descriptiveName: name,
                    hasHistorical: false,
                })),
            }),
    );
    await page.route(
        (url) => url.pathname.startsWith("/api/timeseries/realizations_vector_data/"),
        (route) => {
            const url = new URL(route.request().url());
            const vectorName = url.searchParams.get("vector_name") ?? "";
            if (!(options.vectorNames ?? ["FOPT", "FGST"]).includes(vectorName)) {
                state.unexpectedApiRequests.push(route.request().url());
                return route.abort();
            }
            state.vectorDataRequests.push(vectorName);
            if (options.failSalesGas && vectorName === "FGST") {
                return route.fulfill({ status: 500, json: { detail: "fixture failure" } });
            }
            if (options.seriesFor) {
                return route.fulfill({ json: options.seriesFor(vectorName) });
            }
            const monthlyVolume = vectorName === "FOPT" ? 100 : vectorName === "FGIT" ? 2_000 : 20_000;
            return route.fulfill({
                json: REALIZATIONS.map((realization, index) =>
                    monthlySeries(
                        realization,
                        monthlyVolume * (1 + index / 4),
                        vectorName === "FOPT" && realization === options.partialOilRealization,
                    ),
                ),
            });
        },
    );
    return state;
}

function viewRegion(page: Page) {
    return page.getByRole("region", { name: "Module view" });
}

function settingsRegion(page: Page) {
    return page.getByRole("region", { name: "Module settings" });
}

const MODE_LABELS = ["Distribution", "Time profile", "All results"] as const;

function modeRadio(page: Page, label: (typeof MODE_LABELS)[number]) {
    return settingsRegion(page).getByRole("radiogroup", { name: "Show" }).getByRole("radio", { name: label });
}

function realizationCombobox(page: Page) {
    return settingsRegion(page).getByRole("combobox", { name: "Realization" });
}

async function expectNoConfigurationInputsInView(page: Page) {
    const view = viewRegion(page);
    for (const role of ["combobox", "radio", "radiogroup", "textbox", "spinbutton", "checkbox", "listbox"] as const) {
        await expect(view.getByRole(role)).toHaveCount(0);
    }
}

async function expectWholeYearTicks(page: Page) {
    const ticks = viewRegion(page).locator(".xtick text");
    await expect(ticks.first()).toBeVisible();
    expect(await ticks.allTextContents()).toEqual(["2030", "2031"]);
}

async function waitForPlottedData(page: Page) {
    await expect(viewRegion(page).locator(".scatterlayer .trace path, .scatterlayer .point").first()).toBeVisible({
        timeout: 5_000,
    });
}

/** Distance between the bottom of the plot and the bottom of the view; a leftover reservation shows up here. */
async function plotBottomGap(page: Page): Promise<number> {
    const view = await viewRegion(page).boundingBox();
    const plot = await viewRegion(page).locator(".main-svg").first().boundingBox();
    return view!.y + view!.height - (plot!.y + plot!.height);
}

type Box = { x: number; y: number; width: number; height: number };

function overlaps(first: Box, second: Box): boolean {
    return (
        first.x < second.x + second.width &&
        second.x < first.x + first.width &&
        first.y < second.y + second.height &&
        second.y < first.y + first.height
    );
}

/** The legend must not cover any year tick or the axis title, and must stay inside the plot. */
async function expectLegendClearOfYearAxis(page: Page) {
    const view = viewRegion(page);
    const legend = (await view.locator(".legend").first().boundingBox())!;
    const plot = (await view.locator(".main-svg").first().boundingBox())!;
    const axisLabels = [...(await view.locator(".xtick text").all()), view.locator(".xtitle").first()];
    expect(axisLabels.length).toBeGreaterThan(2);
    for (const label of axisLabels) {
        const labelBox = (await label.boundingBox())!;
        expect(overlaps(legend, labelBox), `legend covers "${await label.textContent()}"`).toBe(false);
    }
    expect(legend.x).toBeGreaterThanOrEqual(plot.x);
    expect(legend.y).toBeGreaterThanOrEqual(plot.y);
    expect(legend.x + legend.width).toBeLessThanOrEqual(plot.x + plot.width);
    expect(legend.y + legend.height).toBeLessThanOrEqual(plot.y + plot.height);
}

async function selectRealizationWithKeyboard(page: Page, realization: number) {
    await realizationCombobox(page).click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type(String(realization));
    await expect(page.getByRole("option", { name: String(realization), exact: true })).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(realizationCombobox(page)).toHaveValue(String(realization));
}

type PublishedChannel = { channelIdString: string; contents: { key: unknown; value: unknown }[][] };

async function readPublishedChannels(page: Page): Promise<PublishedChannel[]> {
    return page.evaluate(() =>
        (
            window as unknown as { readEconomicScreeningChannels: () => PublishedChannel[] }
        ).readEconomicScreeningChannels(),
    );
}

test("keeps every result control in Settings and plots data in a configuration-free view", async ({
    mount,
    page,
    blockedExternalRequests,
}) => {
    const fixtures = await routeSourceFixtures(page);
    await page.setViewportSize({ width: 1320, height: 700 });
    await mount(<EconomicScreeningModuleHarness settingsOpen viewWidth={900} viewHeight={640} />);

    await waitForPlottedData(page);
    await expectNoConfigurationInputsInView(page);
    const settings = settingsRegion(page);
    await expect(modeRadio(page, "Distribution")).toBeChecked();
    await expect(settings.getByRole("radiogroup", { name: "Show" }).getByRole("radio")).toHaveCount(3);
    for (const label of MODE_LABELS) {
        await expect(modeRadio(page, label)).toHaveAccessibleName(label);
    }
    await expect(settings.getByText("Measure", { exact: true })).toBeVisible();
    await expect(settings.getByText("Plot type", { exact: true })).toBeVisible();
    // Cost years are generated from the Settings-side horizon without locale grouping.
    await expect(settings.getByRole("cell", { name: "2031", exact: true })).toBeVisible();
    expect(await plotBottomGap(page)).toBeLessThan(24);
    expect(fixtures.vectorDataRequests.sort()).toEqual(["FGST", "FOPT"]);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/desktop-distribution.png` });

    await modeRadio(page, "Distribution").focus();
    await page.keyboard.press("ArrowRight");
    await expect(modeRadio(page, "Time profile")).toBeChecked();
    await expect(modeRadio(page, "Time profile")).toBeFocused();
    await expect(modeRadio(page, "Distribution")).not.toBeChecked();
    await waitForPlottedData(page);
    await expectWholeYearTicks(page);
    await expectNoConfigurationInputsInView(page);

    const realization = realizationCombobox(page);
    await realization.click();
    await page.keyboard.type("21");
    await expect(page.getByRole("option", { name: "21", exact: true })).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(viewRegion(page).getByText("Realization 21")).toBeVisible();
    await expectLegendClearOfYearAxis(page);
    const lastPoint = await viewRegion(page).locator(".scatterlayer .point").last().boundingBox();
    await page.mouse.move(lastPoint!.x + lastPoint!.width / 2, lastPoint!.y + lastPoint!.height / 2);
    await expect(viewRegion(page).locator(".hoverlayer")).toContainText("2031");
    await expect(viewRegion(page).locator(".hoverlayer")).not.toContainText("2,031");
    expect(await plotBottomGap(page)).toBeLessThan(24);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/desktop-time-profile.png` });

    await modeRadio(page, "All results").click();
    const selectedRow = viewRegion(page).locator('tr[aria-current="true"]');
    await expect(selectedRow).toHaveCount(1);
    await expect(selectedRow.getByRole("cell").first()).toHaveText("21");
    await viewRegion(page).getByRole("cell", { name: "8", exact: true }).click();
    await expect(selectedRow.getByRole("cell").first()).toHaveText("21");
    await expect(realizationCombobox(page)).toHaveValue("21");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/desktop-all-results.png` });

    expect(fixtures.vectorDataRequests).toHaveLength(2);
    expect(blockedExternalRequests).toEqual(["https://cdn.eds.equinor.com/font/equinor-font.css"]);
});

test("preserves choices and requests when Settings closes and reopens", async ({ mount, page }) => {
    const fixtures = await routeSourceFixtures(page);
    await page.setViewportSize({ width: 1320, height: 700 });
    const component = await mount(<EconomicScreeningModuleHarness settingsOpen viewWidth={900} viewHeight={640} />);
    await waitForPlottedData(page);
    await modeRadio(page, "Time profile").click();
    await waitForPlottedData(page);

    await component.update(<EconomicScreeningModuleHarness settingsOpen={false} viewWidth={900} viewHeight={640} />);
    await expect(settingsRegion(page)).toHaveCount(0);
    await expectWholeYearTicks(page);

    await component.update(<EconomicScreeningModuleHarness settingsOpen viewWidth={900} viewHeight={640} />);
    await expect(modeRadio(page, "Time profile")).toBeChecked();
    await expect(settingsRegion(page).getByRole("cell", { name: "2031", exact: true })).toBeVisible();
    await waitForPlottedData(page);
    expect(fixtures.vectorDataRequests).toHaveLength(2);
});

test("keeps title, context and plotted data visible in a narrow view", async ({ mount, page }) => {
    await routeSourceFixtures(page);
    await page.setViewportSize({ width: 720, height: 600 });
    await mount(<EconomicScreeningModuleHarness settingsOpen viewWidth={360} viewHeight={520} />);

    await waitForPlottedData(page);
    await expectNoConfigurationInputsInView(page);
    await expect(viewRegion(page).getByText("Economic screening - Screening")).toBeVisible();
    await expect(viewRegion(page).getByText(/Discount rate 8%/)).toBeVisible();
    const plot = await viewRegion(page).locator(".main-svg").first().boundingBox();
    expect(plot!.width).toBeLessThanOrEqual(360);
    expect(plot!.height).toBeGreaterThanOrEqual(200);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/narrow-distribution.png` });
});

test("shows an unavailable state, not zero results, when a source request fails", async ({ mount, page }) => {
    await routeSourceFixtures(page, { failSalesGas: true });
    await mount(<EconomicScreeningModuleHarness settingsOpen viewWidth={900} viewHeight={640} />);

    await expect(
        viewRegion(page).getByText(
            "Select an ensemble with oil or sales-gas production data to compute economic results.",
        ),
    ).toBeVisible({ timeout: 5_000 });
    await expect(viewRegion(page).locator(".main-svg")).toHaveCount(0);
    await expect(settingsRegion(page).getByRole("cell", { name: "2031", exact: true })).toHaveCount(0);
    await expectNoConfigurationInputsInView(page);
});

test("names currency options by their values and selects them with arrow keys", async ({ mount, page }) => {
    await routeSourceFixtures(page);
    await mount(<EconomicScreeningModuleHarness settingsOpen viewWidth={900} viewHeight={640} />);

    const currency = settingsRegion(page).getByRole("radiogroup", { name: "Currency" });
    const nok = currency.getByRole("radio", { name: "NOK" });
    const usd = currency.getByRole("radio", { name: "USD" });
    await expect(currency.getByRole("radio")).toHaveCount(2);
    await expect(nok).toHaveAccessibleName("NOK");
    await expect(usd).toHaveAccessibleName("USD");
    await expect(usd).toBeChecked();

    await usd.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(nok).toBeChecked();
    await expect(nok).toBeFocused();
    await expect(settingsRegion(page).getByText("Oil price [NOK per Sm³]")).toBeVisible();
});

test("keeps the time-profile legend clear of the year axis in a narrow view", async ({ mount, page }) => {
    await routeSourceFixtures(page);
    await page.setViewportSize({ width: 720, height: 600 });
    await mount(<EconomicScreeningModuleHarness settingsOpen viewWidth={360} viewHeight={520} />);
    await waitForPlottedData(page);

    await modeRadio(page, "Time profile").click();
    await selectRealizationWithKeyboard(page, 21);
    await expect(viewRegion(page).getByText("Realization 21", { exact: true })).toBeVisible();
    await expectWholeYearTicks(page);
    await expectLegendClearOfYearAxis(page);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/narrow-time-profile.png` });
});

test("shows a selected realization without complete profile data as unavailable", async ({ mount, page }) => {
    const fixtures = await routeSourceFixtures(page, { partialOilRealization: 21 });
    await page.setViewportSize({ width: 1320, height: 700 });
    await mount(<EconomicScreeningModuleHarness settingsOpen viewWidth={900} viewHeight={640} />);
    await waitForPlottedData(page);
    await modeRadio(page, "Time profile").click();
    await waitForPlottedData(page);
    const view = viewRegion(page);
    const publishedBefore = await readPublishedChannels(page);
    const traceCountBefore = await view.locator(".scatterlayer .trace").count();

    await selectRealizationWithKeyboard(page, 21);

    await expect(view.getByRole("status")).toHaveText(
        "Realization 21 has no complete data for this profile; showing the aggregate only.",
    );
    await expect(view.locator(".legend").getByText("P50", { exact: true })).toBeVisible();
    await expect(view.getByText("Realization 21", { exact: true })).toHaveCount(0);
    await expect(view.locator(".scatterlayer .trace")).toHaveCount(traceCountBefore);
    expect(await readPublishedChannels(page)).toEqual(publishedBefore);
    const keysOf = (measure: EconomicMeasure) =>
        publishedBefore
            .find((channel) => channel.channelIdString === MEASURE_CHANNEL_ID_MAP[measure])!
            .contents.flat()
            .map((element) => element.key);
    // Realization 21 keeps its valid gas result and lacks only the results that need complete oil.
    expect(keysOf(EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME)).toEqual([3, 8, 21]);
    expect(keysOf(EconomicMeasure.DISCOUNTED_OIL_VOLUME)).toEqual([3, 8]);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/desktop-time-profile-unavailable.png` });

    await selectRealizationWithKeyboard(page, 8);
    await expect(view.getByRole("status")).toHaveCount(0);
    await expect(view.getByText("Realization 8", { exact: true })).toBeVisible();
    await expect(view.locator(".scatterlayer .trace")).toHaveCount(traceCountBefore + 1);
    expect(await readPublishedChannels(page)).toEqual(publishedBefore);
    expect(fixtures.vectorDataRequests).toHaveLength(2);
});

// --- Domain/UX pass: setup guidance, prediction-year selection, early value and cost fields. ---
const UX_SCREENSHOT_DIR = "test-results/economic-screening-ux";

function setupStatus(page: Page) {
    return settingsRegion(page).getByRole("status", { name: "Setup status" });
}

async function setupItems(page: Page): Promise<string[]> {
    const details = setupStatus(page).locator("details");
    if ((await details.count()) && !(await details.evaluate((element) => element.hasAttribute("open")))) {
        await details.locator("summary").click();
    }
    return (await setupStatus(page).getByRole("listitem").allTextContents()).map((text) => text.trim());
}

test("keeps compact setup status visible and reveals a closed field section", async ({ mount, page }) => {
    const fixtures = await routeSourceFixtures(page);
    await mount(
        <EconomicScreeningModuleHarness
            settingsOpen
            viewWidth={900}
            viewHeight={640}
            initialState={{ predictionStartYear: null }}
        />,
    );
    const settings = settingsRegion(page);
    const status = setupStatus(page);
    await expect(status.locator("summary")).toContainText("1 issue for");
    await settings.getByRole("button", { name: "Data and valuation", exact: true }).click();
    await settings.locator("[data-collapsible-scroll-area]").evaluate((element) => {
        element.scrollTop = element.scrollHeight;
    });
    await expect(status).toBeInViewport();
    await status.locator("summary").click();
    await status.getByRole("button", { name: "Enter a prediction start year." }).click();
    const year = settings.getByRole("combobox", { name: "Prediction start year", exact: true });
    await expect(year).toBeFocused();
    await expect(year).toBeInViewport();
    await page.keyboard.type("2030");
    await page.keyboard.press("Tab");
    await expect(status).toHaveText("Setup ready");
    await expect(status.locator("details")).toHaveCount(0);
    expect(fixtures.vectorDataRequests.sort()).toEqual(["FGST", "FOPT"]);
    expect(fixtures.unexpectedApiRequests).toEqual([]);
});

for (const layout of [
    { name: "desktop", width: 1320, settingsWidth: 400, viewWidth: 880 },
    { name: "narrow", width: 720, settingsWidth: 320, viewWidth: 360 },
]) {
    test(`separates optional early cash flow from break-even in ${layout.name} Settings`, async ({ mount, page }) => {
        const fixtures = await routeSourceFixtures(page, { vectorNames: ["FOPT", "FGPT", "FGIT"] });
        await page.setViewportSize({ width: layout.width, height: 700 });
        await mount(
            <EconomicScreeningModuleHarness
                settingsOpen
                settingsWidth={layout.settingsWidth}
                viewWidth={layout.viewWidth}
                viewHeight={640}
                initialState={{
                    gasPrice: 0,
                    costProfile: [{ year: 2030, capex: 1000, opex: 0 }],
                    selectedMeasure: EconomicMeasure.BREAK_EVEN_OIL_PRICE,
                    earlyValue: { enabled: true, endYear: null },
                }}
            />,
        );
        const settings = settingsRegion(page);
        const status = setupStatus(page);
        await expect.poll(() => setupItems(page)).toEqual(["Early value: enter a Calculate through year."]);
        await expect(status.locator("summary")).toHaveText("Optional early comparison");
        await expect(status).toContainText("full results unchanged");
        await expect
            .poll(
                async () =>
                    channelEntries(
                        await readPublishedChannels(page),
                        MEASURE_CHANNEL_ID_MAP[EconomicMeasure.BREAK_EVEN_OIL_PRICE],
                    ).length,
            )
            .toBe(3);
        const fullBefore = (await readPublishedChannels(page)).filter((channel) =>
            Object.values(MEASURE_CHANNEL_ID_MAP).includes(channel.channelIdString),
        );
        await expect(settings.getByRole("button", { name: "Advanced", exact: true })).toHaveCount(0);
        await expect(
            settings.getByText("Gas revenue excluded; gas-volume outputs still require resolved gas data."),
        ).toBeVisible();
        await expect(settings.getByRole("checkbox", { name: "Assume no gas consumption" })).not.toBeChecked();

        for (const label of ["Discount rate [%]", "Oil price [USD per Sm³]", "Gas price [USD per Sm³]"]) {
            const input = settings.getByRole("textbox", { name: label, exact: true });
            await input.scrollIntoViewIfNeeded();
            const labelBox = (await settings.getByText(label, { exact: true }).boundingBox())!;
            const inputBox = (await input.boundingBox())!;
            expect(labelBox.y + labelBox.height).toBeLessThanOrEqual(inputBox.y);
            expect(await input.evaluate((element) => getComputedStyle(element).textAlign)).toBe("right");
        }
        const section = settings.getByRole("button", { name: "Early cash-flow comparison", exact: true });
        await section.click();
        await status.getByRole("button", { name: "Early value: enter a Calculate through year.", exact: true }).click();
        const throughYear = settings.getByRole("textbox", { name: "Calculate through year", exact: true });
        await expect(throughYear).toBeFocused();
        await expect(throughYear).toBeInViewport();
        await expect(status).toBeInViewport();
        expect((await status.boundingBox())!.height).toBeLessThanOrEqual((await settings.boundingBox())!.height * 0.4);
        expect(await fitsHorizontally(status)).toBe(true);
        await page.screenshot({
            path: `test-results/economic-screening-presentation/${layout.name}-optional-status.png`,
        });
        await page.keyboard.type("2030");
        await page.keyboard.press("Tab");
        await expect(status).toHaveText("Setup ready");
        await expect(earlyComparison(page)).toContainText("Early discounted cash flow");
        await expect(earlyComparison(page)).not.toContainText("Break-even");
        expect(
            (await readPublishedChannels(page)).filter((channel) =>
                Object.values(MEASURE_CHANNEL_ID_MAP).includes(channel.channelIdString),
            ),
        ).toEqual(fullBefore);
        await settings.getByRole("checkbox", { name: "Early value", exact: true }).uncheck();
        await expect(earlyComparison(page)).toHaveCount(0);
        await expect
            .poll(async () =>
                (await readPublishedChannels(page))
                    .filter((channel) => Object.values(EARLY_MEASURE_CHANNEL_ID_MAP).includes(channel.channelIdString))
                    .flatMap((channel) => channel.contents.flat()),
            )
            .toEqual([]);
        expect(
            (await readPublishedChannels(page)).filter((channel) =>
                Object.values(MEASURE_CHANNEL_ID_MAP).includes(channel.channelIdString),
            ),
        ).toEqual(fullBefore);
        expect(fixtures.vectorDataRequests.sort()).toEqual(["FGIT", "FGPT", "FOPT"]);
        expect(fixtures.unexpectedApiRequests).toEqual([]);
    });
}

/** Base UI keeps the previous filter if a single combobox is reopened before its close has completed. */
async function expectPopupClosed(page: Page) {
    await expect(page.getByRole("listbox")).toHaveCount(0);
}

async function typeAndTabAway(page: Page, input: ReturnType<Page["getByRole"]>, year: string) {
    await input.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type(year);
    await page.keyboard.press("Tab");
}

test("lists every known NPV setup requirement together before any price edit", async ({ mount, page }) => {
    const fixtures = await routeSourceFixtures(page, { vectorNames: ["FOPT", "FGPT", "FGIT"] });
    await page.setViewportSize({ width: 1320, height: 700 });
    await mount(
        <EconomicScreeningModuleHarness
            settingsOpen
            viewWidth={900}
            viewHeight={640}
            initialState={{
                predictionStartYear: null,
                oilPrice: null,
                gasPrice: null,
                selectedMeasure: EconomicMeasure.NPV,
            }}
        />,
    );

    await expect(setupStatus(page)).toContainText("Needed for net present value");
    await expect
        .poll(() => setupItems(page))
        .toEqual([
            "Enter a prediction start year.",
            "Enter an oil price, or 0 to omit oil revenue.",
            "Enter a gas price, or 0 to omit gas revenue.",
            "Gas consumption (FGCT) is missing: accept “Assume no gas consumption” or enter a gas price of 0.",
        ]);
    await page.screenshot({ path: `${UX_SCREENSHOT_DIR}/desktop-initial-setup.png` });

    const settings = settingsRegion(page);
    const oilPrice = settings.getByRole("textbox", { name: /^Oil price/ });
    const gasPrice = settings.getByRole("textbox", { name: /^Gas price/ });
    await oilPrice.fill("50");
    await oilPrice.blur();
    await expect
        .poll(() => setupItems(page))
        .toEqual([
            "Enter a prediction start year.",
            "Enter a gas price, or 0 to omit gas revenue.",
            "Gas consumption (FGCT) is missing: accept “Assume no gas consumption” or enter a gas price of 0.",
        ]);

    // Zero gas price resolves gas revenue only; sales-gas volume still needs the missing component.
    await gasPrice.fill("0");
    await gasPrice.blur();
    await expect.poll(() => setupItems(page)).toEqual(["Enter a prediction start year."]);
    await expect(settings.getByRole("checkbox", { name: "Assume no gas consumption" })).not.toBeChecked();

    await settings.getByRole("combobox", { name: "Measure" }).click();
    await page.getByRole("option", { name: "Discounted sales gas volume" }).click();
    await expect(setupStatus(page)).toContainText("Needed for discounted sales gas volume");
    await expect
        .poll(() => setupItems(page))
        .toEqual([
            "Enter a prediction start year.",
            "Gas consumption (FGCT) is missing: accept “Assume no gas consumption” to calculate sales gas.",
        ]);
    await settings.getByRole("combobox", { name: "Measure" }).click();
    await page.getByRole("option", { name: "Break-even oil price" }).click();
    await expect(setupStatus(page)).toContainText("Needed for break-even oil price");
    await expect.poll(() => setupItems(page)).toEqual(["Enter a prediction start year."]);
    expect(fixtures.vectorDataRequests.sort()).toEqual(["FGIT", "FGPT", "FOPT"]);
    expect(fixtures.unexpectedApiRequests).toEqual([]);
});

test("applies an explicit missing-component assumption to gas revenue without auto-accepting it", async ({
    mount,
    page,
}) => {
    const fixtures = await routeSourceFixtures(page, { vectorNames: ["FOPT", "FGPT", "FGIT"] });
    await mount(
        <EconomicScreeningModuleHarness
            settingsOpen
            viewWidth={900}
            viewHeight={640}
            initialState={{ gasPrice: 0, selectedMeasure: EconomicMeasure.NPV }}
        />,
    );
    const settings = settingsRegion(page);
    const npvValues = async () =>
        (await readPublishedChannels(page))
            .find((channel) => channel.channelIdString === MEASURE_CHANNEL_ID_MAP[EconomicMeasure.NPV])!
            .contents.flat()
            .map((element) => element.value as number);

    await expect.poll(async () => (await npvValues()).length).toBe(3);
    const withoutGasRevenue = await npvValues();
    const consumption = settings.getByRole("checkbox", { name: "Assume no gas consumption" });
    await expect(consumption).not.toBeChecked();

    const gasPrice = settings.getByRole("textbox", { name: /^Gas price/ });
    await gasPrice.fill("0.2");
    await gasPrice.blur();
    await expect
        .poll(() => setupItems(page))
        .toEqual(["Gas consumption (FGCT) is missing: accept “Assume no gas consumption” or enter a gas price of 0."]);
    await expect.poll(async () => (await npvValues()).length).toBe(0);

    await consumption.check();
    await expect(setupStatus(page)).toHaveText("Setup ready");
    await expect.poll(async () => (await npvValues()).length).toBe(3);
    const withGasRevenue = await npvValues();
    withGasRevenue.forEach((value, index) => expect(value).toBeGreaterThan(withoutGasRevenue[index]));

    await gasPrice.fill("0");
    await gasPrice.blur();
    await expect.poll(async () => npvValues()).toEqual(withoutGasRevenue);
    // A zero gas price does not clear the stored ensemble-scoped assumption.
    await expect(consumption).toBeChecked();
    expect(fixtures.vectorDataRequests.sort()).toEqual(["FGIT", "FGPT", "FOPT"]);
    expect(fixtures.unexpectedApiRequests).toEqual([]);
});

// Deterministic source from 1 January 2018 to 1 July 2020: 2018 is covered with zero production, and the
// 1 July terminal boundary closes June 2020. Realization 21's oil ends on 1 January 2020.
const EARLY_MONTH_COUNT = 30;
const EARLY_MONTHLY_OIL: Record<number, number> = { 3: 100, 8: 150, 21: 120 };
const EARLY_SHORT_OIL_REALIZATION = 21;
const EARLY_INPUTS = {
    predictionStartYear: 2018,
    discountRatePercent: 10,
    oilPrice: 50,
    gasPrice: 0.2,
    costProfile: [
        { year: 2018, capex: 20_000, opex: 0 },
        { year: 2019, capex: 0, opex: 1_200 },
        { year: 2020, capex: 500, opex: 1_200 },
    ],
};

function earlyMonthlyOil(realization: number): number[] {
    return Array.from({ length: EARLY_MONTH_COUNT }, (_, month) => {
        if (month < 12) return 0;
        if (realization === EARLY_SHORT_OIL_REALIZATION && month >= 24) return 0;
        return EARLY_MONTHLY_OIL[realization];
    });
}

function earlyMonthlyGas(realization: number): number[] {
    return Array.from({ length: EARLY_MONTH_COUNT }, (_, month) =>
        month < 12 ? 0 : 100 * EARLY_MONTHLY_OIL[realization],
    );
}

function earlySeriesFor(vectorName: string) {
    return REALIZATIONS.map((realization) => {
        const isShortOil = vectorName === "FOPT" && realization === EARLY_SHORT_OIL_REALIZATION;
        return makeSeriesFromMonthlyVolumes(
            realization,
            2018,
            vectorName === "FOPT" ? earlyMonthlyOil(realization) : earlyMonthlyGas(realization),
            ["REGULAR"],
            isShortOil ? monthStartUtcMs(2020, 1) : monthStartUtcMs(2020, 7),
        );
    });
}

/**
 * Independent reference from the documented conventions: valuation 1 January 2018, monthly midpoint revenue
 * and OPEX (annual/12, all twelve months even in 2020), mid-year CAPEX, through the end of `throughYear`.
 */
function referenceDiscountedCashFlow(realization: number, throughYear: number): number {
    const rate = EARLY_INPUTS.discountRatePercent / 100;
    const factor = (time: number) => Math.pow(1 + rate, -time);
    const oil = earlyMonthlyOil(realization);
    const gas = earlyMonthlyGas(realization);
    let value = 0;
    for (let month = 0; month < EARLY_MONTH_COUNT; month++) {
        const year = 2018 + Math.floor(month / 12);
        if (year > throughYear) continue;
        const time = year - 2018 + ((month % 12) + 0.5) / 12;
        value += (EARLY_INPUTS.oilPrice * oil[month] + EARLY_INPUTS.gasPrice * gas[month]) * factor(time);
    }
    for (const cost of EARLY_INPUTS.costProfile) {
        if (cost.year > throughYear) continue;
        value -= cost.capex * factor(cost.year - 2018 + 0.5);
        for (let month = 1; month <= 12; month++) {
            value -= (cost.opex / 12) * factor(cost.year - 2018 + (month - 0.5) / 12);
        }
    }
    return value;
}

function channelEntries(channels: PublishedChannel[], channelIdString: string): { key: number; value: number }[] {
    return (channels.find((channel) => channel.channelIdString === channelIdString)?.contents.flat() ?? []) as {
        key: number;
        value: number;
    }[];
}

function earlyComparison(page: Page) {
    return viewRegion(page).getByRole("region", { name: "Early value comparison" });
}

/** The displayed comparison value in currency units, undoing the display scale shown in the header. */
async function comparisonValue(page: Page, rowLabel: string): Promise<number | "Unavailable"> {
    const header = await earlyComparison(page).getByRole("columnheader").nth(2).textContent();
    const scale = header!.includes("thousand") ? 1e3 : header!.includes("million") ? 1e6 : 1;
    const text = (await earlyComparison(page)
        .getByRole("row", { name: rowLabel })
        .getByRole("cell")
        .nth(2)
        .textContent())!;
    return text.trim() === "Unavailable" ? "Unavailable" : Number(text) * scale;
}

function expectDisplayedClose(actual: number | "Unavailable", expected: number) {
    expect(actual).not.toBe("Unavailable");
    expect(Math.abs((actual as number) - expected)).toBeLessThanOrEqual(1e-5 * Math.abs(expected) + 1e-6);
}

async function plottedValue(page: Page, traceName: string, year: number): Promise<number | null> {
    return viewRegion(page)
        .locator(".js-plotly-plot")
        .first()
        .evaluate(
            (element, args) => {
                const trace = (element as unknown as { data: { name: string; x: number[]; y: number[] }[] }).data.find(
                    (candidate) => candidate.name === args.traceName,
                );
                const index = trace ? Array.from(trace.x).indexOf(args.year) : -1;
                return index < 0 ? null : trace!.y[index];
            },
            { traceName, year },
        );
}

const EARLY_DCF_CHANNEL = EARLY_MEASURE_CHANNEL_ID_MAP[EarlyEconomicMeasure.DISCOUNTED_CASH_FLOW];
const NPV_CHANNEL = MEASURE_CHANNEL_ID_MAP[EconomicMeasure.NPV];

test("suggests covered years, accepts typed years and keeps the choice under filtering", async ({ mount, page }) => {
    const fixtures = await routeSourceFixtures(page, { seriesFor: earlySeriesFor });
    await page.setViewportSize({ width: 1320, height: 700 });
    const component = await mount(
        <EconomicScreeningModuleHarness
            settingsOpen
            viewWidth={900}
            viewHeight={640}
            initialState={{ predictionStartYear: null }}
        />,
    );
    const settings = settingsRegion(page);
    const year = settings.getByRole("combobox", { name: "Prediction start year" });
    await expect(year).toHaveValue("");
    await expect(settings.getByText(/^Valuation:/)).toHaveCount(0);

    // Keyboard search: covered zero-production 2018 is suggested; no history is selected automatically.
    await year.click();
    await expect(page.getByRole("option")).toHaveText(["2018", "2019", "2020"]);
    await page.keyboard.type("2019");
    await expect(page.getByRole("option")).toHaveText(["2019"]);
    await page.keyboard.press("Enter");
    await expect(year).toHaveValue("2019");
    await expectPopupClosed(page);
    await expect(settings.getByText("Valuation: 1 January 2019")).toBeVisible();
    await expect(settings.getByRole("cell", { name: "2019", exact: true })).toBeVisible();

    // A typed year outside the suggestions is accepted and explained through the existing validation.
    await year.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("2031");
    await expect(page.getByRole("option", { name: /2031/ })).toContainText("No source data from 1 January");
    await page.keyboard.press("Enter");
    await expect(year).toHaveValue("2031");
    await expectPopupClosed(page);
    await expect(settings.getByText(/^Valuation:/)).toHaveCount(0);
    await expect(setupStatus(page)).toContainText(
        "The prediction start year 2031 is after the supported simulation end (Jun 2020).",
    );

    // Pointer selection, then clearing back to blank.
    await settings.getByRole("button", { name: "Prediction start year" }).click();
    await page.getByRole("option", { name: "2018", exact: true }).click();
    await expect(year).toHaveValue("2018");
    await expectPopupClosed(page);
    await expect(settings.getByText("Valuation: 1 January 2018")).toBeVisible();
    await settings.getByRole("button", { name: "Clear selection" }).first().click();
    await expect(year).toHaveValue("");
    await expect(settings.getByText(/^Valuation:/)).toHaveCount(0);
    await expect.poll(() => setupItems(page)).toContain("Enter a prediction start year.");

    await year.click();
    await page.keyboard.type("2019");
    await page.keyboard.press("Enter");
    await expectPopupClosed(page);
    await component.update(
        <EconomicScreeningModuleHarness
            settingsOpen
            viewWidth={900}
            viewHeight={640}
            initialState={{ predictionStartYear: null }}
            filteredRealizations={[8]}
        />,
    );
    const npvKeys = async () =>
        channelEntries(await readPublishedChannels(page), NPV_CHANNEL).map((entry) => entry.key);
    await expect.poll(npvKeys).toEqual([8]);
    await expect(year).toHaveValue("2019");
    await settings.getByRole("button", { name: "Prediction start year" }).click();
    await expect(page.getByRole("option")).toHaveText(["2018", "2019", "2020"]);
    await page.keyboard.press("Escape");
    await expect(year).toHaveValue("2019");
    expect(fixtures.vectorDataRequests.sort()).toEqual(["FGST", "FOPT"]);
    expect(fixtures.unexpectedApiRequests).toEqual([]);
});

test("keeps a stored prediction start year that is outside the suggestions", async ({ mount, page }) => {
    await routeSourceFixtures(page, { seriesFor: earlySeriesFor });
    await mount(
        <EconomicScreeningModuleHarness
            settingsOpen
            viewWidth={900}
            viewHeight={640}
            initialState={{ predictionStartYear: 2016 }}
        />,
    );
    const year = settingsRegion(page).getByRole("combobox", { name: "Prediction start year" });
    await expect(settingsRegion(page).getByRole("cell", { name: "2016", exact: true })).toBeVisible();
    await expect(year).toHaveValue("2016");
    await expect(settingsRegion(page).getByText("Valuation: 1 January 2016")).toBeVisible();
    await year.click();
    await expect(page.getByRole("option")).toHaveText(["2016No source data from 1 January", "2018", "2019", "2020"]);
});

test("commits a typed whole year when focus leaves, and Escape cancels the edit", async ({ mount, page }) => {
    const fixtures = await routeSourceFixtures(page, { seriesFor: earlySeriesFor });
    await mount(
        <EconomicScreeningModuleHarness
            settingsOpen
            viewWidth={900}
            viewHeight={640}
            initialState={{ predictionStartYear: 2019 }}
        />,
    );
    const settings = settingsRegion(page);
    const year = settings.getByRole("combobox", { name: "Prediction start year" });
    await expect(settings.getByText("Valuation: 1 January 2019")).toBeVisible();

    await typeAndTabAway(page, year, "2018");
    await expectPopupClosed(page);
    await expect(year).toHaveValue("2018");
    await expect(settings.getByText("Valuation: 1 January 2018")).toBeVisible();
    await expect(settings.getByRole("cell", { name: "2018", exact: true })).toBeVisible();

    // Tab also commits a typed year outside the suggestions.
    await year.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("2017");
    await page.keyboard.press("Tab");
    await expectPopupClosed(page);
    await expect(year).toHaveValue("2017");
    await expect(settings.getByText("Valuation: 1 January 2017")).toBeVisible();

    await year.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("2020");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Tab");
    await expectPopupClosed(page);
    await expect(year).toHaveValue("2017");
    await expect(settings.getByText("Valuation: 1 January 2017")).toBeVisible();

    // Text that is not a whole year is discarded.
    await typeAndTabAway(page, year, "20");
    await expectPopupClosed(page);
    await expect(year).toHaveValue("2017");
    await expect(settings.getByText("Valuation: 1 January 2017")).toBeVisible();

    await settings.getByRole("button", { name: "Clear selection" }).first().click();
    await expect(year).toHaveValue("");
    await expect(settings.getByText(/^Valuation:/)).toHaveCount(0);
    expect(fixtures.unexpectedApiRequests).toEqual([]);
});

test("reports missing source coverage for the selected realizations in the setup summary", async ({ mount, page }) => {
    const fixtures = await routeSourceFixtures(page, { seriesFor: earlySeriesFor });
    const initialState = { ...EARLY_INPUTS, predictionStartYear: 2016, selectedMeasure: EconomicMeasure.NPV };
    const component = await mount(
        <EconomicScreeningModuleHarness settingsOpen viewWidth={900} viewHeight={640} initialState={initialState} />,
    );
    const settings = settingsRegion(page);
    const npvCount = async () => channelEntries(await readPublishedChannels(page), NPV_CHANNEL).length;
    const coverageBefore = (product: string) =>
        `${product} source coverage is incomplete between Jan 2016 and Jun 2020 for every selected realization; supported data starts Jan 2018.`;

    await expect.poll(() => setupItems(page)).toEqual([coverageBefore("Oil"), coverageBefore("Sales gas")]);
    await expect(setupStatus(page)).toContainText("Source data:");
    await expect(setupStatus(page)).not.toContainText("Setup ready");
    expect(await npvCount()).toBe(0);
    await expect(settings.getByRole("combobox", { name: "Prediction start year" })).toHaveValue("2016");

    // A zero price removes only that product's coverage requirement.
    const gasPrice = settings.getByRole("textbox", { name: /^Gas price/ });
    await typeAndTabAway(page, gasPrice, "0");
    await expect.poll(() => setupItems(page)).toEqual([coverageBefore("Oil")]);

    await typeAndTabAway(page, settings.getByRole("combobox", { name: "Prediction start year" }), "2018");
    await expect(setupStatus(page)).toHaveText("Setup ready");
    await expect.poll(npvCount).toBe(2);

    // Only realization 21 is selected, and its oil ends in January 2020.
    await component.update(
        <EconomicScreeningModuleHarness
            settingsOpen
            viewWidth={900}
            viewHeight={640}
            initialState={initialState}
            filteredRealizations={[21]}
        />,
    );
    await expect
        .poll(() => setupItems(page))
        .toEqual(["Oil source coverage is incomplete between Jan 2018 and Jun 2020 for every selected realization."]);
    await expect.poll(npvCount).toBe(0);
    expect(fixtures.vectorDataRequests.sort()).toEqual(["FGST", "FOPT"]);
    expect(fixtures.unexpectedApiRequests).toEqual([]);
});

/** Realization 3 lacks complete gas and 8 lacks complete oil; 21 is complete and sets the ensemble horizon. */
function disjointCoverageSeriesFor(vectorName: string) {
    return REALIZATIONS.map((realization) => {
        const isShort = vectorName === "FOPT" ? realization === 8 : realization === 3;
        return makeSeriesFromMonthlyVolumes(
            realization,
            2018,
            vectorName === "FOPT" ? earlyMonthlyOil(3) : earlyMonthlyGas(3),
            ["REGULAR"],
            isShort ? monthStartUtcMs(2020, 1) : monthStartUtcMs(2020, 7),
        );
    });
}

test("requires the needed products to be covered in the same selected realization", async ({ mount, page }) => {
    const fixtures = await routeSourceFixtures(page, { seriesFor: disjointCoverageSeriesFor });
    await mount(
        <EconomicScreeningModuleHarness
            settingsOpen
            viewWidth={900}
            viewHeight={640}
            initialState={{ ...EARLY_INPUTS, selectedMeasure: EconomicMeasure.NPV }}
            filteredRealizations={[3, 8]}
        />,
    );
    const npvKeys = async () =>
        channelEntries(await readPublishedChannels(page), NPV_CHANNEL).map((entry) => entry.key);

    await expect
        .poll(() => setupItems(page))
        .toEqual(["No selected realization has both oil and sales gas source coverage between Jan 2018 and Jun 2020."]);
    await expect(setupStatus(page)).not.toContainText("Setup ready");
    expect(await npvKeys()).toEqual([]);

    // Without gas revenue, realization 3's complete oil is enough.
    await typeAndTabAway(page, settingsRegion(page).getByRole("textbox", { name: /^Gas price/ }), "0");
    await expect(setupStatus(page)).toHaveText("Setup ready");
    await expect.poll(npvKeys).toEqual([3]);
    expect(fixtures.vectorDataRequests.sort()).toEqual(["FGST", "FOPT"]);
    expect(fixtures.unexpectedApiRequests).toEqual([]);
});

test("shows early and full discounted cash flow from the computed results with a labeled profile marker", async ({
    mount,
    page,
}) => {
    const fixtures = await routeSourceFixtures(page, { seriesFor: earlySeriesFor });
    await page.setViewportSize({ width: 1320, height: 760 });
    await mount(
        <EconomicScreeningModuleHarness
            settingsOpen
            viewWidth={900}
            viewHeight={700}
            initialState={{
                ...EARLY_INPUTS,
                earlyValue: { enabled: true, endYear: 2019 },
                resultMode: ResultMode.TIME_PROFILE,
                cashFlowProfileType: CashFlowProfileType.CUMULATIVE_DISCOUNTED_CASH_FLOW,
                selectedRealization: 3,
            }}
        />,
    );
    const view = viewRegion(page);
    const settings = settingsRegion(page);
    await waitForPlottedData(page);

    const expected2018 = referenceDiscountedCashFlow(3, 2018);
    const expected2019 = referenceDiscountedCashFlow(3, 2019);
    const expectedFull = referenceDiscountedCashFlow(3, 2020);
    expect(expected2018).toBeLessThan(0);

    // Through 2019: rendered comparison, plotted 2019 point and published channel agree with the reference.
    await expect(earlyComparison(page)).toContainText(
        "Early value through 2019 | Valuation 1 January 2018 | Currency USD",
    );
    await expect(earlyComparison(page).getByRole("row", { name: /Early discounted cash flow/ })).toContainText(
        "Jan 2018-Dec 2019",
    );
    await expect(earlyComparison(page).getByRole("row", { name: /Net present value/ })).toContainText(
        "Jan 2018-Jun 2020",
    );
    await expect(earlyComparison(page).getByRole("columnheader").nth(2)).toContainText("Realization 3");
    expectDisplayedClose(await comparisonValue(page, "Early discounted cash flow"), expected2019);
    expectDisplayedClose(await comparisonValue(page, "Net present value"), expectedFull);
    expect(Math.abs((await plottedValue(page, "Realization 3", 2019))! - expected2019)).toBeLessThan(1e-6);
    await expect(view.locator(".annotation-text")).toHaveText("Early value through 2019");
    let channels = await readPublishedChannels(page);
    const fullNpv = channelEntries(channels, NPV_CHANNEL);
    expect(fullNpv.map((entry) => entry.key)).toEqual([3, 8]);
    for (const entry of fullNpv) {
        expect(Math.abs(entry.value - referenceDiscountedCashFlow(entry.key, 2020))).toBeLessThan(1e-6);
    }
    const early2019 = channelEntries(channels, EARLY_DCF_CHANNEL);
    expect(early2019.map((entry) => entry.key)).toEqual([3, 8, 21]);
    for (const entry of early2019) {
        expect(Math.abs(entry.value - referenceDiscountedCashFlow(entry.key, 2019))).toBeLessThan(1e-6);
    }
    await page.screenshot({ path: `${UX_SCREENSHOT_DIR}/desktop-early-2019-realization.png` });

    const throughYear = settings.getByRole("textbox", { name: "Calculate through year" });
    await typeAndTabAway(page, throughYear, "2018");
    await expect(view.locator(".annotation-text")).toHaveText("Early value through 2018");
    expectDisplayedClose(await comparisonValue(page, "Early discounted cash flow"), expected2018);
    await expect
        .poll(async () => channelEntries(await readPublishedChannels(page), EARLY_DCF_CHANNEL)[0]?.value)
        .toBeCloseTo(expected2018, 6);

    // Through the final year: equals full NPV and includes the full 2020 costs; short-oil 21 is unavailable.
    await typeAndTabAway(page, throughYear, "2020");
    await expect(earlyComparison(page).getByRole("row", { name: /Early discounted cash flow/ })).toContainText(
        "Jan 2018-Jun 2020",
    );
    expectDisplayedClose(await comparisonValue(page, "Early discounted cash flow"), expectedFull);
    await expect
        .poll(async () =>
            channelEntries(await readPublishedChannels(page), EARLY_DCF_CHANNEL).map((entry) => entry.key),
        )
        .toEqual([3, 8]);
    channels = await readPublishedChannels(page);
    const early2020 = channelEntries(channels, EARLY_DCF_CHANNEL);
    expect(Math.abs(early2020[0].value - fullNpv[0].value)).toBeLessThan(1e-6);
    expect(channelEntries(channels, NPV_CHANNEL)).toEqual(fullNpv);

    // Aggregate: labeled P50 per horizon with each horizon's own valid count.
    await typeAndTabAway(page, throughYear, "2019");
    await realizationCombobox(page).click();
    await page.keyboard.press("Escape");
    await settings.getByRole("button", { name: "Clear selection" }).last().click();
    await expect(earlyComparison(page).getByRole("columnheader").nth(2)).toContainText("P50");
    await expect(earlyComparison(page).getByRole("row", { name: /Early discounted cash flow/ })).toContainText("3/3");
    await expect(earlyComparison(page).getByRole("row", { name: /Net present value/ })).toContainText("2/3");
    await expect(earlyComparison(page)).toContainText("need not come from the same realization");
    const earlyMedian = [3, 8, 21]
        .map((realization) => referenceDiscountedCashFlow(realization, 2019))
        .sort((a, b) => a - b)[1];
    const fullMedian = (referenceDiscountedCashFlow(3, 2020) + referenceDiscountedCashFlow(8, 2020)) / 2;
    expectDisplayedClose(await comparisonValue(page, "Early discounted cash flow"), earlyMedian);
    expectDisplayedClose(await comparisonValue(page, "Net present value"), fullMedian);
    await page.screenshot({ path: `${UX_SCREENSHOT_DIR}/desktop-early-2019-aggregate.png` });

    // Disabled early value withdraws only early context and contents.
    await settings.getByRole("checkbox", { name: "Early value" }).uncheck();
    await expect(earlyComparison(page)).toHaveCount(0);
    await expect(view.locator(".annotation-text")).toHaveCount(0);
    await expect.poll(async () => channelEntries(await readPublishedChannels(page), EARLY_DCF_CHANNEL)).toEqual([]);
    expect(channelEntries(await readPublishedChannels(page), NPV_CHANNEL)).toEqual(fullNpv);
    await waitForPlottedData(page);

    // An out-of-range year does the same and is reported in the setup summary.
    await settings.getByRole("checkbox", { name: "Early value" }).check();
    await typeAndTabAway(page, throughYear, "2025");
    await expect(setupStatus(page)).toContainText("Early value: choose a Calculate through year within 2018-2020.");
    await expect(earlyComparison(page)).toHaveCount(0);
    await expect(view.locator(".annotation-text")).toHaveCount(0);
    await expect.poll(async () => channelEntries(await readPublishedChannels(page), EARLY_DCF_CHANNEL)).toEqual([]);
    expect(channelEntries(await readPublishedChannels(page), NPV_CHANNEL)).toEqual(fullNpv);
    await expectNoConfigurationInputsInView(page);
    expect(fixtures.vectorDataRequests.sort()).toEqual(["FGST", "FOPT"]);
    expect(fixtures.unexpectedApiRequests).toEqual([]);
});

/** True when the element's content fits its own box horizontally, i.e. nothing is clipped or scrolled. */
async function fitsHorizontally(locator: ReturnType<Page["getByRole"]>): Promise<boolean> {
    return locator.evaluate((element) => element.scrollWidth <= element.clientWidth + 1);
}

test("keeps the early comparison, marker and setup summary contained in a narrow layout", async ({ mount, page }) => {
    await routeSourceFixtures(page, { seriesFor: earlySeriesFor });
    await page.setViewportSize({ width: 720, height: 700 });
    await mount(
        <EconomicScreeningModuleHarness
            settingsOpen
            viewWidth={360}
            viewHeight={640}
            initialState={{
                ...EARLY_INPUTS,
                gasPrice: null,
                earlyValue: { enabled: true, endYear: 2019 },
                resultMode: ResultMode.TIME_PROFILE,
                cashFlowProfileType: CashFlowProfileType.CUMULATIVE_DISCOUNTED_CASH_FLOW,
                selectedRealization: 3,
            }}
        />,
    );
    // A blank gas price withholds financial results, so the summary is shown while volumes stay available.
    await expect.poll(() => setupItems(page)).toEqual(["Enter a gas price, or 0 to omit gas revenue."]);
    const summaryBox = (await setupStatus(page).boundingBox())!;
    const settingsBox = (await settingsRegion(page).boundingBox())!;
    expect(summaryBox.x + summaryBox.width).toBeLessThanOrEqual(settingsBox.x + settingsBox.width);
    expect(await fitsHorizontally(setupStatus(page))).toBe(true);

    const gasPrice = settingsRegion(page).getByRole("textbox", { name: /^Gas price/ });
    await gasPrice.fill("0.2");
    await gasPrice.blur();
    await expect(setupStatus(page)).toHaveText("Setup ready");
    await waitForPlottedData(page);
    await expect(viewRegion(page).locator(".annotation-text")).toHaveText("Early value through 2019");

    const view = viewRegion(page);
    const viewBox = (await view.boundingBox())!;
    const comparisonBox = (await earlyComparison(page).boundingBox())!;
    expect(comparisonBox.x + comparisonBox.width).toBeLessThanOrEqual(viewBox.x + viewBox.width);
    for (const cell of await earlyComparison(page).getByRole("cell").all()) {
        const cellBox = (await cell.boundingBox())!;
        expect(cellBox.x + cellBox.width, `cell "${await cell.textContent()}"`).toBeLessThanOrEqual(
            viewBox.x + viewBox.width,
        );
    }
    const annotation = (await view.locator(".annotation").first().boundingBox())!;
    const legend = (await view.locator(".legend").first().boundingBox())!;
    const plot = (await view.locator(".main-svg").first().boundingBox())!;
    expect(overlaps(annotation, legend)).toBe(false);
    for (const label of [...(await view.locator(".xtick text").all()), view.locator(".xtitle").first()]) {
        expect(overlaps(annotation, (await label.boundingBox())!)).toBe(false);
    }
    expect(annotation.x).toBeGreaterThanOrEqual(plot.x);
    expect(annotation.x + annotation.width).toBeLessThanOrEqual(plot.x + plot.width);
    await expectLegendClearOfYearAxis(page);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${UX_SCREENSHOT_DIR}/narrow-early-time-profile.png` });
});

test("names Settings cost inputs by year without step buttons while other number fields keep them", async ({
    mount,
    page,
}) => {
    await routeSourceFixtures(page);
    await page.setViewportSize({ width: 1320, height: 700 });
    await mount(<EconomicScreeningModuleHarness settingsOpen viewWidth={900} viewHeight={640} />);
    const settings = settingsRegion(page);

    const capex2030 = settings.getByRole("textbox", { name: "CAPEX 2030", exact: true });
    await expect(capex2030).toBeVisible();
    await expect(settings.getByRole("textbox", { name: "OPEX 2031", exact: true })).toBeVisible();
    const costTable = settings
        .getByRole("table")
        .filter({ has: page.getByRole("textbox", { name: "CAPEX 2030", exact: true }) });
    await expect(costTable.getByRole("button")).toHaveCount(0);
    await expect(settings.getByRole("status").filter({ hasText: "No non-zero costs included." })).toBeVisible();

    const discountRate = settings.getByRole("textbox", { name: /^Discount rate/ });
    await expect(discountRate).toHaveValue("8");
    await discountRate.locator("..").getByRole("button", { name: "Increase" }).click();
    await expect(discountRate).toHaveValue("9");
    await expect(viewRegion(page).getByText(/Discount rate 9%/)).toBeVisible({ timeout: 2_000 });

    await capex2030.click();
    await page.keyboard.type("1000");
    await capex2030.blur();
    await expect(capex2030).toHaveValue("1,000");
    await expect(settings.getByRole("status").filter({ hasText: "No non-zero costs included." })).toHaveCount(0);
    await page.screenshot({ path: `${UX_SCREENSHOT_DIR}/desktop-settings-costs.png` });
});

test("cost paste preserves channels until Apply and matches independent full and early cash flows", async ({
    mount,
    page,
}) => {
    const fixtures = await routeSourceFixtures(page, { seriesFor: earlySeriesFor });
    await page.setViewportSize({ width: 1320, height: 700 });
    const initialState = {
        ...EARLY_INPUTS,
        costProfile: [{ year: 2016, capex: 7, opex: 0 }, ...EARLY_INPUTS.costProfile],
        earlyValue: { enabled: true, endYear: 2019 },
        selectedMeasure: EconomicMeasure.BREAK_EVEN_OIL_PRICE,
        resultMode: ResultMode.ALL_RESULTS,
        selectedRealization: 3,
    };
    const component = await mount(
        <EconomicScreeningModuleHarness
            settingsOpen
            settingsWidth={400}
            viewWidth={880}
            viewHeight={640}
            initialState={initialState}
        />,
    );
    await expect.poll(async () => channelEntries(await readPublishedChannels(page), NPV_CHANNEL).length).toBe(2);
    const original = await readPublishedChannels(page);
    const readCosts = () =>
        page.evaluate(() =>
            (window as unknown as { readEconomicScreeningCosts: () => unknown }).readEconomicScreeningCosts(),
        );
    await expect.poll(readCosts).toEqual(initialState.costProfile);
    const settings = settingsRegion(page);
    await expect(settings.getByText("Annual costs", { exact: true })).toBeVisible();
    await expect(settings.getByRole("columnheader", { name: "CAPEX [USD]", exact: true })).toBeVisible();
    await expect(settings.getByRole("columnheader", { name: "OPEX [USD]", exact: true })).toBeVisible();
    const trigger = settings.getByRole("button", { name: "Paste costs...", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Paste costs", exact: true });
    await dialog.getByRole("textbox").fill("2019\t600\t2400\n2020\t\t");
    await expect(dialog.getByRole("table")).toBeVisible();
    expect(await readPublishedChannels(page)).toEqual(original);
    expect(await readCosts()).toEqual(initialState.costProfile);
    await page.screenshot({ path: "test-results/economic-screening-presentation/desktop-paste.png" });
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(await readPublishedChannels(page)).toEqual(original);
    await trigger.click();
    await dialog.getByRole("textbox").fill("2019\t-600\t2400");
    await expect(dialog.getByRole("button", { name: "Apply", exact: true })).toBeDisabled();
    expect(await readPublishedChannels(page)).toEqual(original);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(await readPublishedChannels(page)).toEqual(original);
    await trigger.click();
    await dialog.getByRole("textbox").fill("2019\t600\t2400\n2020\t\t");
    await dialog.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect.poll(readCosts).toEqual([
        { year: 2016, capex: 7, opex: 0 },
        { year: 2018, capex: 20000, opex: 0 },
        { year: 2019, capex: 600, opex: 2400 },
    ]);
    const costPv = (year: number, capex: number, opex: number) =>
        capex / 1.1 ** (year - 2018 + 0.5) +
        Array.from({ length: 12 }, (_, month) => opex / 12 / 1.1 ** (year - 2018 + (month + 0.5) / 12)).reduce(
            (total, value) => total + value,
            0,
        );
    const earlyChange = -costPv(2019, 600, 1200);
    const fullChange = earlyChange + costPv(2020, 500, 1200);
    await expect
        .poll(async () => channelEntries(await readPublishedChannels(page), NPV_CHANNEL)[0]?.value)
        .toBeCloseTo(referenceDiscountedCashFlow(3, 2020) + fullChange, 7);
    const actual = await readPublishedChannels(page);
    for (const entry of channelEntries(actual, NPV_CHANNEL))
        expect(entry.value).toBeCloseTo(referenceDiscountedCashFlow(entry.key, 2020) + fullChange, 7);
    for (const entry of channelEntries(actual, EARLY_DCF_CHANNEL))
        expect(entry.value).toBeCloseTo(referenceDiscountedCashFlow(entry.key, 2019) + earlyChange, 7);
    for (const measure of [
        EconomicMeasure.DISCOUNTED_OIL_VOLUME,
        EconomicMeasure.UNDISCOUNTED_OIL_VOLUME,
        EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME,
        EconomicMeasure.UNDISCOUNTED_SALES_GAS_VOLUME,
        EconomicMeasure.DISCOUNTED_OIL_EQUIVALENTS,
    ]) {
        expect(channelEntries(actual, MEASURE_CHANNEL_ID_MAP[measure])).toEqual(
            channelEntries(original, MEASURE_CHANNEL_ID_MAP[measure]),
        );
    }
    await test.info().attach("independent-cost-channel-evidence", {
        contentType: "application/json",
        body: JSON.stringify(
            {
                expectedNpv3: referenceDiscountedCashFlow(3, 2020) + fullChange,
                actualNpv3: channelEntries(actual, NPV_CHANNEL)[0],
                expectedEarly3: referenceDiscountedCashFlow(3, 2019) + earlyChange,
                actualEarly3: channelEntries(actual, EARLY_DCF_CHANNEL)[0],
                costs: await readCosts(),
            },
            null,
            2,
        ),
    });

    for (const layout of [
        { name: "desktop", width: 1320, settingsWidth: 400, viewWidth: 880 },
        { name: "narrow", width: 720, settingsWidth: 320, viewWidth: 360 },
    ]) {
        await page.setViewportSize({ width: layout.width, height: 700 });
        await component.update(
            <EconomicScreeningModuleHarness
                settingsOpen
                settingsWidth={layout.settingsWidth}
                viewWidth={layout.viewWidth}
                viewHeight={640}
                initialState={initialState}
            />,
        );
        const capex = settings.getByRole("textbox", { name: "CAPEX 2019", exact: true });
        await capex.scrollIntoViewIfNeeded();
        const table = settings
            .getByRole("table")
            .filter({ has: page.getByRole("textbox", { name: "CAPEX 2019", exact: true }) });
        expect(await fitsHorizontally(settings)).toBe(true);
        expect(await fitsHorizontally(table)).toBe(true);
        expect(await capex.evaluate((element) => getComputedStyle(element).textAlign)).toBe("right");
        const tableBox = (await table.boundingBox())!;
        const settingsBox = (await settings.boundingBox())!;
        expect(tableBox.width).toBeGreaterThan(settingsBox.width - 40);
        expect(tableBox.x + tableBox.width).toBeLessThanOrEqual(settingsBox.x + settingsBox.width);
        expect(
            overlaps(
                (await setupStatus(page).boundingBox())!,
                (await settings.locator("[data-collapsible-scroll-area]").boundingBox())!,
            ),
        ).toBe(false);
        await page.screenshot({ path: `test-results/economic-screening-presentation/${layout.name}-costs.png` });
        await trigger.click();
        await dialog.getByRole("textbox").fill("2019\t600\t2400");
        const dialogBox = (await dialog.boundingBox())!;
        expect(dialogBox.x).toBeGreaterThanOrEqual(0);
        expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(layout.width);
        expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(700);
        expect(await fitsHorizontally(dialog)).toBe(true);
        expect(
            overlaps(
                (await dialog.getByRole("textbox").boundingBox())!,
                (await dialog.getByRole("table").boundingBox())!,
            ),
        ).toBe(false);
        await page.screenshot({ path: `test-results/economic-screening-presentation/${layout.name}-paste.png` });
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
    }
    expect(fixtures.vectorDataRequests.sort()).toEqual(["FGST", "FOPT"]);
    expect(fixtures.unexpectedApiRequests).toEqual([]);
});
