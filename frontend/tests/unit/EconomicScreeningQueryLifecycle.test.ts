import { QueryClient } from "@tanstack/react-query";
import { createStore } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";
import { describe, expect, test, vi } from "vitest";

import type * as Api from "@api";
import { SourceCoverageIntervalStatus_api, SourceCoverageInterpolationMethod_api, SourceCoverageRole_api } from "@api";
import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom, RealizationFilterSetAtom } from "@framework/GlobalAtoms";
import { ChannelManager } from "@framework/internal/DataChannels/ChannelManager";
import type { RealizationFilterSet } from "@framework/RealizationFilterSet";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { KeyKind, type DataGenerator } from "@framework/types/dataChannnel";
import { EARLY_MEASURE_CHANNEL_ID_MAP, MEASURE_CHANNEL_ID_MAP } from "@modules/EconomicScreening/channelDefs";
import { makeEarlyMeasureDataGenerator, makeMeasureDataGenerator } from "@modules/EconomicScreening/dataGenerators";
import {
    Currency,
    EarlyEconomicMeasure,
    EconomicMeasure,
    GasPriceBasis,
    OilPriceBasis,
} from "@modules/EconomicScreening/typesAndEnums";
import { monthStartUtcMs } from "@modules/EconomicScreening/utils/monthlyProduction";
import {
    costProfileAtom,
    earlyValueConfigurationAtom,
    economicAssumptionsAtom,
    ensembleIdentAtom,
    hasOilProductionVectorAtom,
    isCostProfileDraftValidAtom,
    priceAssumptionsAtom,
    salesGasStrategyAtom,
} from "@modules/EconomicScreening/view/atoms/baseAtoms";
import {
    economicScreeningResultsAtom,
    queryErrorAtom,
    sourceHorizonAtom,
} from "@modules/EconomicScreening/view/atoms/derivedAtoms";

type VectorRequest = {
    case_uuid?: string;
    comparison_case_uuid?: string;
    ensemble_name?: string;
    vector_name: string;
    resampling_frequency?: string | null;
    include_source_coverage?: boolean;
    realizations_encoded_as_uint_list_str: string | null;
};

type Deferred<T> = {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
};

const requests: VectorRequest[] = [];
const executedRequestKeys: string[] = [];
const deferredResponses = new Map<string, Deferred<Api.VectorRealizationData_api[]>>();

function makeDeferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

function requestKey(caseUuid: string, vectorName: string, realizations: string | null): string {
    return `${caseUuid}:${vectorName}:${realizations}`;
}

function mockVectorDataOptions(query: VectorRequest) {
    requests.push(query);
    const caseUuid = query.case_uuid ?? `delta-${query.comparison_case_uuid}`;
    const key = requestKey(caseUuid, query.vector_name, query.realizations_encoded_as_uint_list_str);
    const response = deferredResponses.get(key) ?? makeDeferred<Api.VectorRealizationData_api[]>();
    deferredResponses.set(key, response);
    return {
        queryKey: ["economic-screening-test", key, query.resampling_frequency, query.include_source_coverage],
        queryFn: () => {
            executedRequestKeys.push(key);
            return deferredResponses.get(key)!.promise;
        },
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
    };
});

function makeEnsemble(caseUuid: string, name: string, realizations: number[]): RegularEnsemble {
    return new RegularEnsemble("asset", [], caseUuid, "case", name, "", realizations, [], null, null, "#123456");
}

async function waitFor(condition: () => boolean): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt++) {
        if (condition()) return;
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    throw new Error(`Condition was not met; options=${requests.length}, executions=${executedRequestKeys.length}`);
}

const DAY_MS = 86_400_000;

