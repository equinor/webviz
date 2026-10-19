import { CashFlowProfileType, EconomicMeasure, ResultMode } from "@modules/EconomicScreening/typesAndEnums";

import { BREAK_EVEN_OIL_VOLUME_TOLERANCE } from "./economicCalculations";

/** What a result needs from the setup and the source data. */
export enum MeasureRequirement {
    FINANCIAL = "FINANCIAL",
    BREAK_EVEN = "BREAK_EVEN",
    OIL_VOLUME = "OIL_VOLUME",
    GAS_VOLUME = "GAS_VOLUME",
    OIL_AND_GAS_VOLUME = "OIL_AND_GAS_VOLUME",
}

export type RequirementNeeds = {
    oilVolume: boolean;
    /** Some selected realization must produce oil, since the result divides by its discounted volume. */
    nonZeroOilVolume: boolean;
    gasVolume: boolean;
    oilRevenue: boolean;
    gasRevenue: boolean;
    includedNonZeroCosts: boolean;
    validCostDraft: boolean;
};

const NO_NEEDS: RequirementNeeds = {
    oilVolume: false,
    nonZeroOilVolume: false,
    gasVolume: false,
    oilRevenue: false,
    gasRevenue: false,
    includedNonZeroCosts: false,
    validCostDraft: false,
};

export const REQUIREMENT_NEEDS: Record<MeasureRequirement, RequirementNeeds> = {
    [MeasureRequirement.FINANCIAL]: { ...NO_NEEDS, oilRevenue: true, gasRevenue: true, validCostDraft: true },
    // Break-even solves for the oil price, so it needs oil volumes rather than oil revenue.
    [MeasureRequirement.BREAK_EVEN]: {
        ...NO_NEEDS,
        oilVolume: true,
        nonZeroOilVolume: true,
        gasRevenue: true,
        includedNonZeroCosts: true,
        validCostDraft: true,
    },
    [MeasureRequirement.OIL_VOLUME]: { ...NO_NEEDS, oilVolume: true },
    [MeasureRequirement.GAS_VOLUME]: { ...NO_NEEDS, gasVolume: true },
    [MeasureRequirement.OIL_AND_GAS_VOLUME]: { ...NO_NEEDS, oilVolume: true, gasVolume: true },
};

export function getMeasureRequirement(measure: EconomicMeasure): MeasureRequirement {
    switch (measure) {
        case EconomicMeasure.NPV:
        case EconomicMeasure.IRR:
            return MeasureRequirement.FINANCIAL;
        case EconomicMeasure.BREAK_EVEN_OIL_PRICE:
            return MeasureRequirement.BREAK_EVEN;
        case EconomicMeasure.DISCOUNTED_OIL_VOLUME:
        case EconomicMeasure.UNDISCOUNTED_OIL_VOLUME:
            return MeasureRequirement.OIL_VOLUME;
        case EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME:
        case EconomicMeasure.UNDISCOUNTED_SALES_GAS_VOLUME:
            return MeasureRequirement.GAS_VOLUME;
        case EconomicMeasure.DISCOUNTED_OIL_EQUIVALENTS:
            return MeasureRequirement.OIL_AND_GAS_VOLUME;
    }
}

export function getResultRequirement(
    resultMode: ResultMode,
    selectedMeasure: EconomicMeasure,
    cashFlowProfileType: CashFlowProfileType,
): MeasureRequirement {
    if (resultMode === ResultMode.TIME_PROFILE) {
        switch (cashFlowProfileType) {
            case CashFlowProfileType.ANNUAL_OIL_VOLUME:
                return MeasureRequirement.OIL_VOLUME;
            case CashFlowProfileType.ANNUAL_SALES_GAS_VOLUME:
                return MeasureRequirement.GAS_VOLUME;
            default:
                return MeasureRequirement.FINANCIAL;
        }
    }
    if (resultMode === ResultMode.ALL_RESULTS) {
        return MeasureRequirement.FINANCIAL;
    }
    return getMeasureRequirement(selectedMeasure);
}

