import { describe, expect, test } from "vitest";

import { BreakEvenSlopeDirection, GasPriceBasis, IrrStatus } from "@modules/EconomicScreening/typesAndEnums";
import {
    aggregateCoincidentEvents,
    computeInternalRateOfReturnFromEvents,
    isConventionalCashFlow,
    makeCostLookup,
} from "@modules/EconomicScreening/utils/economicCalculations";
import type { ResolvedMonthlyAssumptions } from "@modules/EconomicScreening/utils/monthlyEconomics";
import {
    capexDiscountFactor,
    computeMonthlyRealizationEconomics,
    discountedAnnualOpex,
    monthlyDiscountFactor,
} from "@modules/EconomicScreening/utils/monthlyEconomics";
import type { MonthlyProductionProfile } from "@modules/EconomicScreening/utils/monthlyProduction";
import { MonthCoverage, monthIndexOf } from "@modules/EconomicScreening/utils/monthlyProduction";
import {
    convertGasPriceToSimulatorUnit,
    makeFixedOilEquivalentDivisor,
    volumeUnitInSm3,
} from "@modules/EconomicScreening/utils/unitConversion";

function npvOfEvents(events: { time: number; value: number }[], rate: number): number {
    return events.reduce((sum, event) => sum + event.value / Math.pow(1 + rate, event.time), 0);
}

describe("computeInternalRateOfReturnFromEvents", () => {
    test("finds the rate where the discounted events net to zero", () => {
        const events = [
            { time: 0, value: -100 },
            { time: 1, value: 110 },
        ];
        const result = computeInternalRateOfReturnFromEvents(events);

        expect(result).toEqual({ irr: expect.closeTo(0.1, 9), status: IrrStatus.CONVERGED });
        expect(npvOfEvents(events, result.irr!)).toBeCloseTo(0, 6);
    });

    test("reports no finite root when the events never change sign", () => {
        const allNegative = [
            { time: 0, value: -100 },
            { time: 1, value: -50 },
        ];
        const allPositive = [
            { time: 0, value: 100 },
            { time: 1, value: 50 },
        ];

        expect(computeInternalRateOfReturnFromEvents(allNegative)).toEqual({
            irr: null,
            status: IrrStatus.NO_FINITE_ROOT,
        });
        expect(computeInternalRateOfReturnFromEvents(allPositive)).toEqual({
            irr: null,
            status: IrrStatus.NO_FINITE_ROOT,
        });
    });

    test("is independent of the absolute event dates", () => {
        const result = computeInternalRateOfReturnFromEvents([
            { time: 20, value: -100 },
            { time: 21, value: 110 },
        ]);

        expect(result).toEqual({ irr: expect.closeTo(0.1, 9), status: IrrStatus.CONVERGED });
    });

    test("aggregates coincident events before classifying the cash flow", () => {
        const result = computeInternalRateOfReturnFromEvents([
            { time: 0, value: -100 },
            { time: 1, value: 150 },
            { time: 1, value: -100 },
            { time: 2, value: 60 },
        ]);

        expect(result).toEqual({ irr: expect.closeTo(0.063941, 5), status: IrrStatus.CONVERGED });
    });

    test("solves long conventional profiles despite lower-bracket overflow, at any scale", () => {
        const expectedIrr = 2 ** (1 / 80) - 1;

        for (const scale of [1, 1e-13, 1e-9, 1e9]) {
            const result = computeInternalRateOfReturnFromEvents([
                { time: 0, value: -100 * scale },
                { time: 80, value: 200 * scale },
            ]);

            expect(result).toEqual({ irr: expect.closeTo(expectedIrr, 9), status: IrrStatus.CONVERGED });
        }
    });
});

describe("monthly ports of annual-model regressions", () => {
    test("leaves NPV and IRR undefined without prices while keeping volumes", () => {
        const result = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(100)),
                salesGasProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(1000)),
            },
            makeMonthlyAssumptions(),
            [],
        );

        expect(result.npv).toBeNull();
        expect(result.irr).toBeNull();
        expect(result.discountedOilVolume).toBeGreaterThan(0);
        expect(result.undiscountedSalesGasVolume).toBeCloseTo(12000, 9);
    });

    test("returns a negative break-even price when gas revenue exceeds costs", () => {
        const input = {
            realization: 1,
            oilProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(100)),
            salesGasProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(1000)),
        };
        const costs = [{ year: 2030, capex: 1000, opex: 100 }];
        const result = computeMonthlyRealizationEconomics(
            input,
            makeMonthlyAssumptions({ gasPricePerVolume: 50 }),
            costs,
        );

        expect(result.breakEvenOilPrice!).toBeLessThan(0);
        expect(result.breakEvenSlopeDirection).toBe(BreakEvenSlopeDirection.POSITIVE);

        const substituted = computeMonthlyRealizationEconomics(
            input,
            makeMonthlyAssumptions({ gasPricePerVolume: 50, oilPricePerVolume: result.breakEvenOilPrice }),
            costs,
        );
        expect(substituted.npv).toBeCloseTo(0, 6);
    });

    test("reports a negative break-even slope for negative delta oil volume", () => {
        const input = {
            realization: 2,
            oilProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(-100)),
            salesGasProfile: makeZeroProfile(2030, 12),
        };
        const costs = [{ year: 2030, capex: -1000, opex: 0 }];
        const result = computeMonthlyRealizationEconomics(
            input,
            makeMonthlyAssumptions({ gasPricePerVolume: 0 }),
            costs,
        );

        expect(result.breakEvenOilPrice).not.toBeNull();
        expect(result.breakEvenSlopeDirection).toBe(BreakEvenSlopeDirection.NEGATIVE);

        const substituted = computeMonthlyRealizationEconomics(
            input,
            makeMonthlyAssumptions({ gasPricePerVolume: 0, oilPricePerVolume: result.breakEvenOilPrice }),
            costs,
        );
        expect(substituted.npv).toBeCloseTo(0, 8);
    });
});

