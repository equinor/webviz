import type { Page } from "@playwright/test";

import { PlotType } from "@modules/DistributionPlot/typesAndEnums";
import { EARLY_MEASURE_CHANNEL_ID_MAP, MEASURE_CHANNEL_ID_MAP } from "@modules/EconomicScreening/channelDefs";
import {
    DistributionPlotType,
    EarlyEconomicMeasure,
    EconomicMeasure,
    ResultMode,
} from "@modules/EconomicScreening/typesAndEnums";

import {
    EconomicScreeningConnectedConsumersHarness,
    type ConnectedConsumersHarnessProps,
} from "./support/EconomicScreeningConnectedConsumersHarness";
import {
    BASE_CASE_UUID,
    BASE_MONTHLY_OIL,
    BASE_REALIZATIONS,
    CAPEX_2030_USD,
    DELTA_MONTHLY_OIL,
    DELTA_REALIZATIONS,
    DESIGN_CASE_UUID,
    DESIGN_MONTHLY_OIL,
    DESIGN_REALIZATIONS,
    DISCOUNT_RATE_PERCENT,
    GAS_PRICE_USD_PER_SM3,
    GAS_SM3_PER_OIL_SM3,
    makeMonthlySeries,
    OIL_PRICE_USD_PER_SM3,
    PARTIAL_OIL_REALIZATION,
} from "./support/economicScreeningConnectedFixtures";
import { expect, test } from "./support/offlineComponentTest";

const SCREENSHOT_DIR = "test-results/economic-screening-b3a";

test.describe.configure({ timeout: 30_000 });

// --- Independent expectations: monthly midpoint discounting from 1 Jan 2030, mid-year CAPEX, no OPEX. ---
const RATE = DISCOUNT_RATE_PERCENT / 100;
const discountFactor = (years: number, rate = RATE) => Math.pow(1 + rate, -years);
/** Months are counted from January 2030; production runs from January 2031 (month 12) to December 2032. */
const monthRange = (first: number, lastExclusive: number) =>
    Array.from({ length: lastExclusive - first }, (_, index) => first + index);
const FULL_PRODUCTION_MONTHS = monthRange(12, 36);
const PRODUCTION_MONTHS_THROUGH_2031 = monthRange(12, 24);
const discountedMonths = (months: number[], rate = RATE) =>
    months.reduce((sum, month) => sum + discountFactor((month + 0.5) / 12, rate), 0);
const D_FULL = discountedMonths(FULL_PRODUCTION_MONTHS);
const D_THROUGH_2031 = discountedMonths(PRODUCTION_MONTHS_THROUGH_2031);
const CAPEX_PV = CAPEX_2030_USD * discountFactor(0.5);
const REVENUE_PER_OIL_SM3 = OIL_PRICE_USD_PER_SM3 + GAS_PRICE_USD_PER_SM3 * GAS_SM3_PER_OIL_SM3;

const expectedNpv = (oil: number) => REVENUE_PER_OIL_SM3 * oil * D_FULL - CAPEX_PV;
const expectedDcfThrough2031 = (oil: number) => REVENUE_PER_OIL_SM3 * oil * D_THROUGH_2031 - CAPEX_PV;
/** Undiscounted cash flow at a given rate; an IRR is a root of this. */
const npvAtRate = (oil: number, rate: number) =>
    REVENUE_PER_OIL_SM3 * oil * discountedMonths(FULL_PRODUCTION_MONTHS, rate) -
    CAPEX_2030_USD * discountFactor(0.5, rate);
const expectedBreakEven = (oil: number) =>
    (CAPEX_PV - GAS_PRICE_USD_PER_SM3 * GAS_SM3_PER_OIL_SM3 * oil * D_FULL) / (oil * D_FULL);
/** Linear-interpolated quantile, as used by the existing Monte Carlo tornado. */
const quantile = (values: number[], q: number) => {
    const sorted = [...values].sort((a, b) => a - b);
    const rank = (sorted.length - 1) * q;
    const lower = Math.floor(rank);
    return sorted[lower] + (rank - lower) * ((sorted[lower + 1] ?? sorted[lower]) - sorted[lower]);
};

function expectedByKey(realizations: number[], valueOf: (realization: number) => number): [number, number][] {
    return realizations.map((realization) => [realization, valueOf(realization)]);
}

const FULL_OIL_KEYS = DESIGN_REALIZATIONS.filter((realization) => realization !== PARTIAL_OIL_REALIZATION);

