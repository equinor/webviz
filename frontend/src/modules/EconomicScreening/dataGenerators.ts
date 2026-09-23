import type { ChannelContentMetaData, DataGenerator } from "@framework/types/dataChannnel";

import { EarlyEconomicMeasure, type EconomicMeasure } from "./typesAndEnums";
import type { MeasureUnitContext } from "./utils/measureAccessors";
import { getMeasureDisplayName, getMeasureUnit, getMeasureValues } from "./utils/measureAccessors";
import type { MonthlyRealizationEconomicResult } from "./utils/monthlyEconomics";

export function makeMeasureDataGenerator(
    results: MonthlyRealizationEconomicResult[],
    measure: EconomicMeasure,
    unitContext: MeasureUnitContext,
    ensembleIdentString: string,
    ensembleDisplayName: string,
    preferredColor: string,
    assumptionContext = "",
): DataGenerator {
    return () => {
        const { realizations, values } = getMeasureValues(results, measure, unitContext);

        const metaData: ChannelContentMetaData = {
            unit: getMeasureUnit(measure, unitContext),
            ensembleIdentString,
            displayString: `${getMeasureDisplayName(measure)} (${ensembleDisplayName}${assumptionContext ? `; ${assumptionContext}` : ""})`,
            preferredColor,
        };

        return {
            data: realizations.map((realization, i) => ({ key: realization, value: values[i] })),
            metaData,
        };
    };
}

/** Publishes only values that are valid on the early horizon itself, which uses its own end year. */
export function makeEarlyMeasureDataGenerator(
    results: MonthlyRealizationEconomicResult[],
    measure: EarlyEconomicMeasure,
    endYear: number,
    unit: string,
    ensembleIdentString: string,
    ensembleDisplayName: string,
    preferredColor: string,
    assumptionContext = "",
): DataGenerator {
    return () => {
        const data = results.flatMap((result) => {
            const earlyValue = result.early;
            if (!earlyValue || earlyValue.endYear !== endYear) {
                return [];
            }
            const value =
                measure === EarlyEconomicMeasure.DISCOUNTED_OIL_VOLUME
                    ? earlyValue.hasOilData
                        ? earlyValue.discountedOilVolume
                        : null
                    : measure === EarlyEconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME
                      ? earlyValue.hasSalesGasData
                          ? earlyValue.discountedSalesGasVolume
                          : null
                      : earlyValue.npv;
            return value !== null && Number.isFinite(value) ? [{ key: result.realization, value }] : [];
        });

        return {
            data,
            metaData: {
                unit,
                ensembleIdentString,
                displayString: `Through ${endYear}: ${ensembleDisplayName}${assumptionContext ? `; ${assumptionContext}` : ""}`,
                preferredColor,
            },
        };
    };
}
