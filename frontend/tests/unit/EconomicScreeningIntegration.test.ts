import { createStore, type WritableAtom } from "jotai";
import { describe, expect, test, vi } from "vitest";

import type { VectorRealizationData_api, VectorSourceSummary_api } from "@api";
import { SourceCoverageIntervalStatus_api, SourceCoverageInterpolationMethod_api, SourceCoverageRole_api } from "@api";
import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { makeEarlyMeasureDataGenerator, makeMeasureDataGenerator } from "@modules/EconomicScreening/dataGenerators";
import {
    costProfileAtom,
    currencyAtom,
    discountRatePercentAtom,
    earlyValueConfigurationAtom,
    gasPriceAtom,
    gasPriceBasisAtom,
    oilPriceAtom,
    oilPriceBasisAtom,
    predictionStartYearAtom,
} from "@modules/EconomicScreening/settings/atoms/baseAtoms";
import type * as SettingsDerivedAtoms from "@modules/EconomicScreening/settings/atoms/derivedAtoms";
import { selectedEnsembleIdentAtom } from "@modules/EconomicScreening/settings/atoms/persistableFixableAtoms";
import {
    deltaConstituentGasConsumptionQueriesAtom,
    validRealizationNumbersAtom,
    vectorDataQueriesAtom,
} from "@modules/EconomicScreening/settings/atoms/sourceQueryAtoms";
import { sourceHorizonAtom } from "@modules/EconomicScreening/settings/atoms/sourceSnapshotAtoms";
import {
    Currency,
    EarlyEconomicMeasure,
    EconomicMeasure,
    GasPriceBasis,
    OilPriceBasis,
} from "@modules/EconomicScreening/typesAndEnums";
import { monthStartUtcMs, SourceKind } from "@modules/EconomicScreening/utils/monthlyProduction";
import { volumeUnitInSm3 } from "@modules/EconomicScreening/utils/unitConversion";
import { economicScreeningResultsAtom } from "@modules/EconomicScreening/view/atoms/derivedAtoms";

import { createEconomicScreeningInstance, mountView } from "./support/economicScreeningModuleHarness";

vi.mock("@modules/EconomicScreening/view/view", () => ({ View: () => null }));
vi.mock("@modules/EconomicScreening/settings/settings", () => ({ Settings: () => null }));

// Query results are fixtures here; the real query lifecycle is covered by the query lifecycle tests.
vi.mock("@modules/EconomicScreening/settings/atoms/sourceQueryAtoms", async () => {
    const { atom } = await import("jotai");
    return {
        VectorQueryIndex: { OIL_PRODUCTION: 0, SALES_GAS: 1, GAS_PRODUCTION: 2, GAS_INJECTION: 3, GAS_CONSUMPTION: 4 },
        vectorDataQueriesAtom: atom([]),
        isVectorNeededAtom: atom([true, true, false, false, false]),
        deltaConstituentGasConsumptionQueriesAtom: atom([]),
        validRealizationNumbersAtom: atom([7, 42]),
    };
});

vi.mock("@modules/EconomicScreening/settings/atoms/derivedAtoms", async (importOriginal) => {
    const actual = await importOriginal<typeof SettingsDerivedAtoms>();
    const { atom } = await import("jotai");
    return {
        ...actual,
        activeVectorListQueryAtom: atom({ isSuccess: true, isError: false, isLoading: false, data: [] }),
        hasOilProductionVectorAtom: atom(true),
        salesGasStrategyAtom: atom({ kind: "DIRECT", hasGasConsumption: false }),
    };
});

type QueryResult = {
    data: VectorRealizationData_api[] | undefined;
    isError: boolean;
    isFetching: boolean;
    isSuccess: boolean;
};

type QueryFixtureAtom = WritableAtom<QueryResult[], [QueryResult[]], void>;
type Store = ReturnType<typeof createStore>;

const DAY_MS = 86_400_000;
const unitContext = { oilUnit: "SM3", gasUnit: "SM3", currency: "USD", oilPriceBasis: OilPriceBasis.PER_SM3 };

