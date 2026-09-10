import { describe, expect, test } from "vitest";

import { DiscountConvention, InvestmentTiming } from "@modules/EconomicScreening/typesAndEnums";
import type { ResolvedEconomicAssumptions } from "@modules/EconomicScreening/utils/economicCalculations";
import {
    computeAnnualVolumesFromCumulative,
    computeInternalRateOfReturn,
    computeRealizationEconomics,
    makeDiscountFactors,
    sumDiscounted,
} from "@modules/EconomicScreening/utils/economicCalculations";

const NO_EVALUATION_WINDOW = { firstYear: null, lastYear: null };

function makeAssumptions(overrides: Partial<ResolvedEconomicAssumptions> = {}): ResolvedEconomicAssumptions {
    return {
        discountRateFraction: 0.1,
        baseYear: null,
        convention: DiscountConvention.YEAR_END,
        investmentTiming: InvestmentTiming.START_OF_YEAR,
        gasToOilEquivalentDivisor: 1000,
        oilPricePerVolume: null,
        gasPricePerVolume: null,
        ...overrides,
    };
}

function yearStartUtcMs(year: number): number {
    return Date.UTC(year, 0, 1);
}

describe("computeAnnualVolumesFromCumulative", () => {
    test("differences consecutive cumulative samples", () => {
        const result = computeAnnualVolumesFromCumulative(
            [yearStartUtcMs(2020), yearStartUtcMs(2021), yearStartUtcMs(2022)],
            [0, 100, 250],
        );

        expect(result.years).toEqual([2020, 2021]);
        expect(result.volumes).toEqual([100, 150]);
    });

    test("yields no intervals for a single sample", () => {
        const result = computeAnnualVolumesFromCumulative([yearStartUtcMs(2020)], [0]);

        expect(result.years).toEqual([]);
        expect(result.volumes).toEqual([]);
    });

    test("keeps negative differences, as produced by delta ensembles", () => {
        const result = computeAnnualVolumesFromCumulative([yearStartUtcMs(2020), yearStartUtcMs(2021)], [0, -50]);

        expect(result.volumes).toEqual([-50]);
    });

    test("throws when the arrays have different lengths", () => {
        expect(() => computeAnnualVolumesFromCumulative([1, 2], [1])).toThrow();
    });
});

describe("makeDiscountFactors", () => {
    test("year-end convention discounts a full year", () => {
        const factors = makeDiscountFactors([2020, 2021], 0.1, 2020, DiscountConvention.YEAR_END);

        expect(factors[0]).toBeCloseTo(1 / 1.1, 10);
        expect(factors[1]).toBeCloseTo(1 / 1.1 ** 2, 10);
    });

    test("mid-year convention discounts half a year less", () => {
        const factors = makeDiscountFactors([2020], 0.1, 2020, DiscountConvention.MID_YEAR);

        expect(factors[0]).toBeCloseTo(1 / 1.1 ** 0.5, 10);
    });

    test("a zero discount rate leaves values untouched", () => {
        const factors = makeDiscountFactors([2020, 2025], 0, 2020, DiscountConvention.YEAR_END);

        expect(factors).toEqual([1, 1]);
    });
});

describe("computeInternalRateOfReturn", () => {
    test("finds the rate where the discounted cash flow nets to zero", () => {
        const years = [2020, 2021];
        const netCashFlow = [-100, 110];

        const irr = computeInternalRateOfReturn(years, netCashFlow, 2020, DiscountConvention.YEAR_END);

        expect(irr).not.toBeNull();
        expect(
            sumDiscounted(netCashFlow, makeDiscountFactors(years, irr!, 2020, DiscountConvention.YEAR_END)),
        ).toBeCloseTo(0, 6);
    });

    test("returns null when the cash flow never turns positive", () => {
        expect(computeInternalRateOfReturn([2020, 2021], [-100, -50], 2020, DiscountConvention.YEAR_END)).toBeNull();
    });

    test("returns null when the cash flow never turns negative", () => {
        expect(computeInternalRateOfReturn([2020, 2021], [100, 50], 2020, DiscountConvention.YEAR_END)).toBeNull();
    });
});