describe("makeCostLookup", () => {
    test("rejects duplicate cost years instead of silently summing them", () => {
        expect(() =>
            makeCostLookup([
                { year: 2020, capex: 10, opex: 0 },
                { year: 2020, capex: 20, opex: 0 },
            ]),
        ).toThrow("Duplicate cost year: 2020");
    });
});

function makeMonthlyProfile(
    startYear: number,
    startMonth: number,
    volumes: number[],
    options: { coverage?: MonthCoverage } = {},
): MonthlyProductionProfile {
    const coverage = options.coverage ?? MonthCoverage.SOURCE_ALIGNED;
    const months = volumes.map((volume, index) => {
        const absoluteMonth = startYear * 12 + (startMonth - 1) + index;
        return {
            year: Math.floor(absoluteMonth / 12),
            month: (absoluteMonth % 12) + 1,
            volume,
            coverage,
        };
    });
    return {
        months,
        totalIncrement: volumes.reduce((sum, volume) => sum + volume, 0),
        rejection: null,
    };
}

function makeZeroProfile(startYear: number, monthCount: number): MonthlyProductionProfile {
    return makeMonthlyProfile(startYear, 1, new Array(monthCount).fill(0));
}

function makeMonthlyAssumptions(overrides: Partial<ResolvedMonthlyAssumptions> = {}): ResolvedMonthlyAssumptions {
    return {
        discountRateFraction: 0.1,
        predictionStartYear: 2030,
        horizonEndMonthIndex: monthIndexOf(2030, 12),
        gasToOilEquivalentDivisor: 1000,
        oilPricePerVolume: null,
        gasPricePerVolume: null,
        ...overrides,
    };
}