const REGULAR_ENSEMBLE = new RegularEnsemble(
    "asset",
    [],
    "33333333-aaaa-4444-aaaa-aaaaaaaaaaaa",
    "case",
    "fixture",
    "",
    [7, 42],
    [],
    null,
    null,
    "#123456",
);
const COMPARISON_ENSEMBLE = new RegularEnsemble(
    "asset",
    [],
    "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa",
    "case",
    "comparison",
    "",
    [7, 42],
    [],
    null,
    null,
    "#123456",
);
const REFERENCE_ENSEMBLE = new RegularEnsemble(
    "asset",
    [],
    "22222222-aaaa-4444-aaaa-aaaaaaaaaaaa",
    "case",
    "reference",
    "",
    [7, 42],
    [],
    null,
    null,
    "#123456",
);
const DELTA_ENSEMBLE = new DeltaEnsemble(COMPARISON_ENSEMBLE, REFERENCE_ENSEMBLE, "#123456");

type SeriesOptions = {
    unit?: string;
    sourceKind?: SourceKind;
    /** Raw support ends this many days into the last returned month, making it partial. */
    partialLastMonthDays?: number;
    withoutCoverage?: boolean;
};

/**
 * API-shaped monthly cumulative vector with backend-style `sourceCoverage`. `monthlyVolumes[k]` is
 * produced in month k counted from January of `firstYear`.
 */
function series(
    realization: number,
    firstYear: number,
    monthlyVolumes: number[],
    options: SeriesOptions = {},
): VectorRealizationData_api {
    const timestampsUtcMs = Array.from({ length: monthlyVolumes.length + 1 }, (_, index) =>
        monthStartUtcMs(firstYear, index + 1),
    );
    const values = [0];
    for (const volume of monthlyVolumes) {
        values.push(values[values.length - 1] + volume);
    }
    const lastIndex = timestampsUtcMs.length - 1;
    const sourceEnd = options.partialLastMonthDays
        ? timestampsUtcMs[lastIndex - 1] + options.partialLastMonthDays * DAY_MS
        : timestampsUtcMs[lastIndex];
    const roles =
        options.sourceKind === SourceKind.DELTA
            ? [SourceCoverageRole_api.COMPARISON, SourceCoverageRole_api.REFERENCE]
            : [SourceCoverageRole_api.REGULAR];
    const sources: VectorSourceSummary_api[] = roles.map((role) => ({
        role,
        firstTimestampUtcMs: timestampsUtcMs[0],
        lastTimestampUtcMs: sourceEnd,
        sampleCount: timestampsUtcMs.length,
        maxSampleGapMs: 31 * DAY_MS,
    }));
    return {
        realization,
        unit: options.unit ?? "SM3",
        isRate: false,
        timestampsUtcMs,
        values,
        ...(options.withoutCoverage
            ? {}
            : {
                  sourceCoverage: {
                      interpolationMethod: SourceCoverageInterpolationMethod_api.LINEAR,
                      sources,
                      intervals: monthlyVolumes.map((_, index) => {
                          const isPartial = options.partialLastMonthDays !== undefined && index === lastIndex - 1;
                          return {
                              status: isPartial
                                  ? SourceCoverageIntervalStatus_api.PARTIAL
                                  : SourceCoverageIntervalStatus_api.SOURCE_ALIGNED,
                              supportedStartUtcMs: timestampsUtcMs[index],
                              supportedEndUtcMs: isPartial ? sourceEnd : timestampsUtcMs[index + 1],
                          };
                      }),
                  },
              }),
    };
}

function query(data: VectorRealizationData_api[] | undefined, isFetching = false, isError = false): QueryResult {
    return { data, isFetching, isError, isSuccess: data !== undefined && !isError };
}

function setQueries(store: Store, oil: QueryResult, gas: QueryResult) {
    store.set(vectorDataQueriesAtom as unknown as QueryFixtureAtom, [oil, gas, query([]), query([]), query([])]);
}

function setOilPrice(store: Store, price: number | null, basis = OilPriceBasis.PER_SM3) {
    store.set(oilPriceAtom, price);
    store.set(oilPriceBasisAtom, basis);
}

function setGasPrice(store: Store, price: number | null, basis = GasPriceBasis.PER_SM3) {
    store.set(gasPriceAtom, price);
    store.set(gasPriceBasisAtom, basis);
}

/** Sum of monthly volumes discounted at month midpoints to 1 January of the start year. */
function discounted(monthlyVolumes: number[], firstYear: number, startYear = 2020, rate = 0.1): number {
    return monthlyVolumes.reduce(
        (sum, volume, index) => sum + volume * Math.pow(1 + rate, -(firstYear - startYear + (index + 0.5) / 12)),
        0,
    );
}