describe("computeRealizationEconomics", () => {
    const input = {
        realization: 3,
        years: [2020, 2021],
        oilVolumes: [100, 200],
        salesGasVolumes: [1000, 2000],
    };

    test("discounts volumes with the configured rate", () => {
        const result = computeRealizationEconomics(input, makeAssumptions(), [], NO_EVALUATION_WINDOW);

        expect(result.realization).toBe(3);
        expect(result.undiscountedOilVolume).toBe(300);
        expect(result.discountedOilVolume).toBeCloseTo(100 / 1.1 + 200 / 1.1 ** 2, 10);
        expect(result.discountedOilEquivalents).toBeCloseTo(
            result.discountedOilVolume + result.discountedSalesGasVolume / 1000,
            10,
        );
    });

    test("leaves NPV and IRR undefined when no prices are given", () => {
        const result = computeRealizationEconomics(input, makeAssumptions(), [], NO_EVALUATION_WINDOW);

        expect(result.npv).toBeNull();
        expect(result.irr).toBeNull();
        expect(result.netCashFlow).toBeNull();
    });

    test("computes NPV from prices and costs", () => {
        const result = computeRealizationEconomics(
            input,
            makeAssumptions({ oilPricePerVolume: 2, gasPricePerVolume: 0 }),
            [
                { year: 2020, capex: 50, opex: 10 },
                { year: 2021, capex: 0, opex: 20 },
            ],
            NO_EVALUATION_WINDOW,
        );

        const expectedNpv = (100 * 2 - 10) / 1.1 - 50 + (200 * 2 - 20) / 1.1 ** 2;
        expect(result.npv).toBeCloseTo(expectedNpv, 10);
        expect(result.netCashFlow).toEqual([140, 380]);
    });

    test("discounts investment costs at the configured start-of-year timing", () => {
        const result = computeRealizationEconomics(
            input,
            makeAssumptions({ oilPricePerVolume: 2, gasPricePerVolume: 0 }),
            [{ year: 2020, capex: 50, opex: 10 }],
            NO_EVALUATION_WINDOW,
        );

        expect(result.npv).toBeCloseTo((100 * 2 - 10) / 1.1 - 50 + (200 * 2) / 1.1 ** 2, 10);
    });

    test("uses separately timed investment costs when calculating IRR", () => {
        const result = computeRealizationEconomics(
            { realization: 3, years: [2020], oilVolumes: [110], salesGasVolumes: [0] },
            makeAssumptions({ oilPricePerVolume: 1, gasPricePerVolume: 0 }),
            [{ year: 2020, capex: 100, opex: 0 }],
            NO_EVALUATION_WINDOW,
        );

        expect(result.irr).toBeCloseTo(0.1, 9);
    });

    test("fixed-gas break-even oil price makes NPV zero", () => {
        const result = computeRealizationEconomics(
            input,
            makeAssumptions({ gasPricePerVolume: 0.1 }),
            [{ year: 2020, capex: 100, opex: 0 }],
            NO_EVALUATION_WINDOW,
        );

        const atBreakEven = computeRealizationEconomics(
            input,
            makeAssumptions({ oilPricePerVolume: result.breakEvenOilPrice, gasPricePerVolume: 0.1 }),
            [{ year: 2020, capex: 100, opex: 0 }],
            NO_EVALUATION_WINDOW,
        );

        expect(result.breakEvenOilPrice).not.toBeNull();
        expect(atBreakEven.npv).toBeCloseTo(0, 10);
    });

    test("break-even oil price is undefined without costs", () => {
        const result = computeRealizationEconomics(input, makeAssumptions(), [], NO_EVALUATION_WINDOW);

        expect(result.breakEvenOilPrice).toBeNull();
    });

    test("does not assume a gas price when sales gas is present", () => {
        const result = computeRealizationEconomics(
            input,
            makeAssumptions(),
            [{ year: 2020, capex: 100, opex: 0 }],
            NO_EVALUATION_WINDOW,
        );

        expect(result.breakEvenOilPrice).toBeNull();
    });

    test("includes cost-only years that precede first production", () => {
        const result = computeRealizationEconomics(
            input,
            makeAssumptions({ baseYear: 2019, oilPricePerVolume: 1 }),
            [{ year: 2019, capex: 500, opex: 0 }],
            NO_EVALUATION_WINDOW,
        );

        expect(result.years).toEqual([2019, 2020, 2021]);
        expect(result.netCashFlow?.[0]).toBe(-500);
    });

    test("restricts the calculation to the evaluation window", () => {
        const result = computeRealizationEconomics(input, makeAssumptions(), [], {
            firstYear: 2021,
            lastYear: null,
        });

        expect(result.years).toEqual([2021]);
        expect(result.undiscountedOilVolume).toBe(200);
    });

    test("defaults the base year to the first year of the profile", () => {
        const result = computeRealizationEconomics(input, makeAssumptions(), [], NO_EVALUATION_WINDOW);

        expect(result.discountFactors[0]).toBeCloseTo(1 / 1.1, 10);
    });

    test("keeps an explicit valuation year when the evaluation window changes", () => {
        const result = computeRealizationEconomics(
            input,
            makeAssumptions({ baseYear: 2020 }),
            [],
            { firstYear: 2021, lastYear: null },
        );

        expect(result.discountFactors).toEqual([1 / 1.1 ** 2]);
    });
});
