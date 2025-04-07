import React from "react";

import type { DataLayerManager } from "@modules/_shared/LayerFramework/framework/DataLayerManager/DataLayerManager";
import { LayerManagerTopic } from "@modules/_shared/LayerFramework/framework/DataLayerManager/DataLayerManager";
import { GroupType } from "@modules/_shared/LayerFramework/groups/groupTypes";
import type { VisualizationTarget } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import { VisualizationFactory } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";

import { AreaPlotProvider } from "../LayerFramework/dataProviders/plots/AreaPlotProvider";
import { LinearPlotProvider } from "../LayerFramework/dataProviders/plots/LinearPlotProvider";
import { WellborePicksProvider } from "../LayerFramework/dataProviders/wellpicks/WellPicksProvider";
import { ContinuousLogTrack } from "../LayerFramework/groups/ContinuousLogTrack";
import type { FactoryAccResult as PlotFactoryAccResult } from "../LayerFramework/visualizations/plots";
import { makeAreaPlotConfig, makeLinePlotConfig, plotDataAccumulator } from "../LayerFramework/visualizations/plots";
import { makeContinuousTrackConfig } from "../LayerFramework/visualizations/tracks";
import { makeLogViewerWellPicks } from "../LayerFramework/visualizations/wellpicks";

type FactoryAccResult = PlotFactoryAccResult;
const VISUALIZATION_FACTORY = new VisualizationFactory<VisualizationTarget.WSC_WELL_LOG, never, FactoryAccResult>();

VISUALIZATION_FACTORY.registerLayerFunctions(LinearPlotProvider.name, LinearPlotProvider, {
    makeVisualizationFunction: makeLinePlotConfig,
    reduceAccumulatedDataFunction: plotDataAccumulator,
});
VISUALIZATION_FACTORY.registerLayerFunctions(AreaPlotProvider.name, AreaPlotProvider, {
    makeVisualizationFunction: makeAreaPlotConfig,
    reduceAccumulatedDataFunction: plotDataAccumulator,
});

VISUALIZATION_FACTORY.registerViewFunction(GroupType.WELL_LOG_TRACK, ContinuousLogTrack, makeContinuousTrackConfig);

VISUALIZATION_FACTORY.registerLayerFunctions(WellborePicksProvider.name, WellborePicksProvider, {
    makeVisualizationFunction: makeLogViewerWellPicks,
});

type MakeFuncReturn = ReturnType<(typeof VISUALIZATION_FACTORY)["make"]>;

export function useLogViewerVisualizationFactoryProduct(dataLayerManager: DataLayerManager) {
    const [previousRevision, setPreviousRevision] = React.useState<number | undefined>();
    const [previousProduct, setPreviousProduct] = React.useState<MakeFuncReturn | null>();

    const latestRevision = React.useSyncExternalStore(
        dataLayerManager.getPublishSubscribeDelegate().makeSubscriberFunction(LayerManagerTopic.LAYER_DATA_REVISION),
        dataLayerManager.makeSnapshotGetter(LayerManagerTopic.LAYER_DATA_REVISION),
    );

    if (previousRevision !== latestRevision) {
        setPreviousRevision(latestRevision);
        setPreviousProduct(VISUALIZATION_FACTORY.make(dataLayerManager));
    }

    return previousProduct;
}
