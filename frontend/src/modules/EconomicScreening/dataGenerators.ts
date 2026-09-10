import type { ChannelContentMetaData, DataGenerator } from "@framework/types/dataChannnel";

import type { EconomicMeasure } from "./typesAndEnums";
import type { RealizationEconomicResult } from "./utils/economicCalculations";
import type { MeasureUnitContext } from "./utils/measureAccessors";
import { getMeasureDisplayName, getMeasureUnit, getMeasureValues } from "./utils/measureAccessors";

export function makeMeasureDataGenerator(
    results: RealizationEconomicResult[],
    measure: EconomicMeasure,
    unitContext: MeasureUnitContext,
    ensembleIdentString: string,
    ensembleDisplayName: string,
    preferredColor: string,
): DataGenerator {
    return () => {
        const { realizations, values } = getMeasureValues(results, measure);

        const metaData: ChannelContentMetaData = {
            unit: getMeasureUnit(measure, unitContext),
            ensembleIdentString,
            displayString: `${getMeasureDisplayName(measure)} (${ensembleDisplayName})`,
            preferredColor,
        };

        return {
            data: realizations.map((realization, i) => ({ key: realization, value: values[i] })),
            metaData,
        };
    };
}
