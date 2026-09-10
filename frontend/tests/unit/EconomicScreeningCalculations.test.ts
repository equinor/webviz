import { describe, expect, test } from "vitest";

import {
    BreakEvenSlopeDirection,
    DiscountConvention,
    InvestmentTiming,
    IrrStatus,
} from "@modules/EconomicScreening/typesAndEnums";
import type { ResolvedEconomicAssumptions } from "@modules/EconomicScreening/utils/economicCalculations";
import {
    computeAnnualVolumesFromCumulative,
    extractEarlyValue,
    computeInternalRateOfReturn,
    computeRealizationEconomics,
    makeDiscountFactors,
    makeInvestmentDiscountFactors,
    sumDiscounted,
} from "@modules/EconomicScreening/utils/economicCalculations";
import { normalizeEconomicProfiles } from "@modules/EconomicScreening/utils/normalizedProfiles";

const NO_EVALUATION_WINDOW = { firstYear: null, lastYear: null };

function makeAssumptions(overrides: Partial<ResolvedEconomicAssumptions> = {}): ResolvedEconomicAssumptions {
    return {
        discountRateFraction: 0.1,
        baseYear: null,
        convention: DiscountConvention.YEAR_END,
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

    test("handles out-of-order and duplicate timestamps gracefully", () => {
        const result = computeAnnualVolumesFromCumulative(
            [yearStartUtcMs(2021), yearStartUtcMs(2020), yearStartUtcMs(2021), yearStartUtcMs(2022)],
            [100, 0, 100, 250],
        );

        expect(result.years).toEqual([2020, 2021]);
        expect(result.volumes).toEqual([100, 150]);
    });

    test("skips non-finite values and timestamps", () => {
        const result = computeAnnualVolumesFromCumulative(
            [yearStartUtcMs(2020), NaN, yearStartUtcMs(2021), yearStartUtcMs(2022)],
            [0, 50, 100, 250],
        );

        expect(result.years).toEqual([2020, 2021]);
        expect(result.volumes).toEqual([100, 150]);
    });

    test("throws when the arrays have different lengths", () => {
        expect(() => computeAnnualVolumesFromCumulative([1, 2], [1])).toThrow();
    });
});

