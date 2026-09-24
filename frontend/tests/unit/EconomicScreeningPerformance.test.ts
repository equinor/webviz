/**
 * Opt-in offline benchmark; skipped unless ECONOMIC_SCREENING_BENCHMARK=1. It prints measurements and has no
 * timing or memory thresholds. Deterministic correctness at scale is covered by the query lifecycle test.
 */
import { writeFileSync } from "node:fs";
import { Session } from "node:inspector/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";

import { QueryClient } from "@tanstack/react-query";
import { createStore } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";
import { describe, expect, test, vi } from "vitest";

import type * as Api from "@api";
import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom, RealizationFilterSetAtom } from "@framework/GlobalAtoms";
import type { RealizationFilterSet } from "@framework/RealizationFilterSet";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import {
    costProfileAtom,
    currencyAtom,
    discountRatePercentAtom,
    earlyValueConfigurationAtom,
    gasPriceAtom,
    gasPriceBasisAtom,
    isCostProfileDraftValidAtom,
    oilPriceAtom,
    oilPriceBasisAtom,
    predictionStartYearAtom,
    resultModeAtom,
} from "@modules/EconomicScreening/settings/atoms/baseAtoms";
import { activeVectorListQueryAtom } from "@modules/EconomicScreening/settings/atoms/derivedAtoms";
import { selectedEnsembleIdentAtom } from "@modules/EconomicScreening/settings/atoms/persistableFixableAtoms";
import { vectorDataQueriesAtom } from "@modules/EconomicScreening/settings/atoms/sourceQueryAtoms";
import { sourceSnapshotAtom } from "@modules/EconomicScreening/settings/atoms/sourceSnapshotAtoms";
import {
    Currency,
    GasPriceBasis,
    IrrStatus,
    OilPriceBasis,
    ResultMode,
} from "@modules/EconomicScreening/typesAndEnums";
import { economicScreeningResultsAtom } from "@modules/EconomicScreening/view/atoms/derivedAtoms";

import {
    makeScaleRealizationIds,
    makeScaleVectorResponse,
    SCALE_BASE_INPUTS,
    scaleDeltaMonthlyGas,
    scaleDeltaMonthlyOil,
    scaleReferenceEconomics,
    scaleServedMonthlyVolumes,
    type ScaleEconomicInputs,
} from "../ct/support/economicScreeningConnectedFixtures";

import { createEconomicScreeningInstance, mountView } from "./support/economicScreeningModuleHarness";

vi.mock("@modules/EconomicScreening/view/view", () => ({ View: () => null }));
vi.mock("@modules/EconomicScreening/settings/settings", () => ({ Settings: () => null }));

type VectorRequest = {
    case_uuid?: string;
    comparison_case_uuid?: string;
    vector_name: string;
    resampling_frequency?: string | null;
};

/** Parsed responses for the current sample, keyed by `${vector}:${frequency}`; anything else fails closed. */
const servedResponses = new Map<string, unknown>();
const executedRequests: string[] = [];
const unexpectedRequests: string[] = [];

function mockVectorDataOptions(query: VectorRequest) {
    const key = `${query.vector_name}:${query.resampling_frequency}`;
    return {
        queryKey: ["economic-screening-benchmark", query.case_uuid ?? query.comparison_case_uuid, key],
        queryFn: () => {
            executedRequests.push(key);
            if (!servedResponses.has(key)) {
                unexpectedRequests.push(key);
                return Promise.reject(new Error(`Unexpected fixture request ${key}`));
            }
            return Promise.resolve(servedResponses.get(key));
        },
        retry: false,
    };
}

function mockVectorListOptions(query: { case_uuid?: string; comparison_case_uuid?: string }) {
    return {
        queryKey: ["economic-screening-benchmark", "vector-list", query.case_uuid ?? query.comparison_case_uuid],
        queryFn: () => Promise.resolve([{ name: "FOPT" }, { name: "FGST" }]),
        retry: false,
    };
}

vi.mock("@api", async (importOriginal) => {
    const actual = await importOriginal<typeof Api>();
    return {
        ...actual,
        getRealizationsVectorDataOptions: vi.fn(({ query }: { query: VectorRequest }) => mockVectorDataOptions(query)),
        getDeltaEnsembleRealizationsVectorDataOptions: vi.fn(({ query }: { query: VectorRequest }) =>
            mockVectorDataOptions(query),
        ),
        getVectorListOptions: vi.fn(mockVectorListOptions),
        getDeltaEnsembleVectorListOptions: vi.fn(mockVectorListOptions),
    };
});

