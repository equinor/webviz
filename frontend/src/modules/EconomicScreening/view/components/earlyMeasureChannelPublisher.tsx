import type { ViewContext } from "@framework/ModuleContext";
import { EARLY_MEASURE_CHANNEL_ID_MAP } from "@modules/EconomicScreening/channelDefs";
import { makeEarlyMeasureDataGenerator } from "@modules/EconomicScreening/dataGenerators";
import type { Interfaces } from "@modules/EconomicScreening/interfaces";
import type { EarlyEconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import type { MonthlyRealizationEconomicResult } from "@modules/EconomicScreening/utils/monthlyEconomics";

export type EarlyMeasureChannelPublisherProps = {
    viewContext: ViewContext<Interfaces>;
    measure: EarlyEconomicMeasure;
    results: MonthlyRealizationEconomicResult[];
    endYear: number;
    unit: string;
    ensembleIdentString: string;
    ensembleDisplayName: string;
    color: string;
    enabled: boolean;
    discountRatePercent: number;
    predictionStartYear: number | null;
};

export function EarlyMeasureChannelPublisher(props: EarlyMeasureChannelPublisherProps): null {
    props.viewContext.usePublishChannelContents({
        channelIdString: EARLY_MEASURE_CHANNEL_ID_MAP[props.measure],
        dependencies: [
            props.results,
            props.endYear,
            props.unit,
            props.ensembleIdentString,
            props.color,
            props.discountRatePercent,
            props.predictionStartYear,
        ],
        enabled: props.enabled,
        contents: [
            {
                contentIdString: `${props.measure}-::-${props.ensembleIdentString}`,
                displayName: `Through ${props.endYear}: ${props.ensembleDisplayName}`,
                dataGenerator: makeEarlyMeasureDataGenerator(
                    props.results,
                    props.measure,
                    props.endYear,
                    props.unit,
                    props.ensembleIdentString,
                    props.ensembleDisplayName,
                    props.color,
                    {
                        discountRatePercent: props.discountRatePercent,
                        predictionStartYear: props.predictionStartYear,
                    },
                ),
            },
        ],
    });

    return null;
}
