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
import { DiffPlotProvider } from "../DataProviderFramework/dataProviders/plots/DiffPlotProvider";
import { LinearPlotProvider } from "../DataProviderFramework/dataProviders/plots/LinearPlotProvider";
import { StackedPlotProvider } from "../DataProviderFramework/dataProviders/plots/StackedPlotProvider";
import { WellborePicksProvider } from "../DataProviderFramework/dataProviders/wellpicks/WellPicksProvider";
import { CustomDataProviderType } from "../DataProviderFramework/dataProviderTypes";
import { ContinuousLogTrack } from "../DataProviderFramework/groups/ContinuousLogTrack";
import { DiscreteLogTrack } from "../DataProviderFramework/groups/DiscreteLogTrack";
import type { FactoryAccResult as PlotFactoryAccResult } from "../DataProviderFramework/visualizations/plots";
import {
    makeAreaPlotConfig,
    makeDiffPlotConfig,
    makeLinePlotConfig,
    makeStackedPlotConfig,
    plotDataAccumulator,
} from "../DataProviderFramework/visualizations/plots";
import {
    collectContinuousTrackConfig,
    collectDiscreteTrackConfig,
} from "../DataProviderFramework/visualizations/tracks";
import { makeWellPickCollections } from "../DataProviderFramework/visualizations/wellpicks";

type FactoryAccResult = PlotFactoryAccResult;

const VISUALIZATION_FACTORY = new VisualizationAssembler<
    VisualizationTarget.WSC_WELL_LOG,
    CustomGroupPropsMap,
    never,
    FactoryAccResult
>();

VISUALIZATION_FACTORY.registerDataProviderTransformers(CustomDataProviderType.LINEAR_PLOT, LinearPlotProvider, {
    transformToVisualization: makeLinePlotConfig,
    reduceAccumulatedData: plotDataAccumulator,
});
VISUALIZATION_FACTORY.registerDataProviderTransformers(CustomDataProviderType.AREA_PLOT, AreaPlotProvider, {
    transformToVisualization: makeAreaPlotConfig,
    reduceAccumulatedData: plotDataAccumulator,
});
VISUALIZATION_FACTORY.registerDataProviderTransformers(CustomDataProviderType.DIFF_PLOT, DiffPlotProvider, {
    transformToVisualization: makeDiffPlotConfig,
    reduceAccumulatedData: plotDataAccumulator,
});

VISUALIZATION_FACTORY.registerDataProviderTransformers(CustomDataProviderType.STACKED_PLOT, StackedPlotProvider, {
    transformToVisualization: makeStackedPlotConfig,
    reduceAccumulatedData: plotDataAccumulator,
});

VISUALIZATION_FACTORY.registerGroupCustomPropsCollector(
    GroupType.WELL_LOG_TRACK_CONT,
    ContinuousLogTrack,
    collectContinuousTrackConfig,
);

VISUALIZATION_FACTORY.registerGroupCustomPropsCollector(
    GroupType.WELL_LOG_TRACK_DISC,
    DiscreteLogTrack,
    collectDiscreteTrackConfig,
);

VISUALIZATION_FACTORY.registerDataProviderTransformers(CustomDataProviderType.WELLBORE_PICKS, WellborePicksProvider, {
    transformToVisualization: makeWellPickCollections,
});

export type WellLogFactoryProduct = ReturnType<(typeof VISUALIZATION_FACTORY)["make"]>;

export function useLogViewerVisualizationProduct(
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
