import { createStore, type WritableAtom } from "jotai";
import { describe, expect, test, vi } from "vitest";

import type { VectorRealizationData_api } from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { makeEarlyMeasureDataGenerator, makeMeasureDataGenerator } from "@modules/EconomicScreening/dataGenerators";
import {
    DiscountConvention,
    EarlyEconomicMeasure,
    EconomicMeasure,
    GasPriceBasis,
    InvestmentTiming,
    OilPriceBasis,
} from "@modules/EconomicScreening/typesAndEnums";
import {
    costProfileAtom,
    discountAssumptionsAtom,
    earlyValueConfigurationAtom,
    ensembleIdentAtom,
    evaluationWindowAtom,
    priceAssumptionsAtom,
    salesGasStrategyAtom,
} from "@modules/EconomicScreening/view/atoms/baseAtoms";
import { economicScreeningResultsAtom } from "@modules/EconomicScreening/view/atoms/derivedAtoms";
import {
    automaticBaseYearVectorDataQueriesAtom,
    deltaConstituentGasConsumptionQueriesAtom,
    validRealizationNumbersAtom,
    vectorDataQueriesAtom,
} from "@modules/EconomicScreening/view/atoms/queryAtoms";

vi.mock("@modules/EconomicScreening/view/atoms/queryAtoms", async () => {
    const { atom } = await import("jotai");
    return {
        VectorQueryIndex: { OIL_PRODUCTION: 0, SALES_GAS: 1, GAS_PRODUCTION: 2, GAS_INJECTION: 3, GAS_CONSUMPTION: 4 },
        vectorDataQueriesAtom: atom([]),
        automaticBaseYearVectorDataQueriesAtom: atom([]),
        deltaConstituentGasConsumptionQueriesAtom: atom([]),
        validRealizationNumbersAtom: atom([7, 42]),
    };
});

type QueryResult = {
    data: VectorRealizationData_api[] | undefined;
    isError: boolean;
    isFetching: boolean;
};

type QueryFixtureAtom = WritableAtom<QueryResult[], [QueryResult[]], void>;

const unitContext = { oilUnit: "SM3", gasUnit: "SM3", currency: "USD", oilPriceBasis: OilPriceBasis.PER_SM3 };

function series(realization: number, firstYear: number, values: number[]): VectorRealizationData_api {
    return {
        realization,
        unit: "SM3",
        isRate: false,
        timestampsUtcMs: values.map((_, index) => Date.UTC(firstYear + index, 0, 1)),
        values,
    };
}

function query(data: VectorRealizationData_api[] | undefined, isFetching = false, isError = false): QueryResult {
    return { data, isFetching, isError };
}

function setup() {
    const store = createStore();
    const oil = [series(7, 2020, [0, 100, 200]), series(42, 2021, [0, 100])];
    const gas = [series(7, 2020, [0, 1000, 2000]), series(42, 2021, [0, 1000])];
    store.set(vectorDataQueriesAtom as unknown as QueryFixtureAtom, [query(oil), query(gas), query([]), query([]), query([])]);
    store.set(automaticBaseYearVectorDataQueriesAtom as unknown as QueryFixtureAtom, [query(oil), query(gas)]);
    store.set(salesGasStrategyAtom, { kind: "DIRECT", hasGasConsumption: false });
    store.set(discountAssumptionsAtom, {
        discountRatePercent: 10,
        baseYear: null,
        convention: DiscountConvention.YEAR_END,
        investmentTiming: InvestmentTiming.START_OF_YEAR,
        gasToOilEquivalentFactor: 1000,
    });
    store.set(priceAssumptionsAtom, {
        currency: "USD",
        oilPrice: 2,
        oilPriceBasis: OilPriceBasis.PER_SM3,
        gasPrice: 0.1,
        gasPriceBasis: GasPriceBasis.PER_SM3,
        excludeOilRevenue: false,
        excludeGasRevenue: false,
    });
    return { store, oil, gas };
}

function metricData(store: ReturnType<typeof createStore>, measure: EconomicMeasure) {
    return makeMeasureDataGenerator(
        store.get(economicScreeningResultsAtom).results,
        measure,
        unitContext,
        "fixture",
        "Fixture",
        "#123456",
    )().data;
}

