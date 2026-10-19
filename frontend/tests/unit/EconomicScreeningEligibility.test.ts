import { describe, expect, test } from "vitest";

import {
    CostDraftStatus,
    EconomicMeasure,
    OilPriceBasis,
    type CostProfileEntry,
} from "@modules/EconomicScreening/typesAndEnums";
import {
    getBreakEvenIneligibility,
    getIneligibilityMessage,
    getMeasureRequirement,
    getRevenueIneligibility,
    Ineligibility,
    isRevenueResolved,
    MeasureRequirement,
    REQUIREMENT_NEEDS,
    revenueNeeds,
} from "@modules/EconomicScreening/utils/eligibility";
import { resolveEvaluationHorizon } from "@modules/EconomicScreening/utils/evaluationHorizon";
import { getMeasureValues, isFinancialMeasure } from "@modules/EconomicScreening/utils/measureAccessors";
import {
    computeMonthlyRealizationEconomics,
    type MonthlyRealizationEconomicResult,
} from "@modules/EconomicScreening/utils/monthlyEconomics";
import {
    MonthCoverage,
    monthIndexOf,
    type MonthlyProductionProfile,
} from "@modules/EconomicScreening/utils/monthlyProduction";
import { getSetupReadiness, summarizeSelectedProductSupport } from "@modules/EconomicScreening/utils/setupReadiness";
import { EMPTY_SOURCE_SNAPSHOT, SourceStatus } from "@modules/EconomicScreening/utils/sourceSnapshot";

const PRICES = [null, 0, 50, -5];
const BOOLEANS = [false, true];

describe("revenueNeeds and isRevenueResolved", () => {
    test("are exactly equivalent to the previous revenue rule", () => {
        for (const price of PRICES) {
            for (const isEstablished of BOOLEANS) {
                for (const isConfirmedAbsent of BOOLEANS) {
                    const previous = price === 0 || (isEstablished && (price !== null || isConfirmedAbsent));
                    expect(isRevenueResolved(price, isEstablished, isConfirmedAbsent)).toBe(previous);
                    expect(getRevenueIneligibility("oil", price, isEstablished, isConfirmedAbsent) === null).toBe(
                        previous,
                    );
                    expect(revenueNeeds(price, isConfirmedAbsent)).toEqual({
                        needsSourceCoverage: price !== 0,
                        needsPrice: price === null && !isConfirmedAbsent,
                    });
                }
            }
        }
    });

    test("reports coverage before a missing price, and nothing for a zero price", () => {
        expect(getRevenueIneligibility("oil", null, false, false)).toBe(Ineligibility.OIL_COVERAGE);
        expect(getRevenueIneligibility("gas", 50, false, false)).toBe(Ineligibility.GAS_COVERAGE);
        expect(getRevenueIneligibility("oil", null, true, false)).toBe(Ineligibility.OIL_PRICE_MISSING);
        expect(getRevenueIneligibility("gas", null, true, false)).toBe(Ineligibility.GAS_PRICE_MISSING);
        expect(getRevenueIneligibility("gas", null, true, true)).toBeNull();
        expect(getRevenueIneligibility("oil", 0, false, false)).toBeNull();
    });
});

describe("REQUIREMENT_NEEDS", () => {
    test("captures each requirement's needs", () => {
        const none = {
            oilVolume: false,
            nonZeroOilVolume: false,
            gasVolume: false,
            oilRevenue: false,
            gasRevenue: false,
            includedNonZeroCosts: false,
            validCostDraft: false,
        };
        expect(REQUIREMENT_NEEDS).toEqual({
            [MeasureRequirement.FINANCIAL]: { ...none, oilRevenue: true, gasRevenue: true, validCostDraft: true },
            [MeasureRequirement.BREAK_EVEN]: {
                ...none,
                oilVolume: true,
                nonZeroOilVolume: true,
                gasRevenue: true,
                includedNonZeroCosts: true,
                validCostDraft: true,
            },
            [MeasureRequirement.OIL_VOLUME]: { ...none, oilVolume: true },
            [MeasureRequirement.GAS_VOLUME]: { ...none, gasVolume: true },
            [MeasureRequirement.OIL_AND_GAS_VOLUME]: { ...none, oilVolume: true, gasVolume: true },
        });
    });

    test("maps every measure, and the cost-draft need matches the financial measures", () => {
        expect(Object.values(EconomicMeasure).map((measure) => [measure, getMeasureRequirement(measure)])).toEqual([
            [EconomicMeasure.NPV, MeasureRequirement.FINANCIAL],
            [EconomicMeasure.IRR, MeasureRequirement.FINANCIAL],
            [EconomicMeasure.BREAK_EVEN_OIL_PRICE, MeasureRequirement.BREAK_EVEN],
            [EconomicMeasure.DISCOUNTED_OIL_VOLUME, MeasureRequirement.OIL_VOLUME],
            [EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME, MeasureRequirement.GAS_VOLUME],
            [EconomicMeasure.DISCOUNTED_OIL_EQUIVALENTS, MeasureRequirement.OIL_AND_GAS_VOLUME],
            [EconomicMeasure.UNDISCOUNTED_OIL_VOLUME, MeasureRequirement.OIL_VOLUME],
            [EconomicMeasure.UNDISCOUNTED_SALES_GAS_VOLUME, MeasureRequirement.GAS_VOLUME],
        ]);
        for (const measure of Object.values(EconomicMeasure)) {
            expect(isFinancialMeasure(measure)).toBe(REQUIREMENT_NEEDS[getMeasureRequirement(measure)].validCostDraft);
        }
    });
});