describe("normalizeEconomicProfiles", () => {
    test("aligns sales gas to each oil realization's annual grid", () => {
        const profiles = normalizeEconomicProfiles(
            [
                {
                    realization: 1,
                    timestampsUtcMs: [yearStartUtcMs(2020), yearStartUtcMs(2021), yearStartUtcMs(2022)],
                    values: [0, 100, 300],
                    unit: "SM3",
                    isRate: false,
                },
            ],
            [
                {
                    realization: 1,
                    timestampsUtcMs: [yearStartUtcMs(2021), yearStartUtcMs(2022)],
                    values: [10, 60],
                },
            ],
        );

        expect(profiles).toEqual([
            {
                realization: 1,
                years: [2020, 2021],
                oilVolumes: [100, 200],
                salesGasVolumes: [0, 50],
                hasOilData: true,
                hasSalesGasData: true,
            },
        ]);
    });

    test("marks a realization without sales-gas data as incomplete instead of assuming zero gas", () => {
        const profiles = normalizeEconomicProfiles(
            [
                {
                    realization: 1,
                    timestampsUtcMs: [yearStartUtcMs(2020), yearStartUtcMs(2021)],
                    values: [0, 100],
                    unit: "SM3",
                    isRate: false,
                },
            ],
            [],
        );

        expect(profiles[0].hasSalesGasData).toBe(false);
        expect(profiles[0].salesGasVolumes).toEqual([0]);
    });

    test("preserves a gas-only realization", () => {
        const profiles = normalizeEconomicProfiles(
            [],
            [
                {
                    realization: 2,
                    timestampsUtcMs: [yearStartUtcMs(2020), yearStartUtcMs(2021)],
                    values: [0, 50],
                },
            ],
        );

        expect(profiles).toEqual([
            {
                realization: 2,
                years: [2020],
                oilVolumes: [0],
                salesGasVolumes: [50],
                hasOilData: false,
                hasSalesGasData: true,
            },
        ]);
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

    test("preserves oil volumes but withholds financial results when sales-gas data is incomplete", () => {
        const result = computeRealizationEconomics(
            { ...input, hasSalesGasData: false },
            makeAssumptions({ oilPricePerVolume: 2, gasPricePerVolume: 0 }),
            [],
            NO_EVALUATION_WINDOW,
        );

        expect(result.discountedOilVolume).toBeGreaterThan(0);
        expect(result.hasSalesGasData).toBe(false);
        expect(result.npv).toBeNull();
    });

    test("withholds financial results when present sales gas has no revenue assumption", () => {
        const result = computeRealizationEconomics(
            input,
            makeAssumptions({ oilPricePerVolume: 2 }),
            [],
            NO_EVALUATION_WINDOW,
        );

        expect(result.npv).toBeNull();
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

        const expectedNpv = (100 * 2 - 60) / 1.1 + (200 * 2 - 20) / 1.1 ** 2;
        expect(result.npv).toBeCloseTo(expectedNpv, 10);
        expect(result.netCashFlow).toEqual([140, 380]);
    });

    test("break-even oil price with fixed gas price satisfies NPV = 0 identity", () => {
        const costEntries = [{ year: 2020, capex: 100, opex: 0 }];
        const assumptions = makeAssumptions({ gasPricePerVolume: 0.05 });
        const result = computeRealizationEconomics(input, assumptions, costEntries, NO_EVALUATION_WINDOW);

        expect(result.breakEvenOilPrice).not.toBeNull();
        // PV_costs = 100 / 1.1
        // PV_gas = 0.05 * D_gas
        // BE = (PV_costs - PV_gas) / D_oil
        const pvCosts = 100 / 1.1;
        const pvGas = 0.05 * result.discountedSalesGasVolume;
        const expectedBe = (pvCosts - pvGas) / result.discountedOilVolume;
        expect(result.breakEvenOilPrice).toBeCloseTo(expectedBe, 10);

        // Substituting breakEvenOilPrice back into computeRealizationEconomics should yield NPV close to 0
        const npvCheckResult = computeRealizationEconomics(
            input,
            makeAssumptions({
                gasPricePerVolume: 0.05,
                oilPricePerVolume: result.breakEvenOilPrice!,
            }),
            costEntries,
            NO_EVALUATION_WINDOW,
        );
        expect(npvCheckResult.npv).toBeCloseTo(0, 8);
    });

    test("break-even oil price is undefined without costs", () => {
        const result = computeRealizationEconomics(input, makeAssumptions(), [], NO_EVALUATION_WINDOW);

        expect(result.breakEvenOilPrice).toBeNull();
    });

    test("includes cost-only years that precede first production", () => {
        const result = computeRealizationEconomics(
            input,
            makeAssumptions({ baseYear: 2019, oilPricePerVolume: 1, gasPricePerVolume: 0 }),
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

    test("extracts early values without rebasing the valuation date", () => {
        const result = computeRealizationEconomics(
            input,
            makeAssumptions({ baseYear: 2020, oilPricePerVolume: 1, gasPricePerVolume: 0 }),
            [],
            NO_EVALUATION_WINDOW,
        );

        const earlyValue = extractEarlyValue(result, 2020);

        expect(earlyValue.discountedOilVolume).toBeCloseTo(100 / 1.1, 10);
        expect(earlyValue.npv).toBeCloseTo(100 / 1.1, 10);
    });

    test("converts early sales gas to oil equivalents with the resolved divisor", () => {
        const result = computeRealizationEconomics(
            input,
            makeAssumptions({ baseYear: 2020, gasToOilEquivalentDivisor: 1000 }),
            [],
            NO_EVALUATION_WINDOW,
        );

        const earlyValue = extractEarlyValue(result, 2020);

        expect(earlyValue.discountedOilEquivalents).toBeCloseTo((100 + 1000 / 1000) / 1.1, 10);
    });
});

describe("Agreed-assumption fixture: pins annual alignment, units, timing, NPV, and break-even", () => {
    // 3-year project:
    // Year 2020: CAPEX 1000, OPEX 0, Oil 0, Gas 0 (pre-production investment)
    // Year 2021: CAPEX 0, OPEX 100, Oil 500 Sm3, Gas 50,000 Sm3
    // Year 2022: CAPEX 0, OPEX 100, Oil 300 Sm3, Gas 30,000 Sm3
    // Assumptions:
    // Discount rate = 10% (0.10)
    // Base year = 2020
    // Convention = Mid-year (offset 0.5)
    // Investment timing = Start of year (offset 0.0)
    // Oil price = 70 USD/Sm3
    // Gas price = 0.20 USD/Sm3
    // Gas to oil equivalent factor = 1000
    const fixtureInput = {
        realization: 1,
        years: [2021, 2022],
        oilVolumes: [500, 300],
        salesGasVolumes: [50000, 30000],
    };
    const fixtureCosts = [
        { year: 2020, capex: 1000, opex: 0 },
        { year: 2021, capex: 0, opex: 100 },
        { year: 2022, capex: 0, opex: 100 },
    ];
    const fixtureAssumptions: ResolvedEconomicAssumptions = {
        discountRateFraction: 0.1,
        baseYear: 2020,
        convention: DiscountConvention.MID_YEAR,
        investmentTiming: InvestmentTiming.START_OF_YEAR,
        gasToOilEquivalentDivisor: 1000,
        oilPricePerVolume: 70,
        gasPricePerVolume: 0.2,
    };

    test("computes exact hand-calculated NPV and discounted volumes", () => {
        const result = computeRealizationEconomics(
            fixtureInput,
            fixtureAssumptions,
            fixtureCosts,
            NO_EVALUATION_WINDOW,
        );

        expect(result.years).toEqual([2020, 2021, 2022]);

        // Discount factors:
        // Mid-year:
        // 2021: 1.1^(-1.5)
        // 2022: 1.1^(-2.5)
        const df2021 = 1 / Math.pow(1.1, 1.5);
        const df2022 = 1 / Math.pow(1.1, 2.5);

        // Investment df:
        // 2020 (start of year): 1.1^(-0) = 1.0
        const invDf2020 = 1.0;

        // Discounted oil:
        const expectedDoil = 500 * df2021 + 300 * df2022;
        expect(result.discountedOilVolume).toBeCloseTo(expectedDoil, 10);

        // Discounted gas:
        const expectedDgas = 50000 * df2021 + 30000 * df2022;
        expect(result.discountedSalesGasVolume).toBeCloseTo(expectedDgas, 10);

        // Discounted oe:
        expect(result.discountedOilEquivalents).toBeCloseTo(expectedDoil + expectedDgas / 1000, 10);

        // Cash flow:
        // 2020: Capex 1000 at start of year -> PV_capex = 1000 * 1.0 = 1000. Rev - Opex = 0.
        // 2021: Oil rev = 500 * 70 = 35000, Gas rev = 50000 * 0.20 = 10000. Opex = 100.
        //       Net operating cash flow = 45000 - 100 = 44900.
        //       PV_operating = 44900 * df2021.
        // 2022: Oil rev = 300 * 70 = 21000, Gas rev = 30000 * 0.20 = 6000. Opex = 100.
        //       Net operating cash flow = 27000 - 100 = 26900.
        //       PV_operating = 26900 * df2022.
        const expectedNpv = -1000 * invDf2020 + 44900 * df2021 + 26900 * df2022;
        expect(result.npv).toBeCloseTo(expectedNpv, 10);

        // Cumulative discounted cash flow final element matches NPV exactly
        expect(result.cumulativeDiscountedCashFlow).toBeDefined();
        const cumDcf = result.cumulativeDiscountedCashFlow!;
        expect(cumDcf[cumDcf.length - 1]).toBeCloseTo(result.npv!, 10);

        // Break-even oil price with fixed gas price:
        // PV_costs = 1000 * 1.0 + 100 * df2021 + 100 * df2022
        // PV_gas = 0.20 * expectedDgas
        // BE = (PV_costs - PV_gas) / expectedDoil
        const pvCosts = 1000 * 1.0 + 100 * df2021 + 100 * df2022;
        const pvGas = 0.2 * expectedDgas;
        const expectedBe = (pvCosts - pvGas) / expectedDoil;
        expect(result.breakEvenOilPrice).toBeCloseTo(expectedBe, 10);
        expect(result.breakEvenSlopeDirection).toBe(BreakEvenSlopeDirection.POSITIVE);

        // Consistency check: NPV at breakEvenOilPrice must be zero
        const beNpvCheck = computeRealizationEconomics(
            fixtureInput,
            { ...fixtureAssumptions, oilPricePerVolume: result.breakEvenOilPrice! },
            fixtureCosts,
            NO_EVALUATION_WINDOW,
        );
        expect(beNpvCheck.npv).toBeCloseTo(0, 8);
    });

    test("computes robust IRR for conventional profile and rejects non-conventional", () => {
        const result = computeRealizationEconomics(
            fixtureInput,
            fixtureAssumptions,
            fixtureCosts,
            NO_EVALUATION_WINDOW,
        );
        expect(result.irr).not.toBeNull();
        expect(result.irrStatus).toBe(IrrStatus.CONVERGED);

        // Verify NPV at calculated IRR is zero
        const annualDfIrr = makeDiscountFactors(result.years, result.irr!, 2020, DiscountConvention.MID_YEAR);
        const invDfIrr = makeInvestmentDiscountFactors(
            result.years,
            result.irr!,
            2020,
            DiscountConvention.MID_YEAR,
            InvestmentTiming.START_OF_YEAR,
        );
        const npvAtIrr = 44900 * annualDfIrr[1] + 26900 * annualDfIrr[2] - 1000 * invDfIrr[0];
        expect(npvAtIrr).toBeCloseTo(0, 5);

        // Non-conventional profile test: repeated sign changes (- + -)
        const nonConvCosts = [
            { year: 2020, capex: 1000, opex: 0 },
            { year: 2021, capex: 0, opex: 100 },
            { year: 2022, capex: 100000, opex: 100 }, // Huge capex in year 2 produces repeated sign change
        ];
        const nonConvResult = computeRealizationEconomics(
            fixtureInput,
            fixtureAssumptions,
            nonConvCosts,
            NO_EVALUATION_WINDOW,
        );
        expect(nonConvResult.irr).toBeNull();
        expect(nonConvResult.irrStatus).toBe(IrrStatus.NON_CONVENTIONAL);
    });

    test("handles negative break-even price when gas revenue exceeds costs", () => {
        // Very high gas price: 50 USD/Sm3 covers all costs without oil revenue
        const highGasAssumptions = {
            ...fixtureAssumptions,
            gasPricePerVolume: 50,
        };
        const result = computeRealizationEconomics(
            fixtureInput,
            highGasAssumptions,
            fixtureCosts,
            NO_EVALUATION_WINDOW,
        );
        expect(result.breakEvenOilPrice).not.toBeNull();
        expect(result.breakEvenOilPrice!).toBeLessThan(0);
        expect(result.breakEvenSlopeDirection).toBe(BreakEvenSlopeDirection.POSITIVE);

        // NPV at negative break-even price still evaluates to 0
        const npvCheck = computeRealizationEconomics(
            fixtureInput,
            { ...highGasAssumptions, oilPricePerVolume: result.breakEvenOilPrice! },
            fixtureCosts,
            NO_EVALUATION_WINDOW,
        );
        expect(npvCheck.npv).toBeCloseTo(0, 8);
    });

    test("handles delta ensemble with negative oil volume and incremental break-even", () => {
        // Delta ensemble: oil volume is negative (-500, -300), cost is negative (savings of 1000 in capex)
        const deltaInput = {
            realization: 2,
            years: [2021, 2022],
            oilVolumes: [-500, -300],
            salesGasVolumes: [0, 0],
        };
        const deltaCosts = [{ year: 2020, capex: -1000, opex: 0 }];
        const deltaAssumptions = {
            ...fixtureAssumptions,
            gasPricePerVolume: 0,
        };
        const result = computeRealizationEconomics(deltaInput, deltaAssumptions, deltaCosts, NO_EVALUATION_WINDOW);
        expect(result.breakEvenOilPrice).not.toBeNull();
        // Negative D_oil means lower oil price improves incremental NPV: slope direction is NEGATIVE
        expect(result.breakEvenSlopeDirection).toBe(BreakEvenSlopeDirection.NEGATIVE);

        // Substituting break-even price returns 0 NPV
        const npvCheck = computeRealizationEconomics(
            deltaInput,
            { ...deltaAssumptions, oilPricePerVolume: result.breakEvenOilPrice! },
            deltaCosts,
            NO_EVALUATION_WINDOW,
        );
        expect(npvCheck.npv).toBeCloseTo(0, 8);
    });

    test("linear NPV identity: NPV(delta) = NPV(comparison) - NPV(reference)", () => {
        // Comparison
        const compInput = {
            realization: 1,
            years: [2021, 2022],
            oilVolumes: [600, 400],
            salesGasVolumes: [60000, 40000],
        };
        const compCosts = [{ year: 2020, capex: 1500, opex: 120 }];

        // Reference
        const refInput = {
            realization: 1,
            years: [2021, 2022],
            oilVolumes: [500, 300],
            salesGasVolumes: [50000, 30000],
        };
        const refCosts = [{ year: 2020, capex: 1000, opex: 100 }];

        // Delta = comp - ref
        const deltaInput = {
            realization: 1,
            years: [2021, 2022],
            oilVolumes: [100, 100],
            salesGasVolumes: [10000, 10000],
        };
        const deltaCosts = [{ year: 2020, capex: 500, opex: 20 }];

        const compResult = computeRealizationEconomics(compInput, fixtureAssumptions, compCosts, NO_EVALUATION_WINDOW);
        const refResult = computeRealizationEconomics(refInput, fixtureAssumptions, refCosts, NO_EVALUATION_WINDOW);
        const deltaResult = computeRealizationEconomics(
            deltaInput,
            fixtureAssumptions,
            deltaCosts,
            NO_EVALUATION_WINDOW,
        );

        expect(deltaResult.npv).not.toBeNull();
        expect(compResult.npv).not.toBeNull();
        expect(refResult.npv).not.toBeNull();
        expect(deltaResult.npv!).toBeCloseTo(compResult.npv! - refResult.npv!, 8);
    });

    test("changing evaluation window does not rebase the valuation year", () => {
        // Full evaluation with baseYear 2020
        const fullResult = computeRealizationEconomics(
            fixtureInput,
            fixtureAssumptions,
            fixtureCosts,
            NO_EVALUATION_WINDOW,
        );

        // Truncated evaluation window: 2022 only
        const truncatedResult = computeRealizationEconomics(fixtureInput, fixtureAssumptions, fixtureCosts, {
            firstYear: 2022,
            lastYear: 2022,
        });

        // 2022 discount factor must still be discounted back to baseYear 2020
        expect(truncatedResult.discountFactors[0]).toBeCloseTo(fullResult.discountFactors[2], 10);
    });
});
