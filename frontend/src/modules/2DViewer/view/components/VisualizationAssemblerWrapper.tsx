import type React from "react";

import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { makeDrilledWellTrajectoriesHoverVisualizationFunctions } from "@modules/2DViewer/DataProviderFramework/visualization/makeDrilledWellTrajectoriesHoverVisualizationFunctions";
import {
    DpfSubsurfaceViewerWrapper,
    type DpfSubsurfaceViewerWrapperProps,
} from "@modules/_shared/components/SubsurfaceViewer/DpfSubsurfaceViewerWrapper";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import { DrilledWellborePicksProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellborePicksProvider";
import { DrilledWellTrajectoriesProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellTrajectoriesProvider";
import { FaultPolygonsProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/FaultPolygonsProvider";
import { RealizationPolygonsProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/RealizationPolygonsProvider";
import { AttributeSurfaceProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/surfaceProviders/AttributeSurfaceProvider";
import { DepthSurfaceProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/surfaceProviders/DepthSurfaceProvider";
import { SeismicSurfaceProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/surfaceProviders/SeismicSurfaceProvider";
import {
    DataProviderManagerTopic,
    type DataProviderManager,
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { makeColorScaleAnnotation } from "@modules/_shared/DataProviderFramework/visualization/annotations/makeColorScaleAnnotation";
import { makeDepthColorScaleAnnotation } from "@modules/_shared/DataProviderFramework/visualization/annotations/makeDepthColorScaleAnnotation";
import { makeSeismicColorScaleAnnotation } from "@modules/_shared/DataProviderFramework/visualization/annotations/makeSeismicColorScaleAnnotation";
import { makePolygonDataBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/boundingBoxes/makePolygonDataBoundingBox";
import { makeRealizationGridBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/boundingBoxes/makeRealizationGridBoundingBox";
import { makeSurfaceLayerBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/boundingBoxes/makeSurfaceLayerBoundingBox";
import { makeDrilledWellborePicksBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellborePicksBoundingBox";
import { makeDrilledWellTrajectoriesBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellTrajectoriesBoundingBox";
import { makeAttributeSurfaceLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeAttributeSurfaceLayer";
import { makeDepthSurfaceLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDepthSurfaceLayer";
import { makePolygonsLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makePolygonsLayer";
import { makeRealizationGridLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeRealizationGridLayer";
import { makeSeismicSurfaceLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeSeismicSurfaceLayer";
import {
    VisualizationAssembler,
    type VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import { CustomDataProviderType } from "../../DataProviderFramework/customDataProviderImplementations/dataProviderTypes";
import { RealizationGridProvider } from "../../DataProviderFramework/customDataProviderImplementations/RealizationGridProvider";
import { makeDrilledWellborePicksLayer2D } from "../../DataProviderFramework/visualization/makeDrilledWellborePicksLayer2D";
import { makeDrilledWellTrajectoriesLayer2D } from "../../DataProviderFramework/visualization/makeDrilledWellTrajectoriesLayer2D";

import "../../DataProviderFramework/customDataProviderImplementations/registerAllDataProviders";
const VISUALIZATION_ASSEMBLER = new VisualizationAssembler<VisualizationTarget.DECK_GL>();

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(DataProviderType.DEPTH_SURFACE, DepthSurfaceProvider, {
    transformToVisualization: makeDepthSurfaceLayer,
    transformToBoundingBox: makeSurfaceLayerBoundingBox,
    transformToAnnotations: makeDepthColorScaleAnnotation,
});

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(DataProviderType.SEISMIC_3D_SURFACE, SeismicSurfaceProvider, {
    transformToVisualization: makeSeismicSurfaceLayer,
    transformToBoundingBox: makeSurfaceLayerBoundingBox,
    transformToAnnotations: makeSeismicColorScaleAnnotation,
});
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(DataProviderType.SEISMIC_4D_SURFACE, SeismicSurfaceProvider, {
    transformToVisualization: makeSeismicSurfaceLayer,
    transformToBoundingBox: makeSurfaceLayerBoundingBox,
    transformToAnnotations: makeSeismicColorScaleAnnotation,
});
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.ATTRIBUTE_STATIC_SURFACE,
    AttributeSurfaceProvider,
    {
        transformToVisualization: makeSeismicSurfaceLayer,
        transformToBoundingBox: makeSurfaceLayerBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.ATTRIBUTE_TIME_STEP_SURFACE,
    AttributeSurfaceProvider,
    {
        transformToVisualization: makeAttributeSurfaceLayer,
        transformToBoundingBox: makeSurfaceLayerBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.ATTRIBUTE_INTERVAL_SURFACE,
    AttributeSurfaceProvider,
    {
        transformToVisualization: makeAttributeSurfaceLayer,
        transformToBoundingBox: makeSurfaceLayerBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(DataProviderType.FAULT_POLYGONS, FaultPolygonsProvider, {
    transformToVisualization: makePolygonsLayer,
    transformToBoundingBox: makePolygonDataBoundingBox,
});
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
        transformToHoverVisualization: makeDrilledWellTrajectoriesHoverVisualizationFunctions,
    },
);

export type VisualizationAssemblerWrapperProps = Omit<
    DpfSubsurfaceViewerWrapperProps,
    "visualizationAssemblerProduct" | "visualizationMode" | "moduleInstanceId"
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
            moduleInstanceId={props.viewContext.getInstanceIdString()}
        />
    );
}
