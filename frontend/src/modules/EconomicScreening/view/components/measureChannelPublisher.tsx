import type { ViewContext } from "@framework/ModuleContext";
import { MEASURE_CHANNEL_ID_MAP } from "@modules/EconomicScreening/channelDefs";
import { makeMeasureDataGenerator } from "@modules/EconomicScreening/dataGenerators";
import type { Interfaces } from "@modules/EconomicScreening/interfaces";
import type { EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import type { RealizationEconomicResult } from "@modules/EconomicScreening/utils/economicCalculations";
import type { MeasureUnitContext } from "@modules/EconomicScreening/utils/measureAccessors";
import { getMeasureDisplayName } from "@modules/EconomicScreening/utils/measureAccessors";

export type MeasureChannelPublisherProps = {
    viewContext: ViewContext<Interfaces>;
    measure: EconomicMeasure;
    results: RealizationEconomicResult[];
    unitContext: MeasureUnitContext;
    ensembleIdentString: string;
    ensembleDisplayName: string;
    color: string;
    enabled: boolean;
    assumptionContext: string;
};

/** Renders nothing; exists so that each channel gets its own hook call. */
export function MeasureChannelPublisher(props: MeasureChannelPublisherProps): null {
    props.viewContext.usePublishChannelContents({
        channelIdString: MEASURE_CHANNEL_ID_MAP[props.measure],
        dependencies: [props.results, props.unitContext, props.ensembleIdentString, props.color, props.assumptionContext],
        enabled: props.enabled,
        contents: [
            {
                contentIdString: `${props.measure}-::-${props.ensembleIdentString}`,
                displayName: `${getMeasureDisplayName(props.measure)} (${props.ensembleDisplayName})`,
                dataGenerator: makeMeasureDataGenerator(
                    props.results,
                    props.measure,
                    props.unitContext,
                    props.ensembleIdentString,
                    props.ensembleDisplayName,
                    props.color,
                    props.assumptionContext,
                ),
            },
        ],
    });

    return null;
}