/** API-shaped monthly cumulative series with fully source-aligned coverage for the given roles. */
function monthlySeries(
    realization: number,
    firstYear: number,
    monthlyVolumes: number[],
    roles: SourceCoverageRole_api[] = [SourceCoverageRole_api.REGULAR],
): Api.VectorRealizationData_api {
    const timestampsUtcMs = Array.from({ length: monthlyVolumes.length + 1 }, (_, index) =>
        monthStartUtcMs(firstYear, index + 1),
    );
    const values = [0];
    for (const volume of monthlyVolumes) {
        values.push(values[values.length - 1] + volume);
    }
    return {
        realization,
        unit: "SM3",
        isRate: false,
        timestampsUtcMs,
        values,
        sourceCoverage: {
            interpolationMethod: SourceCoverageInterpolationMethod_api.LINEAR,
            sources: roles.map((role) => ({
                role,
                firstTimestampUtcMs: timestampsUtcMs[0],
                lastTimestampUtcMs: timestampsUtcMs[timestampsUtcMs.length - 1],
                sampleCount: timestampsUtcMs.length,
                maxSampleGapMs: 31 * DAY_MS,
            })),
            intervals: monthlyVolumes.map((_, index) => ({
                status: SourceCoverageIntervalStatus_api.SOURCE_ALIGNED,
                supportedStartUtcMs: timestampsUtcMs[index],
                supportedEndUtcMs: timestampsUtcMs[index + 1],
            })),
        },
    };
}

function discountedMonthly(monthlyVolumes: number[], rate: number): number {
    return monthlyVolumes.reduce((sum, volume, index) => sum + volume * Math.pow(1 + rate, -(index + 0.5) / 12), 0);
}

function resetRequests() {
    requests.length = 0;
    executedRequestKeys.length = 0;
    deferredResponses.clear();
}

function setEconomicInputs(store: ReturnType<typeof createStore>) {
    store.set(hasOilProductionVectorAtom, true);
    store.set(salesGasStrategyAtom, { kind: "DIRECT", hasGasConsumption: false });
    store.set(economicAssumptionsAtom, { discountRatePercent: 10, predictionStartYear: 2030 });
    store.set(priceAssumptionsAtom, {
        currency: Currency.USD,
        oilPrice: 50,
        oilPriceBasis: OilPriceBasis.PER_SM3,
        gasPrice: 0.2,
        gasPriceBasis: GasPriceBasis.PER_SM3,
    });
}

