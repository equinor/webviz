import React from "react";

import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import {
    accumulatePolylineIds,
    type AccumulatedData,
} from "@modules/3DViewer/DataProviderFramework/accumulators/polylineIdsAccumulator";
import { makeIntersectionRealizationGridBoundingBox } from "@modules/3DViewer/DataProviderFramework/boundingBoxes/makeIntersectionRealizationGridBoundingBox";
import { makeIntersectionRealizationSeismicBoundingBox } from "@modules/3DViewer/DataProviderFramework/boundingBoxes/makeIntersectionRealizationSeismicBoundingBox";
import { makeRealizationSeismicSlicesBoundingBox } from "@modules/3DViewer/DataProviderFramework/boundingBoxes/makeRealizationSeismicSlicesBoundingBox";
import { RealizationGridProvider } from "@modules/3DViewer/DataProviderFramework/customDataProviderImplementations/RealizationGridProvider";
import { RealizationSeismicSlicesProvider } from "@modules/3DViewer/DataProviderFramework/customDataProviderImplementations/RealizationSeismicSlicesProvider";
import { CustomDataProviderType } from "@modules/3DViewer/DataProviderFramework/customDataProviderTypes";
import { makeDrilledWellTrajectoriesHoverVisualizationFunctions } from "@modules/3DViewer/DataProviderFramework/visualization/makeDrilledWellTrajectoriesHoverVisualizationFunctions";
import { makeDrilledWellTrajectoriesLayer } from "@modules/3DViewer/DataProviderFramework/visualization/makeDrilledWellTrajectoriesLayer";
import { makeIntersectionRealizationGridLayer } from "@modules/3DViewer/DataProviderFramework/visualization/makeIntersectionRealizationGridLayer";
import { makeRealizationSurfaceLayer } from "@modules/3DViewer/DataProviderFramework/visualization/makeRealizationSurfaceLayer";
import { makeSeismicIntersectionMeshLayer } from "@modules/3DViewer/DataProviderFramework/visualization/makeSeismicIntersectionMeshLayer";
import { makeSeismicSlicesLayer } from "@modules/3DViewer/DataProviderFramework/visualization/makeSeismicSlicesLayer";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import { DrilledWellborePicksProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellborePicksProvider";
import { DrilledWellTrajectoriesProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellTrajectoriesProvider";
import { IntersectionRealizationGridProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationGridProvider";
import { IntersectionRealizationSeismicProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationSeismicProvider";
import { RealizationPolygonsProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/RealizationPolygonsProvider";
import { RealizationSurfaceProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/RealizationSurfaceProvider";
import { StatisticalSurfaceProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/StatisticalSurfaceProvider";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { DataProviderManagerTopic } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { makeColorScaleAnnotation } from "@modules/_shared/DataProviderFramework/visualization/annotations/makeColorScaleAnnotation";
import { makePolygonDataBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/boundingBoxes/makePolygonDataBoundingBox";
import { makeRealizationGridBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/boundingBoxes/makeRealizationGridBoundingBox";
import { makeSurfaceLayerBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/boundingBoxes/makeSurfaceLayerBoundingBox";
import { makeDrilledWellborePicksBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellborePicksBoundingBox";
import { makeDrilledWellTrajectoriesBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellTrajectoriesBoundingBox";
import { makeDrilledWellborePicksLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellborePicksLayer";
import { makePolygonsLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makePolygonsLayer";
import { makeRealizationGridLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeRealizationGridLayer";
import { makeStatisticalSurfaceLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeStatisticalSurfaceLayer";
import type { VisualizationTarget } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { VisualizationAssembler } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import {
    DpfSubsurfaceViewerWrapper,
    type DpfSubsurfaceViewerWrapperProps,
} from "@modules/_shared/components/SubsurfaceViewer/DpfSubsurfaceViewerWrapper";

const VISUALIZATION_ASSEMBLER = new VisualizationAssembler<
    VisualizationTarget.DECK_GL,
    Record<string, never>,
    Record<string, never>,
    AccumulatedData
>();

VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.REALIZATION_SURFACE_3D,
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
    CustomDataProviderType.REALIZATION_GRID_3D,
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
        transformToVisualization: makeDrilledWellborePicksLayer,
        transformToBoundingBox: makeDrilledWellborePicksBoundingBox,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.DRILLED_WELL_TRAJECTORIES,
    DrilledWellTrajectoriesProvider,
    {
        transformToVisualization: makeDrilledWellTrajectoriesLayer,
        transformToBoundingBox: makeDrilledWellTrajectoriesBoundingBox,
        transformToHoverVisualization: makeDrilledWellTrajectoriesHoverVisualizationFunctions,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.REALIZATION_SEISMIC_SLICES,
    RealizationSeismicSlicesProvider,
    {
        transformToVisualization: makeSeismicSlicesLayer,
        transformToAnnotations: makeColorScaleAnnotation,
        transformToBoundingBox: makeRealizationSeismicSlicesBoundingBox,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.INTERSECTION_WITH_WELLBORE_EXTENSION_REALIZATION_GRID,
    IntersectionRealizationGridProvider,
    {
        transformToVisualization: makeIntersectionRealizationGridLayer,
        transformToAnnotations: makeColorScaleAnnotation,
        reduceAccumulatedData: accumulatePolylineIds,
        transformToBoundingBox: makeIntersectionRealizationGridBoundingBox,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.INTERSECTION_REALIZATION_OBSERVED_SEISMIC,
    IntersectionRealizationSeismicProvider,
    {
        transformToVisualization: makeSeismicIntersectionMeshLayer,
        transformToAnnotations: makeColorScaleAnnotation,
        transformToBoundingBox: makeIntersectionRealizationSeismicBoundingBox,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    DataProviderType.INTERSECTION_REALIZATION_SIMULATED_SEISMIC,
    IntersectionRealizationSeismicProvider,
    {
        transformToVisualization: makeSeismicIntersectionMeshLayer,
        transformToAnnotations: makeColorScaleAnnotation,
        transformToBoundingBox: makeIntersectionRealizationSeismicBoundingBox,
    },
);

export type VisualizationAssemblerWrapperProps = Omit<
    DpfSubsurfaceViewerWrapperProps,
    "visualizationAssemblerProduct" | "visualizationMode"
> & {
    dataProviderManager: DataProviderManager;
};

export function DataProvidersWrapper(props: VisualizationAssemblerWrapperProps): React.ReactNode {
    usePublishSubscribeTopicValue(props.dataProviderManager, DataProviderManagerTopic.DATA_REVISION);

    const assemblerProduct = VISUALIZATION_ASSEMBLER.make(props.dataProviderManager, {
        initialAccumulatedData: { polylineIds: [] },
    });

    return (
        <DpfSubsurfaceViewerWrapper
            {...props}
            visualizationMode="3D"
            visualizationAssemblerProduct={assemblerProduct}
        />
    );
}