const NPV_CHANNEL = MEASURE_CHANNEL_ID_MAP[EconomicMeasure.NPV];
const EARLY_DCF_CHANNEL = EARLY_MEASURE_CHANNEL_ID_MAP[EarlyEconomicMeasure.DISCOUNTED_CASH_FLOW];
const EARLY_OIL_CHANNEL = EARLY_MEASURE_CHANNEL_ID_MAP[EarlyEconomicMeasure.DISCOUNTED_OIL_VOLUME];
const OIL_CHANNEL = MEASURE_CHANNEL_ID_MAP[EconomicMeasure.DISCOUNTED_OIL_VOLUME];
const GAS_CHANNEL = MEASURE_CHANNEL_ID_MAP[EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME];
const IRR_CHANNEL = MEASURE_CHANNEL_ID_MAP[EconomicMeasure.IRR];
const BREAK_EVEN_CHANNEL = MEASURE_CHANNEL_ID_MAP[EconomicMeasure.BREAK_EVEN_OIL_PRICE];

const DEFAULT_PROPS: ConnectedConsumersHarnessProps = {
    producerEnsemble: "design",
    costDraftValid: true,
    early: { enabled: true, endYear: 2031 },
    distributionX: null,
    distributionY: null,
    distributionPlotType: PlotType.BarChart,
    sensitivityResponse: null,
};

// --- API fixtures: every source/metadata request is served here; anything else fails and is recorded. ---
type SourceRoutes = { requests: string[]; unexpected: string[]; releaseBase: () => void };

async function routeSources(page: Page, options: { base?: "delayed" | "failed" } = {}): Promise<SourceRoutes> {
    const requests: string[] = [];
    const unexpected: string[] = [];
    let releaseBase = () => {};
    const baseGate =
        options.base === "delayed" ? new Promise<void>((resolve) => (releaseBase = resolve)) : Promise.resolve();

    const rejectUnexpected = (route: Parameters<Parameters<Page["route"]>[1]>[0]) => {
        unexpected.push(route.request().url());
        return route.fulfill({ status: 500, json: { detail: "Unexpected fixture request" } });
    };
    await page.route((url) => url.pathname.startsWith("/api/"), rejectUnexpected);

    const vectorList = [
        { name: "FOPT", descriptiveName: "FOPT", hasHistorical: false },
        { name: "FGST", descriptiveName: "FGST", hasHistorical: false },
    ];
    await page.route(
        (url) => url.pathname.startsWith("/api/timeseries/vector_list/"),
        (route) => {
            const caseUuid = new URL(route.request().url()).searchParams.get("case_uuid");
            if (caseUuid !== DESIGN_CASE_UUID && caseUuid !== BASE_CASE_UUID) return rejectUnexpected(route);
            requests.push(`vector_list:${caseUuid}`);
            return route.fulfill({ json: vectorList });
        },
    );
    await page.route(
        (url) => url.pathname.startsWith("/api/timeseries/delta_ensemble_vector_list/"),
        (route) => {
            const params = new URL(route.request().url()).searchParams;
            if (
                params.get("comparison_case_uuid") !== DESIGN_CASE_UUID ||
                params.get("reference_case_uuid") !== BASE_CASE_UUID
            ) {
                return rejectUnexpected(route);
            }
            requests.push("delta_vector_list");
            return route.fulfill({ json: vectorList });
        },
    );
    await page.route(
        (url) => url.pathname.startsWith("/api/timeseries/realizations_vector_data/"),
        async (route) => {
            const params = new URL(route.request().url()).searchParams;
            const caseUuid = params.get("case_uuid");
            const vectorName = params.get("vector_name") ?? "";
            const frequency = params.get("resampling_frequency");
            if (vectorName === "FGCT" && frequency === "YEARLY") {
                // Delta constituent diagnostics only; no FGCT is modelled in these fixtures.
                requests.push(`diagnostics:${caseUuid}:FGCT`);
                return route.fulfill({ json: [] });
            }
            const isMonthlySource =
                ["FOPT", "FGST"].includes(vectorName) &&
                frequency === "MONTHLY" &&
                params.get("include_source_coverage") === "true";
            if (!isMonthlySource || (caseUuid !== DESIGN_CASE_UUID && caseUuid !== BASE_CASE_UUID)) {
                return rejectUnexpected(route);
            }
            requests.push(`${caseUuid === DESIGN_CASE_UUID ? "design" : "base"}:${vectorName}`);
            const isDesign = caseUuid === DESIGN_CASE_UUID;
            if (!isDesign) {
                await baseGate;
                if (options.base === "failed") {
                    return route.fulfill({ status: 500, json: { detail: "fixture failure" } });
                }
            }
            const realizations = isDesign ? DESIGN_REALIZATIONS : BASE_REALIZATIONS;
            // Design sales gas arrives in reverse order, so oil and gas must be joined by realization.
            const orderedRealizations = isDesign && vectorName === "FGST" ? [...realizations].reverse() : realizations;
            const oil = isDesign ? DESIGN_MONTHLY_OIL : BASE_MONTHLY_OIL;
            const gasFactor = vectorName === "FGST" ? GAS_SM3_PER_OIL_SM3 : 1;
            return route.fulfill({
                json: orderedRealizations.map((realization) =>
                    makeMonthlySeries(
                        realization,
                        oil[realization] * gasFactor,
                        ["REGULAR"],
                        isDesign && vectorName === "FOPT" && realization === PARTIAL_OIL_REALIZATION,
                    ),
                ),
            });
        },
    );
    await page.route(
        (url) => url.pathname.startsWith("/api/timeseries/delta_ensemble_realizations_vector_data/"),
        (route) => {
            const params = new URL(route.request().url()).searchParams;
            const vectorName = params.get("vector_name") ?? "";
            if (
                params.get("comparison_case_uuid") !== DESIGN_CASE_UUID ||
                params.get("reference_case_uuid") !== BASE_CASE_UUID ||
                !["FOPT", "FGST"].includes(vectorName) ||
                params.get("resampling_frequency") !== "MONTHLY" ||
                params.get("include_source_coverage") !== "true"
            ) {
                return rejectUnexpected(route);
            }
            requests.push(`delta:${vectorName}`);
            const gasFactor = vectorName === "FGST" ? GAS_SM3_PER_OIL_SM3 : 1;
            return route.fulfill({
                json: DELTA_REALIZATIONS.map((realization) =>
                    makeMonthlySeries(realization, DELTA_MONTHLY_OIL[realization] * gasFactor, [
                        "COMPARISON",
                        "REFERENCE",
                    ]),
                ),
            });
        },
    );
    return { requests, unexpected, releaseBase: () => releaseBase() };
}