describe("Economic Screening source query lifecycle", () => {
    test("does not expose delayed results from the previous ensemble after switching", async () => {
        resetRequests();
        const firstEnsemble = makeEnsemble("11111111-1111-4111-8111-111111111111", "First", [1, 2]);
        const secondEnsemble = makeEnsemble("22222222-2222-4222-8222-222222222222", "Second", [7]);
        EnsembleFingerprintStore.setAll(
            new Map([
                [firstEnsemble.getIdent().toString(), "first-fingerprint"],
                [secondEnsemble.getIdent().toString(), "second-fingerprint"],
            ]),
        );
        const store = createStore();
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        store.set(queryClientAtom, queryClient);
        store.set(EnsembleSetAtom, new EnsembleSet([firstEnsemble, secondEnsemble]));
        setEconomicInputs(store);
        store.set(ensembleIdentAtom, firstEnsemble.getIdent());
        const unsubscribe = store.sub(economicScreeningResultsAtom, () => {});

        await waitFor(() => executedRequestKeys.length === 2);
        expect(requests).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    case_uuid: firstEnsemble.getCaseUuid(),
                    ensemble_name: "First",
                    resampling_frequency: "MONTHLY",
                    include_source_coverage: true,
                    realizations_encoded_as_uint_list_str: "1-2",
                }),
            ]),
        );
        store.set(economicAssumptionsAtom, { discountRatePercent: 12, predictionStartYear: 2030 });
        await Promise.resolve();
        expect(executedRequestKeys).toHaveLength(2);

        store.set(ensembleIdentAtom, secondEnsemble.getIdent());
        await waitFor(() => executedRequestKeys.length === 4);
        deferredResponses
            .get(requestKey(firstEnsemble.getCaseUuid(), "FOPT", "1-2"))
            ?.resolve([monthlySeries(1, 2030, new Array(12).fill(10))]);
        deferredResponses
            .get(requestKey(firstEnsemble.getCaseUuid(), "FGST", "1-2"))
            ?.resolve([monthlySeries(1, 2030, new Array(12).fill(100))]);
        await Promise.resolve();

        expect(store.get(economicScreeningResultsAtom).results).toEqual([]);
        expect(store.get(sourceHorizonAtom).endYear).toBeNull();

        deferredResponses
            .get(requestKey(secondEnsemble.getCaseUuid(), "FOPT", "7"))
            ?.resolve([monthlySeries(7, 2030, new Array(12).fill(10))]);
        deferredResponses
            .get(requestKey(secondEnsemble.getCaseUuid(), "FGST", "7"))
            ?.reject(new Error("source failed"));
        await waitFor(() => store.get(queryErrorAtom) !== null);
        expect(store.get(economicScreeningResultsAtom).results).toEqual([]);
        expect(executedRequestKeys).toHaveLength(4);

        unsubscribe();
        queryClient.clear();
        EnsembleFingerprintStore.clear();
    });

    test("requests delta sources with coverage through the typed delta endpoint", async () => {
        resetRequests();
        const comparison = makeEnsemble("44444444-4444-4444-8444-444444444444", "Comparison", [1, 3, 5]);
        const reference = makeEnsemble("55555555-5555-4555-8555-555555555555", "Reference", [3, 5, 9]);
        const delta = new DeltaEnsemble(comparison, reference, "#123456");
        EnsembleFingerprintStore.setAll(
            new Map([
                [comparison.getIdent().toString(), "comparison-fingerprint"],
                [reference.getIdent().toString(), "reference-fingerprint"],
            ]),
        );
        const store = createStore();
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        store.set(queryClientAtom, queryClient);
        store.set(EnsembleSetAtom, new EnsembleSet([comparison, reference], [delta]));
        setEconomicInputs(store);
        store.set(ensembleIdentAtom, delta.getIdent());
        const unsubscribe = store.sub(economicScreeningResultsAtom, () => {});

        await waitFor(() => executedRequestKeys.length >= 2);
        const deltaRequests = requests.filter((request) => request.comparison_case_uuid !== undefined);
        const caseKey = `delta-${comparison.getCaseUuid()}`;
        const commonRealizations = "3!5";
        expect(executedRequestKeys.filter((key) => key.startsWith(caseKey)).sort()).toEqual([
            requestKey(caseKey, "FGST", commonRealizations),
            requestKey(caseKey, "FOPT", commonRealizations),
        ]);
        expect(
            deltaRequests.every(
                (request) =>
                    request.resampling_frequency === "MONTHLY" &&
                    request.include_source_coverage === true &&
                    request.realizations_encoded_as_uint_list_str === commonRealizations,
            ),
        ).toBe(true);

        const deltaRoles = [SourceCoverageRole_api.COMPARISON, SourceCoverageRole_api.REFERENCE];
        deferredResponses
            .get(requestKey(caseKey, "FOPT", commonRealizations))
            ?.resolve([monthlySeries(3, 2030, new Array(12).fill(-5), deltaRoles)]);
        deferredResponses
            .get(requestKey(caseKey, "FGST", commonRealizations))
            ?.resolve([monthlySeries(3, 2030, new Array(12).fill(0), deltaRoles)]);
        await waitFor(() => store.get(economicScreeningResultsAtom).results.length === 1);

        expect(publishedThroughChannel(store, EconomicMeasure.NPV)).toEqual([
            { key: 3, value: expect.closeTo(50 * discountedMonthly(new Array(12).fill(-5), 0.1), 8) },
        ]);
        // Constituent FGCT diagnostics keep their existing yearly request without coverage.
        const diagnosticRequests = requests.filter((request) => request.comparison_case_uuid === undefined);
        expect(diagnosticRequests.map((request) => request.case_uuid).sort()).toEqual(
            [comparison.getCaseUuid(), reference.getCaseUuid()].sort(),
        );
        expect(
            diagnosticRequests.every(
                (request) =>
                    request.vector_name === "FGCT" &&
                    request.resampling_frequency === "YEARLY" &&
                    request.include_source_coverage === undefined,
            ),
        ).toBe(true);
        expect(executedRequestKeys).toHaveLength(4);

        unsubscribe();
        queryClient.clear();
        EnsembleFingerprintStore.clear();
    });
});