describe("Economic Screening query results to channel data", () => {
    test("retains unfiltered valuation date and exact realization keys after filtering", () => {
        const { store, oil, gas } = setup();
        const before = metricData(store, EconomicMeasure.NPV).find((entry) => entry.key === 42)!;
        expect(before.value).toBeCloseTo(300 / 1.1 ** 2, 8);
        store.set(vectorDataQueriesAtom as unknown as QueryFixtureAtom, [
            query([oil[1]]), query([gas[1]]), query([]), query([]), query([]),
        ]);
        store.set(validRealizationNumbersAtom as WritableAtom<number[], [number[]], void>, [42]);
        expect(metricData(store, EconomicMeasure.NPV)).toEqual([before]);
        expect(store.get(economicScreeningResultsAtom).results[0].valuationYear).toBe(2020);
    });

    test("matches independent NPV and break-even arithmetic through derived state and generators", () => {
        const { store } = setup();
        store.set(costProfileAtom, [{ year: 2020, capex: 100, opex: 10 }]);
        const expectedNpv = 290 / 1.1 + 300 / 1.1 ** 2 - 100;
        expect(metricData(store, EconomicMeasure.NPV)[0].value).toBeCloseTo(expectedNpv, 8);
        const discountedOil = 100 / 1.1 + 100 / 1.1 ** 2;
        const expectedBreakEven = (100 + 10 / 1.1 - 100 / 1.1 - 100 / 1.1 ** 2) / discountedOil;
        expect(metricData(store, EconomicMeasure.BREAK_EVEN_OIL_PRICE)[0].value).toBeCloseTo(expectedBreakEven, 8);
        store.set(priceAssumptionsAtom, { ...store.get(priceAssumptionsAtom), oilPrice: expectedBreakEven });
        expect(metricData(store, EconomicMeasure.NPV)[0].value).toBeCloseTo(0, 8);
    });

    test("omits incomplete oil financial values but retains independently valid gas", () => {
        const { store, gas } = setup();
        store.set(vectorDataQueriesAtom as unknown as QueryFixtureAtom, [query([]), query(gas), query([]), query([]), query([])]);
        store.set(priceAssumptionsAtom, { ...store.get(priceAssumptionsAtom), oilPrice: null });
        expect(metricData(store, EconomicMeasure.NPV)).toEqual([]);
        expect(metricData(store, EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME).map((entry) => entry.key)).toEqual([7, 42]);
        store.set(priceAssumptionsAtom, { ...store.get(priceAssumptionsAtom), excludeOilRevenue: true });
        expect(metricData(store, EconomicMeasure.NPV)[0].value).toBeCloseTo(100 / 1.1 + 100 / 1.1 ** 2, 8);
    });

    test("withdraws values when an ordered evaluation window has no data", () => {
        const { store } = setup();
        expect(metricData(store, EconomicMeasure.NPV)).toHaveLength(2);
        store.set(evaluationWindowAtom, { firstYear: 2030, lastYear: 2031 });
        expect(metricData(store, EconomicMeasure.NPV)).toEqual([]);
        expect(store.get(economicScreeningResultsAtom).errors).toContain("The evaluation range contains no production or cost years.");
    });

    test("publishes a legitimate cost-only early horizon using the unchanged valuation date", () => {
        const { store } = setup();
        store.set(costProfileAtom, [{ year: 2019, capex: 100, opex: 0 }]);
        store.set(earlyValueConfigurationAtom, { enabled: true, endYear: 2019 });
        const result = store.get(economicScreeningResultsAtom);
        expect(result.errors).toEqual([]);
        const early = makeEarlyMeasureDataGenerator(
            result.results, EarlyEconomicMeasure.DISCOUNTED_CASH_FLOW, 2019, "USD", "fixture", "Fixture", "#123456",
        )();
        expect(early.data).toHaveLength(2);
        expect(early.data[0].value).toBeCloseTo(-110, 8);
    });

    test("keeps financial results when constituent diagnostics are partial or fail", () => {
        const { store } = setup();
        store.set(ensembleIdentAtom, new DeltaEnsembleIdent(
            new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "comparison"),
            new RegularEnsembleIdent("22222222-aaaa-4444-aaaa-aaaaaaaaaaaa", "reference"),
        ));
        const expected = metricData(store, EconomicMeasure.NPV);
        store.set(deltaConstituentGasConsumptionQueriesAtom as unknown as QueryFixtureAtom, [
            query([series(7, 2020, [0, 0])]), query([series(7, 2020, [0, 0]), series(42, 2020, [0, 0])]),
        ]);
        expect(store.get(economicScreeningResultsAtom).warnings).toContain("Constituent gas-consumption diagnostics are incomplete.");
        expect(metricData(store, EconomicMeasure.NPV)).toEqual(expected);
        store.set(deltaConstituentGasConsumptionQueriesAtom as unknown as QueryFixtureAtom, [query(undefined, false, true), query([])]);
        expect(store.get(economicScreeningResultsAtom).warnings).toContain("Constituent gas-consumption diagnostics are unavailable.");
        expect(metricData(store, EconomicMeasure.NPV)).toEqual(expected);
    });

    test("waits for all automatic valuation sources before publishing a date-dependent result", () => {
        const { store, oil } = setup();
        store.set(automaticBaseYearVectorDataQueriesAtom as unknown as QueryFixtureAtom, [query(oil), query(undefined, true)]);
        expect(metricData(store, EconomicMeasure.NPV)).toEqual([]);
    });

    test("keeps full-evaluation outputs when only the early end year is invalid", () => {
        const { store } = setup();
        const expected = metricData(store, EconomicMeasure.NPV);
        store.set(earlyValueConfigurationAtom, { enabled: true, endYear: 2030 });
        expect(metricData(store, EconomicMeasure.NPV)).toEqual(expected);
    });
});