// --- Consumer observations ---
type PlotTrace = { type: string; x: number[]; y: (number | string)[]; base?: number[]; hovertemplate?: string[] };

function region(page: Page, name: string) {
    return page.getByRole("region", { name, exact: true });
}

async function readTraces(page: Page, regionName: string): Promise<PlotTrace[]> {
    const plot = region(page, regionName).locator(".js-plotly-plot").first();
    await expect(plot).toBeVisible();
    return plot.evaluate((element) =>
        (element as unknown as { data: Record<string, unknown>[] }).data.map((trace) => ({
            type: String(trace.type),
            x: Array.from((trace.x as number[]) ?? []),
            y: Array.from((trace.y as (number | string)[]) ?? []),
            base: trace.base ? Array.from(trace.base as number[]) : undefined,
            hovertemplate: Array.isArray(trace.hovertemplate) ? (trace.hovertemplate as string[]) : undefined,
        })),
    );
}

/** Horizontal DistributionPlot bars carry values on x and realization keys on y. */
async function readBarValuesByKey(page: Page): Promise<[number, number][]> {
    const [trace] = await readTraces(page, "Distribution consumer");
    expect(trace.type).toBe("bar");
    return trace.y
        .map((key, index): [number, number] => [Number(key), trace.x[index]])
        .sort((first, second) => first[0] - second[0]);
}

function expectPairsClose(actual: [number, number][], expected: [number, number][]) {
    expect(actual.map(([key]) => key)).toEqual(expected.map(([key]) => key));
    actual.forEach(([, value], index) => expect(value).toBeCloseTo(expected[index][1], 4));
}

async function axisTitle(page: Page, regionName: string, axis: "x" | "y"): Promise<string> {
    return (await region(page, regionName).locator(`.${axis}title`).first().textContent()) ?? "";
}

type TitleLine = { text: string; clippedPx: number };

/** Each rendered title line with how far it extends beyond the plot's SVG viewport, which clips it. */
async function axisTitleLines(page: Page, regionName: string, axis: "x" | "y"): Promise<TitleLine[]> {
    return region(page, regionName)
        .locator(`.${axis}title`)
        .first()
        .evaluate((title) => {
            const viewport = title.closest("svg")!.getBoundingClientRect();
            const lines = title.querySelectorAll("tspan.line");
            return Array.from(lines.length > 0 ? lines : [title]).map((line) => {
                const box = line.getBoundingClientRect();
                return {
                    text: line.textContent ?? "",
                    clippedPx: Math.max(
                        0,
                        viewport.left - box.left,
                        box.right - viewport.right,
                        viewport.top - box.top,
                        box.bottom - viewport.bottom,
                    ),
                };
            });
        });
}

