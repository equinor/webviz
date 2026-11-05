import { simulationUnitReformat } from "@modules/_shared/reservoirSimulationStringUtils";
import type { CommonNumberScale } from "@modules/_shared/utils/numberFormatting";
import {
    formatCommonScaleUnit,
    formatWithCommonScale,
    makeCommonNumberScale,
} from "@modules/_shared/utils/numberFormatting";
import type { OilPriceBasis } from "@modules/EconomicScreening/typesAndEnums";
import {
    EconomicMeasure,
    EconomicMeasureEnumToStringMapping,
    OilPriceBasisEnumToStringMapping,
} from "@modules/EconomicScreening/typesAndEnums";

import {
    getIneligibilityMessage,
    getMeasureRequirement,
    Ineligibility,
    MeasureRequirement,
    REQUIREMENT_NEEDS,
} from "./eligibility";
import type { MonthlyRealizationEconomicResult } from "./monthlyEconomics";
import { convertOilPriceFromSimulatorUnit } from "./unitConversion";

export type MeasureValues = {
    realizations: number[];
    values: number[];
};

/** A common scale for a set of values, with the prefixed unit label. */
export type MeasureDisplayScale = CommonNumberScale & {
    unit: string;
};

export type MeasureUnitContext = {
    oilUnit: string;
    gasUnit: string;
    currency: string;
    oilPriceBasis: OilPriceBasis;
};

/** Measures withheld by an invalid cost draft: NPV, IRR and break-even oil price. */
export function isFinancialMeasure(measure: EconomicMeasure): boolean {
    return REQUIREMENT_NEEDS[getMeasureRequirement(measure)].validCostDraft;
}

function rawMeasureValue(
    result: MonthlyRealizationEconomicResult,
    measure: EconomicMeasure,
    context: MeasureUnitContext,
): number | null {
    switch (measure) {
        case EconomicMeasure.NPV:
            return result.npv;
        case EconomicMeasure.IRR:
            // Reported in percent so the channel and axis read naturally.
            return result.irr === null ? null : result.irr * 100;
        case EconomicMeasure.BREAK_EVEN_OIL_PRICE:
            return result.breakEvenOilPrice === null
                ? null
                : convertOilPriceFromSimulatorUnit(result.breakEvenOilPrice, context.oilPriceBasis, context.oilUnit);
        case EconomicMeasure.DISCOUNTED_OIL_VOLUME:
            return result.hasOilData ? result.discountedOilVolume : null;
        case EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME:
            return result.hasSalesGasData ? result.discountedSalesGasVolume : null;
        case EconomicMeasure.DISCOUNTED_OIL_EQUIVALENTS:
            return result.hasOilData && result.hasSalesGasData ? result.discountedOilEquivalents : null;
        case EconomicMeasure.UNDISCOUNTED_OIL_VOLUME:
            return result.hasOilData ? result.undiscountedOilVolume : null;
        case EconomicMeasure.UNDISCOUNTED_SALES_GAS_VOLUME:
            return result.hasSalesGasData ? result.undiscountedSalesGasVolume : null;
        default:
            return null;
    }
}

/** Realizations where the measure is undefined, e.g. IRR without a sign change, are left out. */
export function getMeasureValues(
    results: MonthlyRealizationEconomicResult[],
    measure: EconomicMeasure,
    context: MeasureUnitContext,
): MeasureValues {
    const realizations: number[] = [];
    const values: number[] = [];

    for (const result of results) {
        const value = rawMeasureValue(result, measure, context);
        if (value === null || !Number.isFinite(value)) {
            continue;
        }
        realizations.push(result.realization);
        values.push(value);
    }

    return { realizations, values };
}

export function getMeasureUnit(measure: EconomicMeasure, context: MeasureUnitContext): string {
    const oilUnit = context.oilUnit ? simulationUnitReformat(context.oilUnit) : "";
    const gasUnit = context.gasUnit ? simulationUnitReformat(context.gasUnit) : "";

    switch (measure) {
        case EconomicMeasure.NPV:
            return context.currency;
        case EconomicMeasure.IRR:
            return "%";
        case EconomicMeasure.BREAK_EVEN_OIL_PRICE:
            return `${context.currency} ${OilPriceBasisEnumToStringMapping[context.oilPriceBasis]}`;
        case EconomicMeasure.DISCOUNTED_OIL_VOLUME:
        case EconomicMeasure.UNDISCOUNTED_OIL_VOLUME:
        case EconomicMeasure.DISCOUNTED_OIL_EQUIVALENTS:
            return oilUnit;
        case EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME:
        case EconomicMeasure.UNDISCOUNTED_SALES_GAS_VOLUME:
            return gasUnit;
        default:
            return "";
    }
}

