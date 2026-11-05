import { describe, expect, test } from "vitest";

import { EconomicMeasure, IrrStatus, OilPriceBasis } from "@modules/EconomicScreening/typesAndEnums";
import { Ineligibility } from "@modules/EconomicScreening/utils/eligibility";
import {
    getMeasureDisplayName,
    formatMeasureValue,
    getMeasureDisplayScale,
    getMeasureUnavailableReason,
    getMeasureUnit,
    isFinancialMeasure,
} from "@modules/EconomicScreening/utils/measureAccessors";
import type { MonthlyRealizationEconomicResult } from "@modules/EconomicScreening/utils/monthlyEconomics";

const BASE_RESULT: MonthlyRealizationEconomicResult = {
    realization: 1,
    predictionStartYear: 2020,
    evaluationEndYear: 2020,
    annualProfile: [],
    hasOilData: true,
    hasSalesGasData: true,
    gasToOilEquivalentDivisor: 1000,
    discountedOilVolume: 0,
    discountedSalesGasVolume: 0,
    discountedOilEquivalents: 0,
    undiscountedOilVolume: 0,
    undiscountedSalesGasVolume: 0,
    npv: null,
    financialIneligibility: null,
    irr: null,
    breakEvenOilPrice: null,
    breakEvenIneligibility: null,
    excludedCostYears: [],
    early: null,
};

describe("getMeasureUnavailableReason", () => {
    test("reports the most common reason, with ties going to the first seen", () => {
        const results = [
            { ...BASE_RESULT, financialIneligibility: Ineligibility.OIL_PRICE_MISSING },
            { ...BASE_RESULT, financialIneligibility: Ineligibility.GAS_COVERAGE },
            { ...BASE_RESULT, financialIneligibility: Ineligibility.GAS_COVERAGE },
        ];
        expect(getMeasureUnavailableReason(results, EconomicMeasure.NPV)).toBe(
            "Gas source coverage is not established for every month of the evaluation.",
        );
        expect(getMeasureUnavailableReason(results.slice(0, 2), EconomicMeasure.IRR)).toBe("Enter oil price.");
    });

    test("reports the break-even reason instead of a generic text", () => {
        const results = [
            { ...BASE_RESULT, breakEvenIneligibility: Ineligibility.NO_INCLUDED_COSTS },
            { ...BASE_RESULT, hasOilData: false, breakEvenIneligibility: Ineligibility.OIL_COVERAGE },
            { ...BASE_RESULT, breakEvenIneligibility: Ineligibility.NO_INCLUDED_COSTS },
        ];
        expect(getMeasureUnavailableReason(results, EconomicMeasure.BREAK_EVEN_OIL_PRICE)).toBe(
            "Enter a non-zero CAPEX or OPEX within the evaluation.",
        );
        expect(
            getMeasureUnavailableReason(
                [{ ...BASE_RESULT, breakEvenIneligibility: Ineligibility.COST_DRAFT_INVALID }],
                EconomicMeasure.BREAK_EVEN_OIL_PRICE,
            ),
        ).toBe("Financial results are unavailable until the cost schedule is valid.");
    });

    test("keeps the IRR solver texts when IRR was calculated", () => {
        expect(
            getMeasureUnavailableReason(
                [{ ...BASE_RESULT, npv: 1, irrStatus: IrrStatus.NO_FINITE_ROOT }],
                EconomicMeasure.IRR,
            ),
        ).toBe("No finite IRR for the available cash-flow signs.");
    });

    test("reports missing coverage for volume measures", () => {
        const results = [{ ...BASE_RESULT, hasOilData: false, hasSalesGasData: false }];
        expect(getMeasureUnavailableReason(results, EconomicMeasure.UNDISCOUNTED_OIL_VOLUME)).toBe(
            "Oil source coverage is not established for every month of the evaluation.",
        );
        expect(getMeasureUnavailableReason(results, EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME)).toBe(
            "Gas source coverage is not established for every month of the evaluation.",
        );
        expect(
            getMeasureUnavailableReason(
                [{ ...BASE_RESULT, hasSalesGasData: false }],
                EconomicMeasure.DISCOUNTED_OIL_EQUIVALENTS,
            ),
        ).toBe("Gas source coverage is not established for every month of the evaluation.");
        expect(getMeasureUnavailableReason([BASE_RESULT], EconomicMeasure.DISCOUNTED_OIL_VOLUME)).toBe(
            "No valid values are available for this metric.",
        );
    });
});

describe("isFinancialMeasure", () => {
    test("is true only for NPV, IRR and break-even oil price", () => {
        const financialMeasures = Object.values(EconomicMeasure).filter(isFinancialMeasure);
        expect(financialMeasures.sort()).toEqual(
            [EconomicMeasure.NPV, EconomicMeasure.IRR, EconomicMeasure.BREAK_EVEN_OIL_PRICE].sort(),
        );
    });
});

describe("getMeasureDisplayName", () => {
    test("labels financial Delta measures as incremental", () => {
        expect(getMeasureDisplayName(EconomicMeasure.NPV, true)).toBe("Incremental net present value");
        expect(getMeasureDisplayName(EconomicMeasure.IRR, true)).toBe("Incremental internal rate of return");
        expect(getMeasureDisplayName(EconomicMeasure.BREAK_EVEN_OIL_PRICE, true)).toBe(
            "Incremental break-even oil price",
        );
    });

    test("keeps regular measure labels unchanged", () => {
        expect(getMeasureDisplayName(EconomicMeasure.NPV)).toBe("Net present value");
        expect(getMeasureDisplayName(EconomicMeasure.DISCOUNTED_OIL_VOLUME, true)).toBe("Discounted oil volume");
    });
});

describe("getMeasureUnit", () => {
    test("labels the break-even price with currency and volume basis like the price inputs", () => {
        const context = { oilUnit: "SM3", gasUnit: "SM3", currency: "USD" };
        expect(
            getMeasureUnit(EconomicMeasure.BREAK_EVEN_OIL_PRICE, { ...context, oilPriceBasis: OilPriceBasis.PER_SM3 }),
        ).toBe("USD per Sm³");
        expect(
            getMeasureUnit(EconomicMeasure.BREAK_EVEN_OIL_PRICE, { ...context, oilPriceBasis: OilPriceBasis.PER_BBL }),
        ).toBe("USD per bbl");
    });
});

describe("getMeasureDisplayScale", () => {
    test("uses one word-prefixed currency scale for a large NPV distribution", () => {
        expect(getMeasureDisplayScale(EconomicMeasure.NPV, [3.312e9, -2.1e9], "USD")).toEqual({
            factor: 1e9,
            prefix: "billion",
            style: "words",
            numDecimalPlaces: 2,
            unit: "billion USD",
        });
    });

    test("uses one SI-prefixed scale for volumes", () => {
        const scale = getMeasureDisplayScale(EconomicMeasure.DISCOUNTED_OIL_VOLUME, [5.38e6, 7.176e6], "Sm³");
        expect(scale).toMatchObject({ factor: 1e6, unit: "MSm³", numDecimalPlaces: 2 });
        expect(formatMeasureValue(5.38e6, scale)).toBe("5.38");
    });

    test("keeps percent and prices below 1000 unscaled", () => {
        expect(getMeasureDisplayScale(EconomicMeasure.IRR, [12.345, 8.1], "%")).toMatchObject({
            factor: 1,
            unit: "%",
            numDecimalPlaces: 1,
        });
    });
});