describe("getBreakEvenIneligibility", () => {
    const eligible = {
        hasOilData: true,
        gasRevenueIneligibility: null,
        hasIncludedNonZeroCost: true,
        discountedOilVolume: 100,
    };

    test("reports the first unmet condition in order", () => {
        expect(getBreakEvenIneligibility(eligible)).toBeNull();
        expect(getBreakEvenIneligibility({ ...eligible, discountedOilVolume: -100 })).toBeNull();
        expect(getBreakEvenIneligibility({ ...eligible, discountedOilVolume: 1e-10 })).toBe(
            Ineligibility.OIL_VOLUME_TOO_SMALL,
        );
        expect(getBreakEvenIneligibility({ ...eligible, discountedOilVolume: Number.NaN })).toBe(
            Ineligibility.OIL_VOLUME_TOO_SMALL,
        );
        expect(getBreakEvenIneligibility({ ...eligible, hasIncludedNonZeroCost: false, discountedOilVolume: 0 })).toBe(
            Ineligibility.NO_INCLUDED_COSTS,
        );
        expect(
            getBreakEvenIneligibility({
                ...eligible,
                gasRevenueIneligibility: Ineligibility.GAS_PRICE_MISSING,
                hasIncludedNonZeroCost: false,
            }),
        ).toBe(Ineligibility.GAS_PRICE_MISSING);
        expect(
            getBreakEvenIneligibility({
                ...eligible,
                hasOilData: false,
                gasRevenueIneligibility: Ineligibility.GAS_COVERAGE,
            }),
        ).toBe(Ineligibility.OIL_COVERAGE);
    });
});

describe("getIneligibilityMessage", () => {
    test("keeps the per-realization texts and covers every reason", () => {
        expect(getIneligibilityMessage(Ineligibility.OIL_COVERAGE)).toBe(
            "Oil source coverage is not established for every month of the evaluation.",
        );
        expect(getIneligibilityMessage(Ineligibility.GAS_COVERAGE)).toBe(
            "Gas source coverage is not established for every month of the evaluation.",
        );
        expect(getIneligibilityMessage(Ineligibility.OIL_PRICE_MISSING)).toBe("Enter oil price.");
        expect(getIneligibilityMessage(Ineligibility.GAS_PRICE_MISSING)).toBe("Enter gas price.");
        expect(getIneligibilityMessage(Ineligibility.NO_INCLUDED_COSTS)).toBe(
            "Enter a non-zero CAPEX or OPEX within the evaluation.",
        );
        expect(getIneligibilityMessage(Ineligibility.OIL_VOLUME_TOO_SMALL)).toBe(
            "The discounted oil volume is too close to zero to solve break-even.",
        );
        expect(getIneligibilityMessage(Ineligibility.COST_DRAFT_INVALID)).toBe(
            "Financial results are unavailable until the cost schedule is valid.",
        );
        const messages = Object.values(Ineligibility).map(getIneligibilityMessage);
        expect(new Set(messages).size).toBe(messages.length);
    });
});

enum ProductState {
    ESTABLISHED = "ESTABLISHED",
    CONFIRMED_ABSENT = "CONFIRMED_ABSENT",
    NOT_ESTABLISHED = "NOT_ESTABLISHED",
}

const START_YEAR = 2030;
const END_MONTH_INDEX = monthIndexOf(2031, 12);

function productProfile(state: ProductState, volume: number): MonthlyProductionProfile {
    // Not established: the source starts a year after the valuation date.
    const firstYear = state === ProductState.NOT_ESTABLISHED ? START_YEAR + 1 : START_YEAR;
    const monthCount = state === ProductState.NOT_ESTABLISHED ? 12 : 24;
    const months = Array.from({ length: monthCount }, (_, index) => ({
        year: firstYear + Math.floor(index / 12),
        month: (index % 12) + 1,
        volume: state === ProductState.CONFIRMED_ABSENT ? 0 : volume,
        coverage: MonthCoverage.SOURCE_ALIGNED,
    }));
    return { months, rejection: null };
}

