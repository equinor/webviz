import type React from "react";

import { type Layer } from "@deck.gl/core";

import type { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import type { Interfaces } from "@modules/2DViewer/interfaces";
import { PreferredViewLayout } from "@modules/2DViewer/types";
import { RealizationSeismicCrosslineProvider } from "@modules/3DViewerNew/DataProviderFramework/customDataProviderImplementations/RealizationSeismicCrosslineProvider";
import { RealizationSeismicDepthSliceProvider } from "@modules/3DViewerNew/DataProviderFramework/customDataProviderImplementations/RealizationSeismicDepthProvider";
import { RealizationSeismicInlineProvider } from "@modules/3DViewerNew/DataProviderFramework/customDataProviderImplementations/RealizationSeismicInlineProvider";
import { CustomDataProviderType } from "@modules/3DViewerNew/DataProviderFramework/customDataProviderTypes";
import {
    makeSeismicFenceMeshLayerFunction,
    Plane,
} from "@modules/3DViewerNew/DataProviderFramework/visualization/makeSeismicFenceMeshLayer";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import { DrilledWellborePicksProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellborePicksProvider";
import { DrilledWellTrajectoriesProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellTrajectoriesProvider";
import { RealizationGridProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/RealizationGridProvider";
import { RealizationPolygonsProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/RealizationPolygonsProvider";
import { RealizationSurfaceProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/RealizationSurfaceProvider";
import { StatisticalSurfaceProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/StatisticalSurfaceProvider";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { DataProviderManagerTopic } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import { makeColorScaleAnnotation } from "@modules/_shared/DataProviderFramework/visualization/annotations/makeColorScaleAnnotation";
import { makePolygonDataBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/boundingBoxes/makePolygonDataBoundingBox";
import { makeRealizationGridBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/boundingBoxes/makeRealizationGridBoundingBox";
import { makeSurfaceLayerBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/boundingBoxes/makeSurfaceLayerBoundingBox";
import { makeDrilledWellborePicksBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellborePicksBoundingBox";
import { makeDrilledWellTrajectoriesBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellTrajectoriesBoundingBox";
import { makeDrilledWellborePicksLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellborePicksLayer";
import { makeDrilledWellTrajectoriesLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellTrajectoriesLayer";
import { makeRealizationGridLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeRealizationGridLayer";
import { makeRealizationPolygonsLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeRealizationPolygonsLayer";
import { makeRealizationSurfaceLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeRealizationSurfaceLayer";
import { makeStatisticalSurfaceLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeStatisticalSurfaceLayer";
import type { VisualizationTarget } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import {
    VisualizationAssembler,
    VisualizationItemType,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { ViewportTypeExtended, ViewsTypeExtended } from "@modules/_shared/types/deckgl";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";

import { PlaceholderLayer } from "../../../_shared/customDeckGlLayers/PlaceholderLayer";

import { InteractionWrapper } from "./InteractionWrapper";

import "../../DataProviderFramework/registerAllDataProviders";

const VISUALIZATION_ASSEMBLER = new VisualizationAssembler<VisualizationTarget.DECK_GL>();

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
        transformToVisualization: makeRealizationPolygonsLayer,
        transformToBoundingBox: makePolygonDataBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(DataProviderType.REALIZATION_GRID, RealizationGridProvider, {
    transformToVisualization: makeRealizationGridLayer,
    transformToBoundingBox: makeRealizationGridBoundingBox,
    transformToAnnotations: makeColorScaleAnnotation,
});
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
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.REALIZATION_SEISMIC_INLINE,
    RealizationSeismicInlineProvider,
    {
        transformToVisualization: makeSeismicFenceMeshLayerFunction(Plane.INLINE),
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.REALIZATION_SEISMIC_CROSSLINE,
    RealizationSeismicCrosslineProvider,
    {
        transformToVisualization: makeSeismicFenceMeshLayerFunction(Plane.CROSSLINE),
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.REALIZATION_SEISMIC_DEPTH,
    RealizationSeismicDepthSliceProvider,
    {
        transformToVisualization: makeSeismicFenceMeshLayerFunction(Plane.DEPTH),
    },
);

export type LayersWrapperProps = {
    fieldId: string;
    layerManager: DataProviderManager;
    preferredViewLayout: PreferredViewLayout;
    viewContext: ViewContext<Interfaces>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function LayersWrapper(props: LayersWrapperProps): React.ReactNode {
    const statusWriter = useViewStatusWriter(props.viewContext);

    usePublishSubscribeTopicValue(props.layerManager, DataProviderManagerTopic.DATA_REVISION);

    const assemblerProduct = VISUALIZATION_ASSEMBLER.make(props.layerManager);

    const viewports: ViewportTypeExtended[] = [];
    const deckGlLayers: Layer<any>[] = [];
    const globalAnnotations = assemblerProduct.annotations;
    const globalColorScales = globalAnnotations.filter((el) => "colorScale" in el);
    const globalLayerIds: string[] = ["placeholder"];

    for (const item of assemblerProduct.children) {
        if (item.itemType === VisualizationItemType.GROUP && item.groupType === GroupType.VIEW) {
            const colorScales = item.annotations.filter((el) => "colorScale" in el);
            const layerIds: string[] = [];

            for (const child of item.children) {
                if (child.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION) {
                    const layer = child.visualization;
                    layerIds.push(layer.id);
                    deckGlLayers.push(layer);
                }
            }
            viewports.push({
                id: item.id,
                name: item.name,
                color: item.color,
                isSync: true,
                show3D: true,
                layerIds,
                colorScales,
            });
        } else if (item.itemType === VisualizationItemType.DATA_PROVIDER_VISUALIZATION) {
            deckGlLayers.push(item.visualization);
            globalLayerIds.push(item.visualization.id);
        }
    }

    const views: ViewsTypeExtended = {
        layout: [0, 0],
        showLabel: false,
        viewports: viewports.map((viewport) => ({
            ...viewport,
            layerIds: [...globalLayerIds, ...viewport.layerIds!],
            colorScales: [...globalColorScales, ...viewport.colorScales!],
        })),
    };

    const numViews = assemblerProduct.children.filter(
        (item) => item.itemType === VisualizationItemType.GROUP && item.groupType === GroupType.VIEW,
    ).length;

    if (numViews) {
        const numCols = Math.ceil(Math.sqrt(numViews));
        const numRows = Math.ceil(numViews / numCols);
        views.layout = [numCols, numRows];
    }

    if (props.preferredViewLayout === PreferredViewLayout.HORIZONTAL) {
        views.layout = [views.layout[1], views.layout[0]];
    }

    statusWriter.setLoading(assemblerProduct.numLoadingDataProviders > 0);

    for (const message of assemblerProduct.aggregatedErrorMessages) {
        statusWriter.addError(message);
    }

    deckGlLayers.push(new PlaceholderLayer({ id: "placeholder" }));

    deckGlLayers.reverse();

    return (
        <InteractionWrapper
            views={views}
            fieldId={props.fieldId}
            layers={deckGlLayers}
            workbenchSession={props.workbenchSession}
            workbenchSettings={props.workbenchSettings}
        />
    );
}