/** The unit line must be fully inside the plot, not merely present in the DOM. */
async function expectVisibleUnit(page: Page, axis: "x" | "y", unit: string) {
    const lines = await axisTitleLines(page, "Distribution consumer", axis);
    expect(lines.find((line) => line.text === `[${unit}]`)).toEqual({ text: `[${unit}]`, clippedPx: 0 });
}

/** Deferred acceptance: long metric/context lines may be clipped; record the measured overflow. */
async function recordTitleClipping(page: Page, axis: "x" | "y", label: string) {
    const [nameLine] = await axisTitleLines(page, "Distribution consumer", axis);
    test.info().annotations.push({
        type: "deferred: clipped DistributionPlot title",
        description: `${label}: ${nameLine.clippedPx.toFixed(0)} px outside the plot on each overflowing side of "${nameLine.text}"`,
    });
    return nameLine;
}

async function expectDistributionBars(page: Page, expected: [number, number][]) {
    await expect
        .poll(async () => (await readBarValuesByKey(page)).map(([key]) => key))
        .toEqual(expected.map(([key]) => key));
    expectPairsClose(await readBarValuesByKey(page), expected);
}

test("DistributionPlot receives regular full and early outputs keyed by actual realization with units", async ({
    mount,
    page,
    blockedExternalRequests,
}) => {
    const sources = await routeSources(page);
    await page.setViewportSize({ width: 1400, height: 900 });
    const component = await mount(
        <EconomicScreeningConnectedConsumersHarness {...DEFAULT_PROPS} distributionX={EARLY_DCF_CHANNEL} />,
    );

    // Early output through 2031 is valid for the partial-oil realization; its full oil results are not.
    await expectDistributionBars(
        page,
        expectedByKey(DESIGN_REALIZATIONS, (r) => expectedDcfThrough2031(DESIGN_MONTHLY_OIL[r])),
    );
    expect(await axisTitle(page, "Distribution consumer", "x")).toContain("Through 2031");
    await expectVisibleUnit(page, "x", "USD");

    await component.update(
        <EconomicScreeningConnectedConsumersHarness {...DEFAULT_PROPS} distributionX={NPV_CHANNEL} />,
    );
    const expectedNpvByKey = expectedByKey(FULL_OIL_KEYS, (r) => expectedNpv(DESIGN_MONTHLY_OIL[r]));
    await expectDistributionBars(page, expectedNpvByKey);
    expect(await axisTitle(page, "Distribution consumer", "x")).toContain("Net present value");
    await expectVisibleUnit(page, "x", "USD");
    expect((await recordTitleClipping(page, "x", "regular NPV bars")).text).toContain("Net present value");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/distribution-regular-npv-bars.png` });

    // X/Y: NPV lacks interior realization 5 while the early output has it, so zipping positions would misalign.
    const npvKeys = FULL_OIL_KEYS;
    const earlyKeys = DESIGN_REALIZATIONS;
    const positionalPairs = npvKeys.map((key, index) => [key, earlyKeys[index]]);
    expect(positionalPairs.some(([npvKey, earlyKey]) => npvKey !== earlyKey)).toBe(true);
    await component.update(
        <EconomicScreeningConnectedConsumersHarness
            {...DEFAULT_PROPS}
            distributionX={NPV_CHANNEL}
            distributionY={EARLY_DCF_CHANNEL}
            distributionPlotType={PlotType.Scatter}
        />,
    );
    await expect.poll(async () => (await readTraces(page, "Distribution consumer"))[0]?.type).toBe("scatter");
    const [scatter] = await readTraces(page, "Distribution consumer");
    const scatterKeys = scatter.hovertemplate!.map((text) => Number(/Realization: <b>(\d+)<\/b>/.exec(text)![1]));
    expect(scatterKeys).toEqual(FULL_OIL_KEYS);
    scatterKeys.forEach((key, index) => {
        expect(scatter.x[index]).toBeCloseTo(expectedNpv(DESIGN_MONTHLY_OIL[key]), 4);
        expect(scatter.y[index] as number).toBeCloseTo(expectedDcfThrough2031(DESIGN_MONTHLY_OIL[key]), 4);
    });
    expect(await axisTitle(page, "Distribution consumer", "y")).toContain("Through 2031");
    await expectVisibleUnit(page, "x", "USD");
    await expectVisibleUnit(page, "y", "USD");
    await recordTitleClipping(page, "x", "scatter X");
    await recordTitleClipping(page, "y", "scatter Y");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/distribution-regular-npv-vs-early-scatter.png` });

    expect(sources.requests.sort()).toEqual(["design:FGST", "design:FOPT", `vector_list:${DESIGN_CASE_UUID}`]);
    expect(sources.unexpected).toEqual([]);
    expect(blockedExternalRequests).toEqual(["https://cdn.eds.equinor.com/font/equinor-font.css"]);
});

