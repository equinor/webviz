import type React from "react";

import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import {
    DpfSubsurfaceViewerWrapper,
    type DpfSubsurfaceViewerWrapperProps,
} from "@modules/_shared/components/SubsurfaceViewer/DpfSubsurfaceViewerWrapper";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import { DrilledWellborePicksProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellborePicksProvider";
import { DrilledWellTrajectoriesProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellTrajectoriesProvider";
import { RealizationPolygonsProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/RealizationPolygonsProvider";
import { RealizationSurfaceProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/RealizationSurfaceProvider";
import { StatisticalSurfaceProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/StatisticalSurfaceProvider";
import {
    DataProviderManagerTopic,
    type DataProviderManager,
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { makeColorScaleAnnotation } from "@modules/_shared/DataProviderFramework/visualization/annotations/makeColorScaleAnnotation";
import { makePolygonDataBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/boundingBoxes/makePolygonDataBoundingBox";
import { makeRealizationGridBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/boundingBoxes/makeRealizationGridBoundingBox";
import { makeSurfaceLayerBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/boundingBoxes/makeSurfaceLayerBoundingBox";
import { makeDrilledWellborePicksBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellborePicksBoundingBox";
import { makeDrilledWellTrajectoriesBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellTrajectoriesBoundingBox";
import { makePolygonsLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makePolygonsLayer";
import { makeRealizationGridLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeRealizationGridLayer";
import { makeRealizationSurfaceLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeRealizationSurfaceLayer";
import { makeStatisticalSurfaceLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeStatisticalSurfaceLayer";
import {
    VisualizationAssembler,
    type VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import { CustomDataProviderType } from "../../DataProviderFramework/customDataProviderImplementations/dataProviderTypes";
import { ObservedSurfaceProvider } from "../../DataProviderFramework/customDataProviderImplementations/ObservedSurfaceProvider";
import { RealizationGridProvider } from "../../DataProviderFramework/customDataProviderImplementations/RealizationGridProvider";
import { makeDrilledWellborePicksLayer2D } from "../../DataProviderFramework/visualization/makeDrilledWellborePicksLayer2D";
import { makeDrilledWellTrajectoriesLayer2D } from "../../DataProviderFramework/visualization/makeDrilledWellTrajectoriesLayer2D";
import { makeObservedSurfaceLayer } from "../../DataProviderFramework/visualization/makeObservedSurfaceLayer";

import "../../DataProviderFramework/customDataProviderImplementations/registerAllDataProviders";

const VISUALIZATION_ASSEMBLER = new VisualizationAssembler<VisualizationTarget.DECK_GL>();

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.OBSERVED_SURFACE,
    ObservedSurfaceProvider,
    {
        transformToVisualization: makeObservedSurfaceLayer,
        transformToBoundingBox: makeSurfaceLayerBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.REALIZATION_SURFACE,
    RealizationSurfaceProvider,
    {
        transformToVisualization: makeRealizationSurfaceLayer,
        transformToBoundingBox: makeSurfaceLayerBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.STATISTICAL_SURFACE,
    StatisticalSurfaceProvider,
    {
        transformToVisualization: makeStatisticalSurfaceLayer,
        transformToBoundingBox: makeSurfaceLayerBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.REALIZATION_POLYGONS,
    RealizationPolygonsProvider,
    {
        transformToVisualization: makePolygonsLayer,
        transformToBoundingBox: makePolygonDataBoundingBox,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.REALIZATION_GRID_2D,
    RealizationGridProvider,
    {
        transformToVisualization: makeRealizationGridLayer,
        transformToBoundingBox: makeRealizationGridBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.DRILLED_WELLBORE_PICKS,
    DrilledWellborePicksProvider,
    {
        transformToVisualization: makeDrilledWellborePicksLayer2D,
        transformToBoundingBox: makeDrilledWellborePicksBoundingBox,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.DRILLED_WELL_TRAJECTORIES,
    DrilledWellTrajectoriesProvider,
    {
        transformToVisualization: makeDrilledWellTrajectoriesLayer2D,
        transformToBoundingBox: makeDrilledWellTrajectoriesBoundingBox,
    },
);

export type VisualizationAssemblerWrapperProps = Omit<
    DpfSubsurfaceViewerWrapperProps,
    "visualizationAssemblerProduct" | "visualizationMode"
> & {
    dataProviderManager: DataProviderManager;
};

export function VisualizationAssemblerWrapper(props: VisualizationAssemblerWrapperProps): React.ReactNode {
    usePublishSubscribeTopicValue(props.dataProviderManager, DataProviderManagerTopic.DATA_REVISION);

    const visualizationAssemblerProduct = VISUALIZATION_ASSEMBLER.make(props.dataProviderManager);

    return (
        <DpfSubsurfaceViewerWrapper
            {...props}
            visualizationMode="2D"
            visualizationAssemblerProduct={visualizationAssemblerProduct}
        />
    );
}