/** The same financial mask the View applies for an invalid cost draft. */
function maskFinancial(result: MonthlyRealizationEconomicResult): MonthlyRealizationEconomicResult {
    return {
        ...result,
        npv: null,
        financialIneligibility: Ineligibility.COST_DRAFT_INVALID,
        irr: null,
        irrStatus: undefined,
        breakEvenOilPrice: null,
        breakEvenIneligibility: Ineligibility.COST_DRAFT_INVALID,
    };
}

const UNIT_CONTEXT = { oilUnit: "SM3", gasUnit: "SM3", currency: "USD", oilPriceBasis: OilPriceBasis.PER_SM3 };

/** IRR counts as calculated when the solver ran, since no finite root is a valid outcome. */
function hasMeasureValue(results: MonthlyRealizationEconomicResult[], measure: EconomicMeasure): boolean {
    if (measure === EconomicMeasure.IRR) {
        return results.some((result) => result.irr !== null || result.irrStatus !== undefined);
    }
    return getMeasureValues(results, measure, UNIT_CONTEXT).values.length > 0;
}

describe("readiness and calculation parity", () => {
    const states = Object.values(ProductState);
    const costCases: CostProfileEntry[][] = [[], [{ year: START_YEAR, capex: 1000, opex: 100 }]];
    const snapshot = {
        ...EMPTY_SOURCE_SNAPSHOT,
        status: SourceStatus.READY,
        salesGasStrategy: { kind: "DIRECT", hasGasConsumption: true } as const,
        envelopeEndMonthIndex: END_MONTH_INDEX,
    };
    const evaluationHorizon = resolveEvaluationHorizon(START_YEAR, snapshot);

    test("readiness has no blocking issue exactly when a realization has every value of the requirement", () => {
        let caseCount = 0;
        for (const oilPrice of [null, 0, 50]) {
            for (const gasPrice of [null, 0, 50]) {
                for (const oilState of states) {
                    for (const gasState of states) {
                        const profiles = [1, 2].map((realization) => ({
                            realization,
                            oilProfile: productProfile(oilState, 100),
                            salesGasProfile: productProfile(gasState, 1000),
                        }));
                        const productSupport = summarizeSelectedProductSupport(
                            profiles,
                            monthIndexOf(START_YEAR, 1),
                            END_MONTH_INDEX,
                        );
                        for (const costProfile of costCases) {
                            const committed = profiles.map((input) =>
                                computeMonthlyRealizationEconomics(
                                    input,
                                    {
                                        discountRateFraction: 0.1,
                                        predictionStartYear: START_YEAR,
                                        horizonEndMonthIndex: END_MONTH_INDEX,
                                        gasToOilEquivalentDivisor: 1000,
                                        oilPricePerVolume: oilPrice,
                                        gasPricePerVolume: gasPrice,
                                    },
                                    costProfile,
                                ),
                            );
                            for (const costDraftStatus of [CostDraftStatus.COMMITTED, CostDraftStatus.INVALID]) {
                                const results =
                                    costDraftStatus === CostDraftStatus.INVALID
                                        ? committed.map(maskFinancial)
                                        : committed;
                                for (const requirement of Object.values(MeasureRequirement)) {
                                    caseCount++;
                                    const readiness = getSetupReadiness({
                                        hasEnsemble: true,
                                        vectorListStatus: "READY",
                                        snapshot,
                                        hasOilVector: true,
                                        productSupport,
                                        missingComponentAssumptions: undefined,
                                        evaluationHorizon,
                                        oilPrice,
                                        gasPrice,
                                        costProfile,
                                        costDraftStatus,
                                        earlyValue: { enabled: false, endYear: null },
                                        requirement,
                                    });
                                    expect(readiness.isLoading).toBe(false);
                                    const isReady = readiness.issues.every((issue) => issue.field === "earlyYear");
                                    const measures = Object.values(EconomicMeasure).filter(
                                        (measure) => getMeasureRequirement(measure) === requirement,
                                    );
                                    const hasValues = measures.every((measure) => hasMeasureValue(results, measure));
                                    const label = JSON.stringify({
                                        oilPrice,
                                        gasPrice,
                                        oilState,
                                        gasState,
                                        costs: costProfile.length,
                                        costDraftStatus,
                                        requirement,
                                        issues: readiness.issues.map((issue) => issue.message),
                                    });
                                    expect(isReady, label).toBe(hasValues);
                                }
                            }
                        }
                    }
                }
            }
        }
        expect(caseCount).toBe(1620);
    });
});