const DESIGN_REQUESTS = ["design:FGST", "design:FOPT", `vector_list:${DESIGN_CASE_UUID}`];

async function readScatterByKey(page: Page): Promise<[number, number, number][]> {
    const [scatter] = await readTraces(page, "Distribution consumer");
    expect(scatter.type).toBe("scatter");
    return scatter.hovertemplate!.map((text, index) => [
        Number(/Realization: <b>(\d+)<\/b>/.exec(text)![1]),
        scatter.x[index],
        scatter.y[index] as number,
    ]);
}

async function expectDistributionMessage(page: Page, message: "No data on" | "Connect a channel to", axis: string) {
    const distribution = region(page, "Distribution consumer");
    await expect(distribution).toContainText(message);
    await expect(distribution).toContainText(axis);
    await expect(distribution.locator(".js-plotly-plot")).toHaveCount(0);
}

type Tornado = { names: string[]; low: number[]; high: number[]; lowBase: number[]; highBase: number[] };

async function readTornado(page: Page): Promise<Tornado> {
    const [low, high] = await readTraces(page, "Sensitivity consumer");
    return {
        names: low.y.map(String),
        low: low.x,
        high: high.x,
        lowBase: low.base ?? [],
        highBase: high.base ?? [],
    };
}

/** Relative scaling: each bar spans from zero to the case average minus the reference sensitivity average. */
function expectedDesignNpvTornado() {
    const npv = (realization: number) => expectedNpv(DESIGN_MONTHLY_OIL[realization]);
    // Realization 5 has no full NPV, so only keyed values 2 and 40 form the rms_seed reference.
    const referenceValues = [npv(2), npv(40)];
    const referenceAverage = (npv(2) + npv(40)) / 2;
    return {
        referenceAverage,
        names: ["perm", "poro", "rms_seed"],
        low: [npv(20) - referenceAverage, npv(9) - referenceAverage, quantile(referenceValues, 0.1) - referenceAverage],
        high: [
            npv(33) - referenceAverage,
            npv(14) - referenceAverage,
            quantile(referenceValues, 0.9) - referenceAverage,
        ],
    };
}