const OIL_7 = new Array(24).fill(10);
const OIL_42 = new Array(24).fill(20);
const GAS = new Array(24).fill(100);

/** Settings-owned inputs and a mounted view, connected only by the module's own interface. */
async function setup(options: { sourceKind?: SourceKind } = {}) {
    const store = createStore();
    store.set(
        EnsembleSetAtom,
        new EnsembleSet([REGULAR_ENSEMBLE, COMPARISON_ENSEMBLE, REFERENCE_ENSEMBLE], [DELTA_ENSEMBLE]),
    );
    const oil = [series(7, 2020, OIL_7, options), series(42, 2020, OIL_42, options)];
    const gas = [series(7, 2020, GAS, options), series(42, 2020, GAS, options)];
    setQueries(store, query(oil), query(gas));
    store.set(
        selectedEnsembleIdentAtom,
        options.sourceKind === SourceKind.DELTA ? DELTA_ENSEMBLE.getIdent() : REGULAR_ENSEMBLE.getIdent(),
    );
    store.set(discountRatePercentAtom, 10);
    store.set(predictionStartYearAtom, 2020);
    store.set(currencyAtom, Currency.USD);
    setOilPrice(store, 2);
    setGasPrice(store, 0.1);
    const { instance } = await createEconomicScreeningInstance(store);
    mountView(store, instance);
    return { store, oil, gas };
}

function metricGenerator(store: Store, measure: EconomicMeasure) {
    const { oilUnit, gasUnit } = store.get(economicScreeningResultsAtom);
    return makeMeasureDataGenerator(
        store.get(economicScreeningResultsAtom).results,
        measure,
        { ...unitContext, oilUnit, gasUnit },
        "fixture",
        "Fixture",
        "#123456",
    )();
}

function metricData(store: Store, measure: EconomicMeasure) {
    return metricGenerator(store, measure).data;
}

function earlyData(store: Store, measure: EarlyEconomicMeasure, endYear: number) {
    return makeEarlyMeasureDataGenerator(
        store.get(economicScreeningResultsAtom).results,
        measure,
        endYear,
        "USD",
        "fixture",
        "Fixture",
        "#123456",
    )().data;
}

