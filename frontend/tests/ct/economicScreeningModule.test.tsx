import type { Page } from "@playwright/test";

import { MEASURE_CHANNEL_ID_MAP } from "@modules/EconomicScreening/channelDefs";
import { EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";

import { EconomicScreeningModuleHarness } from "./support/EconomicScreeningModuleHarness";
import { expect, test } from "./support/offlineComponentTest";

const REALIZATIONS = [3, 8, 21];
const SCREENSHOT_DIR = "test-results/economic-screening-b2";

// Full Settings and View mounts with plotly exceed the 10 s default when the machine is loaded.
test.describe.configure({ timeout: 30_000 });

type SourceFixtureState = {
    vectorDataRequests: string[];
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
    options: { failSalesGas?: boolean; partialOilRealization?: number } = {},
): Promise<SourceFixtureState> {
    const state: SourceFixtureState = { vectorDataRequests: [] };
    await page.route(
        (url) => url.pathname.startsWith("/api/timeseries/vector_list/"),
        (route) =>
            route.fulfill({
                json: [
                    { name: "FOPT", descriptiveName: "FOPT", hasHistorical: false },
                    { name: "FGST", descriptiveName: "FGST", hasHistorical: false },
                ],
            }),
    );
    await page.route(
        (url) => url.pathname.startsWith("/api/timeseries/realizations_vector_data/"),
        (route) => {
            const url = new URL(route.request().url());
            const vectorName = url.searchParams.get("vector_name") ?? "";
            state.vectorDataRequests.push(vectorName);
            if (options.failSalesGas && vectorName === "FGST") {
                return route.fulfill({ status: 500, json: { detail: "fixture failure" } });
            }
            const monthlyVolume = vectorName === "FOPT" ? 100 : 20_000;
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
