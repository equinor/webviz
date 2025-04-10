import React from "react";

import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { DataProviderManagerTopic } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import type {
    CustomGroupPropsMap,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
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
// type FactoryMakeResult

const VISUALIZATION_FACTORY = new VisualizationAssembler<
    VisualizationTarget.WSC_WELL_LOG,
    CustomGroupPropsMap,
    never,
    FactoryAccResult
>();

VISUALIZATION_FACTORY.registerDataProviderTransformers(LinearPlotProvider.name, LinearPlotProvider, {
    transformToVisualization: makeLinePlotConfig,
    reduceAccumulatedData: plotDataAccumulator,
});
VISUALIZATION_FACTORY.registerDataProviderTransformers(AreaPlotProvider.name, AreaPlotProvider, {
    transformToVisualization: makeAreaPlotConfig,
    reduceAccumulatedData: plotDataAccumulator,
});

VISUALIZATION_FACTORY.registerGroupCustomPropsCollector(
    GroupType.WELL_LOG_TRACK,
    ContinuousLogTrack,
    makeContinuousTrackConfig,
);

VISUALIZATION_FACTORY.registerDataProviderTransformers(WellborePicksProvider.name, WellborePicksProvider, {
    transformToVisualization: makeLogViewerWellPicks,
    // transformToBoundingBox: computeWellPickBBox,
});

export type WellLogFactoryProduct = ReturnType<(typeof VISUALIZATION_FACTORY)["make"]>;

export function useLogViewerVisualizationFactoryProduct(
    dataProviderManager: DataProviderManager,
): WellLogFactoryProduct | null {
    const [previousRevision, setPreviousRevision] = React.useState<number | null>(null);
    const [previousProduct, setPreviousProduct] = React.useState<WellLogFactoryProduct | null>(null);

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