/**
 * What a product's revenue needs. A zero price omits the revenue; otherwise the product needs established
 * source coverage, and a price unless it is confirmed absent.
 */
export function revenueNeeds(
    price: number | null,
    isConfirmedAbsent: boolean,
): { needsSourceCoverage: boolean; needsPrice: boolean } {
    return { needsSourceCoverage: price !== 0, needsPrice: price === null && !isConfirmedAbsent };
}

export function isRevenueResolved(price: number | null, isEstablished: boolean, isConfirmedAbsent: boolean): boolean {
    const needs = revenueNeeds(price, isConfirmedAbsent);
    return (!needs.needsSourceCoverage || isEstablished) && !needs.needsPrice;
}

export enum Ineligibility {
    OIL_COVERAGE = "OIL_COVERAGE",
    GAS_COVERAGE = "GAS_COVERAGE",
    OIL_PRICE_MISSING = "OIL_PRICE_MISSING",
    GAS_PRICE_MISSING = "GAS_PRICE_MISSING",
    NO_INCLUDED_COSTS = "NO_INCLUDED_COSTS",
    OIL_VOLUME_TOO_SMALL = "OIL_VOLUME_TOO_SMALL",
    COST_DRAFT_INVALID = "COST_DRAFT_INVALID",
}

const INELIGIBILITY_MESSAGES: Record<Ineligibility, string> = {
    [Ineligibility.OIL_COVERAGE]: "Oil source coverage is not established for every month of the evaluation.",
    [Ineligibility.GAS_COVERAGE]: "Gas source coverage is not established for every month of the evaluation.",
    [Ineligibility.OIL_PRICE_MISSING]: "Enter oil price.",
    [Ineligibility.GAS_PRICE_MISSING]: "Enter gas price.",
    [Ineligibility.NO_INCLUDED_COSTS]: "Enter a non-zero CAPEX or OPEX within the evaluation.",
    [Ineligibility.OIL_VOLUME_TOO_SMALL]: "The discounted oil volume is too close to zero to solve break-even.",
    [Ineligibility.COST_DRAFT_INVALID]: "Financial results are unavailable until the cost schedule is valid.",
};

export function getIneligibilityMessage(reason: Ineligibility): string {
    return INELIGIBILITY_MESSAGES[reason];
}

export function getRevenueIneligibility(
    product: "oil" | "gas",
    price: number | null,
    isEstablished: boolean,
    isConfirmedAbsent: boolean,
): Ineligibility | null {
    const needs = revenueNeeds(price, isConfirmedAbsent);
    if (needs.needsSourceCoverage && !isEstablished) {
        return product === "oil" ? Ineligibility.OIL_COVERAGE : Ineligibility.GAS_COVERAGE;
    }
    if (needs.needsPrice) {
        return product === "oil" ? Ineligibility.OIL_PRICE_MISSING : Ineligibility.GAS_PRICE_MISSING;
    }
    return null;
}

export type BreakEvenEligibilityInput = {
    hasOilData: boolean;
    gasRevenueIneligibility: Ineligibility | null;
    hasIncludedNonZeroCost: boolean;
    discountedOilVolume: number;
};

export function getBreakEvenIneligibility(input: BreakEvenEligibilityInput): Ineligibility | null {
    if (!input.hasOilData) {
        return Ineligibility.OIL_COVERAGE;
    }
    if (input.gasRevenueIneligibility !== null) {
        return input.gasRevenueIneligibility;
    }
    if (!input.hasIncludedNonZeroCost) {
        return Ineligibility.NO_INCLUDED_COSTS;
    }
    if (!(Math.abs(input.discountedOilVolume) > BREAK_EVEN_OIL_VOLUME_TOLERANCE)) {
        return Ineligibility.OIL_VOLUME_TOO_SMALL;
    }
    return null;
}
