import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Page } from "@playwright/test";

import { PlotType } from "@modules/DistributionPlot/typesAndEnums";
import { EARLY_MEASURE_CHANNEL_ID_MAP, MEASURE_CHANNEL_ID_MAP } from "@modules/EconomicScreening/channelDefs";
import { EarlyEconomicMeasure, EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";

import {
    EconomicScreeningConnectedConsumersHarness,
    type ConnectedConsumersHarnessProps,
    type HarnessObservation,
} from "./support/EconomicScreeningConnectedConsumersHarness";
import {
    makeScaleRealizationIds,
    makeScaleVectorResponse,
    SCALE_BASE_INPUTS,
    SCALE_CASE_UUID,
    SCALE_FIRST_YEAR,
    SCALE_LAST_YEAR,
    SCALE_SHORT_OIL_INDEX,
    scaleReferenceEconomics,
    scaleServedMonthlyVolumes,
    type ScaleEconomicInputs,
} from "./support/economicScreeningConnectedFixtures";
import { expect, test } from "./support/offlineComponentTest";

// 500 realizations x 360 months through the real producer Settings, View, publishers and DistributionPlot.
test.describe.configure({ timeout: 180_000 });

const REALIZATIONS = makeScaleRealizationIds(500);
const SHORT_OIL_REALIZATION = REALIZATIONS[SCALE_SHORT_OIL_INDEX];
const NPV_CHANNEL = MEASURE_CHANNEL_ID_MAP[EconomicMeasure.NPV];
const IRR_CHANNEL = MEASURE_CHANNEL_ID_MAP[EconomicMeasure.IRR];
const BREAK_EVEN_CHANNEL = MEASURE_CHANNEL_ID_MAP[EconomicMeasure.BREAK_EVEN_OIL_PRICE];
const OIL_CHANNEL = MEASURE_CHANNEL_ID_MAP[EconomicMeasure.DISCOUNTED_OIL_VOLUME];
const EARLY_DCF_CHANNEL = EARLY_MEASURE_CHANNEL_ID_MAP[EarlyEconomicMeasure.DISCOUNTED_CASH_FLOW];
const EARLY_OIL_CHANNEL = EARLY_MEASURE_CHANNEL_ID_MAP[EarlyEconomicMeasure.DISCOUNTED_OIL_VOLUME];
const INITIAL_EARLY_END_YEAR = 2034;

const PROPS: ConnectedConsumersHarnessProps = {
    producerEnsemble: "scale",
    producerSettingsOpen: true,
    initialEconomics: SCALE_BASE_INPUTS,
    costDraftValid: true,
    early: { enabled: true, endYear: INITIAL_EARLY_END_YEAR },
    distributionX: NPV_CHANNEL,
    distributionY: EARLY_DCF_CHANNEL,
    distributionPlotType: PlotType.Scatter,
    sensitivityResponse: null,
};

// --- Offline sources: generated once in Node, outside every measured interval. ---
const payloads = new Map<string, string>();
function payload(vectorName: "FOPT" | "FGST"): string {
    if (!payloads.has(vectorName)) {
        // Gas arrives in reverse realization order, so products must be joined by realization.
        const order = vectorName === "FGST" ? [...REALIZATIONS].reverse() : undefined;
        payloads.set(vectorName, JSON.stringify(makeScaleVectorResponse(REALIZATIONS, vectorName, { order })));
    }
    return payloads.get(vectorName)!;
}

async function routeScaleSources(page: Page) {
    const requests: string[] = [];
    const unexpected: string[] = [];
    const rejectUnexpected = (route: Parameters<Parameters<Page["route"]>[1]>[0]) => {
        unexpected.push(route.request().url());
        return route.fulfill({ status: 500, json: { detail: "Unexpected fixture request" } });
    };
    await page.route((url) => url.pathname.startsWith("/api/"), rejectUnexpected);
    await page.route(
        (url) => url.pathname.startsWith("/api/timeseries/vector_list/"),
        (route) => {
            if (new URL(route.request().url()).searchParams.get("case_uuid") !== SCALE_CASE_UUID) {
                return rejectUnexpected(route);
            }
            requests.push("vector_list");
            return route.fulfill({
                json: [
                    { name: "FOPT", descriptiveName: "FOPT", hasHistorical: false },
                    { name: "FGST", descriptiveName: "FGST", hasHistorical: false },
                ],
            });
        },
    );
    await page.route(
        (url) => url.pathname.startsWith("/api/timeseries/realizations_vector_data/"),
        (route) => {
            const params = new URL(route.request().url()).searchParams;
            const vectorName = params.get("vector_name");
            if (
                params.get("case_uuid") !== SCALE_CASE_UUID ||
                (vectorName !== "FOPT" && vectorName !== "FGST") ||
                params.get("resampling_frequency") !== "MONTHLY" ||
                params.get("include_source_coverage") !== "true"
            ) {
                return rejectUnexpected(route);
            }
            requests.push(vectorName);
            return route.fulfill({ body: payload(vectorName), contentType: "application/json" });
        },
    );
    return { requests, unexpected };
}

// --- Independent expectations from the fixture's reference formulas. ---
type ScaleState = { inputs: ScaleEconomicInputs; earlyEndYear: number; filtered: number[] | null };

function expectedByRealization(state: ScaleState) {
    return (state.filtered ?? REALIZATIONS).map((realization) => ({
        realization,
        hasFullOil: realization !== SHORT_OIL_REALIZATION,
        ...scaleReferenceEconomics(
            scaleServedMonthlyVolumes(REALIZATIONS, realization, "oil"),
            scaleServedMonthlyVolumes(REALIZATIONS, realization, "gas"),
            state.inputs,
            state.earlyEndYear,
        ),
    }));
}

/** Scatter of full NPV against early DCF: keys present in both channels, identified by count and sums. */
function expectedScatter(state: ScaleState) {
    const plotted = expectedByRealization(state).filter((expected) => expected.hasFullOil);
    return {
        count: plotted.length,
        sumX: plotted.reduce((sum, expected) => sum + expected.npv, 0),
        sumY: plotted.reduce((sum, expected) => sum + expected.earlyDcf, 0),
    };
}

// --- Page observation ---
type ProducerChannel = {
    channelIdString: string;
    contents: {
        contentIdString: string;
        displayName: string;
        metaData: { unit?: string; displayString?: string; ensembleIdentString: string };
        data: [number, number][];
    }[];
};
type HarnessWindow = {
    economicScreeningObservations: HarnessObservation[];
    readEconomicScreeningProducerChannels: () => ProducerChannel[];
};

async function readProducerChannels(page: Page): Promise<Map<string, ProducerChannel["contents"]>> {
    const channels = await page.evaluate(() =>
        (window as unknown as HarnessWindow).readEconomicScreeningProducerChannels(),
    );
    return new Map(channels.map((channel) => [channel.channelIdString, channel.contents]));
}

async function observationCount(page: Page): Promise<number> {
    return page.evaluate(() => (window as unknown as HarnessWindow).economicScreeningObservations.length);
}

async function observationsSince(page: Page, marker: number): Promise<HarnessObservation[]> {
    return page.evaluate(
        (from) => (window as unknown as HarnessWindow).economicScreeningObservations.slice(from),
        marker,
    );
}

/** Records keystroke input events and main-thread long tasks on the harness timeline. */
async function observeInputAndLongTasks(page: Page) {
    await page.evaluate(() => {
        const push = (observation: HarnessObservation) =>
            (window as unknown as HarnessWindow).economicScreeningObservations.push(observation);
        document.addEventListener("input", () => push({ t: performance.now(), event: "input" }), true);
        new PerformanceObserver((list) =>
            list.getEntries().forEach((entry) => push({ t: entry.startTime, event: "longtask", keys: entry.duration })),
        ).observe({ type: "longtask" });
    });
}

/**
 * Resolves with the page time of the first animation frame at which the consumer's plotly data shows the expected
 * scatter; started before an edit, so it cannot observe an earlier frame.
 */
function watchRender(page: Page, expected: ReturnType<typeof expectedScatter>): Promise<number> {
    return page.evaluate(
        (target) =>
            new Promise<number>((resolve, reject) => {
                const deadline = performance.now() + 30_000;
                const isClose = (actual: number, wanted: number) =>
                    Math.abs(actual - wanted) <= 1e-9 * Math.max(1, Math.abs(wanted));
                const check = () => {
                    const plot = document.querySelector('section[aria-label="Distribution consumer"] .js-plotly-plot');
                    const trace = (plot as unknown as { data?: { x: number[]; y: number[] }[] } | null)?.data?.[0];
                    if (trace && trace.x.length === target.count && trace.y.length === target.count) {
                        const sumX = Array.from(trace.x).reduce((sum, value) => sum + value, 0);
                        const sumY = Array.from(trace.y).reduce((sum, value) => sum + value, 0);
                        if (isClose(sumX, target.sumX) && isClose(sumY, target.sumY)) {
                            resolve(performance.now());
                            return;
                        }
                    }
                    if (performance.now() > deadline) {
                        const actual = trace
                            ? {
                                  count: trace.x.length,
                                  sumX: Array.from(trace.x).reduce((sum, value) => sum + value, 0),
                                  sumY: Array.from(trace.y).reduce((sum, value) => sum + value, 0),
                              }
                            : document.body.innerText.slice(0, 1500);
                        reject(new Error(`Expected ${JSON.stringify(target)}, rendered ${JSON.stringify(actual)}`));
                        return;
                    }
                    requestAnimationFrame(check);
                };
                check();
            }),
        expected,
    );
}

function settingsRegion(page: Page) {
    return page.getByRole("region", { name: "Producer settings" });
}

async function openSection(page: Page, title: string) {
    const trigger = settingsRegion(page).getByRole("button", { name: title, exact: true });
    if ((await trigger.getAttribute("aria-expanded")) !== "true") {
        await trigger.click();
    }
}

const inputs = {
    oilPrice: (page: Page) => settingsRegion(page).getByRole("textbox", { name: /^Oil price/ }),
    gasPrice: (page: Page) => settingsRegion(page).getByRole("textbox", { name: /^Gas price/ }),
    discountRate: (page: Page) => settingsRegion(page).getByRole("textbox", { name: /^Discount rate/ }),
    earlyYear: (page: Page) =>
        settingsRegion(page).getByRole("textbox", { name: /^Publish cumulative results through year/ }),
    // The cell's aria-label names its group; the input itself is named by the enclosing field label.
    cost: (page: Page, kind: "CAPEX" | "OPEX", year: number) =>
        settingsRegion(page)
            .getByRole("group", { name: `${kind} ${year}`, exact: true })
            .getByRole("textbox"),
};

async function openEditableSections(page: Page) {
    for (const title of ["Advanced", "Prices", "Costs"]) {
        await openSection(page, title);
    }
    await expect(inputs.oilPrice(page)).toBeVisible();
    await expect(inputs.cost(page, "OPEX", 2040)).toBeVisible();
}

/** Clears and types character by character, so each keystroke is a separate browser event. */
async function typeValue(page: Page, locator: ReturnType<typeof inputs.oilPrice>, text: string) {
    await locator.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type(text);
}

function withCost(state: ScaleState, year: number, change: { capex?: number; opex?: number }): ScaleState {
    return {
        ...state,
        inputs: {
            ...state.inputs,
            costs: state.inputs.costs.map((cost) => (cost.year === year ? { ...cost, ...change } : cost)),
        },
    };
}

function withInputs(state: ScaleState, change: Partial<ScaleEconomicInputs>): ScaleState {
    return { ...state, inputs: { ...state.inputs, ...change } };
}

const BASE_STATE: ScaleState = { inputs: SCALE_BASE_INPUTS, earlyEndYear: INITIAL_EARLY_END_YEAR, filtered: null };

/** Checks every published full and early key against the reference, plus units and assumption context. */
async function expectPublishedState(page: Page, state: ScaleState, options: { financial: boolean }) {
    const channels = await readProducerChannels(page);
    const expected = expectedByRealization(state);
    const fullOil = expected.filter((entry) => entry.hasFullOil);
    const contentOf = (channelIdString: string) => {
        const contents = channels.get(channelIdString)!;
        return contents.length === 0 ? null : contents[0];
    };
    const expectKeyedValues = (
        channelIdString: string,
        entries: typeof expected,
        valueOf: (e: (typeof expected)[number]) => number,
    ) => {
        const content = contentOf(channelIdString)!;
        expect(content.data.map(([key]) => key)).toEqual(entries.map((entry) => entry.realization));
        content.data.forEach(([, value], index) => {
            const wanted = valueOf(entries[index]);
            expect(Math.abs(value - wanted)).toBeLessThanOrEqual(1e-7 * Math.max(1, Math.abs(wanted)));
        });
        return content;
    };

    const oil = expectKeyedValues(OIL_CHANNEL, fullOil, (entry) => entry.discountedOil);
    expect(oil.metaData.unit).toBe("Sm³");
    const earlyOil = expectKeyedValues(EARLY_OIL_CHANNEL, expected, (entry) => entry.earlyDiscountedOil);
    expect(earlyOil.metaData.displayString).toContain(`Through ${state.earlyEndYear}`);
    if (!options.financial) {
        expect(contentOf(NPV_CHANNEL)).toBeNull();
        expect(contentOf(IRR_CHANNEL)).toBeNull();
        expect(contentOf(BREAK_EVEN_CHANNEL)).toBeNull();
        expect(contentOf(EARLY_DCF_CHANNEL)).toBeNull();
        return;
    }
    const npv = expectKeyedValues(NPV_CHANNEL, fullOil, (entry) => entry.npv);
    expect(npv.metaData.unit).toBe("USD");
    for (const context of [
        `Discount rate ${state.inputs.discountRatePercent}%`,
        `Valuation 1 Jan ${state.inputs.predictionStartYear}`,
        `Evaluation ${state.inputs.predictionStartYear}-${SCALE_LAST_YEAR}`,
        "Currency USD",
    ]) {
        expect(npv.metaData.displayString).toContain(context);
    }
    const breakEven = expectKeyedValues(BREAK_EVEN_CHANNEL, fullOil, (entry) => entry.breakEvenOilPrice);
    expect(breakEven.metaData.unit).toBe("USD per Sm³");
    const earlyDcf = expectKeyedValues(EARLY_DCF_CHANNEL, expected, (entry) => entry.earlyDcf);
    expect(earlyDcf.metaData.unit).toBe("USD");
    expect(earlyDcf.metaData.displayString).toContain(`Through ${state.earlyEndYear}`);

    // Every regular IRR is finite; each published rate is a root of that realization's own cash flow.
    const irr = contentOf(IRR_CHANNEL)!;
    expect(irr.metaData.unit).toBe("%");
    expect(irr.data.map(([key]) => key)).toEqual(fullOil.map((entry) => entry.realization));
    for (const index of [0, 1, 200, irr.data.length - 1]) {
        const [realization, irrPercent] = irr.data[index];
        expect(Number.isFinite(irrPercent)).toBe(true);
        const residual = scaleReferenceEconomics(
            scaleServedMonthlyVolumes(REALIZATIONS, realization, "oil"),
            scaleServedMonthlyVolumes(REALIZATIONS, realization, "gas"),
            state.inputs,
            null,
            irrPercent / 100,
        ).npv;
        expect(Math.abs(residual) / 4_000_000).toBeLessThan(1e-6);
    }
    expect(
        [npv, breakEven, earlyDcf, irr].every((content) =>
            content.metaData.ensembleIdentString.includes(SCALE_CASE_UUID),
        ),
    ).toBe(true);
}

test("500 realizations: rapid Settings edits, invalid draft, display changes and filtering publish the final state", async ({
    mount,
    page,
}) => {
    const sources = await routeScaleSources(page);
    await page.setViewportSize({ width: 1400, height: 1000 });
    const component = await mount(<EconomicScreeningConnectedConsumersHarness {...PROPS} />);
    await watchRender(page, expectedScatter(BASE_STATE));
    await expectPublishedState(page, BASE_STATE, { financial: true });
    await openEditableSections(page);
    await observeInputAndLongTasks(page);

    // A burst of distinct edits, each its own browser turn; debounced price and cost fields are re-edited quickly.
    await typeValue(page, inputs.oilPrice(page), "45");
    await typeValue(page, inputs.oilPrice(page), "47");
    await typeValue(page, inputs.gasPrice(page), "0.18");
    await typeValue(page, inputs.discountRate(page), "7");
    await typeValue(page, inputs.cost(page, "OPEX", 2040), "50000");
    await typeValue(page, inputs.cost(page, "CAPEX", SCALE_FIRST_YEAR), "4200000");
    // Intermediate years 2, 20 and 203 are outside the horizon and withdraw only the early outputs.
    await typeValue(page, inputs.earlyYear(page), "2036");
    await typeValue(page, inputs.oilPrice(page), "46");
    let state: ScaleState = withCost(
        withCost(
            withInputs({ ...BASE_STATE, earlyEndYear: 2036 }, { oilPrice: 46, gasPrice: 0.18, discountRatePercent: 7 }),
            2040,
            { opex: 50_000 },
        ),
        SCALE_FIRST_YEAR,
        { capex: 4_200_000 },
    );
    await watchRender(page, expectedScatter(state));
    await expectPublishedState(page, state, { financial: true });

    // No later publication replaces the final state after the debounce window has passed.
    const settledMarker = await observationCount(page);
    const settledChannels = await readProducerChannels(page);
    await page.waitForTimeout(1_200);
    expect((await observationsSince(page, settledMarker)).filter((entry) => entry.event !== "longtask")).toEqual([]);
    expect(await readProducerChannels(page)).toEqual(settledChannels);

    // Typing a cost holds the Settings draft invalid until its debounced commit; financial outputs withdraw meanwhile.
    const draftMarker = await observationCount(page);
    state = withCost(state, 2041, { opex: 55_000 });
    await typeValue(page, inputs.cost(page, "OPEX", 2041), "55000");
    await watchRender(page, expectedScatter(state));
    const draftEvents = (await observationsSince(page, draftMarker)).filter((entry) =>
        ["commit:costProfileAtom", "received:channelX"].includes(entry.event),
    );
    const withdrawal = draftEvents.findIndex((entry) => entry.event === "received:channelX" && entry.keys === 0);
    const costCommit = draftEvents.findIndex((entry) => entry.event === "commit:costProfileAtom");
    expect(withdrawal).toBeGreaterThan(-1);
    expect(withdrawal).toBeLessThan(costCommit);
    expect(draftEvents.at(-1)).toMatchObject({ event: "received:channelX", keys: REALIZATIONS.length - 1 });
    await expectPublishedState(page, state, { financial: true });

    // A held invalid draft withdraws financial outputs but keeps full and early volumes; validity recovers them.
    await component.update(<EconomicScreeningConnectedConsumersHarness {...PROPS} costDraftValid={false} />);
    await expect.poll(async () => (await readProducerChannels(page)).get(NPV_CHANNEL)!.length).toBe(0);
    await expectPublishedState(page, state, { financial: false });
    await component.update(<EconomicScreeningConnectedConsumersHarness {...PROPS} />);
    await watchRender(page, expectedScatter(state));
    await expectPublishedState(page, state, { financial: true });

    // Display-only choices neither republish nor change values.
    const displayMarker = await observationCount(page);
    const beforeDisplay = await readProducerChannels(page);
    const showRadio = (name: string) =>
        settingsRegion(page).getByRole("radiogroup", { name: "Show" }).getByRole("radio", { name });
    await showRadio("All results").click();
    await expect(page.getByRole("region", { name: "Producer view" }).getByRole("table").first()).toBeVisible();
    await showRadio("Time profile").click();
    await showRadio("Distribution").click();
    expect(await readProducerChannels(page)).toEqual(beforeDisplay);
    expect(
        (await observationsSince(page, displayMarker)).filter((entry) => entry.event.startsWith("received:")),
    ).toEqual([]);

    // Filtering narrows keys without rebasing values, horizon or cost years, and without refetching.
    const filtered = REALIZATIONS.filter((_, index) => index % 2 === 0);
    await component.update(<EconomicScreeningConnectedConsumersHarness {...PROPS} filteredRealizations={filtered} />);
    state = { ...state, filtered };
    await watchRender(page, expectedScatter(state));
    await expectPublishedState(page, state, { financial: true });
    await expect(inputs.cost(page, "OPEX", SCALE_LAST_YEAR)).toBeVisible();
    await expect(inputs.cost(page, "OPEX", SCALE_LAST_YEAR + 1)).toHaveCount(0);
    await component.update(<EconomicScreeningConnectedConsumersHarness {...PROPS} filteredRealizations={null} />);
    state = { ...state, filtered: null };
    await watchRender(page, expectedScatter(state));
    await expectPublishedState(page, state, { financial: true });

    expect(sources.requests.sort()).toEqual(["FGST", "FOPT", "vector_list"]);
    expect(sources.unexpected).toEqual([]);
});

// --- Opt-in measurements; no thresholds. ---
/**
 * Jotai listeners, which timestamp a Settings commit, run after the store's synchronous recalculation, so the task
 * that performed the write is located through the long-task entry containing that commit.
 */
type EditTiming = {
    lastInputToWriteTaskMs: number | null;
    writeTaskMs: number | null;
    writeTaskStartToRenderMs: number | null;
    commitListenerToReceivedMs: number | null;
    commitListenerToRenderMs: number | null;
    lastInputToRenderMs: number | null;
    receivedNotifications: number;
    longTaskTotalMs: number;
};

function summarize(values: (number | null)[]) {
    const samples = values.filter((value): value is number => value !== null).sort((first, second) => first - second);
    if (samples.length === 0) return { n: 0 };
    const middle = Math.floor(samples.length / 2);
    const median = samples.length % 2 ? samples[middle] : (samples[middle - 1] + samples[middle]) / 2;
    return {
        n: samples.length,
        median: +median.toFixed(1),
        min: +samples[0].toFixed(1),
        max: +samples.at(-1)!.toFixed(1),
    };
}

async function timedEdit(page: Page, commitEvent: string, expected: ScaleState, edit: () => Promise<void>) {
    const marker = await observationCount(page);
    const render = watchRender(page, expectedScatter(expected));
    await edit();
    const renderT = await render;
    const observations = await observationsSince(page, marker);
    const commit = observations.filter((entry) => entry.event === commitEvent).at(-1);
    const input = observations.filter((entry) => entry.event === "input" && (!commit || entry.t <= commit.t)).at(-1);
    const received = commit
        ? observations.find(
              (entry) =>
                  entry.event === "received:channelX" &&
                  entry.t >= commit.t &&
                  entry.keys === expectedScatter(expected).count,
          )
        : undefined;
    const longTasks = observations.filter((entry) => entry.event === "longtask");
    const writeTask = commit
        ? longTasks.find((entry) => entry.t <= commit.t && commit.t <= entry.t + (entry.keys ?? 0))
        : undefined;
    return {
        lastInputToWriteTaskMs: input && writeTask ? writeTask.t - input.t : null,
        writeTaskMs: writeTask ? (writeTask.keys ?? 0) : null,
        writeTaskStartToRenderMs: writeTask ? renderT - writeTask.t : null,
        commitListenerToReceivedMs: commit && received ? received.t - commit.t : null,
        commitListenerToRenderMs: commit ? renderT - commit.t : null,
        lastInputToRenderMs: input ? renderT - input.t : null,
        receivedNotifications: observations.filter((entry) => entry.event === "received:channelX").length,
        longTaskTotalMs: longTasks.reduce((sum, entry) => sum + (entry.keys ?? 0), 0),
    } satisfies EditTiming;
}

function summarizeEdits(timings: EditTiming[], warmup: number) {
    const measured = timings.slice(warmup);
    const fields = Object.keys(measured[0]).filter((field) => field !== "receivedNotifications") as Exclude<
        keyof EditTiming,
        "receivedNotifications"
    >[];
    return {
        warmupDiscarded: warmup,
        ...Object.fromEntries(fields.map((field) => [field, summarize(measured.map((timing) => timing[field]))])),
        receivedNotificationsPerEdit: measured.map((timing) => timing.receivedNotifications),
    };
}

test("benchmark: 500-realization load, Settings edits to consumer render, and mount cycles", async ({
    mount,
    page,
    browser,
}) => {
    test.skip(process.env.ECONOMIC_SCREENING_BENCHMARK !== "1", "Opt-in benchmark");
    test.setTimeout(900_000);
    const sources = await routeScaleSources(page);
    payload("FOPT");
    payload("FGST");
    await page.setViewportSize({ width: 1400, height: 1000 });
    const cdp = await page.context().newCDPSession(page);
    const heapMb = async () => {
        await cdp.send("HeapProfiler.collectGarbage");
        await cdp.send("HeapProfiler.collectGarbage");
        const usage = await cdp.send("Runtime.getHeapUsage");
        return +(usage.usedSize / 2 ** 20).toFixed(1);
    };
    const report: Record<string, unknown> = {
        browser: `chromium ${browser.version()}`,
        hardwareConcurrency: await page.evaluate(() => navigator.hardwareConcurrency),
        payloadMbPerVector: {
            FOPT: +(payload("FOPT").length / 2 ** 20).toFixed(1),
            FGST: +(payload("FGST").length / 2 ** 20).toFixed(1),
        },
        heapBeforeFirstMountMb: await heapMb(),
    };

    const cycles: Record<string, unknown>[] = [];
    const early = { enabled: true, endYear: INITIAL_EARLY_END_YEAR };
    for (let cycle = 0; cycle < 5; cycle++) {
        const component = await mount(<EconomicScreeningConnectedConsumersHarness {...PROPS} />);
        const renderT = await watchRender(page, expectedScatter(BASE_STATE));
        const loadObservations = await observationsSince(page, 0);
        const observingT = loadObservations[0].t;
        const received = loadObservations.find(
            (entry) => entry.event === "received:channelX" && entry.keys === REALIZATIONS.length - 1,
        );
        const cycleReport: Record<string, unknown> = {
            mountToReceivedMs: received ? +(received.t - observingT).toFixed(1) : null,
            mountToRenderMs: +(renderT - observingT).toFixed(1),
            heapLoadedMb: await heapMb(),
        };
        await openEditableSections(page);
        await observeInputAndLongTasks(page);

        let state = BASE_STATE;
        if (cycle === 0) {
            const edits: Record<string, unknown> = {};
            const oil: EditTiming[] = [];
            for (let sample = 0; sample < 12; sample++) {
                const price = sample % 2 === 0 ? 55 : 50;
                oil.push(
                    await timedEdit(page, "commit:oilPriceAtom", withInputs(state, { oilPrice: price }), () =>
                        typeValue(page, inputs.oilPrice(page), String(price)),
                    ),
                );
            }
            edits["oil price (debounced field)"] = summarizeEdits(oil, 2);
            const rate: EditTiming[] = [];
            for (let sample = 0; sample < 8; sample++) {
                const value = sample % 2 === 0 ? 9 : 8;
                rate.push(
                    await timedEdit(
                        page,
                        "commit:discountRatePercentAtom",
                        withInputs(state, { discountRatePercent: value }),
                        () => typeValue(page, inputs.discountRate(page), String(value)),
                    ),
                );
            }
            edits["discount rate (debounced field)"] = summarizeEdits(rate, 2);
            const cost: EditTiming[] = [];
            for (let sample = 0; sample < 8; sample++) {
                const opex = sample % 2 === 0 ? 70_000 : 60_000;
                cost.push(
                    await timedEdit(page, "commit:costProfileAtom", withCost(state, 2040, { opex }), () =>
                        typeValue(page, inputs.cost(page, "OPEX", 2040), String(opex)),
                    ),
                );
            }
            edits["OPEX 2040 (debounced cell)"] = summarizeEdits(cost, 2);
            const earlyYear: EditTiming[] = [];
            for (let sample = 0; sample < 8; sample++) {
                const endYear = sample % 2 === 0 ? 2036 : 2034;
                earlyYear.push(
                    await timedEdit(
                        page,
                        "commit:earlyValueConfigurationAtom",
                        { ...state, earlyEndYear: endYear },
                        () => typeValue(page, inputs.earlyYear(page), String(endYear)),
                    ),
                );
            }
            edits["early year (typed, immediate per keystroke)"] = summarizeEdits(earlyYear, 2);
            const filtering: EditTiming[] = [];
            const half = REALIZATIONS.filter((_, index) => index % 2 === 0);
            for (let sample = 0; sample < 8; sample++) {
                const filtered = sample % 2 === 0 ? half : null;
                filtering.push(
                    await timedEdit(page, "commit:RealizationFilterSetAtom", { ...state, filtered }, () =>
                        component.update(
                            <EconomicScreeningConnectedConsumersHarness
                                {...PROPS}
                                early={early}
                                filteredRealizations={filtered}
                            />,
                        ),
                    ),
                );
            }
            edits["filtering (workbench filter prop)"] = summarizeEdits(filtering, 2);
            report.edits = edits;
            state = BASE_STATE;
            await expectPublishedState(page, state, { financial: true });
        } else {
            // Repeated shorter edit cycles before cleanup.
            for (const price of [55, 50]) {
                state = withInputs(BASE_STATE, { oilPrice: price });
                await timedEdit(page, "commit:oilPriceAtom", state, () =>
                    typeValue(page, inputs.oilPrice(page), String(price)),
                );
            }
        }
        cycleReport.heapAfterEditsMb = await heapMb();
        await component.unmount();
        cycleReport.heapAfterUnmountMb = await heapMb();
        cycles.push(cycleReport);
    }
    report.mountCycles = cycles;
    // The harness query clients keep unobserved queries for gcTime (60 s) after unmount.
    await page.waitForTimeout(65_000);
    report.heapAfterQueryGcTimeMb = await heapMb();
    report.requests = sources.requests.length;
    report.memoryScope =
        "Chromium page JS heap (Runtime.getHeapUsage) after two forced GCs through CDP; excludes GPU, DOM native and worker memory.";
    expect(sources.unexpected).toEqual([]);
    expect(sources.requests.filter((request) => request !== "vector_list")).toHaveLength(2 * cycles.length);

    const outputDirectory = process.env.ECONOMIC_SCREENING_BENCHMARK_OUT ?? test.info().outputPath();
    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(join(outputDirectory, "economic-screening-browser-500.json"), JSON.stringify(report, null, 2));
});