describe("Economic Screening query results to channel data", () => {
    test("retains the valuation date, horizon and exact realization keys after filtering", async () => {
        const { store } = await setup();
        const before = metricData(store, EconomicMeasure.NPV).find((entry) => entry.key === 42)!;
        expect(before.value).toBeCloseTo(2 * discounted(OIL_42, 2020) + 0.1 * discounted(GAS, 2020), 8);
        const horizonBefore = store.get(sourceHorizonAtom);

        store.set(validRealizationNumbersAtom as unknown as WritableAtom<number[], [number[]], void>, [42]);

        expect(metricData(store, EconomicMeasure.NPV)).toEqual([before]);
        expect(store.get(economicScreeningResultsAtom).horizon).toEqual({
            startYear: 2020,
            endYear: 2021,
            endMonthIndex: 2021 * 12 + 11,
        });
        expect(store.get(sourceHorizonAtom)).toEqual(horizonBefore);
        expect(store.get(economicScreeningResultsAtom).results[0].predictionStartYear).toBe(2020);
    });

    test("matches independent NPV and break-even arithmetic through derived state and generators", async () => {
        const { store } = await setup();
        store.set(costProfileAtom, [{ year: 2020, capex: 100, opex: 10 }]);
        const pvCosts = 100 * Math.pow(1.1, -0.5) + discounted(new Array(12).fill(10 / 12), 2020);
        const expectedNpv = 2 * discounted(OIL_7, 2020) + 0.1 * discounted(GAS, 2020) - pvCosts;
        expect(metricData(store, EconomicMeasure.NPV)[0].value).toBeCloseTo(expectedNpv, 8);
        const expectedBreakEven = (pvCosts - 0.1 * discounted(GAS, 2020)) / discounted(OIL_7, 2020);
        expect(metricData(store, EconomicMeasure.BREAK_EVEN_OIL_PRICE)[0].value).toBeCloseTo(expectedBreakEven, 8);
        setOilPrice(store, expectedBreakEven);
        expect(metricData(store, EconomicMeasure.NPV)[0].value).toBeCloseTo(0, 8);

        const result = store.get(economicScreeningResultsAtom).results[0];
        const annualDiscountedOil = result.annualProfile.map((entry) => entry.discountedOilVolume);
        expect(annualDiscountedOil[0]).toBeCloseTo(discounted(OIL_7.slice(0, 12), 2020), 10);
        expect(annualDiscountedOil[0] + annualDiscountedOil[1]).toBeCloseTo(result.discountedOilVolume, 10);
        expect(result.annualProfile.at(-1)!.cumulativeDiscountedCashFlow).toBeCloseTo(result.npv!, 10);
    });

    test("keeps NPV and physical volumes equivalent across supported source units", async () => {
        const { store, oil, gas } = await setup();
        const sm3Npv = metricData(store, EconomicMeasure.NPV);
        const sm3OilVolumes = metricData(store, EconomicMeasure.DISCOUNTED_OIL_VOLUME);
        const bblInSm3 = volumeUnitInSm3("BBL")!;
        const mscfInSm3 = volumeUnitInSm3("MSCF")!;
        const oilInBbl = oil.map((entry, index) =>
            series(
                entry.realization,
                2020,
                (index === 0 ? OIL_7 : OIL_42).map((value) => value / bblInSm3),
                {
                    unit: "BBL",
                },
            ),
        );
        const gasInMscf = gas.map((entry) =>
            series(
                entry.realization,
                2020,
                GAS.map((value) => value / mscfInSm3),
                { unit: "MSCF" },
            ),
        );

        setQueries(store, query(oilInBbl), query(gasInMscf));
        setOilPrice(store, 2 * bblInSm3, OilPriceBasis.PER_BBL);
        setGasPrice(store, 0.1 * mscfInSm3, GasPriceBasis.PER_MSCF);

        const convertedNpv = metricData(store, EconomicMeasure.NPV);
        const convertedOilVolumes = metricGenerator(store, EconomicMeasure.DISCOUNTED_OIL_VOLUME);
        expect(convertedNpv.map((entry) => entry.key)).toEqual(sm3Npv.map((entry) => entry.key));
        convertedNpv.forEach((entry, index) => expect(entry.value).toBeCloseTo(sm3Npv[index].value, 9));
        expect(convertedOilVolumes.metaData.unit).toBe("BBL");
        expect(convertedOilVolumes.data.map((entry) => entry.key)).toEqual(sm3OilVolumes.map((entry) => entry.key));
        convertedOilVolumes.data.forEach((entry, index) => {
            expect(entry.value * bblInSm3).toBeCloseTo(sm3OilVolumes[index].value, 8);
        });
    });

    test("omits incomplete oil financial values but retains independently valid gas", async () => {
        const { store, gas } = await setup();
        setQueries(store, query([]), query(gas));
        setOilPrice(store, null);
        expect(metricData(store, EconomicMeasure.NPV)).toEqual([]);
        expect(metricData(store, EconomicMeasure.DISCOUNTED_OIL_VOLUME)).toEqual([]);
        expect(metricData(store, EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME).map((entry) => entry.key)).toEqual([
            7, 42,
        ]);
        // A zero price intentionally omits oil revenue; it does not turn the missing oil data into zero volume.
        setOilPrice(store, 0);
        expect(metricData(store, EconomicMeasure.NPV)[0].value).toBeCloseTo(0.1 * discounted(GAS, 2020), 8);
        expect(metricData(store, EconomicMeasure.DISCOUNTED_OIL_VOLUME)).toEqual([]);
    });

    test("withdraws every value while the prediction start is missing or after the simulation end", async () => {
        const { store } = await setup();
        expect(metricData(store, EconomicMeasure.NPV)).toHaveLength(2);

        store.set(predictionStartYearAtom, null);
        expect(metricData(store, EconomicMeasure.DISCOUNTED_OIL_VOLUME)).toEqual([]);
        expect(store.get(economicScreeningResultsAtom).errors).toContain(
            "Enter a prediction start year to calculate results.",
        );

        store.set(predictionStartYearAtom, 2022);
        expect(metricData(store, EconomicMeasure.NPV)).toEqual([]);
        expect(store.get(economicScreeningResultsAtom).errors).toContain(
            "The prediction start year 2022 is after the supported simulation end (Dec 2021).",
        );
    });

    test("publishes a cost-only early horizon only when zero production is source-covered", async () => {
        const { store } = await setup();
        const covered = (realization: number, volumes: number[]) =>
            series(realization, 2019, [...new Array(12).fill(0), ...volumes]);
        setQueries(store, query([covered(7, OIL_7), covered(42, OIL_42)]), query([covered(7, GAS), covered(42, GAS)]));
        store.set(predictionStartYearAtom, 2019);
        store.set(costProfileAtom, [{ year: 2019, capex: 100, opex: 0 }]);
        store.set(earlyValueConfigurationAtom, { enabled: true, endYear: 2019 });

        expect(store.get(economicScreeningResultsAtom).errors).toEqual([]);
        const early = earlyData(store, EarlyEconomicMeasure.DISCOUNTED_CASH_FLOW, 2019);
        expect(early.map((entry) => entry.key)).toEqual([7, 42]);
        expect(early[0].value).toBeCloseTo(-100 * Math.pow(1.1, -0.5), 10);
        expect(metricData(store, EconomicMeasure.NPV)[0].value).toBeCloseTo(
            2 * discounted(OIL_7, 2020, 2019) + 0.1 * discounted(GAS, 2020, 2019) - 100 * Math.pow(1.1, -0.5),
            8,
        );

        // The same start without coverage for 2019 must not assume zero pre-source production.
        const { store: uncovered } = await setup();
        uncovered.set(predictionStartYearAtom, 2019);
        uncovered.set(costProfileAtom, [{ year: 2019, capex: 100, opex: 0 }]);
        uncovered.set(earlyValueConfigurationAtom, { enabled: true, endYear: 2019 });
        expect(earlyData(uncovered, EarlyEconomicMeasure.DISCOUNTED_CASH_FLOW, 2019)).toEqual([]);
        expect(metricData(uncovered, EconomicMeasure.NPV)).toEqual([]);
    });

    test("keeps early values valid when only a later month is partial, and withholds the full results", async () => {
        const { store } = await setup();
        const partialOil = series(7, 2020, OIL_7, { partialLastMonthDays: 15 });
        const partialGas = series(7, 2020, GAS, { partialLastMonthDays: 15 });
        setQueries(store, query([partialOil, series(42, 2020, OIL_42)]), query([partialGas, series(42, 2020, GAS)]));
        store.set(earlyValueConfigurationAtom, { enabled: true, endYear: 2020 });

        expect(metricData(store, EconomicMeasure.NPV).map((entry) => entry.key)).toEqual([42]);
        expect(metricData(store, EconomicMeasure.DISCOUNTED_OIL_VOLUME).map((entry) => entry.key)).toEqual([42]);
        const early = earlyData(store, EarlyEconomicMeasure.DISCOUNTED_CASH_FLOW, 2020);
        expect(early.map((entry) => entry.key)).toEqual([7, 42]);
        expect(early[0].value).toBeCloseTo(
            2 * discounted(OIL_7.slice(0, 12), 2020) + 0.1 * discounted(GAS.slice(0, 12), 2020),
            10,
        );
        expect(store.get(economicScreeningResultsAtom).warnings).toContain(
            "Oil source coverage is incomplete over Jan 2020-Dec 2021 for 1 of 2 realizations; their results that need oil are withheld.",
        );
    });

    test("validates a shorter realization against the full-ensemble horizon instead of zero-filling it", async () => {
        const { store } = await setup();
        setQueries(
            store,
            query([series(7, 2020, OIL_7), series(42, 2020, OIL_42.slice(0, 12))]),
            query([series(7, 2020, GAS), series(42, 2020, GAS.slice(0, 12))]),
        );

        expect(store.get(sourceHorizonAtom).endYear).toBe(2021);
        expect(metricData(store, EconomicMeasure.NPV).map((entry) => entry.key)).toEqual([7]);
        expect(metricData(store, EconomicMeasure.UNDISCOUNTED_OIL_VOLUME).map((entry) => entry.key)).toEqual([7]);
    });

    test("withholds every result when the server omits source coverage", async () => {
        const { store } = await setup();
        const withoutCoverage = { withoutCoverage: true };
        setQueries(
            store,
            query([series(7, 2020, OIL_7, withoutCoverage), series(42, 2020, OIL_42, withoutCoverage)]),
            query([series(7, 2020, GAS, withoutCoverage), series(42, 2020, GAS, withoutCoverage)]),
        );

        expect(store.get(sourceHorizonAtom).endYear).toBeNull();
        expect(metricData(store, EconomicMeasure.NPV)).toEqual([]);
        expect(metricData(store, EconomicMeasure.DISCOUNTED_OIL_VOLUME)).toEqual([]);
        expect(store.get(economicScreeningResultsAtom).errors).toContain(
            "Source coverage is unavailable, so the simulation end cannot be established.",
        );
    });

    test("satisfies the signed delta NPV identity with delta-shaped coverage", async () => {
        const costs = { comparison: { capex: 900, opex: 30 }, reference: { capex: 1000, opex: 10 } };
        const comparisonOil = new Array(24).fill(12);
        const referenceOil = new Array(24).fill(10);
        const npvOf = async (oilVolumes: number[], cost: { capex: number; opex: number }, sourceKind?: SourceKind) => {
            const { store } = await setup({ sourceKind });
            setQueries(
                store,
                query([series(7, 2020, oilVolumes, { sourceKind })]),
                query([series(7, 2020, new Array(24).fill(0), { sourceKind })]),
            );
            store.set(costProfileAtom, [{ year: 2020, ...cost }]);
            return metricData(store, EconomicMeasure.NPV)[0].value;
        };

        const deltaNpv = await npvOf(
            comparisonOil.map((volume, index) => volume - referenceOil[index]),
            {
                capex: costs.comparison.capex - costs.reference.capex,
                opex: costs.comparison.opex - costs.reference.opex,
            },
            SourceKind.DELTA,
        );

        expect(deltaNpv).toBeCloseTo(
            (await npvOf(comparisonOil, costs.comparison)) - (await npvOf(referenceOil, costs.reference)),
            8,
        );
    });

    test("keeps financial results when constituent diagnostics are partial or fail", async () => {
        const { store } = await setup({ sourceKind: SourceKind.DELTA });
        const expected = metricData(store, EconomicMeasure.NPV);
        expect(expected).toHaveLength(2);
        store.set(deltaConstituentGasConsumptionQueriesAtom as unknown as QueryFixtureAtom, [
            query([series(7, 2020, [0])]),
            query([series(7, 2020, [0]), series(42, 2020, [0])]),
        ]);
        expect(store.get(economicScreeningResultsAtom).warnings).toContain(
            "Constituent gas-consumption diagnostics are incomplete.",
        );
        expect(metricData(store, EconomicMeasure.NPV)).toEqual(expected);
        store.set(deltaConstituentGasConsumptionQueriesAtom as unknown as QueryFixtureAtom, [
            query(undefined, false, true),
            query([]),
        ]);
        expect(store.get(economicScreeningResultsAtom).warnings).toContain(
            "Constituent gas-consumption diagnostics are unavailable.",
        );
        expect(metricData(store, EconomicMeasure.NPV)).toEqual(expected);
    });

    test("withholds regular-shaped coverage on a delta ensemble", async () => {
        const { store } = await setup();
        store.set(selectedEnsembleIdentAtom, DELTA_ENSEMBLE.getIdent());
        expect(metricData(store, EconomicMeasure.NPV)).toEqual([]);
    });

    test("publishes nothing while any required source is pending or has failed", async () => {
        const { store, oil } = await setup();
        setQueries(store, query(oil), query(undefined, true));
        expect(metricData(store, EconomicMeasure.NPV)).toEqual([]);
        expect(metricData(store, EconomicMeasure.DISCOUNTED_OIL_VOLUME)).toEqual([]);
        setQueries(store, query(oil), query(undefined, false, true));
        expect(metricData(store, EconomicMeasure.DISCOUNTED_OIL_VOLUME)).toEqual([]);
        expect(store.get(sourceHorizonAtom).endYear).toBeNull();
    });

    test("keeps full-evaluation outputs when only the early end year is invalid", async () => {
        const { store } = await setup();
        const expected = metricData(store, EconomicMeasure.NPV);
        store.set(earlyValueConfigurationAtom, { enabled: true, endYear: 2030 });
        expect(metricData(store, EconomicMeasure.NPV)).toEqual(expected);
    });
});