async function expectDesignNpvTornado(page: Page) {
    const expected = expectedDesignNpvTornado();
    await expect.poll(async () => (await readTornado(page)).names).toEqual(expected.names);
    const tornado = await readTornado(page);
    tornado.low.forEach((value, index) => expect(value).toBeCloseTo(expected.low[index], 4));
    tornado.high.forEach((value, index) => expect(value).toBeCloseTo(expected.high[index], 4));
    expect([...tornado.lowBase, ...tornado.highBase].every((base) => base === 0)).toBe(true);
    const compact = Intl.NumberFormat("en", {
        notation: "compact",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(expected.referenceAverage);
    await expect(region(page, "Sensitivity consumer").locator(".annotation-text", { hasText: "(Ref avg)" })).toHaveText(
        `${compact} (Ref avg)`,
    );
}

/** The response unit computed by SensitivityPlot's own hook and processing; its chart does not render units. */
function sensitivityResponseUnit(page: Page) {
    return page.getByTestId("sensitivity-response-unit");
}

async function expectSensitivityWithoutTornado(page: Page, ...messages: string[]) {
    const sensitivity = region(page, "Sensitivity consumer");
    for (const message of messages) {
        await expect(sensitivity).toContainText(message);
    }
    await expect(sensitivity.locator(".js-plotly-plot")).toHaveCount(0);
}

test("SensitivityPlot builds a regular designed-sensitivity tornado and rejects a delta connection without stale bars", async ({
    mount,
    page,
}) => {
    const sources = await routeSources(page);
    await page.setViewportSize({ width: 1400, height: 900 });
    const props = { ...DEFAULT_PROPS, distributionX: NPV_CHANNEL, sensitivityResponse: NPV_CHANNEL };
    const component = await mount(<EconomicScreeningConnectedConsumersHarness {...props} />);

    await expect(
        region(page, "Sensitivity consumer settings").getByRole("combobox", { name: "Reference sensitivity" }),
    ).toHaveValue("rms_seed");
    await expectDesignNpvTornado(page);
    await expect(sensitivityResponseUnit(page)).toHaveText("USD");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/sensitivity-regular-npv-tornado.png` });

    // The unit follows the connected channel: IRR arrives in percent through the same hook and processing.
    await component.update(<EconomicScreeningConnectedConsumersHarness {...props} sensitivityResponse={IRR_CHANNEL} />);
    await expect(sensitivityResponseUnit(page)).toHaveText("%");
    await component.update(<EconomicScreeningConnectedConsumersHarness {...props} />);
    await expect(sensitivityResponseUnit(page)).toHaveText("USD");

    await component.update(<EconomicScreeningConnectedConsumersHarness {...props} producerEnsemble="delta" />);
    // Delta identity reaches the consumer: it recognises the delta ensemble instead of an invalid one.
    await expectSensitivityWithoutTornado(
        page,
        "Delta ensemble detected in data channel.",
        "Unable to compute sensitivity responses.",
    );
    await expect(region(page, "Sensitivity consumer settings")).toContainText(
        "Delta ensemble detected in the data channel.",
    );
    const expectedDeltaNpv = expectedByKey(DELTA_REALIZATIONS, (r) => expectedNpv(DELTA_MONTHLY_OIL[r]));
    expect(expectedDeltaNpv.some(([, value]) => value < 0) && expectedDeltaNpv.some(([, value]) => value > 0)).toBe(
        true,
    );
    await expectDistributionBars(page, expectedDeltaNpv);
    const deltaTitle = await axisTitle(page, "Distribution consumer", "x");
    expect(deltaTitle).toContain(") - (");
    await expectVisibleUnit(page, "x", "USD");
    await expect(sensitivityResponseUnit(page)).toHaveText("");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/sensitivity-delta-unsupported-and-delta-distribution.png` });

    await component.update(<EconomicScreeningConnectedConsumersHarness {...props} />);
    await expectDesignNpvTornado(page);
    await expectDistributionBars(
        page,
        expectedByKey(FULL_OIL_KEYS, (r) => expectedNpv(DESIGN_MONTHLY_OIL[r])),
    );

    expect(sources.requests.sort()).toEqual(
        [
            ...DESIGN_REQUESTS,
            "delta:FGST",
            "delta:FOPT",
            "delta_vector_list",
            `diagnostics:${BASE_CASE_UUID}:FGCT`,
            `diagnostics:${DESIGN_CASE_UUID}:FGCT`,
        ].sort(),
    );
    expect(sources.unexpected).toEqual([]);
});