describe("monthly screening model", () => {
    test("discounts production and OPEX allocations at month midpoints and CAPEX at mid-year", () => {
        const oilProfile = makeMonthlyProfile(2030, 1, new Array(12).fill(100));
        const result = computeMonthlyRealizationEconomics(
            { realization: 3, oilProfile, salesGasProfile: makeZeroProfile(2030, 12) },
            makeMonthlyAssumptions({ oilPricePerVolume: 50 }),
            [{ year: 2030, capex: 1000, opex: 200 }],
        );

        expect(monthlyDiscountFactor(2030, 1, 2030, 0.1)).toBeCloseTo(0.9960366175, 10);
        expect(monthlyDiscountFactor(2030, 7, 2030, 0.1)).toBeCloseTo(0.9496836523, 10);
        expect(monthlyDiscountFactor(2030, 12, 2030, 0.1)).toBeCloseTo(0.9127083213, 10);
        expect(capexDiscountFactor(2030, 2030, 0.1)).toBeCloseTo(1 / Math.sqrt(1.1), 12);

        const monthlyFactors = Array.from({ length: 12 }, (_, index) => Math.pow(1.1, -((index + 1 - 0.5) / 12)));
        const expectedDiscountedOil = monthlyFactors.reduce((sum, factor) => sum + 100 * factor, 0);
        const expectedOpexPv = monthlyFactors.reduce((sum, factor) => sum + (200 / 12) * factor, 0);
        const expectedNpv = 50 * expectedDiscountedOil - 1000 * Math.pow(1.1, -0.5) - expectedOpexPv;

        expect(discountedAnnualOpex(200, 2030, 2030, 0.1)).toBeCloseTo(expectedOpexPv, 12);
        expect(result.realization).toBe(3);
        expect(result.discountedOilVolume).toBeCloseTo(expectedDiscountedOil, 9);
        expect(result.discountedOilVolume).toBeCloseTo(1144.585212, 5);
        expect(result.undiscountedOilVolume).toBeCloseTo(1200, 9);
        expect(result.npv).toBeCloseTo(expectedNpv, 8);
        // Mid-year annual OPEX previously gave 56085.105488.
        expect(result.npv).toBeCloseTo(56085.033804, 4);
        expect(result.annualProfile[0].opex).toBe(200);
    });

    test("uses undiscounted sums at a zero rate", () => {
        const result = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(10)),
                salesGasProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(100)),
            },
            makeMonthlyAssumptions({
                discountRateFraction: 0,
                oilPricePerVolume: 5,
                gasPricePerVolume: 0.5,
            }),
            [{ year: 2030, capex: 100, opex: 50 }],
        );

        expect(result.discountedOilVolume).toBeCloseTo(120, 10);
        expect(result.npv).toBeCloseTo(120 * 5 + 1200 * 0.5 - 150, 10);
    });

    test("aggregates monthly results into annual profiles after discounting", () => {
        const oilProfile = makeMonthlyProfile(2030, 1, new Array(24).fill(100));
        const result = computeMonthlyRealizationEconomics(
            { realization: 1, oilProfile, salesGasProfile: makeZeroProfile(2030, 24) },
            makeMonthlyAssumptions({ oilPricePerVolume: 1, horizonEndMonthIndex: monthIndexOf(2031, 12) }),
            [],
        );

        const secondYearDiscountedOil = Array.from({ length: 12 }, (_, index) =>
            Math.pow(1.1, -(1 + (index + 1 - 0.5) / 12)),
        ).reduce((sum, factor) => sum + 100 * factor, 0);

        expect(result.annualProfile.map((entry) => entry.year)).toEqual([2030, 2031]);
        expect(result.annualProfile[1].oilVolume).toBeCloseTo(1200, 9);
        expect(result.annualProfile[1].discountedOilVolume).toBeCloseTo(secondYearDiscountedOil, 9);
        // Discounting annual totals at mid-year would give a different, smaller value.
        expect(result.annualProfile[1].discountedOilVolume).not.toBeCloseTo(1200 * Math.pow(1.1, -1.5), 3);
    });

    test("includes pre-production cost years when source coverage establishes zero production", () => {
        const oilVolumes = [...new Array(24).fill(0), ...new Array(12).fill(100)];
        const result = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, oilVolumes),
                salesGasProfile: makeZeroProfile(2030, 36),
            },
            makeMonthlyAssumptions({
                predictionStartYear: 2030,
                horizonEndMonthIndex: monthIndexOf(2032, 12),
                oilPricePerVolume: 10,
            }),
            [{ year: 2030, capex: 500, opex: 0 }],
        );

        expect(result.annualProfile.map((entry) => entry.year)).toEqual([2030, 2031, 2032]);
        expect(result.annualProfile[0].oilVolume).toBe(0);
        expect(result.hasOilData).toBe(true);
        expect(result.excludedCostYears).toEqual([]);
        expect(result.annualProfile[0].discountedNetCashFlow).toBeCloseTo(-500 * Math.pow(1.1, -0.5), 10);
    });

    test("does not infer pre-source zeros from a zero initial cumulative value", () => {
        // The profile starts in 2032 at zero cumulative volume; the months from 2030 are still unsupported.
        const result = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2032, 1, new Array(12).fill(100)),
                salesGasProfile: makeMonthlyProfile(2032, 1, new Array(12).fill(0)),
            },
            makeMonthlyAssumptions({
                predictionStartYear: 2030,
                horizonEndMonthIndex: monthIndexOf(2032, 12),
                oilPricePerVolume: 10,
            }),
            [{ year: 2030, capex: 500, opex: 0 }],
        );

        expect(result.hasOilData).toBe(false);
        expect(result.hasSalesGasData).toBe(false);
        expect(result.npv).toBeNull();
        expect(result.breakEvenOilPrice).toBeNull();
        expect(result.financialReason).toContain("coverage");
        expect(result.undiscountedOilVolume).toBeCloseTo(1200, 9);
        expect(result.annualProfile[0].oilVolume).toBe(0);
    });

    test("withholds a realization whose source ends before the common horizon instead of zero-filling it", () => {
        const result = computeMonthlyRealizationEconomics(
            {
                realization: 5,
                oilProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(100)),
                salesGasProfile: makeZeroProfile(2030, 24),
            },
            makeMonthlyAssumptions({ horizonEndMonthIndex: monthIndexOf(2031, 12), oilPricePerVolume: 10 }),
            [],
        );

        expect(result.hasOilData).toBe(false);
        expect(result.hasSalesGasData).toBe(true);
        expect(result.npv).toBeNull();
        expect(result.evaluationEndYear).toBe(2031);
        expect(result.undiscountedOilVolume).toBeCloseTo(1200, 9);
    });

    test("does not use one product's later endpoint as support for another", () => {
        const result = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, new Array(24).fill(100)),
                salesGasProfile: makeMonthlyProfile(2030, 1, new Array(18).fill(1000)),
            },
            makeMonthlyAssumptions({
                horizonEndMonthIndex: monthIndexOf(2031, 12),
                oilPricePerVolume: 10,
                gasPricePerVolume: 0.1,
            }),
            [],
        );

        expect(result.hasOilData).toBe(true);
        expect(result.hasSalesGasData).toBe(false);
        expect(result.npv).toBeNull();
        expect(result.financialReason).toContain("Gas source coverage");
        expect(result.undiscountedOilVolume).toBeCloseTo(2400, 9);
    });

    test("withholds financial results while monthly coverage is unverified", () => {
        const result = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(100), {
                    coverage: MonthCoverage.UNVERIFIED,
                }),
                salesGasProfile: makeZeroProfile(2030, 12),
            },
            makeMonthlyAssumptions({ oilPricePerVolume: 50 }),
            [{ year: 2030, capex: 100, opex: 0 }],
        );

        expect(result.hasOilData).toBe(false);
        expect(result.npv).toBeNull();
        expect(result.breakEvenOilPrice).toBeNull();
        expect(result.undiscountedOilVolume).toBeCloseTo(1200, 9);
    });

    test("keeps independently valid gas volumes when oil coverage is partial", () => {
        const result = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(100), {
                    coverage: MonthCoverage.PARTIAL,
                }),
                salesGasProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(1000)),
            },
            makeMonthlyAssumptions({ oilPricePerVolume: 50, gasPricePerVolume: 0.1 }),
            [],
        );

        expect(result.hasOilData).toBe(false);
        expect(result.hasSalesGasData).toBe(true);
        expect(result.npv).toBeNull();
        expect(result.discountedSalesGasVolume).toBeGreaterThan(0);
        expect(result.discountedOilEquivalents).toBeCloseTo(
            result.discountedOilVolume + result.discountedSalesGasVolume / 1000,
            9,
        );
    });

    test("does not require a price for a product that is confirmed absent", () => {
        const result = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(100)),
                salesGasProfile: makeZeroProfile(2030, 12),
            },
            makeMonthlyAssumptions({ oilPricePerVolume: 50, gasPricePerVolume: null }),
            [],
        );

        expect(result.npv).not.toBeNull();
    });

    test("treats a blank oil price as unspecified and an explicit zero as omitted revenue", () => {
        const input = {
            realization: 1,
            oilProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(100)),
            salesGasProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(1000)),
        };
        const blank = computeMonthlyRealizationEconomics(
            input,
            makeMonthlyAssumptions({ oilPricePerVolume: null, gasPricePerVolume: 0.1 }),
            [{ year: 2030, capex: 100, opex: 0 }],
        );
        const zero = computeMonthlyRealizationEconomics(
            input,
            makeMonthlyAssumptions({ oilPricePerVolume: 0, gasPricePerVolume: 0.1 }),
            [{ year: 2030, capex: 100, opex: 0 }],
        );

        expect(blank.npv).toBeNull();
        expect(blank.financialReason).toBe("Enter oil price.");
        expect(zero.npv).toBeCloseTo(0.1 * zero.discountedSalesGasVolume - 100 * Math.pow(1.1, -0.5), 9);
        expect(zero.undiscountedOilVolume).toBeCloseTo(1200, 9);
    });

    test("keeps cost years outside the evaluated horizon out of every total", () => {
        const result = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(100)),
                salesGasProfile: makeZeroProfile(2030, 12),
            },
            makeMonthlyAssumptions({ oilPricePerVolume: 50 }),
            [
                { year: 2028, capex: 900, opex: 0 },
                { year: 2030, capex: 100, opex: 0 },
                { year: 2040, capex: 700, opex: 0 },
            ],
        );

        expect(result.excludedCostYears).toEqual([2028, 2040]);
        expect(result.annualProfile.map((entry) => entry.capex)).toEqual([100]);
        expect(result.npv).toBeCloseTo(50 * result.discountedOilVolume - 100 * Math.pow(1.1, -0.5), 8);
    });

    test("satisfies the delta NPV identity for signed volumes and costs", () => {
        const assumptions = makeMonthlyAssumptions({ oilPricePerVolume: 50, gasPricePerVolume: 0.2 });
        const comparisonOil = new Array(12).fill(120);
        const referenceOil = new Array(12).fill(100);
        const comparisonGas = new Array(12).fill(1500);
        const referenceGas = new Array(12).fill(1000);

        const comparison = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, comparisonOil),
                salesGasProfile: makeMonthlyProfile(2030, 1, comparisonGas),
            },
            assumptions,
            [{ year: 2030, capex: 900, opex: 120 }],
        );
        const reference = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, referenceOil),
                salesGasProfile: makeMonthlyProfile(2030, 1, referenceGas),
            },
            assumptions,
            [{ year: 2030, capex: 1000, opex: 100 }],
        );
        const delta = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(
                    2030,
                    1,
                    comparisonOil.map((value, index) => value - referenceOil[index]),
                ),
                salesGasProfile: makeMonthlyProfile(
                    2030,
                    1,
                    comparisonGas.map((value, index) => value - referenceGas[index]),
                ),
            },
            assumptions,
            [{ year: 2030, capex: -100, opex: 20 }],
        );

        expect(delta.npv!).toBeCloseTo(comparison.npv! - reference.npv!, 8);
        expect(delta.annualProfile[0].oilVolume).toBeCloseTo(240, 9);
    });

    test("returns a break-even oil price that zeroes NPV when substituted", () => {
        const input = {
            realization: 1,
            oilProfile: makeMonthlyProfile(2030, 1, new Array(24).fill(100)),
            salesGasProfile: makeMonthlyProfile(2030, 1, new Array(24).fill(800)),
        };
        const costs = [
            { year: 2030, capex: 400000, opex: 1000 },
            { year: 2031, capex: 0, opex: 2000 },
        ];
        const result = computeMonthlyRealizationEconomics(
            input,
            makeMonthlyAssumptions({
                oilPricePerVolume: null,
                gasPricePerVolume: 0.5,
                horizonEndMonthIndex: monthIndexOf(2031, 12),
            }),
            costs,
        );

        expect(result.breakEvenOilPrice).not.toBeNull();
        expect(result.breakEvenSlopeDirection).toBe(BreakEvenSlopeDirection.POSITIVE);

        const substituted = computeMonthlyRealizationEconomics(
            input,
            makeMonthlyAssumptions({
                oilPricePerVolume: result.breakEvenOilPrice,
                gasPricePerVolume: 0.5,
                horizonEndMonthIndex: monthIndexOf(2031, 12),
            }),
            costs,
        );

        expect(substituted.npv).toBeCloseTo(0, 6);
    });

    test("solves IRR on the monthly events that the NPV uses", () => {
        const oilVolumes = [...new Array(12).fill(0), ...new Array(24).fill(100)];
        const result = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, oilVolumes),
                salesGasProfile: makeZeroProfile(2030, 36),
            },
            makeMonthlyAssumptions({ oilPricePerVolume: 50, horizonEndMonthIndex: monthIndexOf(2032, 12) }),
            [{ year: 2030, capex: 80000, opex: 0 }],
        );

        expect(result.irrStatus).toBe(IrrStatus.CONVERGED);
        expect(result.irr).not.toBeNull();

        const events: { time: number; value: number }[] = [];
        for (let yearOffset = 1; yearOffset <= 2; yearOffset++) {
            for (let month = 1; month <= 12; month++) {
                events.push({ time: yearOffset + (month - 0.5) / 12, value: 50 * 100 });
            }
        }
        events.push({ time: 0.5, value: -80000 });
        const npvAtIrr = events.reduce((sum, event) => sum + event.value * Math.pow(1 + result.irr!, -event.time), 0);

        expect(npvAtIrr).toBeCloseTo(0, 4);
    });

    test("keeps an investment followed by monthly revenue net of monthly OPEX conventional", () => {
        const oilVolumes = [...new Array(12).fill(0), ...new Array(24).fill(100)];
        const input = {
            realization: 1,
            oilProfile: makeMonthlyProfile(2030, 1, oilVolumes),
            salesGasProfile: makeZeroProfile(2030, 36),
        };
        const costs = [
            { year: 2030, capex: 80000, opex: 0 },
            { year: 2031, capex: 0, opex: 5000 },
            { year: 2032, capex: 0, opex: 5000 },
        ];
        const result = computeMonthlyRealizationEconomics(
            input,
            makeMonthlyAssumptions({ oilPricePerVolume: 50, horizonEndMonthIndex: monthIndexOf(2032, 12) }),
            costs,
        );

        // With mid-year annual OPEX this profile was non-conventional; monthly net revenue is 5000 - 416.67.
        expect(result.irrStatus).toBe(IrrStatus.CONVERGED);
        const events = [{ time: 0.5, value: -80000 }];
        for (let month = 13; month <= 36; month++) {
            events.push({ time: (month - 0.5) / 12, value: 50 * 100 - 5000 / 12 });
        }
        const npvAtIrr = events.reduce((sum, event) => sum + event.value * Math.pow(1 + result.irr!, -event.time), 0);
        expect(Math.abs(npvAtIrr) / 80000).toBeLessThan(1e-9);

        const otherRate = computeMonthlyRealizationEconomics(
            input,
            makeMonthlyAssumptions({
                discountRateFraction: 0.03,
                oilPricePerVolume: 50,
                horizonEndMonthIndex: monthIndexOf(2032, 12),
            }),
            costs,
        );
        expect(otherRate.irr).toBeCloseTo(result.irr!, 9);
        expect(otherRate.npv).not.toBeCloseTo(result.npv!, 2);
    });

    test("keeps real monthly losses after production non-conventional", () => {
        const oilVolumes = [...new Array(12).fill(0), ...new Array(12).fill(100), ...new Array(12).fill(5)];
        const result = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, oilVolumes),
                salesGasProfile: makeZeroProfile(2030, 36),
            },
            makeMonthlyAssumptions({ oilPricePerVolume: 100, horizonEndMonthIndex: monthIndexOf(2032, 12) }),
            [
                { year: 2030, capex: 60000, opex: 0 },
                { year: 2031, capex: 0, opex: 12000 },
                { year: 2032, capex: 0, opex: 12000 },
            ],
        );

        // 2032 revenue of 500 per month is below its 1000 monthly OPEX allocation: - then + then -.
        expect(result.annualProfile[2].netCashFlow).toBe(12 * 500 - 12000);
        expect(result.irrStatus).toBe(IrrStatus.NON_CONVENTIONAL);
        expect(result.irr).toBeNull();
        expect(result.npv).not.toBeNull();
    });

    test("classifies within-year sign changes that annual netting would hide as non-conventional", () => {
        // Monthly revenue of 50 in 2030 and 100 in 2031, with 1000 CAPEX at mid-2030.
        const oilVolumes = [...new Array(12).fill(5), ...new Array(12).fill(10)];
        const result = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, oilVolumes),
                salesGasProfile: makeZeroProfile(2030, 24),
            },
            makeMonthlyAssumptions({ oilPricePerVolume: 10, horizonEndMonthIndex: monthIndexOf(2031, 12) }),
            [{ year: 2030, capex: 1000, opex: 0 }],
        );

        const annualNetCashFlow = result.annualProfile.map((entry) => entry.netCashFlow!);
        expect(annualNetCashFlow).toEqual([-400, 1200]);
        // Annual netting looks conventional; the earlier implementation reported a converged IRR of about 257%.
        expect(isConventionalCashFlow(annualNetCashFlow)).toBe(true);

        const exactEvents: { time: number; value: number }[] = oilVolumes.map((volume, index) => ({
            time: (index + 0.5) / 12,
            value: 10 * volume,
        }));
        exactEvents.push({ time: 0.5, value: -1000 });
        const exactSigns = aggregateCoincidentEvents(exactEvents).map((event) => Math.sign(event.value));
        expect(exactSigns.slice(0, 8)).toEqual([1, 1, 1, 1, 1, 1, -1, 1]);

        expect(result.irrStatus).toBe(IrrStatus.NON_CONVENTIONAL);
        expect(result.irr).toBeNull();
        expect(computeInternalRateOfReturnFromEvents(exactEvents).status).toBe(IrrStatus.NON_CONVENTIONAL);
        expect(result.npv).toBeCloseTo(
            oilVolumes.reduce((sum, volume, index) => sum + 10 * volume * Math.pow(1.1, -(index + 0.5) / 12), 0) -
                1000 * Math.pow(1.1, -0.5),
            9,
        );
    });

    test("combines only coincident events before classifying IRR", () => {
        const sameTime = computeInternalRateOfReturnFromEvents([
            { time: 0.5, value: -1000 },
            { time: 0.5, value: 400 },
            { time: 1.5, value: 800 },
        ]);
        const nearlySameTime = computeInternalRateOfReturnFromEvents([
            { time: 0.5, value: -1000 },
            { time: 0.5 + 1 / 24, value: 400 },
            { time: 1.5, value: 800 },
        ]);

        expect(sameTime.status).toBe(IrrStatus.CONVERGED);
        expect(sameTime.irr).toBeCloseTo(800 / 600 - 1, 9);
        expect(nearlySameTime.status).toBe(IrrStatus.CONVERGED);
        expect(nearlySameTime.irr).not.toBeCloseTo(sameTime.irr!, 3);
        expect(
            computeInternalRateOfReturnFromEvents([
                { time: 0.4, value: 400 },
                { time: 0.5, value: -1000 },
                { time: 1.5, value: 800 },
            ]).status,
        ).toBe(IrrStatus.NON_CONVENTIONAL);
    });

    test("classifies a reversing annual cash flow as non-conventional", () => {
        const result = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, new Array(36).fill(100)),
                salesGasProfile: makeMonthlyProfile(2030, 1, new Array(36).fill(0)),
            },
            makeMonthlyAssumptions({ oilPricePerVolume: 10, horizonEndMonthIndex: monthIndexOf(2032, 12) }),
            [
                { year: 2030, capex: 20000, opex: 0 },
                { year: 2031, capex: 0, opex: 0 },
                { year: 2032, capex: 50000, opex: 0 },
            ],
        );

        expect(result.irrStatus).toBe(IrrStatus.NON_CONVENTIONAL);
        expect(result.irr).toBeNull();
        expect(result.npv).not.toBeNull();
    });

    test("ends the cumulative profile at NPV and matches the early result", () => {
        const result = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, new Array(36).fill(100)),
                salesGasProfile: makeMonthlyProfile(2030, 1, new Array(36).fill(500)),
            },
            makeMonthlyAssumptions({
                oilPricePerVolume: 50,
                gasPricePerVolume: 0.3,
                horizonEndMonthIndex: monthIndexOf(2032, 12),
                earlyEndYear: 2031,
            }),
            [
                { year: 2030, capex: 50000, opex: 1000 },
                { year: 2031, capex: 0, opex: 1000 },
                { year: 2032, capex: 0, opex: 1000 },
            ],
        );

        const lastEntry = result.annualProfile[result.annualProfile.length - 1];
        expect(lastEntry.cumulativeDiscountedCashFlow).toBeCloseTo(result.npv!, 8);

        const early = result.early!;
        expect(early.endYear).toBe(2031);
        expect(early.npv).toBeCloseTo(result.annualProfile[1].cumulativeDiscountedCashFlow!, 10);
        expect(early.discountedOilVolume).toBeCloseTo(
            result.annualProfile[0].discountedOilVolume + result.annualProfile[1].discountedOilVolume,
            10,
        );
        expect(early.discountedOilEquivalents).toBeCloseTo(
            early.discountedOilVolume + early.discountedSalesGasVolume / 1000,
            10,
        );
        // The early extraction must not shorten or rebase the full evaluation.
        expect(result.annualProfile).toHaveLength(3);
        expect(result.predictionStartYear).toBe(2030);
        expect(result.evaluationEndYear).toBe(2032);
    });

    test("validates early values on their own horizon without moving the valuation date", () => {
        const oilProfile = makeMonthlyProfile(2030, 1, new Array(36).fill(100));
        oilProfile.months[35] = { ...oilProfile.months[35], coverage: MonthCoverage.PARTIAL };
        const input = { realization: 1, oilProfile, salesGasProfile: makeZeroProfile(2030, 36) };
        const costs = [{ year: 2030, capex: 50000, opex: 0 }];

        const full = computeMonthlyRealizationEconomics(
            input,
            makeMonthlyAssumptions({
                oilPricePerVolume: 50,
                horizonEndMonthIndex: monthIndexOf(2032, 12),
                earlyEndYear: 2031,
            }),
            costs,
        );
        const shorterHorizon = computeMonthlyRealizationEconomics(
            input,
            makeMonthlyAssumptions({ oilPricePerVolume: 50, horizonEndMonthIndex: monthIndexOf(2031, 12) }),
            costs,
        );

        expect(full.hasOilData).toBe(false);
        expect(full.npv).toBeNull();
        expect(full.early?.hasOilData).toBe(true);
        expect(full.early?.npv).toBeCloseTo(shorterHorizon.npv!, 10);
        expect(full.early?.discountedOilVolume).toBeCloseTo(shorterHorizon.discountedOilVolume, 10);

        const earlyInvalid = computeMonthlyRealizationEconomics(
            { ...input, oilProfile: makeMonthlyProfile(2030, 1, new Array(36).fill(100)) },
            makeMonthlyAssumptions({
                oilPricePerVolume: 50,
                horizonEndMonthIndex: monthIndexOf(2032, 12),
                earlyEndYear: 2040,
            }),
            costs,
        );
        expect(earlyInvalid.early).toBeNull();
        expect(earlyInvalid.npv).not.toBeNull();

        const earlyPartial = computeMonthlyRealizationEconomics(
            input,
            makeMonthlyAssumptions({
                oilPricePerVolume: 50,
                horizonEndMonthIndex: monthIndexOf(2032, 12),
                earlyEndYear: 2032,
            }),
            costs,
        );
        expect(earlyPartial.early?.hasOilData).toBe(false);
        expect(earlyPartial.early?.npv).toBeNull();
    });

    test("requires a price when signed monthly volumes cancel to zero", () => {
        const gasVolumes = [100, -100, ...new Array(10).fill(0)];
        const input = {
            realization: 1,
            oilProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(10)),
            salesGasProfile: makeMonthlyProfile(2030, 1, gasVolumes),
        };

        const blankGasPrice = computeMonthlyRealizationEconomics(
            input,
            makeMonthlyAssumptions({ oilPricePerVolume: 50, gasPricePerVolume: null }),
            [{ year: 2030, capex: 100, opex: 0 }],
        );
        const zeroGasPrice = computeMonthlyRealizationEconomics(
            input,
            makeMonthlyAssumptions({ oilPricePerVolume: 50, gasPricePerVolume: 0 }),
            [{ year: 2030, capex: 100, opex: 0 }],
        );

        expect(blankGasPrice.undiscountedSalesGasVolume).toBe(0);
        expect(blankGasPrice.npv).toBeNull();
        expect(blankGasPrice.financialReason).toBe("Enter gas price.");
        expect(blankGasPrice.breakEvenOilPrice).toBeNull();
        // Their discounted values do not cancel either, since the months are discounted differently.
        expect(blankGasPrice.discountedSalesGasVolume).not.toBe(0);
        expect(zeroGasPrice.npv).toBeCloseTo(50 * zeroGasPrice.discountedOilVolume - 100 * Math.pow(1.1, -0.5), 9);
    });

    test("calculates NPV with an explicit zero price when that product is unavailable", () => {
        const result = computeMonthlyRealizationEconomics(
            { realization: 1, oilProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(100)), salesGasProfile: null },
            makeMonthlyAssumptions({ oilPricePerVolume: 50, gasPricePerVolume: 0 }),
            [{ year: 2030, capex: 100, opex: 0 }],
        );
        const blank = computeMonthlyRealizationEconomics(
            { realization: 1, oilProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(100)), salesGasProfile: null },
            makeMonthlyAssumptions({ oilPricePerVolume: 50, gasPricePerVolume: null }),
            [{ year: 2030, capex: 100, opex: 0 }],
        );

        expect(result.hasSalesGasData).toBe(false);
        expect(result.npv).toBeCloseTo(50 * result.discountedOilVolume - 100 * Math.pow(1.1, -0.5), 9);
        expect(result.breakEvenOilPrice).not.toBeNull();
        expect(blank.npv).toBeNull();
        expect(blank.financialReason).toContain("Gas source coverage");
    });

    test("matches the worked example in the calculation guide", () => {
        const costs = [
            { year: 2020, capex: 100, opex: 60 },
            { year: 2021, capex: 0, opex: 60 },
        ];
        const input = {
            realization: 1,
            oilProfile: makeMonthlyProfile(2020, 1, new Array(24).fill(10)),
            salesGasProfile: makeMonthlyProfile(2020, 1, new Array(24).fill(100)),
        };
        const assumptions = {
            predictionStartYear: 2020,
            horizonEndMonthIndex: monthIndexOf(2021, 12),
            gasPricePerVolume: 0.1,
        };
        const result = computeMonthlyRealizationEconomics(
            input,
            makeMonthlyAssumptions({ ...assumptions, oilPricePerVolume: 2 }),
            costs,
        );

        expect(result.annualProfile.map((entry) => entry.netCashFlow)).toEqual([200, 300]);
        expect(result.annualProfile[0].discountedNetCashFlow).toBeCloseTo(190.8, 2);
        expect(result.annualProfile[1].discountedNetCashFlow).toBeCloseTo(260.13, 2);
        expect(result.npv).toBeCloseTo(450.93, 2);
        expect(result.discountedOilVolume).toBeCloseTo(218.512, 3);
        expect(result.discountedSalesGasVolume).toBeCloseTo(2185.117, 3);
        expect(result.breakEvenOilPrice).toBeCloseTo(-0.06366, 5);
        // Monthly revenue in January-June 2020 precedes the mid-2020 CAPEX.
        expect(result.irrStatus).toBe(IrrStatus.NON_CONVENTIONAL);
        expect(
            computeMonthlyRealizationEconomics(
                input,
                makeMonthlyAssumptions({ ...assumptions, oilPricePerVolume: result.breakEvenOilPrice }),
                costs,
            ).npv,
        ).toBeCloseTo(0, 9);
    });

    describe("monthly OPEX allocation", () => {
        // Source-covered zero production in 2030, then 100 Sm3 oil per month in 2031 at 100 per Sm3.
        const input = {
            realization: 4,
            oilProfile: makeMonthlyProfile(2030, 1, [...new Array(12).fill(0), ...new Array(12).fill(100)]),
            salesGasProfile: makeZeroProfile(2030, 24),
        };
        const costs = [
            { year: 2030, capex: 60000, opex: 12000 },
            { year: 2031, capex: 0, opex: 12000 },
        ];
        const assumptions = makeMonthlyAssumptions({
            oilPricePerVolume: 100,
            horizonEndMonthIndex: monthIndexOf(2031, 12),
            earlyEndYear: 2030,
        });

        test("matches hand-calculated present values, NPV, break-even and cumulative profile", () => {
            const result = computeMonthlyRealizationEconomics(input, assumptions, costs);

            // Monthly factors sum to 11.445852 in 2030 and 10.405320 in 2031.
            const factorSum2030 = 11.445852119051764;
            const factorSum2031 = 10.405320108228876;
            const pvCosts = 60000 * Math.pow(1.1, -0.5) + 1000 * factorSum2030 + 1000 * factorSum2031;
            expect(pvCosts).toBeCloseTo(79058.927582, 5);
            expect(result.discountedOilVolume).toBeCloseTo(100 * factorSum2031, 9);
            expect(result.npv).toBeCloseTo(100 * 1040.5320108228875 - pvCosts, 6);
            expect(result.npv).toBeCloseTo(24994.2735, 3);
            expect(result.breakEvenOilPrice).toBeCloseTo(pvCosts / (100 * factorSum2031), 9);
            expect(result.breakEvenOilPrice).toBeCloseTo(75.979332, 5);
            expect(
                computeMonthlyRealizationEconomics(
                    input,
                    { ...assumptions, oilPricePerVolume: result.breakEvenOilPrice },
                    costs,
                ).npv,
            ).toBeCloseTo(0, 8);

            expect(result.annualProfile.map((entry) => entry.opex)).toEqual([12000, 12000]);
            expect(result.annualProfile.map((entry) => entry.netCashFlow)).toEqual([-72000, 108000]);
            expect(result.annualProfile[1].cumulativeDiscountedCashFlow).toBeCloseTo(result.npv!, 10);
            expect(result.early?.npv).toBeCloseTo(result.annualProfile[0].cumulativeDiscountedCashFlow!, 10);
            expect(result.early?.npv).toBeCloseTo(-(60000 * Math.pow(1.1, -0.5) + 1000 * factorSum2030), 8);
            expect(result.irrStatus).toBe(IrrStatus.CONVERGED);
        });

        test("conserves the annual amount and leaves volumes unchanged", () => {
            const atZeroRate = computeMonthlyRealizationEconomics(
                input,
                { ...assumptions, discountRateFraction: 0 },
                costs,
            );
            const withoutOpex = computeMonthlyRealizationEconomics(
                input,
                assumptions,
                costs.map((entry) => ({ ...entry, opex: 0 })),
            );

            expect(discountedAnnualOpex(12000, 2031, 2030, 0)).toBeCloseTo(12000, 10);
            expect(atZeroRate.npv).toBeCloseTo(100 * 1200 - 60000 - 24000, 8);
            const withOpex = computeMonthlyRealizationEconomics(input, assumptions, costs);
            expect(withOpex.discountedOilVolume).toBe(withoutOpex.discountedOilVolume);
            expect(withOpex.undiscountedOilVolume).toBe(withoutOpex.undiscountedOilVolume);
            expect(withoutOpex.npv! - withOpex.npv!).toBeCloseTo(
                discountedAnnualOpex(12000, 2030, 2030, 0.1) + discountedAnnualOpex(12000, 2031, 2030, 0.1),
                8,
            );
        });

        test("applies signed delta OPEX savings as positive monthly allocations", () => {
            const savings = computeMonthlyRealizationEconomics(input, assumptions, [
                { year: 2030, capex: 60000, opex: 12000 },
                { year: 2031, capex: 0, opex: -1200 },
            ]);
            const base = computeMonthlyRealizationEconomics(input, assumptions, costs);

            expect(savings.npv! - base.npv!).toBeCloseTo(
                discountedAnnualOpex(13200, 2031, 2030, 0.1),
                8,
            );
            expect(discountedAnnualOpex(-1200, 2031, 2030, 0.1)).toBeCloseTo(-100 * 10.405320108228876, 9);
        });

        test("keeps the full annual OPEX obligation in a final year whose source ends mid-year", () => {
            const midYearInput = {
                realization: 4,
                oilProfile: makeMonthlyProfile(2030, 1, [...new Array(12).fill(0), ...new Array(6).fill(100)]),
                salesGasProfile: makeZeroProfile(2030, 18),
            };
            const result = computeMonthlyRealizationEconomics(
                midYearInput,
                { ...assumptions, horizonEndMonthIndex: monthIndexOf(2031, 6) },
                costs,
            );

            expect(result.hasOilData).toBe(true);
            expect(result.annualProfile[1].opex).toBe(12000);
            expect(result.annualProfile[1].oilVolume).toBe(600);
            expect(result.annualProfile[1].discountedNetCashFlow).toBeCloseTo(
                100 * result.annualProfile[1].discountedOilVolume - discountedAnnualOpex(12000, 2031, 2030, 0.1),
                9,
            );
            // July-December 2031 OPEX follows the last revenue month, so the exact events reverse sign again.
            expect(result.irrStatus).toBe(IrrStatus.NON_CONVENTIONAL);
        });
    });

    test("keeps NPV equivalent when gas is reported in Mscf", () => {
        const gasVolumesSm3 = new Array(12).fill(1000);
        const mscfInSm3 = volumeUnitInSm3("MSCF")!;
        const sm3Result = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(100)),
                salesGasProfile: makeMonthlyProfile(2030, 1, gasVolumesSm3),
            },
            makeMonthlyAssumptions({
                oilPricePerVolume: 50,
                gasPricePerVolume: convertGasPriceToSimulatorUnit(3, GasPriceBasis.PER_MSCF, "SM3"),
                gasToOilEquivalentDivisor: makeFixedOilEquivalentDivisor("SM3", "SM3")!,
            }),
            [{ year: 2030, capex: 1000, opex: 0 }],
        );
        const mscfResult = computeMonthlyRealizationEconomics(
            {
                realization: 1,
                oilProfile: makeMonthlyProfile(2030, 1, new Array(12).fill(100)),
                salesGasProfile: makeMonthlyProfile(
                    2030,
                    1,
                    gasVolumesSm3.map((volume) => volume / mscfInSm3),
                ),
            },
            makeMonthlyAssumptions({
                oilPricePerVolume: 50,
                gasPricePerVolume: convertGasPriceToSimulatorUnit(3, GasPriceBasis.PER_MSCF, "MSCF"),
                gasToOilEquivalentDivisor: makeFixedOilEquivalentDivisor("SM3", "MSCF")!,
            }),
            [{ year: 2030, capex: 1000, opex: 0 }],
        );

        expect(mscfResult.npv!).toBeCloseTo(sm3Result.npv!, 6);
        expect(mscfResult.discountedOilEquivalents).toBeCloseTo(sm3Result.discountedOilEquivalents, 9);
    });
});