type Store = ReturnType<typeof createStore>;
type Fixture = { name: string; count: number; delta: boolean };

const FIXTURES: Fixture[] = [
    { name: "regular-100", count: 100, delta: false },
    { name: "regular-500", count: 500, delta: false },
    { name: "delta-500", count: 500, delta: true },
];
const COLD_SAMPLES = 7;
const WARM_SAMPLES = 15;
const WARMUP = 3;
const CYCLES = 6;

const BASE_INPUTS = SCALE_BASE_INPUTS;

const gc = (() => {
    setFlagsFromString("--expose-gc");
    return runInNewContext("gc") as () => void;
})();

function memory() {
    gc();
    gc();
    const usage = process.memoryUsage();
    return { heapUsedMb: usage.heapUsed / 2 ** 20, rssMb: usage.rss / 2 ** 20 };
}

function summarize(samples: number[]) {
    const sorted = [...samples].sort((first, second) => first - second);
    const middle = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    return {
        n: samples.length,
        medianMs: +median.toFixed(2),
        minMs: +sorted[0].toFixed(2),
        maxMs: +sorted[sorted.length - 1].toFixed(2),
    };
}

async function waitFor(condition: () => boolean, label: string): Promise<void> {
    for (let attempt = 0; attempt < 2000; attempt++) {
        if (condition()) return;
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    throw new Error(`Timed out waiting for ${label}`);
}

function makeEnsembles(fixture: Fixture) {
    const realizations = makeScaleRealizationIds(fixture.count);
    const comparison = new RegularEnsemble(
        "asset",
        [],
        "5ca1e000-0000-4000-8000-000000000003",
        "case",
        "Scale",
        "",
        realizations,
        [],
        null,
        null,
        "#123456",
    );
    const reference = new RegularEnsemble(
        "asset",
        [],
        "5ca1e000-0000-4000-8000-000000000004",
        "case",
        "Reference",
        "",
        realizations,
        [],
        null,
        null,
        "#654321",
    );
    const delta = new DeltaEnsemble(comparison, reference, "#abcdef");
    EnsembleFingerprintStore.setAll(
        new Map([
            [comparison.getIdent().toString(), "comparison"],
            [reference.getIdent().toString(), "reference"],
        ]),
    );
    return {
        realizations,
        ensembleSet: new EnsembleSet([comparison, reference], [delta]),
        selected: fixture.delta ? delta.getIdent() : comparison.getIdent(),
    };
}

function makePayloads(fixture: Fixture, realizations: number[]) {
    const started = performance.now();
    // Reversed gas order, so oil and gas must be joined by realization rather than position.
    const oil = makeScaleVectorResponse(realizations, "FOPT", { delta: fixture.delta });
    const gas = makeScaleVectorResponse(realizations, "FGST", {
        delta: fixture.delta,
        order: [...realizations].reverse(),
    });
    const generationMs = performance.now() - started;
    return { json: { oil: JSON.stringify(oil), gas: JSON.stringify(gas) }, generationMs };
}

function serve(json: { oil: string; gas: string }) {
    servedResponses.clear();
    servedResponses.set("FOPT:MONTHLY", JSON.parse(json.oil));
    servedResponses.set("FGST:MONTHLY", JSON.parse(json.gas));
    servedResponses.set("FGCT:YEARLY", []);
}

function applyInputs(store: Store, inputs: ScaleEconomicInputs, earlyEndYear: number) {
    store.set(predictionStartYearAtom, inputs.predictionStartYear);
    store.set(discountRatePercentAtom, inputs.discountRatePercent);
    store.set(currencyAtom, Currency.USD);
    store.set(oilPriceAtom, inputs.oilPrice);
    store.set(oilPriceBasisAtom, OilPriceBasis.PER_SM3);
    store.set(gasPriceAtom, inputs.gasPrice);
    store.set(gasPriceBasisAtom, GasPriceBasis.PER_SM3);
    store.set(costProfileAtom, inputs.costs);
    store.set(earlyValueConfigurationAtom, { enabled: true, endYear: earlyEndYear });
}

async function makeLoadedStore(fixture: Fixture) {
    const { ensembleSet, selected } = makeEnsembles(fixture);
    const store = createStore();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    store.set(queryClientAtom, queryClient);
    store.set(EnsembleSetAtom, ensembleSet);
    store.set(selectedEnsembleIdentAtom, selected);
    applyInputs(store, BASE_INPUTS, 2034);
    const { instance } = await createEconomicScreeningInstance(store);
    return { store, queryClient, instance, module: instance.getModule() };
}

function makeFilterSet(realizations: number[]) {
    return {
        filterSet: {
            getRealizationFilterForEnsembleIdent: () => ({ getFilteredRealizations: () => realizations }),
        },
    } as unknown as { filterSet: RealizationFilterSet };
}

type ProfileNode = {
    id: number;
    callFrame: { functionName: string; url: string };
    hitCount: number;
    children?: number[];
};

const PROFILED_FUNCTIONS = [
    "computeMonthlyRealizationEconomics",
    "computeInternalRateOfReturnFromEvents",
    "makeCashFlowEvents",
    "aggregateCoincidentEvents",
    "evaluateProduct",
    "monthsOfYear",
    "sumDiscountedVolumes",
    "discountedAnnualOpex",
    "computeEarlyValue",
    "isConfirmedAbsentThrough",
];

/** Sampled self time by function and inclusive time for the economics stages of interest. */
async function profile(work: () => void) {
    const session = new Session();
    session.connect();
    await session.post("Profiler.enable");
    await session.post("Profiler.setSamplingInterval", { interval: 100 });
    await session.post("Profiler.start");
    work();
    const { profile } = await session.post("Profiler.stop");
    session.disconnect();

    const nodes = new Map((profile.nodes as ProfileNode[]).map((node) => [node.id, node]));
    const totalHits = [...nodes.values()].reduce((sum, node) => sum + node.hitCount, 0);
    const selfHits = new Map<string, number>();
    const inclusiveHits = new Map<string, number>();
    const visit = (node: ProfileNode, active: Set<string>) => {
        const name = `${node.callFrame.functionName || "(anonymous)"} ${node.callFrame.url.split("/").pop()}`;
        selfHits.set(name, (selfHits.get(name) ?? 0) + node.hitCount);
        const nextActive = PROFILED_FUNCTIONS.includes(node.callFrame.functionName)
            ? new Set([...active, node.callFrame.functionName])
            : active;
        nextActive.forEach((functionName) =>
            inclusiveHits.set(functionName, (inclusiveHits.get(functionName) ?? 0) + node.hitCount),
        );
        node.children?.forEach((child) => visit(nodes.get(child)!, nextActive));
    };
    visit(nodes.get((profile.nodes as ProfileNode[])[0].id)!, new Set());
    const percent = (hits: number) => +((100 * hits) / totalHits).toFixed(1);
    return {
        topSelfPercent: [...selfHits]
            .sort((first, second) => second[1] - first[1])
            .slice(0, 12)
            .map(([name, hits]) => `${percent(hits)}% ${name}`),
        inclusivePercent: Object.fromEntries(
            PROFILED_FUNCTIONS.map((name) => [name, percent(inclusiveHits.get(name) ?? 0)]),
        ),
    };
}

type Edit = { label: string; apply: (store: Store, flip: boolean) => void };

const EDITS: Edit[] = [
    { label: "oil price", apply: (store, flip) => store.set(oilPriceAtom, flip ? 55 : 50) },
    { label: "discount rate", apply: (store, flip) => store.set(discountRatePercentAtom, flip ? 9 : 8) },
    {
        label: "cost (OPEX 2040)",
        apply: (store, flip) =>
            store.set(
                costProfileAtom,
                BASE_INPUTS.costs.map((cost) =>
                    cost.year === 2040 ? { ...cost, opex: flip ? 70_000 : 60_000 } : cost,
                ),
            ),
    },
    {
        label: "early year",
        apply: (store, flip) => store.set(earlyValueConfigurationAtom, { enabled: true, endYear: flip ? 2036 : 2034 }),
    },
    {
        label: "prediction start",
        apply: (store, flip) => store.set(predictionStartYearAtom, flip ? 2026 : 2025),
    },
    {
        label: "cost draft validity toggle",
        apply: (store, flip) => store.set(isCostProfileDraftValidAtom, !flip),
    },
    {
        label: "presentation only (result mode)",
        apply: (store, flip) => store.set(resultModeAtom, flip ? ResultMode.ALL_RESULTS : ResultMode.DISTRIBUTION),
    },
];

function measureEdit(store: Store, edit: Edit) {
    const samples: number[] = [];
    let recalculations = 0;
    for (let sample = 0; sample < WARMUP + WARM_SAMPLES; sample++) {
        const before = store.get(economicScreeningResultsAtom);
        const started = performance.now();
        edit.apply(store, sample % 2 === 0);
        const after = store.get(economicScreeningResultsAtom);
        const elapsed = performance.now() - started;
        if (sample >= WARMUP) {
            samples.push(elapsed);
            recalculations += after !== before ? 1 : 0;
        }
    }
    // Leave the store at the base state.
    edit.apply(store, true);
    edit.apply(store, false);
    return { ...summarize(samples), recalculated: `${recalculations}/${WARM_SAMPLES}` };
}

function checkFinalValues(store: Store, fixture: Fixture, realizations: number[]) {
    const { results } = store.get(economicScreeningResultsAtom);
    expect(results.map((result) => result.realization)).toEqual(realizations);
    for (const index of [0, 7, 250 % realizations.length, realizations.length - 1]) {
        const realization = realizations[index];
        const oil = fixture.delta
            ? scaleDeltaMonthlyOil(realization)
            : scaleServedMonthlyVolumes(realizations, realization, "oil");
        const gas = fixture.delta
            ? scaleDeltaMonthlyGas(realization)
            : scaleServedMonthlyVolumes(realizations, realization, "gas");
        const expected = scaleReferenceEconomics(oil, gas, BASE_INPUTS, 2034);
        const result = results[index];
        expect(result.early?.npv).toBeCloseTo(expected.earlyDcf, 4);
        if (!fixture.delta && index === 7) {
            expect(result.npv).toBeNull();
            continue;
        }
        expect(result.npv).toBeCloseTo(expected.npv, 4);
        if (!fixture.delta) {
            expect(result.irrStatus).toBe(IrrStatus.CONVERGED);
            const residual = scaleReferenceEconomics(oil, gas, BASE_INPUTS, null, result.irr!).npv;
            expect(Math.abs(residual) / 4_000_000).toBeLessThan(1e-6);
        }
    }
}

describe.runIf(process.env.ECONOMIC_SCREENING_BENCHMARK === "1")("Economic Screening offline benchmark", () => {
    test.each(FIXTURES)(
        "$name",
        async (fixture) => {
            const report: Record<string, unknown> = { fixture: fixture.name, node: process.version };
            const memoryBefore = memory();
            const { realizations } = makeEnsembles(fixture);
            const { json, generationMs } = makePayloads(fixture, realizations);
            report.fixtureGenerationMs = +generationMs.toFixed(1);
            report.payloadMb = +((json.oil.length + json.gas.length) / 2 ** 20).toFixed(1);

            const stringifySamples: number[] = [];
            const parseSamples: number[] = [];
            for (let sample = 0; sample < 5; sample++) {
                const parsed = JSON.parse(json.oil);
                let started = performance.now();
                JSON.stringify(parsed);
                stringifySamples.push(performance.now() - started);
                started = performance.now();
                JSON.parse(json.oil);
                parseSamples.push(performance.now() - started);
            }
            report.transportPerVectorOil = { stringify: summarize(stringifySamples), parse: summarize(parseSamples) };

            // Cold: a fresh store and query client per sample; only the queries are subscribed while sources resolve.
            const preparation: number[] = [];
            const firstEconomics: number[] = [];
            const coldFirstSample: Record<string, number> = {};
            for (let sample = 0; sample < COLD_SAMPLES + 1; sample++) {
                serve(json);
                executedRequests.length = 0;
                const { store, queryClient, instance } = await makeLoadedStore(fixture);
                const unsubscribers = [
                    store.sub(vectorDataQueriesAtom, () => {}),
                    store.sub(activeVectorListQueryAtom, () => {}),
                ];
                await waitFor(() => {
                    const queries = store.get(vectorDataQueriesAtom);
                    return (
                        store.get(activeVectorListQueryAtom).isSuccess && queries[0].isSuccess && queries[1].isSuccess
                    );
                }, "source queries");
                let started = performance.now();
                const snapshot = store.get(sourceSnapshotAtom);
                const preparationMs = performance.now() - started;
                expect(snapshot.realizationProfiles).toHaveLength(realizations.length);

                started = performance.now();
                const unmountView = mountView(store, instance);
                const firstResults = store.get(economicScreeningResultsAtom).results;
                const firstEconomicsMs = performance.now() - started;
                expect(firstResults).toHaveLength(realizations.length);
                expect(store.get(sourceSnapshotAtom)).toBe(snapshot);
                if (sample === 0) {
                    coldFirstSample.preparationMs = +preparationMs.toFixed(1);
                    coldFirstSample.firstEconomicsMs = +firstEconomicsMs.toFixed(1);
                } else {
                    preparation.push(preparationMs);
                    firstEconomics.push(firstEconomicsMs);
                }
                expect(executedRequests.filter((key) => key.endsWith(":MONTHLY")).sort()).toEqual([
                    "FGST:MONTHLY",
                    "FOPT:MONTHLY",
                ]);

                if (sample === COLD_SAMPLES) {
                    const snapshotBefore = store.get(sourceSnapshotAtom);
                    const requestsBefore = executedRequests.length;
                    const warm: Record<string, unknown> = {};
                    for (const edit of EDITS) {
                        warm[edit.label] = measureEdit(store, edit);
                    }
                    const filtered = realizations.filter((_, index) => index % 2 === 0);
                    warm["filtering (half, then all)"] = measureEdit(store, {
                        label: "filtering",
                        apply: (target, flip) =>
                            target.set(RealizationFilterSetAtom, flip ? makeFilterSet(filtered) : null),
                    });
                    report.warmRecalculation = warm;
                    report.profileOilPriceEdits = await profile(() => {
                        for (let edit = 0; edit < 10; edit++) {
                            store.set(oilPriceAtom, edit % 2 ? 50 : 55);
                            store.get(economicScreeningResultsAtom);
                        }
                    });
                    store.set(oilPriceAtom, 50);
                    checkFinalValues(store, fixture, realizations);
                    const outputDirectory = process.env.ECONOMIC_SCREENING_BENCHMARK_OUT ?? tmpdir();
                    writeFileSync(
                        join(outputDirectory, `economic-screening-${fixture.name}-values.json`),
                        JSON.stringify(
                            store
                                .get(economicScreeningResultsAtom)
                                .results.map((result) => [
                                    result.realization,
                                    result.irr,
                                    result.irrStatus,
                                    result.npv,
                                    result.breakEvenOilPrice,
                                    result.early?.npv,
                                ]),
                        ),
                    );
                    expect(store.get(sourceSnapshotAtom)).toBe(snapshotBefore);
                    expect(executedRequests).toHaveLength(requestsBefore);
                }
                unsubscribers.forEach((unsubscribe) => unsubscribe());
                unmountView();
                queryClient.clear();
            }
            report.coldFirstSampleIncludingJit = coldFirstSample;
            report.coldPreparation = summarize(preparation);
            report.coldFirstEconomicsOnMount = summarize(firstEconomics);

            // Repeated mount/resolve/edit/cleanup cycles with the view mounted before sources resolve.
            const resolveToResults: number[] = [];
            const heapAfterCycle: number[] = [];
            const rssAfterCycle: number[] = [];
            let registeredModule: unknown = null;
            for (let cycle = 0; cycle < CYCLES; cycle++) {
                serve(json);
                const { store, queryClient, instance, module } = await makeLoadedStore(fixture);
                registeredModule = module;
                const started = performance.now();
                const unmountView = mountView(store, instance);
                await waitFor(() => store.get(economicScreeningResultsAtom).results.length > 0, "results");
                resolveToResults.push(performance.now() - started);
                for (let edit = 0; edit < 10; edit++) {
                    EDITS[edit % 5].apply(store, edit % 2 === 0);
                }
                unmountView();
                queryClient.clear();
                servedResponses.clear();
                const usage = memory();
                heapAfterCycle.push(+usage.heapUsedMb.toFixed(1));
                rssAfterCycle.push(+usage.rssMb.toFixed(1));
            }
            report.mountToResultsIncludingQueryResolution = summarize(resolveToResults);
            // Test-only attribution: the framework Module keeps every instance it made, together with its store.
            const retainedInstances = (registeredModule as { _moduleInstances: unknown[] })._moduleInstances;
            const retainedInstanceCount = retainedInstances.length;
            retainedInstances.length = 0;
            const afterReleasingInstances = memory();
            report.memory = {
                scope: "whole vitest worker process after forced GC; not a leak test",
                beforeFixtureHeapMb: +memoryBefore.heapUsedMb.toFixed(1),
                beforeFixtureRssMb: +memoryBefore.rssMb.toFixed(1),
                heapAfterEachCycleMb: heapAfterCycle,
                rssAfterEachCycleMb: rssAfterCycle,
                retainedModuleInstancesBeforeRelease: retainedInstanceCount,
                heapAfterTestOnlyInstanceReleaseMb: +afterReleasingInstances.heapUsedMb.toFixed(1),
            };
            expect(unexpectedRequests).toEqual([]);
            EnsembleFingerprintStore.clear();
            const outputDirectory = process.env.ECONOMIC_SCREENING_BENCHMARK_OUT ?? tmpdir();
            writeFileSync(
                join(outputDirectory, `economic-screening-${fixture.name}.json`),
                JSON.stringify(report, null, 2),
            );
        },
        600_000,
    );
});
