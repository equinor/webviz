import type { ChannelContentMetaData, DataGenerator } from "@framework/types/dataChannnel";

import { EarlyEconomicMeasure, type EconomicMeasure } from "./typesAndEnums";
import type { RealizationEconomicResult } from "./utils/economicCalculations";
import { extractEarlyValue } from "./utils/economicCalculations";
import type { MeasureUnitContext } from "./utils/measureAccessors";
import { getMeasureDisplayName, getMeasureUnit, getMeasureValues } from "./utils/measureAccessors";

export function makeMeasureDataGenerator(
    results: RealizationEconomicResult[],
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

export function makeEarlyMeasureDataGenerator(
    results: RealizationEconomicResult[],
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
            const earlyValue = extractEarlyValue(result, endYear);
            const value =
                measure === EarlyEconomicMeasure.DISCOUNTED_OIL_VOLUME
                    ? result.hasOilData
                        ? earlyValue.discountedOilVolume
                        : null
                    : measure === EarlyEconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME
                      ? result.hasSalesGasData
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
