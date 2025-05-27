import React from "react";

import type { Layer } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { BoundingBox2D } from "@webviz/subsurface-viewer";
import type { Feature } from "geojson";
import _ from "lodash";

import { type HoverService, HoverTopic, useHoverValue } from "@framework/HoverService";
import type { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import * as bbox from "@lib/utils/bbox";
import { makeColorScaleAnnotation } from "@modules/2DViewer/DataProviderFramework/annotations/makeColorScaleAnnotation";
import { makePolygonDataBoundingBox } from "@modules/2DViewer/DataProviderFramework/boundingBoxes/makePolygonDataBoundingBox";
import { makeRealizationGridBoundingBox } from "@modules/2DViewer/DataProviderFramework/boundingBoxes/makeRealizationGridBoundingBox";
import { makeSurfaceLayerBoundingBox } from "@modules/2DViewer/DataProviderFramework/boundingBoxes/makeSurfaceLayerBoundingBox";
import { CustomDataProviderType } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/dataProviderTypes";
import { ObservedSurfaceProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/ObservedSurfaceProvider";
import { RealizationGridProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/RealizationGridProvider";
import { RealizationPolygonsProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/RealizationPolygonsProvider";
import { RealizationSurfaceProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/RealizationSurfaceProvider";
import { StatisticalSurfaceProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/StatisticalSurfaceProvider";
import { makeObservedSurfaceLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeObservedSurfaceLayer";
import { makeRealizationGridLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeRealizationGridLayer";
import { makeRealizationPolygonsLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeRealizationPolygonsLayer";
import { makeRealizationSurfaceLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeRealizationSurfaceLayer";
import { makeStatisticalSurfaceLayer } from "@modules/2DViewer/DataProviderFramework/visualization/makeStatisticalSurfaceLayer";
import type { Interfaces } from "@modules/2DViewer/interfaces";
import { PreferredViewLayout } from "@modules/2DViewer/types";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import { DrilledWellborePicksProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellborePicksProvider";
import { DrilledWellTrajectoriesProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellTrajectoriesProvider";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import { useVisualizationAssemblerProduct } from "@modules/_shared/DataProviderFramework/hooks/useVisualizationProduct";
import { makeDrilledWellborePicksBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellborePicksBoundingBox";
import { makeDrilledWellTrajectoriesBoundingBox } from "@modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeDrilledWellTrajectoriesBoundingBox";
import { makeDrilledWellborePicksLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellborePicksLayer";
import { makeDrilledWellTrajectoriesLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellTrajectoriesLayer";
import type { VisualizationTarget } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import {
    VisualizationAssembler,
    VisualizationItemType,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import { PlaceholderLayer } from "../../../_shared/customDeckGlLayers/PlaceholderLayer";

import type { ViewportTypeExtended, ViewsTypeExtended } from "./SubsurfaceViewerWrapper";
import { SubsurfaceViewerWrapper } from "./SubsurfaceViewerWrapper";

import "../../DataProviderFramework/customDataProviderImplementations/registerAllDataProviders";

export type LayersWrapperProps = {
    layerManager: DataProviderManager;
    hoverService: HoverService;
    preferredViewLayout: PreferredViewLayout;
    viewContext: ViewContext<Interfaces>;
};

const HIGHLIGHT_LAYER_ID = "2d-hover-highlights";

function bboxToBound2d(box: bbox.BBox | null): BoundingBox2D | undefined {
    if (!box) return undefined;

    return [box.min.x, box.min.y, box.max.x, box.max.y];
}

// TODO: Combine with DPF's hover-layer functionality
function useHighlightLayer(
    boundingBox: bbox.BBox | null,
    hoverService: HoverService,
    instanceId: string,
): GeoJsonLayer {
    const { x, y } = useHoverValue(HoverTopic.WORLD_POS, hoverService, instanceId) ?? {};
    const xInRange = boundingBox && x && _.inRange(x, boundingBox.min.x, boundingBox.max.x);
    const yInRange = boundingBox && y && _.inRange(y, boundingBox.min.y, boundingBox.max.y);

    const highlightFeatures: Feature[] = [];

    if (xInRange && yInRange) {
        highlightFeatures.push({
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [x, y] },
        });
    }

    return new GeoJsonLayer({
        id: HIGHLIGHT_LAYER_ID,
        pointRadiusMinPixels: 5,
        pointRadiusMaxPixels: 5,
        getFillColor: [255, 0, 0, 170],
        data: {
            type: "FeatureCollection",
            unit: "m",
            features: highlightFeatures,
        },
    });
}

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
    CustomDataProviderType.REALIZATION_SURFACE,
    RealizationSurfaceProvider,
    {
        transformToVisualization: makeRealizationSurfaceLayer,
        transformToBoundingBox: makeSurfaceLayerBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.STATISTICAL_SURFACE,
    StatisticalSurfaceProvider,
    {
        transformToVisualization: makeStatisticalSurfaceLayer,
        transformToBoundingBox: makeSurfaceLayerBoundingBox,
        transformToAnnotations: makeColorScaleAnnotation,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.REALIZATION_POLYGONS,
    RealizationPolygonsProvider,
    {
        transformToVisualization: makeRealizationPolygonsLayer,
        transformToBoundingBox: makePolygonDataBoundingBox,
    },
);
VISUALIZATION_ASSEMBLER.registerDataProviderTransformers(
    CustomDataProviderType.REALIZATION_GRID,
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
    },
);

export function LayersWrapper(props: LayersWrapperProps): React.ReactNode {
    const [prevBoundingBox, setPrevBoundingBox] = React.useState<bbox.BBox | null>(null);

    const statusWriter = useViewStatusWriter(props.viewContext);

    const assemblerProduct = useVisualizationAssemblerProduct(props.layerManager, VISUALIZATION_ASSEMBLER);

    const globalAnnotations = assemblerProduct.annotations.filter((el) => "colorScale" in el);

    const viewports: ViewportTypeExtended[] = [];
    const deckGlLayers: Layer<any>[] = [];
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

    const highlightLayer = useHighlightLayer(
        prevBoundingBox,
        props.hoverService,
        props.viewContext.getInstanceIdString(),
    );

    deckGlLayers.push(new PlaceholderLayer({ id: "placeholder" }));
    deckGlLayers.push(highlightLayer);
    deckGlLayers.reverse();

    return (
        <PendingWrapper className="w-full h-full flex flex-col" isPending={numLoadingLayers > 0}>
            <SubsurfaceViewerWrapper
                instanceId={props.viewContext.getInstanceIdString()}
                hoverService={props.hoverService}
                views={views}
                layers={deckGlLayers}
                bounds={bboxToBound2d(prevBoundingBox)}
            />
        </PendingWrapper>
    );
}