function makeFilterSet(realizations: number[]): { filterSet: RealizationFilterSet } {
    return {
        filterSet: {
            getRealizationFilterForEnsembleIdent: () => ({ getFilteredRealizations: () => realizations }),
        },
    } as unknown as { filterSet: RealizationFilterSet };
}

function publishedNpv(store: ReturnType<typeof createStore>) {
    return publishedThroughChannel(store, EconomicMeasure.NPV);
}

/** Publishes the current results on a real channel, as the view's publisher does, and reads them back. */
function publishedThroughChannel(store: ReturnType<typeof createStore>, measure: EconomicMeasure) {
    const { results, oilUnit, gasUnit } = store.get(economicScreeningResultsAtom);
    return receiveThroughChannel(
        MEASURE_CHANNEL_ID_MAP[measure],
        results.length === 0
            ? null
            : makeMeasureDataGenerator(
                  results,
                  measure,
                  { oilUnit, gasUnit, currency: "USD", oilPriceBasis: OilPriceBasis.PER_SM3 },
                  "fixture",
                  "Fixture",
                  "#123456",
              ),
    );
}

function publishedEarlyThroughChannel(
    store: ReturnType<typeof createStore>,
    measure: EarlyEconomicMeasure,
    endYear: number,
) {
    const { results } = store.get(economicScreeningResultsAtom);
    return receiveThroughChannel(
        EARLY_MEASURE_CHANNEL_ID_MAP[measure],
        results.length === 0
            ? null
            : makeEarlyMeasureDataGenerator(results, measure, endYear, "USD", "fixture", "Fixture", "#123456"),
    );
}

function receiveThroughChannel(channelIdString: string, dataGenerator: DataGenerator | null) {
    const manager = new ChannelManager("economic-screening-lifecycle");
    manager.registerChannels([{ idString: channelIdString, displayName: channelIdString, kindOfKey: KeyKind.REALIZATION }]);
    manager.registerReceivers([{ idString: "consumer", displayName: "Consumer", supportedKindsOfKeys: [KeyKind.REALIZATION] }]);
    const channel = manager.getChannel(channelIdString)!;
    const receiver = manager.getReceiver("consumer")!;
    receiver.connectToChannel(channel, "all");
    channel.replaceContents(
        dataGenerator ? [{ contentIdString: `${channelIdString}-::-fixture`, displayName: "Fixture", dataGenerator }] : [],
    );
    return (receiver.getChannel()?.getContents() ?? []).flatMap((content) =>
        content.getDataArray().map((element) => ({ key: element.key, value: element.value })),
    );
}

const PRODUCING_OIL = new Array(24).fill(10);
const PRODUCING_GAS = new Array(24).fill(100);