test("consumers withdraw and recover producer outputs for drafts, early settings and disconnects", async ({
    mount,
    page,
}) => {
    const sources = await routeSources(page);
    await page.setViewportSize({ width: 1400, height: 900 });
    const props: ConnectedConsumersHarnessProps = {
        ...DEFAULT_PROPS,
        distributionX: NPV_CHANNEL,
        sensitivityResponse: NPV_CHANNEL,
    };
    const component = await mount(<EconomicScreeningConnectedConsumersHarness {...props} />);
    const expectedNpvByKey = expectedByKey(FULL_OIL_KEYS, (r) => expectedNpv(DESIGN_MONTHLY_OIL[r]));
    await expectDistributionBars(page, expectedNpvByKey);
    await expectDesignNpvTornado(page);

    // Invalid financial draft: financial outputs disappear from both consumers.
    await component.update(<EconomicScreeningConnectedConsumersHarness {...props} costDraftValid={false} />);
    await expectDistributionMessage(page, "No data on", "X axis");
    await expectSensitivityWithoutTornado(page, "No data received on channel");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/withdrawn-invalid-cost-draft.png` });

    // Volumes, full and early, remain available with the draft still invalid.
    await component.update(
        <EconomicScreeningConnectedConsumersHarness {...props} costDraftValid={false} distributionX={OIL_CHANNEL} />,
    );
    await expectDistributionBars(
        page,
        expectedByKey(FULL_OIL_KEYS, (r) => DESIGN_MONTHLY_OIL[r] * D_FULL),
    );
    await component.update(
        <EconomicScreeningConnectedConsumersHarness
            {...props}
            costDraftValid={false}
            distributionX={EARLY_OIL_CHANNEL}
        />,
    );
    await test.step("early oil volume remains with an invalid draft", () =>
        expectDistributionBars(
            page,
            expectedByKey(DESIGN_REALIZATIONS, (r) => DESIGN_MONTHLY_OIL[r] * D_THROUGH_2031),
        ));
    await component.update(
        <EconomicScreeningConnectedConsumersHarness
            {...props}
            costDraftValid={false}
            distributionX={EARLY_DCF_CHANNEL}
        />,
    );
    await expectDistributionMessage(page, "No data on", "X axis");

    // Recovery republishes the same financial values.
    await component.update(<EconomicScreeningConnectedConsumersHarness {...props} />);
    await expectDistributionBars(page, expectedNpvByKey);
    await expectDesignNpvTornado(page);

    // Early settings affect only the early output; the full-NPV tornado stays unchanged throughout.
    const scatterProps = { ...props, distributionY: EARLY_DCF_CHANNEL, distributionPlotType: PlotType.Scatter };
    await component.update(<EconomicScreeningConnectedConsumersHarness {...scatterProps} />);
    await expect.poll(async () => (await readScatterByKey(page)).map(([key]) => key)).toEqual(FULL_OIL_KEYS);
    for (const early of [
        { enabled: false, endYear: 2031 },
        { enabled: true, endYear: 2040 },
    ]) {
        await component.update(<EconomicScreeningConnectedConsumersHarness {...scatterProps} early={early} />);
        await expectDistributionMessage(page, "No data on", "Y axis");
        await expectDesignNpvTornado(page);
    }
    await component.update(
        <EconomicScreeningConnectedConsumersHarness {...scatterProps} early={{ enabled: true, endYear: 2030 }} />,
    );
    // Through 2030 only the mid-year CAPEX has occurred.
    await expect.poll(async () => (await readScatterByKey(page))[0]?.[2]).toBeCloseTo(-CAPEX_PV, 4);
    const through2030 = await readScatterByKey(page);
    expect(through2030.map(([key]) => key)).toEqual(FULL_OIL_KEYS);
    through2030.forEach(([key, x, y]) => {
        expect(x).toBeCloseTo(expectedNpv(DESIGN_MONTHLY_OIL[key]), 4);
        expect(y).toBeCloseTo(-CAPEX_PV, 4);
    });
    expect(await axisTitle(page, "Distribution consumer", "y")).toContain("Through 2030");
    await expectDesignNpvTornado(page);
    await component.update(<EconomicScreeningConnectedConsumersHarness {...scatterProps} />);
    await expect.poll(async () => (await readScatterByKey(page))[0]?.[2]).toBeCloseTo(expectedDcfThrough2031(1000), 4);

    // Producer display choices change neither consumer values nor source requests.
    const scatterBefore = await readScatterByKey(page);
    await component.update(
        <EconomicScreeningConnectedConsumersHarness
            {...scatterProps}
            producerDisplay={{
                resultMode: ResultMode.ALL_RESULTS,
                measure: EconomicMeasure.IRR,
                plotType: DistributionPlotType.HISTOGRAM,
            }}
        />,
    );
    await expect(region(page, "Producer view").getByRole("table").first()).toBeVisible();
    expect(await readScatterByKey(page)).toEqual(scatterBefore);
    await expectDesignNpvTornado(page);

    // Disconnecting uses the framework lifecycle; reconnecting restores current contents.
    await component.update(
        <EconomicScreeningConnectedConsumersHarness
            {...scatterProps}
            distributionY={null}
            sensitivityResponse={null}
        />,
    );
    await expectDistributionMessage(page, "Connect a channel to", "Y axis");
    await expectSensitivityWithoutTornado(page, "Data channel required for use.");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/disconnected-consumers.png` });
    await component.update(<EconomicScreeningConnectedConsumersHarness {...scatterProps} />);
    await expect.poll(async () => await readScatterByKey(page)).toEqual(scatterBefore);
    await expectDesignNpvTornado(page);

    expect(sources.requests.sort()).toEqual(DESIGN_REQUESTS);
    expect(sources.unexpected).toEqual([]);
});

test("a delayed ensemble switch never shows the previous ensemble's contents as current", async ({ mount, page }) => {
    const sources = await routeSources(page, { base: "delayed" });
    await page.setViewportSize({ width: 1400, height: 900 });
    const props = { ...DEFAULT_PROPS, distributionX: NPV_CHANNEL, sensitivityResponse: NPV_CHANNEL };
    const component = await mount(<EconomicScreeningConnectedConsumersHarness {...props} />);
    await expectDistributionBars(
        page,
        expectedByKey(FULL_OIL_KEYS, (r) => expectedNpv(DESIGN_MONTHLY_OIL[r])),
    );
    await expectDesignNpvTornado(page);

    await component.update(<EconomicScreeningConnectedConsumersHarness {...props} producerEnsemble="base" />);
    await expect
        .poll(() => sources.requests.filter((request) => request.startsWith("base:")).sort())
        .toEqual(["base:FGST", "base:FOPT"]);
    await expectDistributionMessage(page, "No data on", "X axis");
    await expectSensitivityWithoutTornado(page, "No data received on channel");

    sources.releaseBase();
    await expectDistributionBars(
        page,
        expectedByKey(BASE_REALIZATIONS, (r) => expectedNpv(BASE_MONTHLY_OIL[r])),
    );
    // The base ensemble has no design matrix, so no tornado is drawn rather than the previous one.
    await expectSensitivityWithoutTornado(page, "No sensitivities available");
    expect(sources.requests.sort()).toEqual(
        [...DESIGN_REQUESTS, "base:FGST", "base:FOPT", `vector_list:${BASE_CASE_UUID}`].sort(),
    );
    expect(sources.unexpected).toEqual([]);
});

