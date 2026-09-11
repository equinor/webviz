import { simulationUnitReformat } from "@modules/_shared/reservoirSimulationStringUtils";
import type { OilPriceBasis } from "@modules/EconomicScreening/typesAndEnums";
import {
    EconomicMeasure,
    EconomicMeasureEnumToStringMapping,
    OilPriceBasisEnumToStringMapping,
} from "@modules/EconomicScreening/typesAndEnums";

import type { RealizationEconomicResult } from "./economicCalculations";
import { convertOilPriceFromSimulatorUnit } from "./unitConversion";

export type MeasureValues = {
    realizations: number[];
    values: number[];
};

export type MeasureDisplayScale = {
    factor: number;
    unit: string;
};

export type MeasureUnitContext = {
    oilUnit: string;
    gasUnit: string;
    currency: string;
    oilPriceBasis: OilPriceBasis;
};

function rawMeasureValue(
    result: RealizationEconomicResult,
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
    results: RealizationEconomicResult[],
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
            return `${context.currency}/${OilPriceBasisEnumToStringMapping[context.oilPriceBasis]}`;
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
    if (measure !== EconomicMeasure.NPV || values.length === 0) {
        return { factor: 1, unit };
    }

    const maximumAbsoluteValue = Math.max(...values.map(Math.abs));
    if (maximumAbsoluteValue >= 1e9) return { factor: 1e9, unit: `billion ${unit}` };
    if (maximumAbsoluteValue >= 1e6) return { factor: 1e6, unit: `million ${unit}` };
    if (maximumAbsoluteValue >= 1e3) return { factor: 1e3, unit: `thousand ${unit}` };
    return { factor: 1, unit };
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

export function getMeasureUnavailableReason(results: RealizationEconomicResult[], measure: EconomicMeasure): string {
    if (measure === EconomicMeasure.NPV || measure === EconomicMeasure.IRR) {
        const financialReason = results.find((result) => result.financialReason)?.financialReason;
        if (financialReason) {
            return financialReason;
        }
        if (measure === EconomicMeasure.IRR) {
            const status = results.find((result) => result.irrStatus)?.irrStatus;
            if (status === "NO_FINITE_ROOT") return "No finite IRR for the available cash-flow signs.";
            if (status === "NON_CONVENTIONAL") return "Non-conventional cash flow has no selected IRR root.";
            if (status === "OUT_OF_DOMAIN") return "IRR could not be solved within the supported rate range.";
        }
    }
    if (measure === EconomicMeasure.BREAK_EVEN_OIL_PRICE) {
        return "Break-even requires complete oil data, a gas revenue assumption, and non-zero costs.";
    }
    return "No valid values are available for this metric.";
}
