import React from "react";

import type { Layer } from "@deck.gl/core";
import type { BoundingBox2D } from "@webviz/subsurface-viewer";

import type { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import * as bbox from "@lib/utils/bbox";
import { CustomDataProviderType } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/dataProviderTypes";
import { ObservedSurfaceProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/ObservedSurfaceProvider";
import { makeObservedSurfaceLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeObservedSurfaceLayer";
import type { Interfaces } from "@modules/2DViewer/interfaces";
import { PreferredViewLayout } from "@modules/2DViewer/types";
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
import {
    VisualizationAssembler,
    VisualizationItemType,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { VisualizationTarget } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";

import { PlaceholderLayer } from "../../../_shared/customDeckGlLayers/PlaceholderLayer";

import type { ViewportTypeExtended, ViewsTypeExtended } from "./SubsurfaceViewerWrapper";
import { SubsurfaceViewerWrapper } from "./SubsurfaceViewerWrapper";

import "../../DataProviderFramework/customDataProviderImplementations/registerAllDataProviders";
import { makeRealizationSurfaceLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeRealizationSurfaceLayer";
import { makeStatisticalSurfaceLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeStatisticalSurfaceLayer";
import { makeRealizationPolygonsLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeRealizationPolygonsLayer";
import { makeRealizationGridLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeRealizationGridLayer";

export type LayersWrapperProps = {
    layerManager: DataProviderManager;
    preferredViewLayout: PreferredViewLayout;
    viewContext: ViewContext<Interfaces>;
};

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
        transformToVisualization: makeRealizationPolygonsLayer,
        transformToBoundingBox: makePolygonDataBoundingBox,
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

export function LayersWrapper(props: LayersWrapperProps): React.ReactNode {
    const [prevBoundingBox, setPrevBoundingBox] = React.useState<bbox.BBox | null>(null);

    const statusWriter = useViewStatusWriter(props.viewContext);

    usePublishSubscribeTopicValue(props.layerManager, DataProviderManagerTopic.DATA_REVISION);

    const assemblerProduct = VISUALIZATION_ASSEMBLER.make(props.layerManager);

    const viewports: ViewportTypeExtended[] = [];
    const deckGlLayers: Layer<any>[] = [];
    const globalAnnotations = assemblerProduct.annotations.filter((el) => "colorScale" in el);
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
            // Apply global layers/annotations
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

    if (assemblerProduct.combinedBoundingBox !== null) {
        if (prevBoundingBox !== null) {
            if (!bbox.outerBoxcontainsInnerBox(prevBoundingBox, assemblerProduct.combinedBoundingBox)) {
                setPrevBoundingBox(assemblerProduct.combinedBoundingBox);
            }
        } else {
            setPrevBoundingBox(assemblerProduct.combinedBoundingBox);
        }
    }

    const numLoadingLayers = assemblerProduct.numLoadingDataProviders;
    statusWriter.setLoading(assemblerProduct.numLoadingDataProviders > 0);

    for (const message of assemblerProduct.aggregatedErrorMessages) {
        statusWriter.addError(message);
    }

    let bounds: BoundingBox2D | undefined = undefined;
    if (prevBoundingBox) {
        bounds = [prevBoundingBox.min.x, prevBoundingBox.min.y, prevBoundingBox.max.x, prevBoundingBox.max.y];
    }

    deckGlLayers.push(new PlaceholderLayer({ id: "placeholder" }));
    deckGlLayers.reverse();

    return (
        <PendingWrapper className="w-full h-full flex flex-col" isPending={numLoadingLayers > 0}>
            <SubsurfaceViewerWrapper views={views} layers={deckGlLayers} bounds={bounds} />
        </PendingWrapper>
    );
}