test("a failed ensemble switch stays unavailable and switching back recovers without refetching", async ({
    mount,
    page,
}) => {
    const sources = await routeSources(page, { base: "failed" });
    await page.setViewportSize({ width: 1400, height: 900 });
    const props = { ...DEFAULT_PROPS, distributionX: NPV_CHANNEL, sensitivityResponse: NPV_CHANNEL };
    const component = await mount(<EconomicScreeningConnectedConsumersHarness {...props} />);
    const expectedNpvByKey = expectedByKey(FULL_OIL_KEYS, (r) => expectedNpv(DESIGN_MONTHLY_OIL[r]));
    await expectDistributionBars(page, expectedNpvByKey);

    await component.update(<EconomicScreeningConnectedConsumersHarness {...props} producerEnsemble="base" />);
    await expect(region(page, "Producer view")).toContainText(
        "Select an ensemble with oil or sales-gas production data to compute economic results.",
    );
    await expectDistributionMessage(page, "No data on", "X axis");
    await expectSensitivityWithoutTornado(page, "No data received on channel");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/failed-switch-unavailable.png` });

    await component.update(<EconomicScreeningConnectedConsumersHarness {...props} />);
    await expectDistributionBars(page, expectedNpvByKey);
    await expectDesignNpvTornado(page);
    expect(sources.requests.sort()).toEqual(
        [...DESIGN_REQUESTS, "base:FGST", "base:FOPT", `vector_list:${BASE_CASE_UUID}`].sort(),
    );
    expect(sources.unexpected).toEqual([]);
});

test("representative NPV, volume, IRR and break-even units reach DistributionPlot", async ({ mount, page }) => {
    const sources = await routeSources(page);
    await page.setViewportSize({ width: 1400, height: 900 });
    const component = await mount(
        <EconomicScreeningConnectedConsumersHarness {...DEFAULT_PROPS} distributionX={IRR_CHANNEL} />,
    );
    const oil = (realization: number) => DESIGN_MONTHLY_OIL[realization];

    await expect.poll(async () => (await readBarValuesByKey(page)).map(([key]) => key)).toEqual(FULL_OIL_KEYS);
    for (const [realization, irrPercent] of await readBarValuesByKey(page)) {
        // Published in percent: the corresponding rate is a root of the realization's cash flow.
        expect(Math.abs(npvAtRate(oil(realization), irrPercent / 100)) / CAPEX_2030_USD).toBeLessThan(1e-6);
    }
    expect(await axisTitle(page, "Distribution consumer", "x")).toContain("Internal rate of return");
    await expectVisibleUnit(page, "x", "%");

    await component.update(
        <EconomicScreeningConnectedConsumersHarness {...DEFAULT_PROPS} distributionX={BREAK_EVEN_CHANNEL} />,
    );
    await expectDistributionBars(
        page,
        expectedByKey(FULL_OIL_KEYS, (r) => expectedBreakEven(oil(r))),
    );
    await expectVisibleUnit(page, "x", "USD per Sm³");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/distribution-break-even-units.png` });

    await component.update(
        <EconomicScreeningConnectedConsumersHarness {...DEFAULT_PROPS} distributionX={GAS_CHANNEL} />,
    );
    await expectDistributionBars(
        page,
        expectedByKey(DESIGN_REALIZATIONS, (r) => GAS_SM3_PER_OIL_SM3 * oil(r) * D_FULL),
    );
    await expectVisibleUnit(page, "x", "Sm³");

    await component.update(
        <EconomicScreeningConnectedConsumersHarness {...DEFAULT_PROPS} distributionX={NPV_CHANNEL} />,
    );
    await expectDistributionBars(
        page,
        expectedByKey(FULL_OIL_KEYS, (r) => expectedNpv(oil(r))),
    );
    await expectVisibleUnit(page, "x", "USD");

    expect(sources.requests.sort()).toEqual(DESIGN_REQUESTS);
    expect(sources.unexpected).toEqual([]);
});