describe("Economic Screening source queries and publication", () => {
    function setupLoadedEnsemble() {
        resetRequests();
        const ensemble = makeEnsemble("33333333-3333-4333-8333-333333333333", "Producing", [1, 2]);
        EnsembleFingerprintStore.setAll(new Map([[ensemble.getIdent().toString(), "fingerprint"]]));

        const store = createStore();
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        store.set(queryClientAtom, queryClient);
        store.set(EnsembleSetAtom, new EnsembleSet([ensemble]));
        setEconomicInputs(store);
        store.set(ensembleIdentAtom, ensemble.getIdent());
        const unsubscribe = store.sub(economicScreeningResultsAtom, () => {});

        return { store, queryClient, ensemble, unsubscribe };
    }

    function resolveProducingSources(caseUuid: string) {
        deferredResponses
            .get(requestKey(caseUuid, "FOPT", "1-2"))
            ?.resolve([monthlySeries(1, 2030, PRODUCING_OIL), monthlySeries(2, 2030, PRODUCING_OIL.map((v) => 2 * v))]);
        deferredResponses
            .get(requestKey(caseUuid, "FGST", "1-2"))
            ?.resolve([monthlySeries(1, 2030, PRODUCING_GAS), monthlySeries(2, 2030, PRODUCING_GAS)]);
    }

    test("publishes nothing while sources load, then publishes actual realization contents", async () => {
        const { store, queryClient, ensemble, unsubscribe } = setupLoadedEnsemble();

        expect(store.get(economicScreeningResultsAtom).results).toEqual([]);
        expect(publishedNpv(store)).toEqual([]);
        await waitFor(() => executedRequestKeys.length === 2);
        expect(store.get(economicScreeningResultsAtom).results).toEqual([]);
        expect(executedRequestKeys.sort()).toEqual([
            requestKey(ensemble.getCaseUuid(), "FGST", "1-2"),
            requestKey(ensemble.getCaseUuid(), "FOPT", "1-2"),
        ]);
        expect(
            requests.every(
                (request) =>
                    request.resampling_frequency === "MONTHLY" &&
                    request.include_source_coverage === true &&
                    request.realizations_encoded_as_uint_list_str === "1-2",
            ),
        ).toBe(true);

        resolveProducingSources(ensemble.getCaseUuid());
        await waitFor(() => store.get(economicScreeningResultsAtom).results.length === 2);

        const expectedNpv = 50 * discountedMonthly(PRODUCING_OIL, 0.1) + 0.2 * discountedMonthly(PRODUCING_GAS, 0.1);
        expect(publishedNpv(store).map((entry) => entry.key)).toEqual([1, 2]);
        expect(publishedNpv(store)[0].value).toBeCloseTo(expectedNpv, 8);
        expect(store.get(sourceHorizonAtom)).toEqual({ endYear: 2031, isLoading: false });
        // No raw or follow-up request is made to reconstruct source dates.
        expect(executedRequestKeys).toHaveLength(2);
        expect(requests.every((request) => request.resampling_frequency === "MONTHLY")).toBe(true);

        // Monthly OPEX: 1200 per year is paid as 100 at each month midpoint; CAPEX 1000 at mid-2030.
        store.set(costProfileAtom, [
            { year: 2030, capex: 1000, opex: 1200 },
            { year: 2031, capex: 0, opex: 1200 },
        ]);
        store.set(earlyValueConfigurationAtom, { enabled: true, endYear: 2030 });
        const opex = new Array(24).fill(100);
        const expectedWithCosts = expectedNpv - 1000 * Math.pow(1.1, -0.5) - discountedMonthly(opex, 0.1);
        expect(publishedNpv(store)[0]).toEqual({ key: 1, value: expect.closeTo(expectedWithCosts, 8) });
        expect(publishedEarlyThroughChannel(store, EarlyEconomicMeasure.DISCOUNTED_CASH_FLOW, 2030)[0]).toEqual({
            key: 1,
            value: expect.closeTo(
                discountedMonthly(PRODUCING_OIL.slice(0, 12).map((volume) => 50 * volume + 0.2 * 100 - 100), 0.1) -
                    1000 * Math.pow(1.1, -0.5),
                8,
            ),
        });
        expect(executedRequestKeys).toHaveLength(2);

        unsubscribe();
        queryClient.clear();
        EnsembleFingerprintStore.clear();
    });

    test("does not refetch sources for economic edits or filtering, and filtering does not rebase values", async () => {
        const { store, queryClient, ensemble, unsubscribe } = setupLoadedEnsemble();
        await waitFor(() => executedRequestKeys.length === 2);
        resolveProducingSources(ensemble.getCaseUuid());
        await waitFor(() => store.get(economicScreeningResultsAtom).results.length === 2);
        const beforeEdits = publishedNpv(store);
        const horizonBefore = store.get(sourceHorizonAtom);

        store.set(priceAssumptionsAtom, { ...store.get(priceAssumptionsAtom), oilPrice: 60 });
        store.set(costProfileAtom, [{ year: 2030, capex: 1000, opex: 100 }]);
        store.set(earlyValueConfigurationAtom, { enabled: true, endYear: 2030 });
        store.set(economicAssumptionsAtom, { discountRatePercent: 12, predictionStartYear: 2030 });
        await waitFor(() => publishedNpv(store)[0].value !== beforeEdits[0].value);
        store.set(economicAssumptionsAtom, { discountRatePercent: 12, predictionStartYear: 2031 });
        expect(store.get(economicScreeningResultsAtom).results[0].predictionStartYear).toBe(2031);

        expect(executedRequestKeys).toHaveLength(2);

        store.set(priceAssumptionsAtom, { ...store.get(priceAssumptionsAtom), oilPrice: 50 });
        store.set(costProfileAtom, []);
        store.set(earlyValueConfigurationAtom, { enabled: false, endYear: null });
        store.set(economicAssumptionsAtom, { discountRatePercent: 10, predictionStartYear: 2030 });
        expect(publishedNpv(store)).toEqual(beforeEdits);

        store.set(RealizationFilterSetAtom, makeFilterSet([2]));
        await waitFor(() => store.get(economicScreeningResultsAtom).results.length === 1);

        expect(publishedNpv(store)).toEqual([beforeEdits[1]]);
        expect(store.get(sourceHorizonAtom)).toEqual(horizonBefore);
        expect(executedRequestKeys).toHaveLength(2);

        unsubscribe();
        queryClient.clear();
        EnsembleFingerprintStore.clear();
    });

    test("withdraws contents for an invalid cost draft or unresolved start without refetching", async () => {
        const { store, queryClient, ensemble, unsubscribe } = setupLoadedEnsemble();
        await waitFor(() => executedRequestKeys.length === 2);
        resolveProducingSources(ensemble.getCaseUuid());
        await waitFor(() => store.get(economicScreeningResultsAtom).results.length === 2);
        const npv = publishedNpv(store);
        const volumes = publishedThroughChannel(store, EconomicMeasure.DISCOUNTED_OIL_VOLUME);

        store.set(isCostProfileDraftValidAtom, false);
        expect(publishedNpv(store)).toEqual([]);
        expect(publishedThroughChannel(store, EconomicMeasure.DISCOUNTED_OIL_VOLUME)).toEqual(volumes);
        store.set(isCostProfileDraftValidAtom, true);
        expect(publishedNpv(store)).toEqual(npv);

        store.set(economicAssumptionsAtom, { discountRatePercent: 10, predictionStartYear: null });
        expect(publishedNpv(store)).toEqual([]);
        expect(publishedThroughChannel(store, EconomicMeasure.DISCOUNTED_OIL_VOLUME)).toEqual([]);
        store.set(economicAssumptionsAtom, { discountRatePercent: 10, predictionStartYear: 2030 });
        expect(publishedNpv(store)).toEqual(npv);
        expect(executedRequestKeys).toHaveLength(2);

        unsubscribe();
        queryClient.clear();
        EnsembleFingerprintStore.clear();
    });

    test("never publishes a failed source as zero volumes", async () => {
        const { store, queryClient, ensemble, unsubscribe } = setupLoadedEnsemble();
        await waitFor(() => executedRequestKeys.length === 2);

        deferredResponses.get(requestKey(ensemble.getCaseUuid(), "FOPT", "1-2"))?.reject(new Error("source failed"));
        deferredResponses
            .get(requestKey(ensemble.getCaseUuid(), "FGST", "1-2"))
            ?.resolve([monthlySeries(1, 2030, PRODUCING_GAS), monthlySeries(2, 2030, PRODUCING_GAS)]);
        await waitFor(() => store.get(queryErrorAtom) !== null);

        expect(store.get(queryErrorAtom)).toContain("FOPT");
        expect(publishedNpv(store)).toEqual([]);
        expect(publishedThroughChannel(store, EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME)).toEqual([]);
        expect(store.get(economicScreeningResultsAtom).results).toEqual([]);
        expect(store.get(sourceHorizonAtom).endYear).toBeNull();

        unsubscribe();
        queryClient.clear();
        EnsembleFingerprintStore.clear();
    });
});
