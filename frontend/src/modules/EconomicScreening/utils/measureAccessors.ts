import { simulationUnitReformat } from "@modules/_shared/reservoirSimulationStringUtils";
import { EconomicMeasure, EconomicMeasureEnumToStringMapping } from "@modules/EconomicScreening/typesAndEnums";

import type { RealizationEconomicResult } from "./economicCalculations";

export type MeasureValues = {
    realizations: number[];
    values: number[];
};

export type MeasureUnitContext = {
    oilUnit: string;
    gasUnit: string;
    currency: string;
};

function rawMeasureValue(result: RealizationEconomicResult, measure: EconomicMeasure): number | null {
    switch (measure) {
        case EconomicMeasure.NPV:
            return result.npv;
        case EconomicMeasure.IRR:
            // Reported in percent so the channel and axis read naturally.
            return result.irr === null ? null : result.irr * 100;
        case EconomicMeasure.BREAK_EVEN_OIL_PRICE:
            return result.breakEvenOilPrice;
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
export function getMeasureValues(results: RealizationEconomicResult[], measure: EconomicMeasure): MeasureValues {
    const realizations: number[] = [];
    const values: number[] = [];

    for (const result of results) {
        const value = rawMeasureValue(result, measure);
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
            return oilUnit ? `${context.currency}/${oilUnit}` : context.currency;
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

export function getMeasureDisplayName(measure: EconomicMeasure): string {
    return EconomicMeasureEnumToStringMapping[measure];
}