export function getMeasureDisplayScale(measure: EconomicMeasure, values: number[], unit: string): MeasureDisplayScale {
    const isMoney = measure === EconomicMeasure.NPV || measure === EconomicMeasure.BREAK_EVEN_OIL_PRICE;
    return makeDisplayScale(values, unit, isMoney);
}

/** Money reads as "million USD", volumes and other units as SI prefixes, e.g. "MSm³". */
export function makeDisplayScale(values: number[], unit: string, isMoney: boolean): MeasureDisplayScale {
    const scale = makeCommonNumberScale(values, { style: isMoney ? "words" : "si" });
    return { ...scale, unit: formatCommonScaleUnit(scale, unit) };
}

export function formatMeasureValue(value: number, displayScale: MeasureDisplayScale): string {
    return formatWithCommonScale(value, displayScale);
}

export function getMeasureDisplayName(measure: EconomicMeasure, isDelta = false): string {
    if (!isDelta) {
        return EconomicMeasureEnumToStringMapping[measure];
    }
    switch (measure) {
        case EconomicMeasure.NPV:
            return "Incremental net present value";
        case EconomicMeasure.IRR:
            return "Incremental internal rate of return";
        case EconomicMeasure.BREAK_EVEN_OIL_PRICE:
            return "Incremental break-even oil price";
        default:
            return EconomicMeasureEnumToStringMapping[measure];
    }
}

/** Ties go to the reason seen first. */
function mostCommonReason(reasons: (Ineligibility | null)[]): Ineligibility | null {
    const counts = new Map<Ineligibility, number>();
    let mostCommon: Ineligibility | null = null;
    for (const reason of reasons) {
        if (reason === null) {
            continue;
        }
        const count = (counts.get(reason) ?? 0) + 1;
        counts.set(reason, count);
        if (mostCommon === null || count > counts.get(mostCommon)!) {
            mostCommon = reason;
        }
    }
    return mostCommon;
}

function measureIneligibility(
    result: MonthlyRealizationEconomicResult,
    measure: EconomicMeasure,
): Ineligibility | null {
    const oilCoverage = result.hasOilData ? null : Ineligibility.OIL_COVERAGE;
    const gasCoverage = result.hasSalesGasData ? null : Ineligibility.GAS_COVERAGE;
    switch (getMeasureRequirement(measure)) {
        case MeasureRequirement.FINANCIAL:
            return result.financialIneligibility;
        case MeasureRequirement.BREAK_EVEN:
            return result.breakEvenIneligibility;
        case MeasureRequirement.OIL_VOLUME:
            return oilCoverage;
        case MeasureRequirement.GAS_VOLUME:
            return gasCoverage;
        case MeasureRequirement.OIL_AND_GAS_VOLUME:
            return oilCoverage ?? gasCoverage;
    }
}

/** The most common reason over the given realizations, or the IRR solver status when IRR was calculated. */
export function getMeasureUnavailableReason(
    results: MonthlyRealizationEconomicResult[],
    measure: EconomicMeasure,
): string {
    const reason = mostCommonReason(results.map((result) => measureIneligibility(result, measure)));
    if (reason !== null) {
        return getIneligibilityMessage(reason);
    }
    if (measure === EconomicMeasure.IRR) {
        const status = results.find((result) => result.irrStatus)?.irrStatus;
        if (status === "NO_FINITE_ROOT") return "No finite IRR for the available cash-flow signs.";
        if (status === "NON_CONVENTIONAL") return "Non-conventional cash flow has no selected IRR root.";
        if (status === "OUT_OF_DOMAIN") return "IRR could not be solved within the supported rate range.";
    }
    return "No valid values are available for this metric.";
}
