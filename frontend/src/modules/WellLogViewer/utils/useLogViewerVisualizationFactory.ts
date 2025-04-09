import React from "react";

import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { DataProviderManagerTopic } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import type { VisualizationTarget } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { VisualizationAssembler } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import { AreaPlotProvider } from "../DataProviderFramework/dataProviders/plots/AreaPlotProvider";
import { LinearPlotProvider } from "../DataProviderFramework/dataProviders/plots/LinearPlotProvider";
import { WellborePicksProvider } from "../DataProviderFramework/dataProviders/wellpicks/WellPicksProvider";
import { ContinuousLogTrack } from "../DataProviderFramework/groups/ContinuousLogTrack";
import type { FactoryAccResult as PlotFactoryAccResult } from "../DataProviderFramework/visualizations/plots";
import {
    makeAreaPlotConfig,
    makeLinePlotConfig,
    plotDataAccumulator,
} from "../DataProviderFramework/visualizations/plots";
import { makeContinuousTrackConfig } from "../DataProviderFramework/visualizations/tracks";
import { makeLogViewerWellPicks } from "../DataProviderFramework/visualizations/wellpicks";

type FactoryAccResult = PlotFactoryAccResult;
const VISUALIZATION_FACTORY = new VisualizationAssembler<VisualizationTarget.WSC_WELL_LOG, never, FactoryAccResult>();

VISUALIZATION_FACTORY.registerDataProviderTransformers(LinearPlotProvider.name, LinearPlotProvider, {
    transformToVisualization: makeLinePlotConfig,
    reduceAccumulatedDataFunction: plotDataAccumulator,
});
VISUALIZATION_FACTORY.registerDataProviderTransformers(AreaPlotProvider.name, AreaPlotProvider, {
    makeVisualizationFunction: makeAreaPlotConfig,
    reduceAccumulatedDataFunction: plotDataAccumulator,
});

VISUALIZATION_FACTORY.registerGroupCustomPropsCollector(
    GroupType.WELL_LOG_TRACK,
    ContinuousLogTrack,
    makeContinuousTrackConfig,
);

VISUALIZATION_FACTORY.registerDataProviderTransformers(WellborePicksProvider.name, WellborePicksProvider, {
    makeVisualizationFunction: makeLogViewerWellPicks,
});

type MakeFuncReturn = ReturnType<(typeof VISUALIZATION_FACTORY)["make"]>;

export function useLogViewerVisualizationFactoryProduct(dataProviderManager: DataProviderManager) {
    const [previousRevision, setPreviousRevision] = React.useState<number | undefined>();
    const [previousProduct, setPreviousProduct] = React.useState<MakeFuncReturn | null>();

    const latestRevision = React.useSyncExternalStore(
        dataProviderManager
            .getPublishSubscribeDelegate()
            .makeSubscriberFunction(DataProviderManagerTopic.DATA_REVISION),
        dataProviderManager.makeSnapshotGetter(DataProviderManagerTopic.DATA_REVISION),
    );

    if (previousRevision !== latestRevision) {
        setPreviousRevision(latestRevision);
        setPreviousProduct(VISUALIZATION_FACTORY.make(dataProviderManager));
    }

    return previousProduct;
}
